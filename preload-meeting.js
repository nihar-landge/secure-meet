const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('meetingAPI', {
  onMeetingJoin: (callback) => ipcRenderer.on('meeting-join', (event, data) => callback(data)),
  // Add more secure APIs as needed
});
