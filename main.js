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
const {
  joinArr,
  setAppIcon,
  withAppUpdate,
  getInstalledApps,
  createSchedulerStoreKey,
  parseStoreKey,
} = require("./utils/helper");
const { createMainWindow } = require("./windows/mainWindow");
const { createInfoWindow } = require("./windows/infoWindow");
const AppScheduler = require("./schedulers/app-scheduler");

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

const appScheduler = new AppScheduler(store);

const createTray = () => {
  if (tray) return;

  tray = new Tray(iconPath);

  tray.setToolTip("Hibernator");

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
};

const resetAppUpdateState = () => {
  store.set(CONSTANTS.APP_HAS_UPDATE, false);
};

const initAutoUpdater = () => {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.autoRunAppAfterInstall = true;

  autoUpdater.on("error", () => {
    resetAppUpdateState();
  });

  autoUpdater.on("update-available", async (info) => {
    if (mainWindow) {
      const result = await dialog.showMessageBox(mainWindow, {
        type: "question",
        buttons: ["Download", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Hibernator Update",
        message: `Version ${info.version} is available.`,
      });

      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    }
  });

  autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: "info",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Hibernator Update",
      message: "Update downloaded",
      detail: "The app needs to restart to apply the update.",
    });

    if (result.response === 0) {
      store.set(CONSTANTS.APP_HAS_UPDATE, true);
      autoUpdater.quitAndInstall(true, true);
    } else resetAppUpdateState();
  });

  autoUpdater.on("update-not-available", resetAppUpdateState);

  autoUpdater.checkForUpdates();
};

const handleBackgroundService = () => {
  resetAppUpdateState();

  if (mainWindow) {
    appScheduler.bootstrap(mainWindow);
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

  if (!mainWindow) mainWindow = createMainWindow(store);

  // migrate store for older versions

  const boot = store.get(CONSTANTS.STORE_BOOT_KEY, []);

  const hib = store.get(CONSTANTS.STORE_HIB_KEY, []);

  if (boot.length) {
    const storeKey = createSchedulerStoreKey(
      CONSTANTS.STORE_BOOT_KEY,
      CONSTANTS.SCHEDULER_SYSTEM
    );
    store.set(storeKey, boot.concat(store.get(storeKey, [])));
  }

  if (hib.length) {
    const storeKey = createSchedulerStoreKey(
      CONSTANTS.STORE_HIB_KEY,
      CONSTANTS.SCHEDULER_SYSTEM
    );
    store.set(storeKey, hib.concat(store.get(storeKey, [])));
  }

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
  // if (storeKey === CONSTANTS.STORE_BOOT_KEY) return bootScheduler;
  // else return hibernateScheduler;
};

app.whenReady().then(async () => {
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

ipcMain.handle(CONSTANTS.GET_STORE, (e, type) => {
  return {
    bootSchedules: store.get(
      createSchedulerStoreKey(CONSTANTS.STORE_BOOT_KEY, type),
      []
    ),
    hibernateSchedules: store.get(
      createSchedulerStoreKey(CONSTANTS.STORE_HIB_KEY, type),
      []
    ),
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

ipcMain.handle("helpers", async (_, keyName, payload) => {
  switch (keyName) {
    case "join-array":
      return joinArr(payload);
    case "hibernate":
      return handleHibernation();
    case "get-installed-apps":
      return await getInstalledApps();
    default:
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

ipcMain.handle(CONSTANTS.ADD_BOOT_SCHEDULE, (_, s, schedulerType) => {
  const scheduler = getScheduler(
    createSchedulerStoreKey(CONSTANTS.STORE_BOOT_KEY, schedulerType)
  );

  scheduler.add(s, CONSTANTS.STORE_BOOT_KEY);
});

ipcMain.handle(CONSTANTS.CANCEL_BOOT_SCHEDULE, (_, id, schedulerType) => {
  const scheduler = getScheduler(
    createSchedulerStoreKey(CONSTANTS.STORE_BOOT_KEY, schedulerType)
  );

  return scheduler.cancelSchedule(id, CONSTANTS.STORE_BOOT_KEY);
});

ipcMain.handle(CONSTANTS.DISABLE_BOOT_SCHEDULE, (_, id, schedulerType) => {
  const scheduler = getScheduler(
    createSchedulerStoreKey(CONSTANTS.STORE_BOOT_KEY, schedulerType)
  );

  return scheduler.toggleDisableSchedule(id, CONSTANTS.STORE_BOOT_KEY);
});

// NOTIFICATION HANDLERS

const handleReomveActiveSchedule = (storeKey) => {
  const scheduler = getScheduler(storeKey);

  scheduler.shouldRemoveActiveScheduleFromList(mainWindow, storeKey);

  scheduler.shiftQueue();
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

const handleKillTask = (schedulerType, payload) => {
  switch (schedulerType) {
    case CONSTANTS.SCHEDULER_SYSTEM:
      handleHibernation();
      break;
    case CONSTANTS.SCHEDULER_APP:
      closeHibernateNotification(true);
      appScheduler.killApp(payload);
      break;
    default:
      break;
  }
};

ipcMain.handle("kill-task", (e, schedulerType, payload) => {
  handleKillTask(schedulerType, payload);
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

  const parsedKey = parseStoreKey(storeKey);

  // set active schedule for boot

  setTimeout(() => {
    const schedule = scheduler.activeSchedule;
    if (!schedule) return handleKillTask(parsedKey.schedulerType);

    const snoozeCount = schedule.snoozeCount + 1;

    const list = store
      .get(storeKey, [])
      .map((s) => (s.id === schedule.id ? { ...s, snoozeCount } : s));

    store.set(storeKey, list);
    scheduler.setActiveSchedule({ ...schedule, snoozeCount });

    const bool = scheduler.scheduleShouldShowNotification(
      schedule,
      parsedKey.storeKey,
      true
    );

    if (!bool) {
      closeHibernateNotification(true);
      handleReomveActiveSchedule(storeKey);
    }

    // const isBoot = storeKey === CONSTANTS.STORE_BOOT_KEY;

    // if (isBoot) {
    //   const bool = bootScheduler.scheduleShouldShowNotification(schedule, true);

    // if (!bool) {
    //   closeHibernateNotification(true);
    //   handleReomveActiveSchedule(storeKey);
    // }
    // } else showHibernateNotification(scheduler.activeSchedule, storeKey);
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
  if (!withAppUpdate(store)) e.preventDefault();
});

app.on("before-quit", (e) => {
  if (!withAppUpdate(store)) {
    e.preventDefault();

    if (mainWindow) mainWindow.hide();
  }
});
