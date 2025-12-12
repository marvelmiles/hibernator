const { contextBridge, ipcRenderer } = require("electron");

const closeNotification = (filterFromList = true) => {
  ipcRenderer.invoke("close-notification", filterFromList);
};

contextBridge.exposeInMainWorld("notificationApi", {
  snooze: () => {
    closeNotification(false);
    ipcRenderer.invoke("snooze-hibernation");
  },
  proceed: () => {
    closeNotification();
    ipcRenderer.invoke("hibernate");
  },
  onShowNotification: (cb) => {
    ipcRenderer.on("show-notification", (_, payload) => {
      cb(payload);
    });
  },
  closeNotification,
});
