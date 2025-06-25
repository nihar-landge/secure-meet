@echo off
echo Installing dependencies...
npm install

echo Copying .env.example to .env (edit with your secrets)...
copy .env.example .env

echo Setup complete. Please edit .env and run "npm run dev" to start.
pause
