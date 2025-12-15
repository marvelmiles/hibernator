const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  dialog,
  Tray,
  Menu,
} = require("electron");
const path = require("path");

const AppStore = require("./config/store");
const CONSTANTS = require("./config/constants");
const Scheduler = require("./scheduler");
const {
  showHibernateNotification,
  closeHibernateNotification,
} = require("./notificationWindow");
const hibernate = require("./hibernate");
const { isScheduleActive } = require("./utils/validators");

app.setAppUserModelId("com.example.hibernator");

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  return;
}

let mainWindow;
let tray;

const store = new AppStore();
const scheduler = new Scheduler(store);
const isDev = !app.isPackaged;

/**
 * -----------------------------
 * SECOND INSTANCE HANDLER
 * -----------------------------
 * Fired when user clicks app icon
 * while tray app is already running
 */

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

const createMainWindow = () => {
  const display = screen.getPrimaryDisplay();
  const { width } = display.workArea;

  const winWidth = 640;
  const winHeight = 560;

  mainWindow = new BrowserWindow({
    show: false,
    width: winWidth,
    height: winHeight,
    x: width - winWidth,
    y: 0,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, "/preloads/main.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));

  mainWindow.on("close", (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
};

const createTray = () => {
  tray = new Tray(path.join(__dirname, "assets/tray.png"));

  const menu = Menu.buildFromTemplate([
    {
      label: "Open Hibernator",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
  ]);

  tray.setToolTip("Hibernator");
  tray.setContextMenu(menu);

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
};

const bootstrapScheduler = () => {
  const list = store.get(CONSTANTS.STORE_HIB_KEY, []);

  scheduler.cancelJobs("hibernate");

  const valid = [];

  for (const s of list) {
    if (isScheduleActive(s)) {
      scheduler.scheduleJob("hibernate", s);
      valid.push(s);
    }
  }

  store.set(CONSTANTS.STORE_HIB_KEY, valid);
};

app.whenReady().then(() => {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });

  createMainWindow();
  createTray();
  bootstrapScheduler();

  const openedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin;

  if (!openedAtLogin) {
    mainWindow.show();
    mainWindow.focus();
  }

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
});

/**
 * -----------------------------
 * IPC HANDLERS
 * -----------------------------
 */
ipcMain.handle(CONSTANTS.GET_STORE, () => {
  return {
    allowedBootSchedule: store.get("allowedBootSchedule"),
    hibernateSchedules: store.get("hibernateSchedules"),
  };
});

ipcMain.handle(CONSTANTS.ADD_HIB_SCHEDULE, (_, s) => {
  return scheduler.add("hibernate", s);
});

ipcMain.handle(CONSTANTS.CANCEL_HIB_SCHEDULE, (_, id) => {
  return scheduler.cancelSchedule(id, "hibernate");
});

ipcMain.handle(CONSTANTS.MESSAGE_DIALOG, (_, message) => {
  dialog.showErrorBox("Warning", message);
});

ipcMain.handle("close-notification", (_, filterFromList) => {
  closeHibernateNotification();
  if (filterFromList) scheduler.removeActiveScheduleFromList(mainWindow);
});

ipcMain.handle("hibernate", () => {
  hibernate();
});

ipcMain.handle("snooze-hibernation", () => {
  setTimeout(() => {
    const schedule = scheduler.activeSchedule;
    if (!schedule) return;

    const snoozeCount = schedule.snoozeCount + 1;

    const list = store
      .get(CONSTANTS.STORE_HIB_KEY, [])
      .map((s) => (s.id === schedule.id ? { ...s, snoozeCount } : s));

    store.set(CONSTANTS.STORE_HIB_KEY, list);
    scheduler.setActiveSchedule({ ...schedule, snoozeCount });

    showHibernateNotification(scheduler.activeSchedule);
  }, 10_000);
});

/**
 * -----------------------------
 * WINDOWS / MAC LIFECYCLE
 * -----------------------------
 */
app.on("activate", () => {
  if (!mainWindow) createMainWindow();
  mainWindow.show();
});
