const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("huasheng", {
  setAlwaysOnTop: () => ipcRenderer.invoke("set-always-on-top"),
  openSeatingView: () => ipcRenderer.invoke("open-seating-view"),
  getActivationInfo: () => ipcRenderer.invoke("get-activation-info"),
});
