const { BrowserWindow } = require("electron");
const path = require("path");

let notificationWin = null;

function showHibernateNotification(schedule) {
  if (notificationWin) return;

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
      seconds: 15,
      schedule,
    });
  });
}

const closeHibernateNotification = () => {
  if (notificationWin) {
    notificationWin.close();
    notificationWin = null;
  }
};

module.exports = { showHibernateNotification, closeHibernateNotification };
