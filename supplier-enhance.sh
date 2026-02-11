#!/bin/bash
echo "🚀 Supplier Enhancement - Part 1: Backend"

# === Invoice Model ===
cat > backend/models/Invoice.js << 'EOF'
const mongoose = require('mongoose');
const ProductSchema = new mongoose.Schema({
  itemCode: String, name: String, brand: String, model: String, modelNumber: String,
  color: String, lockStatus: String, storage: String, grade: String, fullDescription: String,
  quantity: { type: Number, default: 1 }, unitPrice: { type: Number, default: 0 },
  lineTotal: { type: Number, default: 0 }, imeis: [String]
});
const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, index: true },
  invoiceDate: Date,
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String, required: true },
  products: [ProductSchema],
  subtotal: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD', enum: ['USD','EUR','GBP','CAD','AUD','INR','JPY','CHF'] },
  status: { type: String, enum: ['pending','processed','verified','rejected'], default: 'pending' },
  imageUrl: String,
  rawText: String,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
InvoiceSchema.index({ invoiceNumber: 'text', supplierName: 'text' });
InvoiceSchema.index({ supplier: 1, createdAt: -1 });
module.exports = mongoose.model('Invoice', InvoiceSchema);
EOF
echo "✅ Invoice model"

# === Supplier Model ===
cat > backend/models/Supplier.js << 'EOF'
const mongoose = require('mongoose');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  contact: { email: { type: String, trim: true }, phone: { type: String }, alternatePhone: String },
  address: { street: String, city: String, state: String, zipCode: String, country: { type: String, default: 'USA' } },
  invoices: [{
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    totalAmount: { type: Number, required: true },
    items: [{ model: String, brand: String, quantity: Number, unitPrice: Number, imeis: [String] }],
    notes: String, fileUrl: String, imageUrl: String,
    createdAt: { type: Date, default: Date.now }
  }],
  totalInvoices: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  rating: { type: Number, min: 1, max: 5, default: 5 },
  notes: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
supplierSchema.index({ name: 'text' });
module.exports = mongoose.model('Supplier', supplierSchema);
EOF
echo "✅ Supplier model"

# === Add supplier ref to Inventory model ===
python3 -c "
with open('backend/models/Inventory.js','r') as f: c=f.read()
if 'supplierName' not in c:
    old='}, { timestamps: true })'
    new='  supplier: { type: mongoose.Schema.Types.ObjectId, ref: \"Supplier\" },\n  supplierName: { type: String, default: \"\" },\n}, { timestamps: true })'
    if old in c:
        c=c.replace(old,new)
        with open('backend/models/Inventory.js','w') as f: f.write(c)
        print('✅ Inventory model updated')
    else: print('⚠️  Manual update needed for Inventory model')
else: print('✅ Inventory model already has supplier fields')
"

echo "✅ Part 1 Backend models done"
#!/bin/bash
echo "🚀 Supplier Enhancement - Part 2: Invoice Controller"

cat > backend/controllers/invoiceController.js << 'EOF'
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
    if (req.file.mimetype==='application/pdf') { text=await parsePDF(req.file.buffer); }
    else if (req.file.mimetype.startsWith('image/')) {
      const result=await Tesseract.recognize(req.file.buffer,'eng'); text=result.data.text;
      imageBase64=`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else return res.status(400).json({success:false,message:'Unsupported file format.'});
    if (!text||text.trim().length<10) return res.status(400).json({success:false,message:'Could not extract text from file.'});
    const extractedData=extractInvoiceData(text);
    const confidence=text.length>500?'high':text.length>100?'medium':'low';
    const existingSupplier=await Supplier.findOne({name:new RegExp(extractedData.supplierName,'i')});
    res.json({success:true,message:'Invoice scanned successfully',data:{
      ...extractedData,confidence,imageUrl:imageBase64,
      existingSupplier:existingSupplier?{_id:existingSupplier._id,name:existingSupplier.name}:null,
      isNewSupplier:!existingSupplier
    }});
  } catch(error){console.error('Invoice scan error:',error);res.status(500).json({success:false,message:'Failed to scan invoice',error:error.message});}
};

exports.saveInvoice = async (req, res) => {
  try {
    const {invoiceNumber,invoiceDate,supplierName,supplierId,supplierPhone,products,subtotal,tax,totalAmount,currency,addToInventory,imageUrl}=req.body;
    let supplier=null;
    if (supplierId) supplier=await Supplier.findById(supplierId);
    if (!supplier&&supplierName) {
      supplier=await Supplier.findOne({name:new RegExp(`^${supplierName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
      if (!supplier) supplier=await Supplier.create({name:supplierName,contact:{phone:supplierPhone||''}});
    }
    const invoice=await Invoice.create({
      invoiceNumber:invoiceNumber||'N/A',invoiceDate:invoiceDate||new Date(),
      supplier:supplier?supplier._id:null,supplierName:supplier?supplier.name:supplierName,
      products:products||[],subtotal:subtotal||0,tax:tax||0,totalAmount:totalAmount||0,
      currency:currency||'USD',imageUrl:imageUrl||null,createdBy:req.user._id,status:'processed'
    });
    // Add to supplier embedded invoices + stats
    if (supplier) {
      try {
        await Supplier.findByIdAndUpdate(supplier._id, {
          $push:{invoices:{invoiceNumber:invoiceNumber||'N/A',invoiceDate:invoiceDate?new Date(invoiceDate):new Date(),
            totalAmount:totalAmount||0,imageUrl:imageUrl||null,
            items:(products||[]).map(p=>({model:p.model||p.name||'Unknown',brand:p.brand||'Unknown',quantity:p.quantity||1,unitPrice:p.unitPrice||0,imeis:p.imeis||[]})),
            createdAt:new Date()}},
          $inc:{totalInvoices:1,totalSpent:totalAmount||0}
        });
      } catch(err){console.error('Error adding invoice to supplier:',err.message);}
    }
    // Add to inventory with supplier ref
    if (addToInventory&&products&&products.length>0) {
      for (const product of products) {
        try {
          const modelName=`${product.brand||''} ${product.model||''}`.trim()||product.name||'Unknown';
          const brandName=product.brand||'Unknown';const storage=product.storage||'';const color=product.color||'';
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
EOF

echo "✅ Invoice controller done"
#!/bin/bash
echo "🚀 Supplier Enhancement - Part 3: InvoiceScanner"

cat > frontend/src/components/InvoiceScanner.jsx << 'EOF'
import { useState, useCallback } from 'react';
import { Upload, FileText, Camera, Loader2, Check, Save, Plus, Trash2, AlertCircle, X, Calendar, Hash, Building, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';

const InvoiceScanner = ({ onScanComplete, supplierId = null, supplierName = null }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [addToInventory, setAddToInventory] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState({});

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null); setExtractedData(null); setError(null); }
  };
  const handleDrop = useCallback((e) => {
    e.preventDefault(); const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null); setExtractedData(null); setError(null); }
  }, []);
  const handleDragOver = (e) => e.preventDefault();

  const handleScan = async () => {
    if (!file) return; setScanning(true); setError(null);
    try {
      const formData = new FormData(); formData.append('invoice', file);
      const response = await api.post('/invoices/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        const data = response.data.data;
        if (supplierName) data.supplierName = supplierName;
        setExtractedData(data);
      } else setError(response.data.message || 'Scan failed');
    } catch (err) { setError(err.response?.data?.message || 'Failed to scan invoice'); }
    finally { setScanning(false); }
  };

  const handleSave = async () => {
    if (!extractedData) return; setSaving(true); setError(null);
    try {
      const response = await api.post('/invoices/save', { ...extractedData, supplierId: supplierId || extractedData.existingSupplier?._id || null, addToInventory });
      if (response.data.success) { if (onScanComplete) onScanComplete(response.data.data); handleReset(); }
      else setError(response.data.message || 'Save failed');
    } catch (err) { setError(err.response?.data?.message || 'Failed to save invoice'); }
    finally { setSaving(false); }
  };

  const updateField = (field, value) => setExtractedData(prev => ({ ...prev, [field]: value }));
  const updateProduct = (index, field, value) => {
    setExtractedData(prev => {
      const np = [...prev.products]; np[index] = { ...np[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        np[index].lineTotal = (np[index].quantity || 0) * (np[index].unitPrice || 0);
        if (field === 'quantity') { const q = parseInt(value) || 1; const ci = np[index].imeis || []; const ni = []; for (let i = 0; i < q; i++) ni.push(ci[i] || '555500000000000'); np[index].imeis = ni; }
      }
      return { ...prev, products: np };
    });
  };
  const updateImei = (pi, ii, v) => {
    setExtractedData(prev => { const np = [...prev.products]; const ni = [...(np[pi].imeis || [])]; ni[ii] = v; np[pi].imeis = ni; return { ...prev, products: np }; });
  };
  const addProduct = () => {
    setExtractedData(prev => ({ ...prev, products: [...(prev.products || []), { name: '', brand: '', model: '', modelNumber: '', color: '', lockStatus: 'Unlocked', storage: '', grade: '', quantity: 1, unitPrice: 0, lineTotal: 0, imeis: ['555500000000000'] }] }));
  };
  const removeProduct = (i) => { setExtractedData(prev => ({ ...prev, products: prev.products.filter((_, idx) => idx !== i) })); };
  const toggleProductExpand = (i) => { setExpandedProducts(prev => ({ ...prev, [i]: !prev[i] })); };
  const handleReset = () => { setFile(null); setPreview(null); setExtractedData(null); setError(null); setExpandedProducts({}); };
  const getCC = (c) => { switch (c) { case 'high': return { bg: '#dcfce7', text: '#166534' }; case 'medium': return { bg: '#fef9c3', text: '#854d0e' }; default: return { bg: '#fee2e2', text: '#991b1b' }; } };
  const fid = `file-input-${supplierId || 'global'}`;

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '2px' }}>
      <div style={{ background: '#ffffff', borderRadius: '14px', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '10px', borderRadius: '10px' }}><FileText size={22} color="white" /></div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#1f2937' }}>Invoice Scanner</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>{supplierName ? `Scanning for ${supplierName}` : 'AI-powered data extraction'}</p>
          </div>
        </div>
        {error && (<div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', marginBottom: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
          <AlertCircle size={18} color="#dc2626" /><span style={{ color: '#dc2626', fontSize: '0.85rem', flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#dc2626" /></button>
        </div>)}
        <div style={{ display: 'grid', gridTemplateColumns: extractedData ? '280px 1fr' : '1fr', gap: '20px' }}>
          <div>
            <div onDrop={handleDrop} onDragOver={handleDragOver}
              style={{ border: `2px dashed ${file ? '#22c55e' : '#d1d5db'}`, borderRadius: '10px', padding: '24px 16px', textAlign: 'center', background: file ? '#f0fdf4' : '#fafafa', cursor: 'pointer' }}
              onClick={() => !file && document.getElementById(fid).click()}>
              {file ? (<div>
                {preview ? <img src={preview} alt="Preview" style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '6px', marginBottom: '10px' }} /> :
                  <div style={{ background: '#e0e7ff', padding: '14px', borderRadius: '10px', display: 'inline-block', marginBottom: '10px' }}><FileText size={36} color="#6366f1" /></div>}
                <p style={{ fontWeight: '600', color: '#166534', marginBottom: '2px', fontSize: '0.85rem' }}>{file.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{(file.size / 1024).toFixed(1)} KB</p>
                <button onClick={(e) => { e.stopPropagation(); handleReset(); }} style={{ marginTop: '8px', padding: '5px 12px', background: 'white', border: '1px solid #d1d5db', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}>Change</button>
              </div>) : (<div>
                <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '12px', borderRadius: '50%', display: 'inline-block', marginBottom: '10px' }}><Upload size={24} color="white" /></div>
                <p style={{ fontWeight: '600', color: '#374151', marginBottom: '4px', fontSize: '0.9rem' }}>Drop invoice here</p>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>PDF, JPG, PNG</p>
              </div>)}
              <input id={fid} type="file" accept=".pdf,image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </div>
            <button onClick={handleScan} disabled={!file || scanning}
              style={{ width: '100%', marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: 'none', background: !file || scanning ? '#e5e7eb' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: !file || scanning ? '#9ca3af' : 'white', fontSize: '0.9rem', fontWeight: '600', cursor: !file || scanning ? 'not-allowed' : 'pointer' }}>
              {scanning ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Scanning...</> : <><Camera size={16} /> Scan Invoice</>}
            </button>
            {extractedData?.isNewSupplier && !supplierId && (<div style={{ marginTop: '12px', padding: '10px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', fontWeight: '500' }}>New Supplier</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#a16207' }}>"{extractedData.supplierName}" will be created</p>
            </div>)}
          </div>
          {extractedData && (<div style={{ background: '#f9fafb', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '500', background: getCC(extractedData.confidence).bg, color: getCC(extractedData.confidence).text }}>
                {extractedData.confidence === 'high' && <Check size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />}{extractedData.confidence}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <Building size={12} color="#6b7280" />
                <input type="text" value={extractedData.supplierName || ''} onChange={(e) => updateField('supplierName', e.target.value)} readOnly={!!supplierName}
                  style={{ border: 'none', outline: 'none', fontSize: '0.8rem', fontWeight: '500', width: '120px', background: supplierName ? '#f3f4f6' : 'white' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <Hash size={12} color="#6b7280" />
                <input type="text" value={extractedData.invoiceNumber || ''} onChange={(e) => updateField('invoiceNumber', e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.8rem', fontWeight: '500', width: '60px' }} placeholder="Inv #" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <Calendar size={12} color="#6b7280" />
                <input type="date" value={extractedData.invoiceDate ? new Date(extractedData.invoiceDate).toISOString().split('T')[0] : ''} onChange={(e) => updateField('invoiceDate', e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '0.8rem' }} />
              </div>
            </div>
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.85rem' }}>Products ({extractedData.products?.length || 0})</span>
                <button onClick={addProduct} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '0.75rem' }}><Plus size={12} /> Add</button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {extractedData.products?.map((product, index) => (
                  <div key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: index % 2 === 0 ? 'white' : '#fafafa' }} onClick={() => toggleProductExpand(index)}>
                      {expandedProducts[index] ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
                      <span style={{ flex: 1, fontWeight: '500', fontSize: '0.85rem', color: '#1f2937' }}>{product.brand} {product.model} {product.storage} {product.color}</span>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>x{product.quantity}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#059669' }}>${(product.lineTotal || 0).toFixed(2)}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeProduct(index); }} style={{ background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}><Trash2 size={14} color="#dc2626" /></button>
                    </div>
                    {expandedProducts[index] && (<div style={{ padding: '12px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        {['brand', 'model', 'color', 'storage'].map(f => (<div key={f}><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px', textTransform: 'capitalize' }}>{f}</label><input type="text" value={product[f] || ''} onChange={(e) => updateProduct(index, f, e.target.value)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                        <div><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Lock Status</label><input type="text" value={product.lockStatus || ''} onChange={(e) => updateProduct(index, 'lockStatus', e.target.value)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>
                        <div><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Grade</label><input type="text" value={product.grade || ''} onChange={(e) => updateProduct(index, 'grade', e.target.value)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>
                        <div><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Qty</label><input type="number" value={product.quantity || 1} onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>
                        <div><label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Unit Price</label><input type="number" step="0.01" value={product.unitPrice || 0} onChange={(e) => updateProduct(index, 'unitPrice', parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '5px 7px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.8rem' }} /></div>
                      </div>
                      <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '8px' }}>IMEIs ({product.quantity} devices)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                          {(product.imeis || []).map((imei, ii) => (<div key={ii} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '0.7rem', color: '#6b7280', minWidth: '20px' }}>{ii + 1}.</span><input type="text" value={imei} onChange={(e) => updateImei(index, ii, e.target.value)} placeholder="Enter IMEI" style={{ flex: 1, padding: '5px 7px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }} /></div>))}
                        </div>
                      </div>
                    </div>)}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Subtotal</label>
                <input type="number" step="0.01" value={extractedData.subtotal || ''} onChange={(e) => updateField('subtotal', parseFloat(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.9rem', fontWeight: '600' }} />
              </div>
              <div style={{ background: 'white', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '0.65rem', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Tax</label>
                <input type="number" step="0.01" value={extractedData.tax || ''} onChange={(e) => updateField('tax', parseFloat(e.target.value))} style={{ width: '100%', padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '0.9rem', fontWeight: '600' }} />
              </div>
              <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '10px', borderRadius: '6px' }}>
                <label style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', display: 'block', marginBottom: '2px' }}>Total</label>
                <input type="number" step="0.01" value={extractedData.totalAmount || ''} onChange={(e) => updateField('totalAmount', parseFloat(e.target.value))} style={{ width: '100%', padding: '6px', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: '700', background: 'rgba(255,255,255,0.9)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}><input type="checkbox" checked={addToInventory} onChange={(e) => setAddToInventory(e.target.checked)} style={{ width: '14px', height: '14px', accentColor: '#6366f1' }} /><span style={{ fontSize: '0.8rem', color: '#374151' }}>Add to inventory</span></label>
              <div style={{ flex: 1 }} />
              <button onClick={handleReset} style={{ padding: '8px 16px', background: 'white', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', border: 'none', borderRadius: '6px', background: saving ? '#d1d5db' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={14} /> Save Invoice</>}
              </button>
            </div>
          </div>)}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};
export default InvoiceScanner;
EOF

echo "✅ InvoiceScanner done"
#!/bin/bash
echo "🚀 Supplier Enhancement - Part 4: SupplierList"

cat > frontend/src/components/Suppliers/SupplierList.jsx << 'EOF'
import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import InvoiceScanner from '../InvoiceScanner';
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, X, Save, FileText, Package, DollarSign, Eye, Building, Star, Camera, ArrowLeft } from 'lucide-react';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', contact: { email: '', phone: '', alternatePhone: '' }, address: { street: '', city: '', state: '', zipCode: '' }, notes: '', rating: 5 });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [activeTab, setActiveTab] = useState('invoices');
  const [supplierInvoices, setSupplierInvoices] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);

  useEffect(() => { fetchSuppliers(); }, [search]);

  const fetchSuppliers = async () => {
    try { const res = await api.get(`/suppliers?search=${search}`); setSuppliers(res.data.data || []); }
    catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const openSupplier = async (supplier) => {
    setSelectedSupplier(supplier); setActiveTab('invoices'); fetchInvoicesFor(supplier._id);
  };

  const fetchInvoicesFor = async (sid) => {
    setLoadingDetail(true);
    try { const res = await api.get(`/invoices?supplierId=${sid}&limit=100`); setSupplierInvoices(res.data.data || []); }
    catch (err) { console.error(err); } finally { setLoadingDetail(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) await api.put(`/suppliers/${editingId}`, formData);
      else await api.post('/suppliers', formData);
      setShowModal(false); setEditingId(null); resetForm(); fetchSuppliers();
    } catch (err) { alert('Failed: ' + (err.response?.data?.message || err.message)); }
  };

  const handleEdit = (supplier, e) => {
    if (e) e.stopPropagation(); setEditingId(supplier._id);
    setFormData({ name: supplier.name || '', contact: supplier.contact || { email: '', phone: '', alternatePhone: '' }, address: supplier.address || { street: '', city: '', state: '', zipCode: '' }, notes: supplier.notes || '', rating: supplier.rating || 5 });
    setShowModal(true);
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this supplier?')) return;
    try { await api.delete(`/suppliers/${id}`); if (selectedSupplier?._id === id) setSelectedSupplier(null); fetchSuppliers(); }
    catch (err) { alert('Failed to delete'); }
  };

  const resetForm = () => { setFormData({ name: '', contact: { email: '', phone: '', alternatePhone: '' }, address: { street: '', city: '', state: '', zipCode: '' }, notes: '', rating: 5 }); };

  const handleScanComplete = () => {
    fetchInvoicesFor(selectedSupplier._id); fetchSuppliers();
    api.get(`/suppliers/${selectedSupplier._id}`).then(res => { if (res.data.success) setSelectedSupplier(res.data.data); });
  };

  // === MODAL ===
  const renderModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', maxWidth: '550px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{editingId ? 'Edit' : 'Add'} Supplier</h2>
          <button onClick={() => { setShowModal(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={22} color="#64748b" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Company Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} /></div>
            <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Phone *</label>
              <input type="tel" required value={formData.contact.phone} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, phone: e.target.value } })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} /></div>
            <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Email</label>
              <input type="email" value={formData.contact.email} onChange={(e) => setFormData({ ...formData, contact: { ...formData.contact, email: e.target.value } })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} /></div>
            <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>City</label>
              <input type="text" value={formData.address.city} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} /></div>
            <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>State</label>
              <input type="text" value={formData.address.state} onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} /></div>
            <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Rating</label>
              <select value={formData.rating} onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white' }}>
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
              </select></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '4px', color: '#334155' }}>Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows="2" style={{ width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', resize: 'vertical' }} /></div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
            <button type="submit" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}><Save size={16} /> {editingId ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  // === SUPPLIER DETAIL ===
  if (selectedSupplier) {
    const s = selectedSupplier;
    return (<div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setSelectedSupplier(null)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', color: '#64748b', fontSize: '13px' }}><ArrowLeft size={16} /> Back</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 2px' }}>{s.name}</h1>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
            {s.contact?.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} /> {s.contact.phone}</span>}
            {s.contact?.email && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={13} /> {s.contact.email}</span>}
            {s.address?.city && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> {s.address.city}{s.address.state ? `, ${s.address.state}` : ''}</span>}
          </div>
        </div>
        <button onClick={(e) => handleEdit(s, e)} style={{ padding: '8px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}><Edit size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} /> Edit</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Invoices', value: s.totalInvoices || s.invoices?.length || 0, icon: FileText, color: '#6366f1', bg: '#eef2ff' },
          { label: 'Total Spent', value: `$${(s.totalSpent || 0).toLocaleString()}`, icon: DollarSign, color: '#10b981', bg: '#ecfdf5' },
          { label: 'Rating', value: `${s.rating || 5}/5`, icon: Star, color: '#f59e0b', bg: '#fffbeb' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><c.icon size={18} color={c.color} /></div>
            <div><div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>{c.value}</div><div style={{ fontSize: '11px', color: '#94a3b8' }}>{c.label}</div></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
        {[{ id: 'invoices', label: 'Invoices', icon: FileText }, { id: 'scan', label: 'Scan Invoice', icon: Camera }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'none', border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #6366f1' : '2px solid transparent',
              color: activeTab === tab.id ? '#6366f1' : '#64748b', fontWeight: activeTab === tab.id ? '600' : '400',
              cursor: 'pointer', fontSize: '13px', marginBottom: '-2px' }}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'scan' && <InvoiceScanner supplierId={selectedSupplier._id} supplierName={selectedSupplier.name} onScanComplete={handleScanComplete} />}

      {activeTab === 'invoices' && (<div>
        {loadingDetail ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>Loading invoices...</div>
        ) : supplierInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <FileText size={40} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', marginBottom: '16px' }}>No invoices for this supplier yet</p>
            <button onClick={() => setActiveTab('scan')} style={{ background: '#6366f1', color: 'white', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500' }}>Scan First Invoice</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {supplierInvoices.map((inv) => (
              <div key={inv._id} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
                {/* Image thumbnail */}
                <div onClick={() => inv.imageUrl && setViewingImage(inv.imageUrl)}
                  style={{ width: '56px', height: '56px', borderRadius: '8px', background: inv.imageUrl ? 'transparent' : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden',
                    cursor: inv.imageUrl ? 'pointer' : 'default', border: '1px solid #e2e8f0' }}>
                  {inv.imageUrl ? <img src={inv.imageUrl} alt="Invoice" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileText size={22} color="#94a3b8" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>#{inv.invoiceNumber || 'N/A'}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500', background: '#ecfdf5', color: '#059669' }}>{inv.status}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {inv.products?.length || 0} products · {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>${inv.totalAmount?.toFixed(2) || '0.00'}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{inv.currency || 'USD'}</div>
                </div>
                {inv.imageUrl && <button onClick={() => setViewingImage(inv.imageUrl)} style={{ padding: '6px', background: '#f5f3ff', border: 'none', borderRadius: '6px', cursor: 'pointer' }} title="View original"><Eye size={16} color="#8b5cf6" /></button>}
              </div>
            ))}
          </div>
        )}
      </div>)}

      {/* Image Viewer */}
      {viewingImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '2rem' }} onClick={() => setViewingImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewingImage(null)} style={{ position: 'absolute', top: '-16px', right: '-16px', width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 101 }}><X size={18} /></button>
            <img src={viewingImage} alt="Invoice" style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: '12px', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      {showModal && renderModal()}
    </div>);
  }

  // === SUPPLIER LIST ===
  return (<div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>Suppliers</h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Manage suppliers, invoices, and purchase history</p>
      </div>
      <button onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #4338ca, #6366f1)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '500', fontSize: '14px' }}>
        <Plus size={18} /> Add Supplier
      </button>
    </div>

    <div style={{ marginBottom: '20px', position: 'relative' }}>
      <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
      <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 10px 10px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }} />
    </div>

    {loading ? (
      <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>Loading...</div>
    ) : suppliers.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <Building size={48} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: '#64748b', marginBottom: '16px' }}>No suppliers found</p>
        <button onClick={() => { resetForm(); setEditingId(null); setShowModal(true); }} style={{ background: '#6366f1', color: 'white', padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Add First Supplier</button>
      </div>
    ) : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {suppliers.map((supplier) => (
          <div key={supplier._id} onClick={() => openSupplier(supplier)}
            style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Building size={20} color="#4338ca" /></div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{supplier.name}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                    {Array.from({ length: 5 }).map((_, i) => (<Star key={i} size={12} fill={i < (supplier.rating || 5) ? '#f59e0b' : 'none'} color={i < (supplier.rating || 5) ? '#f59e0b' : '#e2e8f0'} />))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => handleEdit(supplier, e)} style={{ padding: '6px', background: '#eef2ff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Edit size={14} color="#4338ca" /></button>
                <button onClick={(e) => handleDelete(supplier._id, e)} style={{ padding: '6px', background: '#fef2f2', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={14} color="#dc2626" /></button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px', fontSize: '12px', color: '#64748b' }}>
              {supplier.contact?.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={12} /> {supplier.contact.phone}</div>}
              {supplier.contact?.email && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={12} /> {supplier.contact.email}</div>}
              {supplier.address?.city && <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={12} /> {supplier.address.city}{supplier.address.state ? `, ${supplier.address.state}` : ''}</div>}
            </div>
            <div style={{ display: 'flex', gap: '12px', padding: '10px 0', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <FileText size={13} color="#6366f1" />
                <span style={{ fontWeight: '600', color: '#334155' }}>{supplier.totalInvoices || supplier.invoices?.length || 0}</span>
                <span style={{ color: '#94a3b8' }}>invoices</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <DollarSign size={13} color="#10b981" />
                <span style={{ fontWeight: '600', color: '#334155' }}>${(supplier.totalSpent || 0).toLocaleString()}</span>
                <span style={{ color: '#94a3b8' }}>total</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
    {showModal && renderModal()}
  </div>);
}
EOF

echo "✅ SupplierList done"

echo ""
echo "============================================"
echo "✅ SUPPLIER ENHANCEMENT COMPLETE!"
echo "============================================"
echo ""
echo "Changes made:"
echo "  backend/models/Invoice.js      → Added imageUrl, supplier index"
echo "  backend/models/Supplier.js     → Added totalInvoices, totalSpent, imageUrl"
echo "  backend/models/Inventory.js    → Added supplier, supplierName fields"
echo "  backend/controllers/invoiceController.js → Image storage, supplier filter"
echo "  frontend/src/components/InvoiceScanner.jsx → Supplier-aware scanning"
echo "  frontend/src/components/Suppliers/SupplierList.jsx → Full tabbed redesign"
echo ""
echo "Features:"
echo "  ✅ Supplier cards with invoice count, total spent, rating stars"
echo "  ✅ Click supplier → detail view with tabs"
echo "  ✅ Invoices tab → all invoices with image thumbnails"
echo "  ✅ Scan Invoice tab → scan directly under this supplier"
echo "  ✅ Invoice images stored (base64) and viewable (click to enlarge)"
echo "  ✅ Supplier name linked to inventory items"
echo "  ✅ Add/Edit/Delete suppliers with improved form"
echo ""
echo "Next steps:"
echo "  1. Restart backend: killall -9 node && cd backend && npm start"
echo "  2. Frontend should auto-reload"
echo "  3. Click any supplier → see Invoices & Scan tabs"
echo ""
