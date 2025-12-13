const { app, BrowserWindow, ipcMain, screen, dialog } = require("electron");
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
  const { width } = display.workArea;

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

  mainWindow.loadFile("./renderer/index.html");
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
  return scheduler.cancelSchedule(id, "hibernate");
});

ipcMain.handle(CONSTANTS.MESSAGE_DIALOG, (e, message) => {
  dialog.showErrorBox("", message);
});

ipcMain.handle("close-notification", (e, filterFromList) => {
  console.log("closing notification", filterFromList);

  closeHibernateNotification();

  if (filterFromList) scheduler.removeActiveScheduleFromList(mainWindow);
});

ipcMain.handle("hibernate", () => {
  console.log("hibernating...");
  hibernate();
});

ipcMain.handle("snooze-hibernation", () => {
  console.log("snoozing...");

  const id = setTimeout(() => {
    clearTimeout(id);

    const schedule = scheduler.activeSchedule;

    if (schedule) {
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
