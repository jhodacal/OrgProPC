const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  storageGet: (key) => ipcRenderer.invoke('storage:get', key),
  storageSet: (key, data) => ipcRenderer.invoke('storage:set', key, data),
  storageGetAll: () => ipcRenderer.invoke('storage:getAll'),
  notify: (title, body) => ipcRenderer.invoke('notify', title, body),
  onRemoteUpdated: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('sync:remoteUpdated', handler);
    return () => ipcRenderer.removeListener('sync:remoteUpdated', handler);
  },
  onPowerResume: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('power:resume', handler);
    return () => ipcRenderer.removeListener('power:resume', handler);
  },
  onPowerSuspend: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('power:suspend', handler);
    return () => ipcRenderer.removeListener('power:suspend', handler);
  },
  unajRequest: (options) => ipcRenderer.invoke('unaj:request', options)
});

