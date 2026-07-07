const mongoose = require('mongoose');
const Sale = require('./models/Sale');
const { PDFDocument } = require('pdf-lib');
require('dotenv').config();

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sale = await Sale.findOne({ saleNumber: 'SL202606-0037' });
  
  if (sale && sale.shipping && sale.shipping.labelImage) {
    console.log('Found label, shrinking...');
    const base64Data = sale.shipping.labelImage.split(',')[1];
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    
    const finalPdf = await PDFDocument.create();
    const embeddedPages = await finalPdf.embedPdf(pdfBuffer);
    
    // We only need the first page, or all pages
    const originalPdf = await PDFDocument.load(pdfBuffer);
    const originalPages = originalPdf.getPages();

    for (let i = 0; i < embeddedPages.length; i++) {
        const embeddedPage = embeddedPages[i];
        const { width, height } = originalPages[i].getSize();
        
        const page = finalPdf.addPage([width, height]);
        const scale = 0.92;
        page.drawPage(embeddedPage, {
          x: width * ((1 - scale) / 2),
          y: height * ((1 - scale) / 2),
          xScale: scale,
          yScale: scale,
        });
    }

    const newBase64 = await finalPdf.saveAsBase64();
    sale.shipping.labelImage = `data:application/pdf;base64,${newBase64}`;
    await sale.save();
    console.log('Shrunk and saved!');
  } else {
    console.log('Label not found on sale');
  }
  
  mongoose.disconnect();
}
fix();
