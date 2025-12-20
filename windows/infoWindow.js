const { BrowserWindow, shell } = require("electron");
const path = require("path");
const { setAppIcon } = require("../utils/helper");

const iconPath = setAppIcon();

function createInfoWindow(type) {
  const isAbout = type === "about";

  const win = new BrowserWindow({
    width: 550,
    height: 410,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: isAbout ? "About Hibernator" : "Help",
    autoHideMenuBar: true,
    icon: iconPath,
    parent: BrowserWindow.getFocusedWindow(),
    modal: false,
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.loadFile(
    path.join(
      process.cwd(),
      `renderer/${type === "about" ? "about.html" : "help.html"}`
    )
  );

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

module.exports = { createInfoWindow };
