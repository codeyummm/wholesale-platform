const Tesseract = require('tesseract.js');
const Invoice = require('../models/Invoice');
const Supplier = require('../models/Supplier');
const Inventory = require('../models/Inventory');

const parseProductDescription = (description) => {
  const parts = description.split('/').map(p => p.trim()).filter(p => p);
  let brand='',model='',modelNumber='',color='',lockStatus='',storage='',grade='';
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (/^(apple|samsung|google|motorola|lg|oneplus|xiaomi|huawei|sony|nokia)$/i.test(part)) brand=part;
    else if (/iphone|galaxy|pixel|moto|redmi/i.test(part)) model=part;
    else if (/^[A-Z]{1,3}\d{3,4}[A-Z]?$/i.test(part)||/^SM-/i.test(part)||/^GG/i.test(part)) modelNumber=part;
    else if (/^\d+\s*(GB|TB)$/i.test(part)) storage=part;
    else if (/grade\s*\d/i.test(part)) grade=part;
    else if (/unlocked|locked|verizon|at&t|t-mobile|sprint/i.test(lower)){if(!lockStatus)lockStatus=part;}
    else if (/^(black|white|blue|red|green|purple|pink|gold|silver|gray|grey|midnight|starlight|graphite|sierra|alpine|pacific|coral|yellow|orange|cream|lavender|mint|porcelain)$/i.test(part)) color=part;
  }
  return {brand:brand||'Unknown',model:model||'',modelNumber:modelNumber||'',color:color||'',lockStatus:lockStatus||'',storage:storage||'',grade:grade||'',fullDescription:description};
};

const extractInvoiceData = (text) => {
  const parseNumber=(str)=>{if(!str)return null;const c=str.replace(/[,\s\$]/g,'');const n=parseFloat(c);return isNaN(n)?null:n;};
  const detectCurrency=(t)=>{if(t.includes('EUR'))return'EUR';if(t.includes('GBP'))return'GBP';if(t.includes('INR'))return'INR';return'USD';};
  const extractSupplier=(t)=>{const l=t.split('\n').filter(l=>l.trim().length>2);for(const line of l.slice(0,5)){if(/LLC|Inc|Corp|Ltd|Company/i.test(line.trim()))return line.trim();}return l[0]?.trim()||'Unknown Supplier';};
  const extractPhone=(t)=>{const m=t.match(/Phone\s*#?\s*:?\s*([\d\-\(\)\s]+)/i);return m?m[1].trim():'';};
  let invoiceNumber=null;
  const invMatch=text.match(/Invoice\s*#[:\s]*(\d+)/i);
  const orderMatch=text.match(/Order\s*#[:\s]*(\d+)/i);
  invoiceNumber=invMatch?invMatch[1]:(orderMatch?orderMatch[1]:null);
  let invoiceDate=null;
  const dateMatch=text.match(/([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/);
  if(dateMatch){const p=new Date(dateMatch[1]);if(!isNaN(p))invoiceDate=p;}
  const subtotalMatch=text.match(/Subtotal[:\s]*\$?([\d,]+\.?\d*)/i);
  const taxMatch=text.match(/Tax[:\s]*\$?([\d,]+\.?\d*)/i);
  const totalMatch=text.match(/Total[:\s]*\$?([\d,]+\.?\d*)/i);
  let subtotal=subtotalMatch?parseNumber(subtotalMatch[1]):null;
  let tax=taxMatch?parseNumber(taxMatch[1]):null;
  let totalAmount=totalMatch?parseNumber(totalMatch[1]):null;
  const products=[];const lines=text.split('\n');
  const priceLinePattern=/^(\d+)\$([\d,]+\.?\d{2})\$([\d,]+\.?\d{2})$/;
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();const priceMatch=line.match(priceLinePattern);
    if(priceMatch){const qty=parseInt(priceMatch[1])||1;const price=parseNumber(priceMatch[2])||0;const extPrice=parseNumber(priceMatch[3])||0;
      let description='',itemCode='';
      for(let j=i-1;j>=Math.max(0,i-5);j--){const prevLine=lines[j].trim();if(!prevLine)continue;
        if(/^[A-Z]\d+[\-\d\.]+\s*\.?\d*$/i.test(prevLine)){itemCode=prevLine;break;}
        if(prevLine.includes('/')||/Apple|iPhone|Samsung|Galaxy|Google|Pixel|Grade/i.test(prevLine))description=prevLine+' '+description;
        if(priceLinePattern.test(prevLine)||/^(Item|Description|Ship Qty|Price)/i.test(prevLine))break;}
      description=description.trim();
      if(description&&price>0){const parsed=parseProductDescription(description);
        products.push({itemCode,name:`${parsed.brand} ${parsed.model} ${parsed.storage} ${parsed.color}`.trim(),...parsed,quantity:qty,unitPrice:price,lineTotal:extPrice});}
    }
  }
  return {invoiceNumber,invoiceDate,supplierName:extractSupplier(text),supplierPhone:extractPhone(text),subtotal,tax,totalAmount:totalAmount||0,currency:detectCurrency(text),products,rawText:text};
};

const parsePDF=async(buffer)=>{const pdfParse=require('pdf-parse');const data=await pdfParse(buffer);return data.text;};

exports.scanInvoice = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({success:false,message:'No file uploaded'});
    let text='', imageBase64=null;

    // Always convert file to base64 for storage (images AND PDFs)
    imageBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    if (req.file.mimetype==='application/pdf') {
      text = await parsePDF(req.file.buffer);
    } else if (req.file.mimetype.startsWith('image/')) {
      const result = await Tesseract.recognize(req.file.buffer,'eng');
      text = result.data.text;
    } else {
      return res.status(400).json({success:false,message:'Unsupported file format.'});
    }

    if (!text||text.trim().length<10) return res.status(400).json({success:false,message:'Could not extract text from file.'});

    const extractedData = extractInvoiceData(text);
    const confidence = text.length>500?'high':text.length>100?'medium':'low';
    const existingSupplier = await Supplier.findOne({name:new RegExp(extractedData.supplierName,'i')});

    console.log('Scan complete. Image size:', imageBase64 ? `${(imageBase64.length/1024).toFixed(0)}KB` : 'none');

    res.json({success:true,message:'Invoice scanned successfully',data:{
      ...extractedData,
      confidence,
      imageUrl: imageBase64,
      existingSupplier:existingSupplier?{_id:existingSupplier._id,name:existingSupplier.name}:null,
      isNewSupplier:!existingSupplier
    }});
  } catch(error){console.error('Invoice scan error:',error);res.status(500).json({success:false,message:'Failed to scan invoice',error:error.message});}
};

exports.saveInvoice = async (req, res) => {
  try {
    const {invoiceNumber,invoiceDate,supplierName,supplierId,supplierPhone,products,subtotal,tax,totalAmount,currency,addToInventory,imageUrl}=req.body;

    console.log('=== SAVE INVOICE ===');
    console.log('Has imageUrl:', !!imageUrl, imageUrl ? `(${(imageUrl.length/1024).toFixed(0)}KB)` : '');

    let supplier=null;
    if (supplierId) supplier=await Supplier.findById(supplierId);
    if (!supplier&&supplierName) {
      supplier=await Supplier.findOne({name:new RegExp(`^${supplierName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
      if (!supplier) supplier=await Supplier.create({name:supplierName,contact:{phone:supplierPhone||''}});
    }

    const invoice=await Invoice.create({
      invoiceNumber:invoiceNumber||'N/A',
      invoiceDate:invoiceDate||new Date(),
      supplier:supplier?supplier._id:null,
      supplierName:supplier?supplier.name:supplierName,
      products:products||[],
      subtotal:subtotal||0, tax:tax||0, totalAmount:totalAmount||0,
      currency:currency||'USD',
      imageUrl:imageUrl||null,
      createdBy:req.user._id,
      status:'processed'
    });
    console.log('Invoice created:', invoice._id, 'imageUrl saved:', !!invoice.imageUrl);

    // Add to supplier embedded invoices + stats
    if (supplier) {
      try {
        await Supplier.findByIdAndUpdate(supplier._id, {
          $push:{invoices:{
            invoiceNumber:invoiceNumber||'N/A',
            invoiceDate:invoiceDate?new Date(invoiceDate):new Date(),
            totalAmount:totalAmount||0,
            imageUrl:imageUrl||null,
            items:(products||[]).map(p=>({model:p.model||p.name||'Unknown',brand:p.brand||'Unknown',quantity:p.quantity||1,unitPrice:p.unitPrice||0,imeis:p.imeis||[]})),
            createdAt:new Date()
          }},
          $inc:{totalInvoices:1,totalSpent:totalAmount||0}
        });
      } catch(err){console.error('Error adding invoice to supplier:',err.message);}
    }

    // Add to inventory with supplier ref
    if (addToInventory&&products&&products.length>0) {
      for (const product of products) {
        try {
          const modelName=`${product.brand||''} ${product.model||''}`.trim()||product.name||'Unknown';
          const brandName=product.brand||'Unknown';
          const storage=product.storage||'';const color=product.color||'';
          const costPrice=product.unitPrice||0;const retailPrice=Math.round(costPrice*1.2);
          const existingItem=await Inventory.findOne({model:modelName,brand:brandName,'specifications.storage':storage,'specifications.color':color});
          if (existingItem) {
            const newDevices=(product.imeis||[]).map(imei=>({imei,unlockStatus:product.lockStatus||'unlocked',condition:'new',grade:product.grade||'A'}));
            existingItem.quantity+=product.quantity||1;existingItem.price.cost=costPrice;existingItem.price.retail=retailPrice;
            if(newDevices.length>0)existingItem.devices.push(...newDevices);
            if(supplier){existingItem.supplier=supplier._id;existingItem.supplierName=supplier.name;}
            await existingItem.save();
          } else {
            const devices=(product.imeis||[]).map(imei=>({imei,unlockStatus:product.lockStatus||'unlocked',condition:'new',grade:product.grade||'A'}));
            await Inventory.create({model:modelName,brand:brandName,quantity:product.quantity||1,
              price:{cost:costPrice,retail:retailPrice},specifications:{storage,color},devices,
              supplier:supplier?supplier._id:null,supplierName:supplier?supplier.name:''});
          }
        } catch(invError){console.error('Inventory error:',invError.message);}
      }
    }

    res.status(201).json({success:true,message:'Invoice saved successfully',data:{invoice,supplier:supplier?{_id:supplier._id,name:supplier.name}:null}});
  } catch(error){console.error('Save invoice error:',error);res.status(500).json({success:false,message:'Failed to save invoice',error:error.message});}
};

exports.getInvoices = async (req, res) => {
  try {
    const page=parseInt(req.query.page)||1;const limit=parseInt(req.query.limit)||10;
    const query={createdBy:req.user._id};
    if(req.query.supplierId) query.supplier=req.query.supplierId;
    // Include imageUrl and products in response
    const invoices=await Invoice.find(query).populate('supplier','name').sort({createdAt:-1}).limit(limit).skip((page-1)*limit);
    const total=await Invoice.countDocuments(query);
    res.json({success:true,data:invoices,pagination:{page,limit,total,pages:Math.ceil(total/limit)}});
  } catch(error){res.status(500).json({success:false,message:'Failed to fetch invoices',error:error.message});}
};

exports.getInvoice = async (req, res) => {
  try {
    const invoice=await Invoice.findOne({_id:req.params.id,createdBy:req.user._id}).populate('supplier','name');
    if(!invoice) return res.status(404).json({success:false,message:'Invoice not found'});
    res.json({success:true,data:invoice});
  } catch(error){res.status(500).json({success:false,message:'Failed to fetch invoice',error:error.message});}
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice=await Invoice.findOneAndDelete({_id:req.params.id,createdBy:req.user._id});
    if(!invoice) return res.status(404).json({success:false,message:'Invoice not found'});
    res.json({success:true,message:'Invoice deleted successfully'});
  } catch(error){res.status(500).json({success:false,message:'Failed to delete invoice',error:error.message});}
};
