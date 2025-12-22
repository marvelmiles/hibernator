const { screen, BrowserWindow, app, Menu } = require("electron");
const { setAppIcon } = require("../utils/helper");
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
    submenu: [
      {
        label: "How it works",
        click: () => createInfoWindow("help"),
      },
    ],
  },
];

const createMainWindow = () => {
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  const display = screen.getPrimaryDisplay();
  const { width } = display.workArea;

  const winWidth = 640;
  const winHeight = 560;

  const window = new BrowserWindow({
    show: false,
    width: winWidth,
    minWidth: 500,
    height: winHeight,
    x: width - winWidth,
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
    if (!app.isQuiting) {
      e.preventDefault();
      window.hide();
    }
  });

  if (!app.isPackaged) {
    window.webContents.openDevTools({ mode: "detach" });
  }

  return window;
};

module.exports = { createMainWindow };
