const { openWindows } = require("get-windows");
const CONSTANTS = require("../config/constants");
const Scheduler = require("./scheduler");
const { createSchedulerStoreKey } = require("../utils/helper");

class AppScheduler extends Scheduler {
  constructor(store) {
    super(store, CONSTANTS.SCHEDULER_APP);
  }

  findSchedule(appName, cb) {
    appName = appName.toLowerCase();

    const store = this.store.get(
      createSchedulerStoreKey(
        CONSTANTS.STORE_BOOT_KEY,
        CONSTANTS.SCHEDULER_SYSTEM
      ),
      []
    );

    const s = store.find((s) => {
      const payload = s.payload.toLowerCase();

      return payload === appName || payload.indexOf(appName) > -1;
    });

    if (s) cb(s);
  }

  bootstrap() {
    super.bootstrap(CONSTANTS.STORE_BOOT_KEY);

    setInterval(async () => {
      const windows = await openWindows();

      windows.forEach((window) => {
        this.findSchedule(window.owner.name, (s) => {
          if (this.activeSchedule) this.queue.push(s);
          else this.scheduleShouldShowNotification(s, CONSTANTS.STORE_BOOT_KEY);
        });
      });
    }, 500);
  }

  async getAppInfo(appName) {
    appName = appName.toLowerCase();

    const windows = await openWindows();

    return windows.find((window) => {
      const name = window.owner.name.toLowerCase();

      return name === appName || name.indexOf(appName) > -1;
    });
  }

  async killApp(appName) {
    const appInfo = await this.getAppInfo(appName);

    if (appInfo) {
      const pid = appInfo.owner.processId;

      let command;

      if (process.platform === "win32") {
        command = `taskkill /PID ${pid} /F`;
      } else {
        command = `kill -9 ${pid}`;
      }

      exec(command, (error) => {
        if (error) return reject(error);
        resolve(true);
      });
    }
  }
}

module.exports = AppScheduler;
