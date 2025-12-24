const { BrowserWindow, app, Menu } = require("electron");
const {
  setAppIcon,
  clampWindowSize,
  withAppUpdate,
} = require("../utils/helper");
const path = require("path");
const { createInfoWindow } = require("./infoWindow");
const CONSTANTS = require("../config/constants");

const iconPath = setAppIcon();

const menuTemplate = [
  {
    label: "App",
    submenu: [
      {
        label: "About",
        click: () => createInfoWindow("about"),
      },
      { type: "separator" },
      {
        role: "quit",
      },
    ],
  },
  {
    label: "Help",
    click: () => createInfoWindow("help"),
  },
];

let initialied = false;

const createMainWindow = (store, show = false) => {
  if (initialied) return;

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  const { width, x: screenX } = clampWindowSize({ width: 700 });

  const window = new BrowserWindow({
    show,
    width,
    minWidth: 500,
    x: screenX,
    y: 0,
    icon: iconPath,
    webPreferences: {
      preload: path.join(CONSTANTS.APP_ROOT_DIRECTORY, "/preloads/main.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  window.loadFile(
    path.join(CONSTANTS.APP_ROOT_DIRECTORY, "./renderer/index.html")
  );

  window.on("close", (e) => {
    if (!withAppUpdate(store)) {
      e.preventDefault();
      window.hide();
    }
  });

  if (!app.isPackaged) {
    window.webContents.openDevTools({ mode: "detach" });
  }

  initialied = true;

  return window;
};

module.exports = { createMainWindow };
