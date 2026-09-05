import { google } from 'googleapis';
import { Readable } from 'stream';
import { readFileSync } from 'fs';

const creds = JSON.parse(readFileSync(new URL('../oauth-credentials.json', import.meta.url)));
const { client_id, client_secret } = creds.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret);
oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

const MIME_TYPES = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf:  'application/pdf',
  zip:  'application/zip',
};

export async function uploadToDrive(filename, buffer, folderId) {
  const ext = filename.split('.').pop().toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });
  const stream = Readable.from(buffer);
  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: { mimeType, body: stream },
    fields: 'id, webViewLink',
  });
  return res.data.webViewLink;
}