const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  dialog,
  Tray,
} = require("electron");
const path = require("path");

const AppStore = require("./config/store");
const CONSTANTS = require("./config/constants");
const HibernateScheduler = require("./schedulers/hibernate-scheduler");
const {
  showHibernateNotification,
  closeHibernateNotification,
  getActiveStoreKey,
} = require("./notificationWindow");
const hibernate = require("./hibernate");
const { isScheduleActive } = require("./utils/validators");
const BootScheduler = require("./schedulers/boot-scheduler");

app.setAppUserModelId("com.example.hibernator");

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  return;
}

let mainWindow;
let tray;

const store = new AppStore();
const hibernateScheduler = new HibernateScheduler(store);
const bootScheduler = new BootScheduler(store);

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

  tray.setToolTip("Hibernator");

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
};

const getScheduler = (storeKey) => {
  if (storeKey === CONSTANTS.STORE_BOOT_KEY) return bootScheduler;
  else return hibernateScheduler;
};

app.whenReady().then(() => {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });

  createMainWindow();
  createTray();
  bootScheduler.shouldHibernate();
  hibernateScheduler.bootstrap();

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

// CONTEXT HANDLERS

ipcMain.handle(CONSTANTS.GET_STORE, () => {
  return {
    bootSchedules: store.get("bootSchedules", []),
    hibernateSchedules: store.get("hibernateSchedules", []),
  };
});

ipcMain.handle(CONSTANTS.MESSAGE_DIALOG, (_, message) => {
  return dialog.showErrorBox("Warning", message);
});

// HIBERNATE HANDLERS

ipcMain.handle(CONSTANTS.ADD_HIB_SCHEDULE, (_, s) => {
  return hibernateScheduler.add(s);
});

ipcMain.handle(CONSTANTS.CANCEL_HIB_SCHEDULE, (_, id) => {
  return hibernateScheduler.cancelSchedule(id);
});

// BOOT HANDLERS

ipcMain.handle(CONSTANTS.ADD_BOOT_SCHEDULE, (_, s) => {
  return bootScheduler.add(s);
});

ipcMain.handle(CONSTANTS.CANCEL_BOOT_SCHEDULE, (_, id) => {
  return bootScheduler.cancelSchedule(CONSTANTS.STORE_BOOT_KEY, id);
});

// NOTIFICATION HANDLERS

ipcMain.handle("close-notification", (_, filterFromList) => {
  const storeKey = closeHibernateNotification(filterFromList);

  if (!storeKey) {
    dialog.showErrorBox(
      "Application Error",
      "Encountered error while closing notification window."
    );

    return;
  }

  if (filterFromList) {
    const scheduler = getScheduler(storeKey);

    scheduler.shouldRemoveActiveScheduleFromList(storeKey, mainWindow);
  }
});

const handleHibernation = () => {
  closeHibernateNotification(true);
  hibernate();
};

ipcMain.handle("hibernate", () => {
  handleHibernation();
});

ipcMain.handle("snooze-hibernation", () => {
  const storeKey = getActiveStoreKey();

  if (!storeKey) {
    dialog.showErrorBox(
      "Application Error",
      "Encountered error while snoozing."
    );

    return;
  }

  const scheduler = getScheduler(storeKey);

  // set active schedule for boot

  setTimeout(() => {
    const schedule = scheduler.activeSchedule;
    if (!schedule) return handleHibernation();

    const snoozeCount = schedule.snoozeCount + 1;

    const list = store
      .get(storeKey, [])
      .map((s) => (s.id === schedule.id ? { ...s, snoozeCount } : s));

    store.set(storeKey, list);
    scheduler.setActiveSchedule({ ...schedule, snoozeCount });

    showHibernateNotification(scheduler.activeSchedule, storeKey);
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
