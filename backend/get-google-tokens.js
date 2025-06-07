const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:8080' // Change to your redirect URI if needed
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('Authorize this app by visiting this url:', url);

// After visiting the URL and authorizing, Google will redirect you to your redirect URI with a code parameter.
// Paste that code below and run the following to get your tokens:

// Uncomment and replace 'YOUR_AUTH_CODE' with the code from the URL
oauth2Client.getToken('4/0AUJR-x5ucuvzyKK5pCxCOs0Wtjbbke18yMBq51N5pmVmwVxBsjL2-AGLTaJ9jQoT-Pj1NA').then(({ tokens }) => {
  console.log('Tokens:', tokens);
});