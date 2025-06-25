const { google } = require('googleapis');

function getGoogleOAuthClient(user) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );
  oauth2Client.setCredentials({
    access_token: user.accessToken,
    refresh_token: user.refreshToken,
  });
  return oauth2Client;
}

async function createMeetEvent(oauth2Client, summary, startTime, endTime) {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const event = {
    summary,
    start: { dateTime: startTime },
    end: { dateTime: endTime },
    conferenceData: { createRequest: { requestId: Math.random().toString(36) } }
  };
  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    conferenceDataVersion: 1
  });
  return res.data.conferenceData.entryPoints[0].uri;
}

async function exchangeCodeForTokens(code) {
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );
  const { tokens } = await client.getToken(code);
  return tokens;
}

module.exports = { getGoogleOAuthClient, createMeetEvent, exchangeCodeForTokens };
