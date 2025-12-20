const { BrowserWindow, shell } = require("electron");
const path = require("path");
const { setAppIcon } = require("../utils/helper");

let window = null;

let activeStoreKey = "";

const iconPath = setAppIcon();

const showHibernateNotification = (schedule, storeKey) => {
  if (window) return;

  activeStoreKey = storeKey;

  window = new BrowserWindow({
    width: 500,
    height: 350,
    maxHeight: 500,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    focusable: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(process.cwd(), "preloads/notification.js"),
      contextIsolation: true,
    },
  });

  window.loadFile("./renderer/notification.html");

  window.once("ready-to-show", () => {
    window.webContents.send("show-notification", {
      schedule,
    });
    shell.beep();
  });

  return window;
};

const closeHibernateNotification = (resetKey) => {
  let key = activeStoreKey;

  return;

  if (resetKey) activeStoreKey = "";

  if (window) {
    window.close();
    window = null;
  }

  return key;
};

const getActiveStoreKey = () => activeStoreKey;

module.exports = {
  showHibernateNotification,
  closeHibernateNotification,
  getActiveStoreKey,
};
