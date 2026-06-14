/**
 * Google Drive Uploader for CSG Content Packs
 * Uploads DOCX files and images to Google Drive using service account
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/**
 * Create authenticated Google Drive client
 */
async function createDriveClient() {
  const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  
  if (!credentialsPath) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
  }
  
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Service account credentials file not found: ${credentialsPath}`);
  }
  
  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  
  const authClient = await auth.getClient();
  const drive = google.drive({ version: 'v3', auth: authClient });
  
  return drive;
}

/**
 * Upload DOCX file to Google Drive
 * @param {string} filePath - Path to the DOCX file
 * @param {string} filename - Name for the file in Google Drive
 * @returns {Promise<string>} Google Drive file URL
 */
async function uploadDocx(filePath, filename) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_PACKS_FOLDER_ID;
    
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_PACKS_FOLDER_ID environment variable not set');
    }
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const drive = await createDriveClient();
    
    const fileMetadata = {
      name: filename,
      parents: [folderId]
    };
    
    const media = {
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      body: fs.createReadStream(filePath)
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });
    
    const fileId = response.data.id;
    
    // Set file permissions to be viewable by anyone with the link
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    return `https://drive.google.com/file/d/${fileId}/view`;
    
  } catch (error) {
    throw new Error(`Failed to upload DOCX to Google Drive: ${error.message}`);
  }
}

/**
 * Upload image buffer to Google Drive
 * @param {Buffer} imageBuffer - Image data as buffer
 * @param {string} filename - Name for the file in Google Drive
 * @returns {Promise<string>} Google Drive file URL
 */
async function uploadImage(imageBuffer, filename) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_HEADERS_FOLDER_ID;
    
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_HEADERS_FOLDER_ID environment variable not set');
    }
    
    if (!Buffer.isBuffer(imageBuffer)) {
      throw new Error('imageBuffer must be a Buffer');
    }
    
    const drive = await createDriveClient();
    
    // Determine MIME type from filename extension
    const ext = path.extname(filename).toLowerCase();
    let mimeType = 'image/png'; // default
    
    if (ext === '.jpg' || ext === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (ext === '.png') {
      mimeType = 'image/png';
    } else if (ext === '.gif') {
      mimeType = 'image/gif';
    } else if (ext === '.webp') {
      mimeType = 'image/webp';
    }
    
    const fileMetadata = {
      name: filename,
      parents: [folderId]
    };
    
    const media = {
      mimeType: mimeType,
      body: require('stream').Readable.from(imageBuffer)
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });
    
    const fileId = response.data.id;
    
    // Set file permissions to be viewable by anyone with the link
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
    
    return `https://drive.google.com/file/d/${fileId}/view`;
    
  } catch (error) {
    throw new Error(`Failed to upload image to Google Drive: ${error.message}`);
  }
}

module.exports = {
  uploadDocx,
  uploadImage
};
