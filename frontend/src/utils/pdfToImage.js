import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to load from a reliable CDN to avoid Vite bundler issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const convertPdfToBase64Image = async (base64Pdf, scale = 2) => {
  try {
    // Decode base64 to Uint8Array
    const binaryString = atob(base64Pdf);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    
    // We assume shipping labels are 1 page.
    const page = await pdf.getPage(1);
    
    // Scale defines the resolution of the generated image. 2 is good for thermal printers.
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    
    // Return full base64 PNG data URI
    const dataUrl = canvas.toDataURL('image/png');
    return dataUrl;
  } catch (error) {
    console.error("Error converting PDF to image:", error);
    throw error;
  }
};
