const {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  dialog,
  Notification,
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

app.whenReady().then(() => {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workArea;

  const winWidth = 640;
  const winHeight = 560;

  mainWindow = new BrowserWindow({
    show: true,
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

  mainWindow.loadFile("./renderer/index.html");

  mainWindow.once("ready-to-show", () => {
    const list = store.get(CONSTANTS.STORE_HIB_KEY, []);

    scheduler.cancelJobs("hibernate");

    for (const s of list) {
      if (isScheduleActive(s)) scheduler.scheduleJob("hibernate", s);
    }
  });
});

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
  return scheduler.cancel("hibernate", id);
});

const handleHibernation = () => {
  hibernate();
};

ipcMain.handle(CONSTANTS.MESSAGE_DIALOG, (e, message) => {
  dialog.showErrorBox("", message);
});

ipcMain.handle("close-notification", (filterFromList) => {
  closeHibernateNotification();
  if (filterFromList) scheduler.removeActiveScheduleFromList(mainWindow);
});

ipcMain.handle("hibernate", () => {
  console.log("hibernating...");
  handleHibernation();
});

ipcMain.handle("snooze-hibernation", () => {
  console.log("snoozing...");

  const id = setTimeout(() => {
    clearTimeout(id);

    const schedule = scheduler.activeSchedule;

    if (schedule) {
      if (schedule.snoozeCount > CONSTANTS.MAX_SNOOZE_COUNT) {
        dialog.showErrorBox("Max snooze limit reached. Will hibernate");

        scheduler.removeActiveScheduleFromList(mainWindow);

        handleHibernation();
        return;
      }

      const snoozeCount = schedule.snoozeCount + 1;

      const list = store
        .get(CONSTANTS.STORE_HIB_KEY, [])
        .map((s) => (s.id === schedule.id ? { ...s, snoozeCount } : s));

      store.set(CONSTANTS.STORE_HIB_KEY, list);

      scheduler.setActiveSchedule({ ...schedule, snoozeCount });

      showHibernateNotification(scheduler.activeSchedule);
    }
  }, 10000);
});
