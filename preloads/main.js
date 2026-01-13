const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApi", {
  hibernate: {
    addSchedule: (type, s) => ipcRenderer.invoke("add-hib-schedule", type, s),
    cancelSchedule: (type, id) =>
      ipcRenderer.invoke("cancel-hib-schedule", type, id),
    toggleDisableSchedule: (type, id) =>
      ipcRenderer.invoke("disable-hib-schedule", type, id),
  },
  boot: {
    addSchedule: (type, s) => ipcRenderer.invoke("add-boot-schedule", type, s),
    cancelSchedule: (type, id) =>
      ipcRenderer.invoke("cancel-boot-schedule", type, id),
    toggleDisableSchedule: (type, id) =>
      ipcRenderer.invoke("disable-boot-schedule", type, id),
  },
  dialog(message, type) {
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
