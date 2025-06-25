const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  googleOAuthLogin: () => ipcRenderer.invoke('google-oauth-login'),
  onOAuthCode: (callback) => ipcRenderer.on('oauth-code', (event, code) => callback(code)),
  openMeetingWindow: (joinCode) => ipcRenderer.invoke('open-meeting-window', { joinCode }),
});
