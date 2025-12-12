const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronApi", {
  getStore: () => ipcRenderer.invoke("get-store"),
  hibernate: {
    addSchedule: (s) => ipcRenderer.invoke("add-hib-schedule", s),
    cancelSchedule: (id) => ipcRenderer.invoke("cancel-hib-schedule", id),
  },
  toast(message) {
    ipcRenderer.invoke("message-dialog", message);
  },
  onHibernateListChange(cb) {
    ipcRenderer.on("hib-list", () => {
      cb();
    });
  },
});
