const axios = require('axios');
const { PDFDocument } = require('pdf-lib');
const { uploadBuffer } = require('../utils/storage');

// ShipStation API base URL
const SHIPSTATION_API_URL = 'https://ssapi.shipstation.com';

// Helper to get ShipStation Authorization Header
const getAuthHeader = () => {
  const apiKey = process.env.SHIPSTATION_API_KEY;
  const apiSecret = process.env.SHIPSTATION_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error("Missing ShipStation API Credentials in .env file.");
  }
  
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  return `Basic ${token}`;
};

/**
 * @desc    Get shipping rates from ShipStation
 * @route   POST /api/shipping/rates
 * @access  Private
 */
const getRates = async (req, res) => {
  try {
    const { carrierCode, serviceCode, fromPostalCode, toState, toCountry, toPostalCode, weight, dimensions, confirmation, insuranceOptions } = req.body;

    const payload = {
      carrierCode: carrierCode || "stamps_com",
      serviceCode: serviceCode,
      fromPostalCode: fromPostalCode || "90210", 
      toState,
      toCountry: toCountry || "US",
      toPostalCode,
      weight: {
        value: weight?.value || 1,
        units: weight?.units || "ounces"
      },
      dimensions: {
        units: dimensions?.units || "inches",
        length: dimensions?.length || 7,
        width: dimensions?.width || 5,
        height: dimensions?.height || 6
      },
      confirmation: confirmation || "none",
      insuranceOptions: insuranceOptions || null,
      residential: true
    };

    const response = await axios.post(`${SHIPSTATION_API_URL}/shipments/getrates`, payload, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    res.status(200).json({ success: true, rates: response.data });
  } catch (error) {
    console.error('ShipStation Get Rates Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.ExceptionMessage || error.message 
    });
  }
};

/**
 * @desc    Create a shipping label via ShipStation
 * @route   POST /api/shipping/label
 * @access  Private
 */
const createLabel = async (req, res) => {
  try {
    const { carrierCode, serviceCode, packageCode, shipTo, shipFrom, weight, dimensions, confirmation, insuranceOptions, orderId } = req.body;

    const payload = {
      carrierCode,
      serviceCode,
      packageCode,
      confirmation: confirmation || "none",
      insuranceOptions: insuranceOptions || null,
      shipDate: new Date().toISOString().split('T')[0], // Today's date YYYY-MM-DD
      weight: {
        value: weight?.value,
        units: weight?.units || "ounces"
      },
      dimensions: {
        units: dimensions?.units || "inches",
        length: dimensions?.length,
        width: dimensions?.width,
        height: dimensions?.height
      },
      shipFrom: {
        name: shipFrom?.name || "Warehouse",
        company: shipFrom?.company || "Udeal Wholesale",
        street1: shipFrom?.street1 || "123 Main St",
        city: shipFrom?.city || "Los Angeles",
        state: shipFrom?.state || "CA",
        postalCode: shipFrom?.postalCode || "90210",
        country: shipFrom?.country || "US",
        phone: shipFrom?.phone || "555-555-5555"
      },
      shipTo: {
        name: shipTo?.name,
        company: shipTo?.company,
        street1: shipTo?.street1,
        street2: shipTo?.street2,
        city: shipTo?.city,
        state: shipTo?.state,
        postalCode: shipTo?.postalCode,
        country: shipTo?.country || "US",
        phone: shipTo?.phone
      },
      testLabel: false // Some carriers do not support test labels at all
    };

    let labelResponse;
    let retries = 0;

    while (retries < 2) {
      try {
        const response = await axios.post(`${SHIPSTATION_API_URL}/shipments/createlabel`, payload, {
          headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json'
          }
        });
        labelResponse = response.data;
        break;
      } catch (err) {
        let errStr = err.response?.data?.ExceptionMessage || err.response?.data?.Message || err.response?.data?.error || err.message;
        if (typeof errStr !== 'string') errStr = JSON.stringify(errStr);
        
        // Auto-Fund Logic
        const isFundError = errStr.toLowerCase().includes('insufficient funds') || 
                            errStr.toLowerCase().includes('insurance balance') || 
                            errStr.toLowerCase().includes('insurance funds');
        if (isFundError && retries === 0) {
          try {
            // 1. Get exact rate
            const ratePayload = {
              carrierCode,
              serviceCode,
              fromPostalCode: payload.shipFrom.postalCode,
              toState: payload.shipTo.state,
              toCountry: payload.shipTo.country,
              toPostalCode: payload.shipTo.postalCode,
              weight: payload.weight,
              dimensions: payload.dimensions,
              confirmation: payload.confirmation,
              insuranceOptions: payload.insuranceOptions,
              residential: true
            };
            const rRes = await axios.post(`${SHIPSTATION_API_URL}/shipments/getrates`, ratePayload, { headers: { 'Authorization': getAuthHeader(), 'Content-Type': 'application/json' } });
            const rateResponse = rRes.data;
            const exactRate = rateResponse.find(r => r.serviceCode === serviceCode) || rateResponse[0];
            let shipmentCost = (exactRate.shipmentCost || 0) + (exactRate.otherCost || 0);

            // Add estimated ParcelGuard insurance cost
            if (payload.insuranceOptions && payload.insuranceOptions.provider !== 'none' && payload.insuranceOptions.insuredValue > 0) {
              shipmentCost += Math.ceil(payload.insuranceOptions.insuredValue / 100) * 0.99;
            }

            // 2. Get current carrier balance
            let carrierBalance = 0;
            const cRes = await axios.get(`${SHIPSTATION_API_URL}/carriers`, { headers: { 'Authorization': getAuthHeader() }});
            const carrier = cRes.data.find(c => c.code === carrierCode);
            if (carrier) {
              carrierBalance = carrier.balance || 0;
            }

            // 3. Calculate deficit
            const deficit = shipmentCost - carrierBalance;
            const reloadAmount = Math.max(10, Math.ceil(deficit));

            await axios.post(`${SHIPSTATION_API_URL}/carriers/addfunds`, { carrierCode, amount: reloadAmount }, { headers: { 'Authorization': getAuthHeader() }});
            
            retries++;
            continue; // Retry label creation
          } catch (autoFundErr) {
            console.error('Auto-Fund failed:', autoFundErr.response?.data || autoFundErr.message);
            const detail = autoFundErr.response?.data?.message || autoFundErr.message;
            throw new Error(`Auto-fund attempt failed: ${detail}. Please add funds manually.`);
          }
        }
        
        throw err;
      }
    }

    // ShipStation returns the label as a Base64 encoded PDF string (labelData)
    // Upload this to DigitalOcean Spaces
    const pdfBuffer = Buffer.from(labelResponse.labelData, 'base64');
    const labelUrl = await uploadBuffer(
      pdfBuffer, 
      `labels/${labelResponse.shipmentId || Date.now()}.pdf`, 
      'application/pdf', 
      true
    );

    res.status(200).json({ 
      success: true, 
      shipmentId: labelResponse.shipmentId,
      trackingNumber: labelResponse.trackingNumber,
      labelUrl: labelUrl, 
      labelData: labelResponse.labelData, // Keep this for backward compatibility for now just in case
      shipmentCost: labelResponse.shipmentCost,
      insuranceCost: labelResponse.insuranceCost || 0
    });

  } catch (error) {
    console.error('ShipStation Create Label Error:', error.response?.data || error.message);
    
    let extractedError = error.message;
    if (error.response && error.response.data) {
      if (typeof error.response.data === 'string') {
        extractedError = error.response.data;
      } else {
        extractedError = error.response.data.ExceptionMessage || 
                         error.response.data.Message || 
                         error.response.data.error || 
                         JSON.stringify(error.response.data);
      }
    }
    
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: extractedError 
    });
  }
};

/**
 * @desc    Get Ship From Locations (Warehouses)
 * @route   GET /api/shipping/warehouses
 * @access  Private
 */
const getWarehouses = async (req, res) => {
  try {
    const response = await axios.get(`${SHIPSTATION_API_URL}/warehouses`, {
      headers: {
        'Authorization': getAuthHeader(),
        'Accept': 'application/json'
      }
    });

    res.status(200).json({ success: true, warehouses: response.data });
  } catch (error) {
    console.error('ShipStation Get Warehouses Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.ExceptionMessage || error.message 
    });
  }
};

/**
 * @desc    Get all connected carriers
 * @route   GET /api/shipping/carriers
 * @access  Private
 */
const getCarriers = async (req, res) => {
  try {
    const response = await axios.get(`${SHIPSTATION_API_URL}/carriers`, {
      headers: { 'Authorization': getAuthHeader(), 'Accept': 'application/json' }
    });
    res.status(200).json({ success: true, carriers: response.data });
  } catch (error) {
    res.status(error.response?.status || 500).json({ success: false, error: error.response?.data?.ExceptionMessage || error.message });
  }
};

/**
 * @desc    Get services for a carrier
 * @route   GET /api/shipping/services?carrierCode=xxx
 * @access  Private
 */
const getServices = async (req, res) => {
  try {
    const { carrierCode } = req.query;
    const response = await axios.get(`${SHIPSTATION_API_URL}/carriers/listservices?carrierCode=${carrierCode}`, {
      headers: { 'Authorization': getAuthHeader(), 'Accept': 'application/json' }
    });
    res.status(200).json({ success: true, services: response.data });
  } catch (error) {
    res.status(error.response?.status || 500).json({ success: false, error: error.response?.data?.ExceptionMessage || error.message });
  }
};

/**
 * @desc    Get packages for a carrier
 * @route   GET /api/shipping/packages?carrierCode=xxx
 * @access  Private
 */
const getPackages = async (req, res) => {
  try {
    const { carrierCode } = req.query;
    const response = await axios.get(`${SHIPSTATION_API_URL}/carriers/listpackages?carrierCode=${carrierCode}`, {
      headers: { 'Authorization': getAuthHeader(), 'Accept': 'application/json' }
    });
    res.status(200).json({ success: true, packages: response.data });
  } catch (error) {
    res.status(error.response?.status || 500).json({ success: false, error: error.response?.data?.ExceptionMessage || error.message });
  }
};

/**
 * @desc    Add funds to ShipStation carrier balance
 * @route   POST /api/shipping/addfunds
 * @access  Private
 */
const addFunds = async (req, res) => {
  try {
    const { carrierCode, amount } = req.body;
    
    // ShipStation requires the payload to have carrierCode and amount
    const payload = {
      carrierCode: carrierCode,
      amount: amount
    };

    const response = await axios.post(`${SHIPSTATION_API_URL}/carriers/addfunds`, payload, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });

    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    console.error('ShipStation Add Funds Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ 
      success: false, 
      error: error.response?.data?.ExceptionMessage || error.response?.data?.Message || error.message 
    });
  }
};

/**
 * @desc    Void a shipping label
 * @route   POST /api/shipping/voidlabel
 * @access  Private
 */
const voidLabel = async (req, res) => {
  try {
    const { shipmentId, saleId } = req.body;
    const authHeader = getAuthHeader();

    // 1. Tell ShipStation to void the label (if we have an ID)
    if (shipmentId) {
      try {
        await axios.post(`${SHIPSTATION_API_URL}/shipments/voidlabel`, { shipmentId }, {
          headers: { 'Authorization': authHeader }
        });
      } catch (apiErr) {
        console.warn('ShipStation Void API Warning:', apiErr.response ? apiErr.response.data : apiErr.message);
        // We continue to clear the local database even if ShipStation fails (e.g. already voided or invalid ID)
      }
    }

    // 2. Clear the label info from the Sale document
    if (saleId) {
      const Sale = require('../models/Sale');
      await Sale.findByIdAndUpdate(saleId, {
        $unset: {
          'shipping.labelImage': 1,
          'shipping.trackingNumber': 1,
          'shipping.shipmentId': 1,
          'shipping.fullImage': 1,
          'shipping.shippingCost': 1,
          'shipping.carrier': 1
        },
        $set: {
          deliveryStatus: 'pending'
        }
      });
    }

    res.json({ success: true, message: 'Label voided successfully' });
  } catch (error) {
    console.error('ShipStation Error [VoidLabel]:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.response?.data?.ExceptionMessage || error.response?.data?.Message || 'Failed to void label' });
  }
};

/**
 * @desc    Bulk buy labels for multiple orders and merge PDFs
 * @route   POST /api/shipping/bulk-label
 * @access  Private
 */
const bulkLabel = async (req, res) => {
  try {
    const { saleIds, carrierCode, serviceCode, packageCode, weight, dimensions, shipFrom } = req.body;
    const authHeader = getAuthHeader();

    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      return res.status(400).json({ success: false, error: "No orders provided for bulk printing" });
    }

    const pdfBytesArray = [];
    const updatedSales = [];

    for (const saleId of saleIds) {
      const sale = await Sale.findById(saleId).populate('items');
      if (!sale) continue;
      
      // Prevent double buying if label already exists
      if (sale.shipping?.labelImage) continue;

      const payload = {
        carrierCode,
        serviceCode,
        packageCode,
        confirmation: "none",
        shipDate: new Date().toISOString().split('T')[0],
        weight,
        dimensions,
        shipFrom,
        shipTo: sale.shipping.address,
        testLabel: false
      };

      let retries = 0;
      let success = false;

      while (retries < 2 && !success) {
        try {
          const response = await axios.post(`${SHIPSTATION_API_URL}/shipments/createlabel`, payload, {
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' }
          });

          const { labelData, trackingNumber, shipmentId, shipmentCost } = response.data;
          
          sale.shipping = {
            ...sale.shipping,
            carrier: carrierCode,
            service: serviceCode,
            trackingNumber,
            shipmentId,
            shipmentCost,
            labelImage: `data:application/pdf;base64,${labelData}`,
          };
          sale.status = 'completed'; // Move to shipped status
          sale.deliveryStatus = 'processing';
          await sale.save();
          
          pdfBytesArray.push(labelData);
          updatedSales.push(sale._id);
          success = true;
        } catch (err) {
          let errStr = err.response?.data?.ExceptionMessage || err.response?.data?.Message || err.response?.data?.error || err.message;
          if (typeof errStr !== 'string') errStr = JSON.stringify(errStr);
          
          const isFundError = errStr.toLowerCase().includes('insufficient funds') || 
                              errStr.toLowerCase().includes('insurance balance') || 
                              errStr.toLowerCase().includes('insurance funds');
          if (isFundError && retries === 0) {
            try {
              const ratePayload = {
                carrierCode,
                serviceCode,
                fromPostalCode: payload.shipFrom.postalCode,
                toState: payload.shipTo.state,
                toCountry: payload.shipTo.country,
                toPostalCode: payload.shipTo.postalCode,
                weight: payload.weight,
                dimensions: payload.dimensions,
                confirmation: payload.confirmation,
                insuranceOptions: payload.insuranceOptions,
                residential: true
              };
              const rRes = await axios.post(`${SHIPSTATION_API_URL}/shipments/getrates`, ratePayload, { headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' } });
              const rateResponse = rRes.data;
              const exactRate = rateResponse.find(r => r.serviceCode === serviceCode) || rateResponse[0];
              let shipmentCost = (exactRate.shipmentCost || 0) + (exactRate.otherCost || 0);

              if (payload.insuranceOptions && payload.insuranceOptions.provider !== 'none' && payload.insuranceOptions.insuredValue > 0) {
                shipmentCost += Math.ceil(payload.insuranceOptions.insuredValue / 100) * 0.99;
              }

              let carrierBalance = 0;
              const cRes = await axios.get(`${SHIPSTATION_API_URL}/carriers`, { headers: { 'Authorization': authHeader }});
              const carrier = cRes.data.find(c => c.code === carrierCode);
              if (carrier) carrierBalance = carrier.balance || 0;

              const deficit = shipmentCost - carrierBalance;
              const reloadAmount = Math.max(10, Math.ceil(deficit));

              await axios.post(`${SHIPSTATION_API_URL}/carriers/addfunds`, { carrierCode, amount: reloadAmount }, { headers: { 'Authorization': authHeader }});
              
              retries++;
              continue;
            } catch (autoFundErr) {
              const detail = autoFundErr.response?.data?.message || autoFundErr.message;
              console.error(`Auto-Fund failed for bulk sale ${saleId}:`, detail);
              break;
            }
          }
          
          console.error(`Failed to create label for sale ${saleId}:`, err.response?.data || err.message);
          break;
        }
      }
    }

    if (pdfBytesArray.length === 0) {
      return res.status(400).json({ success: false, error: "Failed to generate any new labels. They may already have labels or address validation failed." });
    }

    // Merge PDFs
    const mergedPdf = await PDFDocument.create();
    for (const base64Pdf of pdfBytesArray) {
      const pdfBytes = Buffer.from(base64Pdf, 'base64');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBase64 = await mergedPdf.saveAsBase64();
    const finalLabel = `data:application/pdf;base64,${mergedPdfBase64}`;

    res.status(200).json({ 
      success: true, 
      labelImage: finalLabel,
      updatedCount: updatedSales.length
    });

  } catch (error) {
    console.error('ShipStation Bulk Label Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Bulk print existing labels for multiple orders
 * @route   POST /api/shipping/bulk-print
 * @access  Private
 */
const bulkPrint = async (req, res) => {
  try {
    const { saleIds } = req.body;

    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      return res.status(400).json({ success: false, error: "No orders provided for bulk printing" });
    }

    const pdfBytesArray = [];
    const Sales = require('../models/Sale');

    for (const saleId of saleIds) {
      const sale = await Sales.findById(saleId);
      if (!sale || !sale.shipping?.labelImage) continue;

      let base64Pdf = sale.shipping.labelImage;
      if (base64Pdf.startsWith('data:application/pdf;base64,')) {
        base64Pdf = base64Pdf.replace('data:application/pdf;base64,', '');
      }
      pdfBytesArray.push(base64Pdf);
    }

    if (pdfBytesArray.length === 0) {
      return res.status(400).json({ success: false, error: "None of the selected orders have shipping labels to print." });
    }

    // Merge PDFs
    const mergedPdf = await PDFDocument.create();
    for (const base64Pdf of pdfBytesArray) {
      const pdfBytes = Buffer.from(base64Pdf, 'base64');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBase64 = await mergedPdf.saveAsBase64();
    const finalLabel = `data:application/pdf;base64,${mergedPdfBase64}`;

    res.status(200).json({ 
      success: true, 
      labelImage: finalLabel,
      printCount: pdfBytesArray.length
    });

  } catch (error) {
    console.error('ShipStation Bulk Print Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc    Scale a shipping label PDF by a given factor (default 1.06 = 106%)
 *          Bakes the scale into the PDF so it prints correctly at 100% in the print dialog.
 * @route   POST /api/shipping/scale-pdf
 * @access  Private
 */
const scaleLabel = async (req, res) => {
  try {
    const { labelBase64, scale = 1.06 } = req.body;
    if (!labelBase64) return res.status(400).json({ error: 'labelBase64 is required' });

    let base64 = labelBase64;
    if (base64.includes(',')) base64 = base64.split(',')[1];

    const pdfBytes = Buffer.from(base64, 'base64');
    const originalPdf = await PDFDocument.load(pdfBytes);
    const originalPage = originalPdf.getPages()[0];
    const { width, height } = originalPage.getSize();

    const newPdf = await PDFDocument.create();
    const [embedded] = await newPdf.embedPdf(pdfBytes, [0]);

    // Keep the same page dimensions but scale content up by `scale`.
    // Centered: content bleeds slightly at edges, which is fine for thermal labels.
    const newPage = newPdf.addPage([width, height]);
    const xOffset = (width * (1 - scale)) / 2;
    const yOffset = (height * (1 - scale)) / 2;
    newPage.drawPage(embedded, {
      x: xOffset,
      y: yOffset,
      width: width * scale,
      height: height * scale,
    });

    const scaledBytes = await newPdf.save();
    const scaledBase64 = Buffer.from(scaledBytes).toString('base64');
    res.json({ success: true, labelBase64: `data:application/pdf;base64,${scaledBase64}` });
  } catch (err) {
    console.error('scaleLabel error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getRates,
  createLabel,
  bulkLabel,
  bulkPrint,
  voidLabel,
  getWarehouses,
  getCarriers,
  getServices,
  getPackages,
  addFunds,
  scaleLabel
};
