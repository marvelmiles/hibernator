const { contextBridge, ipcRenderer } = require("electron");

const closeNotification = (scheduleType, filterFromList = true) => {
  ipcRenderer.invoke("close-notification", scheduleType, filterFromList);
};

contextBridge.exposeInMainWorld("notificationApi", {
  snooze: (scheduleType, storeKey) => {
    closeNotification(scheduleType, false);
    ipcRenderer.invoke("snooze-hibernation", scheduleType, storeKey);
  },
  proceed: (schedulerType, payload) => {
    closeNotification(schedulerType);
    ipcRenderer.invoke("kill-task", schedulerType, payload);
  },
  onShowNotification: (cb) => {
    ipcRenderer.on("show-notification", (_, payload) => {
      cb(payload);
    });
  },
  closeNotification,
  helpers(keyName, payload) {
    return ipcRenderer.invoke("helpers", keyName, payload);
  },
});
