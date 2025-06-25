# SecureMeet Platform

A secure video conferencing app using Google Meet, Electron, and MongoDB.

## Setup

1. Run `install.sh` (Linux/macOS) or `install.bat` (Windows)
2. Edit `.env` with your credentials and secrets.
3. Start backend: `npm run server`
4. Start Electron app: `npm start`
5. Or run both: `npm run dev`

## Security Features

- Google OAuth2 login
- Never exposes real Meet link to attendees
- Secure join codes
- Meeting window with content protection, watermark, and recording detection
- MongoDB for code mapping

## Deployment

- Build for production: `npm run build`
