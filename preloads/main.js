const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApi", {
  getStore: (type) => ipcRenderer.invoke("get-store", type),
  hibernate: {
    addSchedule: (s, type) => ipcRenderer.invoke("add-hib-schedule", s, type),
    cancelSchedule: (id, type) =>
      ipcRenderer.invoke("cancel-hib-schedule", id, type),
    disableSchedule: (id, type) =>
      ipcRenderer.invoke("disable-hib-schedule", id, type),
  },
  boot: {
    addSchedule: (s, type) => ipcRenderer.invoke("add-boot-schedule", s, type),
    cancelSchedule: (id, type) =>
      ipcRenderer.invoke("cancel-boot-schedule", id, type),
    disableSchedule: (id, type) =>
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
