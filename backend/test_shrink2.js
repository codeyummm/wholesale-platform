const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function test() {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);
    page.drawText('UDEAL INC. 12345', { x: 0, y: 580, size: 24 });
    page.drawText('THIS SHOULD NOT BE CUT OFF', { x: 380, y: 580, size: 10 });
    
    // In pdf-lib, to scale or translate existing content, we can embed the page into another page!
    const [embeddedPage] = await pdfDoc.embedPdf(await pdfDoc.save());
    
    const newPdf = await PDFDocument.create();
    const newPage = newPdf.addPage([400, 600]);
    
    newPage.drawPage(embeddedPage, {
      x: 400 * 0.025,
      y: 600 * 0.025,
      xScale: 0.95,
      yScale: 0.95,
    });

    const pdfBytes = await newPdf.save();
    fs.writeFileSync('test_shrink.pdf', pdfBytes);
    console.log('Success');
  } catch (err) {
    console.error(err);
  }
}
test();
