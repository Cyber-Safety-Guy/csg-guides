import { google } from 'googleapis';
import { readFileSync } from 'fs';
import * as readline from 'readline';

const creds = JSON.parse(readFileSync('./oauth-credentials.json', 'utf8'));
const { client_id, client_secret, redirect_uris } = creds.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const url = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive']
});

console.log('\nOpen this URL in your browser:\n\n' + url + '\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Paste the code here: ', async (code) => {
  const { tokens } = await oAuth2Client.getToken(code);
  console.log('\nAdd this to your .env file:\n');
  console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
  rl.close();
});
