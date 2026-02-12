const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

exports.scanLabel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // Save uploaded file temporarily
    const tempDir = path.join(__dirname, '../temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const tempFile = path.join(tempDir, `scan_${Date.now()}_${req.file.originalname}`);
    await fs.writeFile(tempFile, req.file.buffer);

    // Call Python OCR script
    const pythonScript = path.join(__dirname, '../scripts/scan.py');
    
    const python = spawn('python3', [pythonScript, tempFile, '--output', `${tempFile}.json`]);
    
    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', async (code) => {
      try {
        // Clean up temp image file
        await fs.unlink(tempFile).catch(() => {});

        if (code !== 0) {
          console.error('Python script error:', stderr);
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to process image',
            error: stderr 
          });
        }

        // Read the JSON result
        const resultFile = `${tempFile}.json`;
        const resultData = await fs.readFile(resultFile, 'utf-8');
        const result = JSON.parse(resultData);

        // Clean up result file
        await fs.unlink(resultFile).catch(() => {});

        res.json({
          success: true,
          data: result
        });

      } catch (err) {
        console.error('Error processing scan result:', err);
        res.status(500).json({ 
          success: false, 
          message: 'Failed to process scan result' 
        });
      }
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
};
