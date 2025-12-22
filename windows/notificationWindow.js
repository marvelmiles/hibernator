const { BrowserWindow, shell, app } = require("electron");
const path = require("path");
const { setAppIcon } = require("../utils/helper");
const CONSTANTS = require("../config/constants");

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
      preload: path.join(
        CONSTANTS.APP_ROOT_DIRECTORY,
        "preloads/notification.js"
      ),
      contextIsolation: true,
    },
  });

  window.loadFile("./renderer/notification.html");

  window.once("ready-to-show", () => {
    window.webContents.send("show-notification", {
      schedule,
      storeKey,
      isBoot: storeKey === CONSTANTS.STORE_BOOT_KEY,
    });
    shell.beep();

    if (!app.isPackaged) {
      // window.webContents.openDevTools({ mode: "detach" });
    }
  });

  return window;
};

const closeHibernateNotification = (resetKey) => {
  let key = activeStoreKey;

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
