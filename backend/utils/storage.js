const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');

const {
  DO_SPACES_ENDPOINT,
  DO_SPACES_KEY,
  DO_SPACES_SECRET,
  DO_SPACES_BUCKET,
  DO_SPACES_REGION
} = process.env;

// Initialize S3 Client for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: `https://${DO_SPACES_ENDPOINT}`, // e.g., https://sfo3.digitaloceanspaces.com
  forcePathStyle: false, 
  region: DO_SPACES_REGION || 'us-east-1',
  credentials: {
    accessKeyId: DO_SPACES_KEY,
    secretAccessKey: DO_SPACES_SECRET
  }
});

// Setup multer for direct upload to Spaces
const uploadToSpace = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: DO_SPACES_BUCKET || 'placeholder-bucket',
    acl: 'public-read',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `uploads/${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * Upload a local file to DO Spaces
 * @param {string} localFilePath 
 * @param {string} destinationKey e.g. "backups/my-backup.tar.gz"
 * @param {boolean} isPublic 
 */
const uploadLocalFile = async (localFilePath, destinationKey, isPublic = false) => {
  if (!fs.existsSync(localFilePath)) throw new Error('File not found');
  
  const fileStream = fs.createReadStream(localFilePath);
  
  const params = {
    Bucket: DO_SPACES_BUCKET,
    Key: destinationKey,
    Body: fileStream,
    ACL: isPublic ? 'public-read' : 'private'
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);
  
  return `https://${DO_SPACES_BUCKET}.${DO_SPACES_ENDPOINT}/${destinationKey}`;
};

/**
 * Upload Buffer Data (like PDFs) to DO Spaces
 */
const uploadBuffer = async (buffer, destinationKey, contentType, isPublic = true) => {
  const params = {
    Bucket: DO_SPACES_BUCKET,
    Key: destinationKey,
    Body: buffer,
    ContentType: contentType,
    ACL: isPublic ? 'public-read' : 'private'
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);
  
  return `https://${DO_SPACES_BUCKET}.${DO_SPACES_ENDPOINT}/${destinationKey}`;
};

module.exports = {
  s3Client,
  uploadToSpace,
  uploadLocalFile,
  uploadBuffer
};
