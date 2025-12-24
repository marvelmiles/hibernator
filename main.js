const { app, ipcMain, dialog, Tray, powerMonitor } = require("electron");
const { autoUpdater } = require("electron-updater");
const AppStore = require("./config/store");
const CONSTANTS = require("./config/constants");
const HibernateScheduler = require("./schedulers/hibernate-scheduler");
const {
  closeHibernateNotification,
  getActiveStoreKey,
  showHibernateNotification,
} = require("./windows/notificationWindow");
const hibernate = require("./hibernate");
const BootScheduler = require("./schedulers/boot-scheduler");
const { joinArr, setAppIcon } = require("./utils/helper");
const { createMainWindow } = require("./windows/mainWindow");
const { createInfoWindow } = require("./windows/infoWindow");

app.setAppUserModelId("com.example.hibernator");
app.setLoginItemSettings({
  openAtLogin: true,
  args: ["--autostart"],
});

const iconPath = setAppIcon();

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

const createTray = () => {
  if (tray) return;

  tray = new Tray(iconPath);

  tray.setToolTip("Hibernator");

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
};

const initAutoUpdater = () => {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    dialog.showMessageBox({
      type: "error",
      title: "Update Error",
      message: "Failed to check for updates.",
      detail: error?.message || "Unknown error",
    });
  });

  autoUpdater.on("update-available", async (info) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Download Update", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update Available",
      message: `Version ${info.version} is available.`,
      detail: "The update will be installed the next time the app restarts.",
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-downloaded", async () => {
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      buttons: ["OK"],
      title: "Update Ready",
      message: "Update downloaded",
      detail:
        "The update will be installed the next time the app is restarted.",
    });
  });

  autoUpdater.checkForUpdates();
};

const handleBackgroundService = () => {
  if (mainWindow) {
    bootScheduler.bootstrap(mainWindow);
    hibernateScheduler.bootstrap(mainWindow);
  }
};

const bootstrap = (opt = {}) => {
  let { show = false } = opt;

  const openedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin;

  const isAutoStart = process.argv.includes("--autostart");

  const disableShow = openedAtLogin || isAutoStart || !!mainWindow;

  show = disableShow ? false : show;

  if (!mainWindow) mainWindow = createMainWindow();

  createTray();
  handleBackgroundService();

  if (show) {
    mainWindow.show();
    mainWindow.focus();

    const openGuide = store.get(CONSTANTS.OPEN_APP_INITIAL_GUIDE, true);

    if (openGuide) {
      createInfoWindow("help", mainWindow);
      createInfoWindow("about", mainWindow);
      store.set(CONSTANTS.OPEN_APP_INITIAL_GUIDE, false);
    }
  }
};

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

const getScheduler = (storeKey) => {
  if (storeKey === CONSTANTS.STORE_BOOT_KEY) return bootScheduler;
  else return hibernateScheduler;
};

app.whenReady().then(() => {
  bootstrap({ show: true });

  initAutoUpdater();
});

powerMonitor.on("resume", () => {
  handleBackgroundService();
});

powerMonitor.on("unlock-screen", () => {
  handleBackgroundService();
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

ipcMain.handle(CONSTANTS.MESSAGE_DIALOG, (_, message, type) => {
  if (type === "question") {
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      buttons: ["OK", "Cancel"],
      defaultId: 0,
      cancelId: 1,
      title: "Confirm Action",
      message: message || "Do you want to continue?",
      detail: "This action cannot be undone.",
    });

    return response;
  } else return dialog.showErrorBox("Warning", message);
});

ipcMain.handle("helpers", (_, keyName, payload) => {
  switch (keyName) {
    case "join-array":
      return joinArr(payload);
    case "hibernate":
      handleHibernation();
      return;
  }
});

// HIBERNATE HANDLERS

ipcMain.handle(CONSTANTS.ADD_HIB_SCHEDULE, (_, s) => {
  return hibernateScheduler.add(s);
});

ipcMain.handle(CONSTANTS.CANCEL_HIB_SCHEDULE, (_, id) => {
  return hibernateScheduler.cancelSchedule(id);
});

ipcMain.handle(CONSTANTS.DISABLE_HIB_SCHEDULE, (_, id) => {
  return hibernateScheduler.toggleDisableSchedule(id, CONSTANTS.STORE_HIB_KEY);
});

// BOOT HANDLERS

ipcMain.handle(CONSTANTS.ADD_BOOT_SCHEDULE, (_, s) => {
  return bootScheduler.add(s, CONSTANTS.STORE_BOOT_KEY);
});

ipcMain.handle(CONSTANTS.CANCEL_BOOT_SCHEDULE, (_, id) => {
  return bootScheduler.cancelSchedule(id, CONSTANTS.STORE_BOOT_KEY);
});

ipcMain.handle(CONSTANTS.DISABLE_BOOT_SCHEDULE, (_, id) => {
  return bootScheduler.toggleDisableSchedule(id, CONSTANTS.STORE_BOOT_KEY);
});

// NOTIFICATION HANDLERS

const handleReomveActiveSchedule = (storeKey) => {
  const scheduler = getScheduler(storeKey);

  scheduler.shouldRemoveActiveScheduleFromList(mainWindow, storeKey);
};

ipcMain.handle("close-notification", (_, filterFromList) => {
  const storeKey = closeHibernateNotification(filterFromList);

  if (!storeKey) {
    dialog.showErrorBox(
      "Application Error",
      "Encountered error while closing notification window."
    );

    return;
  }

  if (filterFromList) handleReomveActiveSchedule(storeKey);
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

    const isBoot = storeKey === CONSTANTS.STORE_BOOT_KEY;

    if (isBoot) {
      const bool = bootScheduler.scheduleShouldShowNotification(schedule, true);

      if (!bool) {
        closeHibernateNotification(true);
        handleReomveActiveSchedule(storeKey);
      }
    } else showHibernateNotification(scheduler.activeSchedule, storeKey);
  }, 300_000);
});

/**
 * -----------------------------
 * WINDOW LIFECYCLES
 * -----------------------------
 */

app.on("activate", () => {
  if (!mainWindow) bootstrap({ show: true });
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});

app.on("before-quit", (e) => {
  e.preventDefault();

  if (mainWindow) mainWindow.hide();
});
