const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApi", {
  getStore: (type) => ipcRenderer.invoke("get-store", type),
  hibernate: {
    addSchedule: (type, s) => ipcRenderer.invoke("add-hib-schedule", s, type),
    cancelSchedule: (type, id) =>
      ipcRenderer.invoke("cancel-hib-schedule", type, id),
    disableSchedule: (type, id) =>
      ipcRenderer.invoke("disable-hib-schedule", id, type),
  },
  boot: {
    addSchedule: (type, s) => ipcRenderer.invoke("add-boot-schedule", s, type),
    cancelSchedule: (type, id) =>
      ipcRenderer.invoke("cancel-boot-schedule", id, type),
    disableSchedule: (type, id) =>
      ipcRenderer.invoke("disable-boot-schedule", id, type),
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
