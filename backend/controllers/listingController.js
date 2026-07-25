const Listing = require('../models/Listing');
const ChannelListing = require('../models/ChannelListing');
const SyncJob = require('../models/SyncJob');
const ebayListingService = require('../services/ebayListingService');
const etsyListingService = require('../services/etsyListingService');
const shopifyListingService = require('../services/shopifyListingService');

exports.getListings = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = 'all', channel = 'all' } = req.query;
    
    // Construct base query
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== 'all') {
      query.status = status;
    }
    
    // If filtering by channel, we must find matching listingIds first
    if (channel !== 'all') {
      const channelMatches = await ChannelListing.find({ platform: channel }).select('listingId').lean();
      query._id = { $in: channelMatches.map(c => c.listingId) };
    }
    
    // Stats calculation (parallel)
    const [totalListings, totalActive, totalDraft, syncedListingIds] = await Promise.all([
      Listing.countDocuments(),
      Listing.countDocuments({ status: 'active' }),
      Listing.countDocuments({ status: 'draft' }),
      ChannelListing.distinct('listingId')
    ]);
    const totalSynced = syncedListingIds.length;
    
    // Fetch paginated listings
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;
    
    const listings = await Listing.find(query)
      .select('-description -images -platformDescriptions -platformTitles -platformSettings')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
      
    const totalPages = Math.ceil((await Listing.countDocuments(query)) / limitNum);
    
    // Attach channels to the fetched listings
    const listingIds = listings.map(l => l._id);
    const allChannels = await ChannelListing.find({ listingId: { $in: listingIds } }).lean();
    
    const channelMap = {};
    allChannels.forEach(c => {
      const lid = c.listingId.toString();
      if (!channelMap[lid]) channelMap[lid] = [];
      channelMap[lid].push(c.platform);
    });

    const listingsWithChannels = listings.map(listing => ({
      ...listing,
      channels: channelMap[listing._id.toString()] || []
    }));

    res.json({ 
      success: true, 
      listings: listingsWithChannels,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: await Listing.countDocuments(query)
      },
      stats: {
        totalListings,
        totalActive,
        totalDraft,
        totalSynced
      }
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ success: false, message: 'Server error fetching listings' });
  }
};

exports.createListing = async (req, res) => {
  try {
    const {
      title, description, sku, price, compareAtPrice,
      quantity, condition, brand, category, tags,
      weight, barcode, images, status,
      platformSettings, platformTitles, platformDescriptions
    } = req.body;

    if (!title || !sku) {
      return res.status(400).json({ success: false, message: 'Title and SKU are required.' });
    }

    const newListing = new Listing({
      title,
      description,
      sku,
      price: Number(price) || 0,
      compareAtPrice: Number(compareAtPrice) || 0,
      quantity: Number(quantity) || 0,
      condition: condition || 'used',
      brand,
      category,
      tags: tags || [],
      weight: Number(weight) || 0,
      barcode,
      images: images || [],
      status: status || 'draft',
      platformSettings: platformSettings || {},
      platformTitles: platformTitles || {},
      platformDescriptions: platformDescriptions || {},
    });

    await newListing.save();
    res.status(201).json({ success: true, listing: newListing });
  } catch (error) {
    console.error('Error creating listing:', error);
    // Handle Mongoose duplicate key error (duplicate SKU)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: `SKU "${error.keyValue?.sku}" already exists. Use a unique SKU.` });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error creating listing' });
  }
};

exports.getListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    
    const channels = await ChannelListing.find({ listingId: listing._id });
    
    res.json({ success: true, listing: { ...listing.toJSON(), channelData: channels } });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ success: false, message: 'Server error fetching listing' });
  }
};
exports.updateListing = async (req, res) => {
  try {
    const updated = await Listing.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    res.json({ success: true, listing: updated });
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating listing' });
  }
};

exports.syncToChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const { platform, syncOptions } = req.body;
    
    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    // Create a new SyncJob
    const job = new SyncJob({
      listingId: id,
      platform,
      action: 'publish_listing',
      status: 'processing'
    });
    await job.save();

    // Fire off async processing
    (async () => {
      try {
        let remoteId = null;

        if (platform === 'ebay') {
          const result = await ebayListingService.createEbayListing(listing, syncOptions, req.user?.id);
          remoteId = result.remoteId;
        } else if (platform === 'etsy') {
          const result = await etsyListingService.createEtsyListing(listing, syncOptions, req.user?.id);
          remoteId = result.remoteId;
        } else if (platform === 'shopify') {
          const result = await shopifyListingService.createShopifyListing(listing, syncOptions, req.user?.id);
          remoteId = result.remoteId;
        } else {
          throw new Error(`Platform ${platform} is not supported yet.`);
        }

        job.status = 'completed';
        job.completedAt = new Date();
        job.logs.push({ message: `Successfully pushed ${listing.sku} to ${platform}` });
        await job.save();

        // Update or create ChannelListing mapping
        await ChannelListing.findOneAndUpdate(
          { listingId: id, platform },
          { status: 'active', lastSyncedAt: new Date(), remoteId },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error(`Sync job error for ${platform}:`, err);
        job.status = 'failed';
        job.completedAt = new Date();
        job.logs.push({ message: err.message || String(err), level: 'error' });
        await job.save();

        await ChannelListing.findOneAndUpdate(
          { listingId: id, platform },
          { status: 'error', lastError: err.message || String(err) },
          { upsert: true, new: true }
        );
      }
    })();

    res.json({ success: true, message: `Sync job started for ${platform}`, jobId: job._id });
  } catch (error) {
    console.error('Error syncing listing:', error);
    res.status(500).json({ success: false, message: 'Server error syncing listing' });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const deleted = await Listing.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Listing not found' });
    // Also remove all channel listings
    await ChannelListing.deleteMany({ listingId: req.params.id });
    res.json({ success: true, message: 'Listing deleted' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ success: false, message: 'Server error deleting listing' });
  }
};

exports.bulkSync = async (req, res) => {
  try {
    const { listingIds, platforms } = req.body;
    if (!listingIds?.length || !platforms?.length) {
      return res.status(400).json({ success: false, message: 'listingIds and platforms are required' });
    }

    const jobs = [];
    for (const listingId of listingIds) {
      for (const platform of platforms) {
        jobs.push({ listingId, platform });
      }
    }

    res.json({ success: true, message: `Queued ${jobs.length} sync jobs`, total: jobs.length });

    // Fire off async processing for each job
    (async () => {
      for (const { listingId, platform } of jobs) {
        try {
          const listing = await Listing.findById(listingId);
          if (!listing) continue;

          const job = new SyncJob({ listingId, platform, action: 'publish_listing', status: 'processing' });
          await job.save();

          let remoteId = null;
          if (platform === 'ebay') {
            const r = await ebayListingService.createEbayListing(listing, {});
            remoteId = r.remoteId;
          } else if (platform === 'etsy') {
            const r = await etsyListingService.createEtsyListing(listing, {});
            remoteId = r.remoteId;
          } else if (platform === 'shopify') {
            const r = await shopifyListingService.createShopifyListing(listing, {});
            remoteId = r.remoteId;
          }

          job.status = 'completed';
          job.completedAt = new Date();
          await job.save();

          await ChannelListing.findOneAndUpdate(
            { listingId, platform },
            { status: 'active', lastSyncedAt: new Date(), remoteId },
            { upsert: true, new: true }
          );
        } catch (err) {
          console.error(`Bulk sync error for ${listingId}@${platform}:`, err.message);
        }
      }
    })();
  } catch (error) {
    console.error('Error in bulk sync:', error);
    res.status(500).json({ success: false, message: 'Server error in bulk sync' });
  }
};

const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');
const { uploadBuffer } = require('../utils/storage');

exports.fetchUrlData = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, message: 'URL is required' });

    // Fetch the HTML
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      timeout: 10000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    const pageTitle = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
    const pageDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
    
    // Extract up to 30 images
    const images = [];
    $('img').each((i, el) => {
      let src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.startsWith('http')) {
         if (src.startsWith('//')) src = 'https:' + src;
         else if (src.startsWith('/')) {
            try { src = new URL(src, url).href; } catch(e){}
         }
      }
      if (src && src.startsWith('http') && !src.includes('.svg') && !src.includes('logo') && !src.includes('icon')) {
        images.push(src);
      }
    });

    // Extract body text, max 4000 chars to avoid huge prompts
    const bodyText = $('body').text().replace(/\s+/g, ' ').substring(0, 4000);

    const prompt = `
    You are an expert product data extraction AI. Extract the following information from the provided raw web page text and metadata into a valid JSON object.
    
    Data to extract:
    - title (string): The best, most descriptive product title.
    - description (string): A comprehensive product description. Formatted with HTML if there are bullet points or paragraphs.
    - brand (string): The brand of the product.
    - category (string): The best category for the product.
    - condition (string): "new" or "used". Default to "used" if uncertain.
    - price (number): The price of the product as a number.
    - sku (string): Any SKU or model number found.
    - images (array of strings): Return up to 10 of the most relevant product images from the provided image list.
    
    Raw Page Title: ${pageTitle}
    Raw Page Description: ${pageDesc}
    Available Image URLs: ${images.slice(0, 30).join(', ')}
    Raw Body Text (Snippet): ${bodyText}
    
    Return ONLY valid JSON. No markdown formatting.
    `;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    let text = result.response.text();
    
    if (text.startsWith('\`\`\`json')) {
      text = text.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    }

    const extractedData = JSON.parse(text);

    // Download, strip metadata, inject SEO EXIF, and upload to DO Spaces
    if (extractedData.images && Array.isArray(extractedData.images)) {
      const processedImages = [];
      const titleSafe = (extractedData.title || 'Product').substring(0, 100).replace(/[^a-zA-Z0-9 -]/g, '');
      const brandSafe = (extractedData.brand || 'Unknown').substring(0, 50).replace(/[^a-zA-Z0-9 -]/g, '');
      
      const exifObj = {
        IFD0: {
          ImageDescription: titleSafe,
          Make: brandSafe,
          Software: 'Wholesale Platform SEO Engine'
        }
      };

      for (const imgUrl of extractedData.images) {
        try {
          const imgRes = await axios({
            method: 'GET',
            url: imgUrl,
            responseType: 'arraybuffer',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/*'
            },
            timeout: 8000
          });
          
          // sharp strips existing metadata by default, we then inject our custom EXIF
          const processedBuffer = await sharp(imgRes.data)
            .jpeg({ quality: 90 })
            .withMetadata({ exif: exifObj })
            .toBuffer();

          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const key = `uploads/${uniqueSuffix}.jpg`;
          
          const doSpaceUrl = await uploadBuffer(processedBuffer, key, 'image/jpeg', true);
          processedImages.push(doSpaceUrl);
        } catch (imgErr) {
          console.error(`Failed to process image ${imgUrl}:`, imgErr.message);
          // Fallback to original URL if processing fails
          processedImages.push(imgUrl);
        }
      }
      extractedData.images = processedImages;
    }

    res.json({ success: true, data: extractedData });
  } catch (error) {
    console.error('Error fetching URL data:', error.message);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ success: false, message: 'This website (like eBay/Amazon) uses aggressive bot protection that blocks our automated scraper. Please manually enter the details for this product.' });
    }
    res.status(500).json({ success: false, message: `Failed to extract data: ${error.message}` });
  }
};
