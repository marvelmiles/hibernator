const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApi", {
  getStore: () => ipcRenderer.invoke("get-store"),
  hibernate: {
    addSchedule: (s) => ipcRenderer.invoke("add-hib-schedule", s),
    cancelSchedule: (id) => ipcRenderer.invoke("cancel-hib-schedule", id),
  },
  boot: {
    addSchedule: (s) => ipcRenderer.invoke("add-boot-schedule", s),
    cancelSchedule: (id) => ipcRenderer.invoke("cancel-boot-schedule", id),
  },
  toast(message) {
    return ipcRenderer.invoke("message-dialog", message);
  },
  onListChange(eventName, cb) {
    ipcRenderer.on(eventName, () => {
      cb();
    });
  },
  helpers(keyName, payload) {
    return ipcRenderer.invoke("helpers", keyName, payload);
  },
});
