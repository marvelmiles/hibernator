const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApi", {
  getStore: () => ipcRenderer.invoke("get-store"),
  hibernate: {
    addSchedule: (s) => ipcRenderer.invoke("add-hib-schedule", s),
    cancelSchedule: (id) => ipcRenderer.invoke("cancel-hib-schedule", id),
    disableSchedule: (id) => ipcRenderer.invoke("disable-hib-schedule", id),
  },
  boot: {
    addSchedule: (s) => ipcRenderer.invoke("add-boot-schedule", s),
    cancelSchedule: (id) => ipcRenderer.invoke("cancel-boot-schedule", id),
    disableSchedule: (id) => ipcRenderer.invoke("disable-boot-schedule", id),
  },
  toast(message, type) {
    return ipcRenderer.invoke("message-dialog", message, type);
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
