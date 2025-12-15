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

const store = new AppStore();
const scheduler = new Scheduler(store);

let mainWindow;
let tray;

const isDev = !app.isPackaged;

/**
 * -----------------------------
 * Create Main Window (HIDDEN)
 * -----------------------------
 */
function createMainWindow() {
  const display = screen.getPrimaryDisplay();
  const { width } = display.workArea;

  const winWidth = 640;
  const winHeight = 560;

  mainWindow = new BrowserWindow({
    show: false, // 👈 VERY IMPORTANT
    width: winWidth,
    height: winHeight,
    x: width - winWidth,
    y: 0,
    webPreferences: {
      preload: path.join(__dirname, "/preloads/main.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "./renderer/index.html"));

  // Prevent app from quitting when window is closed
  mainWindow.on("close", (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

/**
 * -----------------------------
 * Tray Setup
 * -----------------------------
 */
function createTray() {
  tray = new Tray(path.join(__dirname, "assets/tray.png")); // ensure icon exists

  const menu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Quit",
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Hibernator");
  tray.setContextMenu(menu);

  tray.on("click", () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

/**
 * -----------------------------
 * Scheduler Bootstrap
 * -----------------------------
 */
function bootstrapScheduler() {
  const list = store.get(CONSTANTS.STORE_HIB_KEY, []);

  //   scheduler.cancelJobs("hibernate");

  const valid = [];

  for (const s of list) {
    if (isScheduleActive(s)) {
      scheduler.scheduleJob("hibernate", s);
      valid.push(s);
    }
  }

  store.set(CONSTANTS.STORE_HIB_KEY, valid);
}

/**
 * -----------------------------
 * App Ready
 * -----------------------------
 */
app.whenReady().then(() => {
  // Auto-run on system startup
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });

  createMainWindow();
  createTray();
  bootstrapScheduler();

  // Dev tools shortcut
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

ipcMain.handle(CONSTANTS.ADD_HIB_SCHEDULE, (event, s) => {
  return scheduler.add("hibernate", s);
});

ipcMain.handle(CONSTANTS.CANCEL_HIB_SCHEDULE, (event, id) => {
  return scheduler.cancelSchedule(id, "hibernate");
});

ipcMain.handle(CONSTANTS.MESSAGE_DIALOG, (e, message) => {
  dialog.showErrorBox("Warning", message);
});

ipcMain.handle("close-notification", (e, filterFromList) => {
  closeHibernateNotification();
  if (filterFromList) scheduler.removeActiveScheduleFromList(mainWindow);
});

ipcMain.handle("hibernate", () => {
  hibernate();
});

ipcMain.handle("snooze-hibernation", () => {
  const id = setTimeout(() => {
    clearTimeout(id);

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
 * macOS behavior
 * -----------------------------
 */
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on("window-all-closed", () => {
  // DO NOTHING — keep background service alive
});
