const { app, ipcMain, dialog, Tray, autoUpdater } = require("electron");

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
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = false;

  autoUpdater.on("error", (error) => {
    dialog.showMessageBox({
      type: "error",
      title: "Update Error",
      message: "Failed to check for updates.",
      detail: error == null ? "Unknown error" : error.message,
    });
  });

  autoUpdater.on("update-available", async (info) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Update Now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update Available",
      message: `Version ${info.version} is available.`,
      detail: "Would you like to download and install it now?",
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-not-available", () => {
    dialog.showErrorBox("", "NO update available");
  });

  autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "warning",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update Ready",
      message: "Update downloaded.",
      detail: "The app needs to restart to apply the update.",
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.checkForUpdates();
};

const bootstrap = ({ forceOpen, show }) => {
  const openedAtLogin = app.getLoginItemSettings().wasOpenedAtLogin;

  show = openedAtLogin ? false : show || forceOpen;

  mainWindow = createMainWindow(show);
  createTray();

  bootScheduler.bootstrap();
  hibernateScheduler.bootstrap();

  if (show) {
    mainWindow.show();
    mainWindow.focus();

    const openGuide = store.get(CONSTANTS.OPEN_APP_INITIAL_GUIDE, true);

    if (openGuide) {
      createInfoWindow("help");
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
  } else {
    // if for some reason app didn't initialize
    bootstrap({ forceOpen: true });
  }
});

const getScheduler = (storeKey) => {
  if (storeKey === CONSTANTS.STORE_BOOT_KEY) return bootScheduler;
  else return hibernateScheduler;
};

app.whenReady().then(() => {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });

  bootstrap({ show: true, forceOpen: true });

  initAutoUpdater();
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
  if (!mainWindow) bootstrap({ forceOpen: true, show: true });
});

app.on("window-all-closed", (e) => {
  e.preventDefault();
});

app.on("before-quit", (e) => {
  e.preventDefault();

  if (mainWindow) mainWindow.hide();
});
