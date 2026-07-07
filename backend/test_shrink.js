const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function test() {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 600]);
    page.drawText('UDEAL INC. 12345', { x: 0, y: 580, size: 24 });
    page.drawText('THIS SHOULD NOT BE CUT OFF', { x: 380, y: 580, size: 10 });
    
    // Scale content down by 5% to fit inside margins
    page.scale(0.95, 0.95);
    // Translate slightly to center
    // If we scale by 0.95, we lose 5% of width/height. To center, we move it right/up by 2.5%
    page.translate(400 * 0.025, 600 * 0.025);

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync('test_shrink.pdf', pdfBytes);
    console.log('Success');
  } catch (err) {
    console.error(err);
  }
}
test();
