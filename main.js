const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const express = require('express');
const crypto = require('crypto');
require('dotenv').config();

let mainWindow;
let oauthServer;

// PKCE helpers
function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

// We'll store the verifier per login flow
let codeVerifier = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  mainWindow.setContentProtection(true);
  mainWindow.setMenu(null);
}

function startOAuthCallbackServer() {
  const oauthApp = express();

  oauthApp.get('/oauth2callback', (req, res) => {
    const code = req.query.code;
    res.send('<html><body>Authentication complete. You can close this window.</body></html>');
    if (mainWindow && code && codeVerifier) {
      // Send both code and codeVerifier to renderer for backend token exchange
      mainWindow.webContents.send('oauth-code', { code, codeVerifier });
      // Clear codeVerifier after use for security
      codeVerifier = null;
    }
    // Optionally, close the server after handling the first request:
    setTimeout(() => {
      if (oauthServer) oauthServer.close();
    }, 1000);
  });

  oauthServer = oauthApp.listen(3000, () => {
    console.log('OAuth2 callback server listening at http://localhost:3000/oauth2callback');
  });
}

app.whenReady().then(() => {
  createWindow();
  startOAuthCallbackServer();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (oauthServer) oauthServer.close();
  if (process.platform !== 'darwin') app.quit();
});

// Handle OAuth2 login: open system browser with Google OAuth2 URL and PKCE
ipcMain.handle('google-oauth-login', async () => {
    console.log('Starting OAuth login...');
  codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(Buffer.from(codeVerifier)));

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.REDIRECT_URI; // e.g. http://localhost:3000/oauth2callback
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar email profile openid');

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

  shell.openExternal(authUrl);
  return { success: true };
});

// IPC for secure meeting window (if you want to open a protected window for meetings)
ipcMain.handle('open-meeting-window', async (event, { joinCode }) => {
  const meetingWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload-meeting.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    contentProtection: true,
    show: false,
  });

  meetingWindow.setMenu(null);
  meetingWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  meetingWindow.once('ready-to-show', () => {
    meetingWindow.show();
    meetingWindow.webContents.send('meeting-join', { joinCode });
  });
});
