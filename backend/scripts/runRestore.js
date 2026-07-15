require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { s3Client } = require('../utils/storage');
const { ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');

const backupDir = path.join(__dirname, '..', 'temp_restore');
const archivePath = path.join(__dirname, '..', 'downloaded_backup.tar.gz');

const DO_SPACES_BUCKET = process.env.DO_SPACES_BUCKET;

async function getLatestBackupKey() {
  const command = new ListObjectsV2Command({
    Bucket: DO_SPACES_BUCKET,
    Prefix: 'backups/'
  });

  const response = await s3Client.send(command);
  if (!response.Contents || response.Contents.length === 0) {
    throw new Error('No backups found in DigitalOcean Spaces.');
  }

  // Sort by LastModified descending
  const sorted = response.Contents.sort((a, b) => b.LastModified - a.LastModified);
  return sorted[0].Key; // Return the most recent backup
}

async function runRestore(targetKey = null) {
  try {
    console.log('Starting Doomsday Restore...');

    const keyToRestore = targetKey || await getLatestBackupKey();
    console.log(`Downloading backup: ${keyToRestore}`);

    const getCommand = new GetObjectCommand({
      Bucket: DO_SPACES_BUCKET,
      Key: keyToRestore
    });

    const { Body } = await s3Client.send(getCommand);
    
    // Pipe the response body to a file
    const fileStream = fs.createWriteStream(archivePath);
    await new Promise((resolve, reject) => {
      if (Body instanceof Readable) {
        Body.pipe(fileStream).on('finish', resolve).on('error', reject);
      } else {
        reject(new Error('S3 Body is not a readable stream'));
      }
    });

    console.log('Extracting backup...');
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    fs.mkdirSync(backupDir);
    
    execSync(`tar -xzf ${archivePath} -C ${backupDir}`);

    console.log('Restoring Database...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found in .env');

    // Run mongorestore. --drop ensures the current DB is wiped and replaced exactly
    execSync(`mongorestore --uri="${mongoUri}" --drop ${backupDir}/db_dump`);

    console.log('Restoring Environment Variables...');
    const envBackupPath = path.join(backupDir, '.env.backup');
    if (fs.existsSync(envBackupPath)) {
      fs.copyFileSync(envBackupPath, path.join(__dirname, '..', '.env.restored'));
      console.log('Restored .env file saved as .env.restored (Review before replacing)');
    }

    console.log('Restore completed successfully!');

  } catch (error) {
    console.error('Restore failed:', error);
  } finally {
    // Cleanup local files
    if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
    if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  }
}

// Allow running directly from command line
if (require.main === module) {
  const args = process.argv.slice(2);
  const targetKey = args[0] || null; // Optional: specify a backup key like "backups/backup-123.tar.gz"
  runRestore(targetKey).then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runRestore;
