require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { uploadLocalFile } = require('../utils/storage');

const backupDir = path.join(__dirname, '..', 'temp_backup');
const archiveName = `backup-${Date.now()}.tar.gz`;
const archivePath = path.join(__dirname, '..', archiveName);

async function runBackup() {
  try {
    console.log('Starting Doomsday Backup...');

    // 1. Create temp directory
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    fs.mkdirSync(backupDir);

    // 2. Dump MongoDB database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found in .env');
    
    console.log('Dumping database...');
    execSync(`mongodump --uri="${mongoUri}" --out="${backupDir}/db_dump"`);

    // 3. Copy .env file (CRITICAL for doomsday restore)
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      fs.copyFileSync(envPath, path.join(backupDir, '.env.backup'));
    }

    // 4. Compress to tar.gz
    console.log('Compressing backup...');
    execSync(`tar -czf ${archivePath} -C ${backupDir} .`);

    // 5. Upload to DO Spaces
    console.log('Uploading to DigitalOcean Spaces...');
    const uploadedUrl = await uploadLocalFile(archivePath, `backups/${archiveName}`, false);

    console.log(`Backup completed successfully! Stored at: ${uploadedUrl}`);

  } catch (error) {
    console.error('Backup failed:', error);
  } finally {
    // Cleanup local files
    if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  }
}

// Allow running directly from command line
if (require.main === module) {
  runBackup().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runBackup;
