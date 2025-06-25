require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Meeting = require('./models/Meeting');
const { getGoogleOAuthClient, createMeetEvent, exchangeCodeForTokens } = require('./utils/google');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

// Middleware: JWT auth
function authenticate(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/auth/google', async (req, res) => {
  const { code, codeVerifier } = req.body;
  console.log('Received code:', code);                // Debug log
  console.log('Received codeVerifier:', codeVerifier); // Debug log
  try {
    console.log('Exchanging code for tokens...');      // Debug log
    const tokens = await exchangeCodeForTokens(code, codeVerifier);
    console.log('Tokens received:', tokens);           // Debug log

    const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const jwtToken = jwt.sign(
      { email: payload.email, googleId: payload.sub, accessToken: tokens.access_token, refreshToken: tokens.refresh_token },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('JWT token generated for user:', payload.email); // Debug log
    res.json({ jwt: jwtToken, email: payload.email });
  } catch (err) {
    console.error('Error in /api/auth/google:', err); // Log error
    res.status(401).json({ error: 'Invalid Google code or PKCE verification failed' });
  }
});


// POST /api/create-meeting
app.post('/api/create-meeting', authenticate, async (req, res) => {
  const { summary, startTime, endTime } = req.body;
  try {
    const oauth2Client = getGoogleOAuthClient(req.user);
    const meetLink = await createMeetEvent(oauth2Client, summary, startTime, endTime);

    const joinCode = Math.random().toString(36).substring(2, 8);

    await Meeting.create({
      joinCode,
      meetLink,
      hostEmail: req.user.email,
    });

    res.json({ joinCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
