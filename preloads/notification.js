const { contextBridge, ipcRenderer } = require("electron");

const closeNotification = (filterFromList = true) => {
  ipcRenderer.invoke("close-notification", filterFromList);
};

contextBridge.exposeInMainWorld("notificationApi", {
  snooze: () => {
    closeNotification(false);
    ipcRenderer.invoke("snooze-hibernation");
  },
  proceed: (schedulerType, payload) => {
    closeNotification();
    ipcRenderer.invoke("kill-task", schedulerType, payload);
  },
  onShowNotification: (cb) => {
    ipcRenderer.on("show-notification", (_, payload) => {
      cb(payload);
    });
  },
  closeNotification,
});
