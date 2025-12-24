const { BrowserWindow, shell, screen } = require("electron");
const path = require("path");
const { setAppIcon, clampWindowSize } = require("../utils/helper");
const CONSTANTS = require("../config/constants");

const iconPath = setAppIcon();

const getFixedWindowSize = (desiredWidth, desiredHeight, parent) => {
  // Screen size (usable area)
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workArea;

  const parentBounds = parent
    ? parent.getContentBounds()
    : { width: screenWidth, height: screenHeight };

  return {
    width: parentBounds.width - 100,
    height: parentBounds.height - 100,
  };
};

function createInfoWindow(type, window) {
  const isAbout = type === "about";

  const parent = BrowserWindow.getFocusedWindow();

  const { width, height } = clampWindowSize({
    width: 550,
    height: 440,
    parent: window || parent,
  });

  const win = new BrowserWindow({
    width,
    height,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: isAbout ? "About Hibernator" : "Help",
    autoHideMenuBar: true,
    icon: iconPath,
    parent,
    modal: false,
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.loadFile(
    path.join(
      CONSTANTS.APP_ROOT_DIRECTORY,
      `renderer/${type === "about" ? "about.html" : "help.html"}`
    )
  );

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

module.exports = { createInfoWindow };
