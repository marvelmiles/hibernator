const { BrowserWindow } = require("electron");
const path = require("path");
const CONSTANTS = require("./config/constants");

let notificationWin = null;

let activeStoreKey = "";

const showHibernateNotification = (schedule, storeKey) => {
  if (notificationWin) return;

  activeStoreKey = storeKey;

  console.log(activeStoreKey, "ss");

  notificationWin = new BrowserWindow({
    width: 320,
    height: 250,
    frame: false,
    resizable: false,
    movable: false,
    // skipTaskbar: true,
    // alwaysOnTop: true,
    // transparent: true,
    // focusable: false, // does NOT steal focus
    webPreferences: {
      preload: path.join(__dirname, "preloads/notification.js"),
      contextIsolation: true,
    },
  });

  notificationWin.loadFile("./renderer/notification.html");

  notificationWin.once("ready-to-show", () => {
    notificationWin.webContents.send("show-notification", {
      seconds: CONSTANTS.COUNTDOWN,
      schedule,
    });
  });
};

const closeHibernateNotification = (resetKey) => {
  let key = activeStoreKey;

  if (resetKey) activeStoreKey = "";

  if (notificationWin) {
    notificationWin.close();
    notificationWin = null;
  }

  return key;
};

const getActiveStoreKey = () => activeStoreKey;

module.exports = {
  showHibernateNotification,
  closeHibernateNotification,
  getActiveStoreKey,
};
