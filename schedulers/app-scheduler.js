const { openWindows } = require("get-windows");
const CONSTANTS = require("../config/constants");
const Scheduler = require("./scheduler");
const { createSchedulerStoreKey } = require("../utils/helper");
const { exec } = require("child_process");
const { default: fkill } = require("fkill");

class AppScheduler extends Scheduler {
  constructor(store) {
    super(store, CONSTANTS.SCHEDULER_APP);
  }

  isEqual(a, b) {
    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();

    return a === b || a.indexOf(b) > -1;
  }

  findSchedule(appName, cb) {
    const store = this.store.get(
      createSchedulerStoreKey(
        CONSTANTS.STORE_BOOT_KEY,
        CONSTANTS.SCHEDULER_APP
      ),
      []
    );

    const s = store.find((s) => {
      return this.isEqual(appName, s.payload);
    });

    if (s) cb(s);
  }

  bootstrap() {
    super.bootstrap(CONSTANTS.STORE_BOOT_KEY);

    setInterval(async () => {
      const windows = await openWindows();

      windows.forEach((window) => {
        this.findSchedule(window.owner.name, (s) => {
          if (this.activeSchedule) this.addToQueue(s);
          else this.scheduleShouldShowNotification(s, CONSTANTS.STORE_BOOT_KEY);
        });
      });
    }, 500);
  }

  async getAppInfo(appName) {
    const windows = await openWindows();

    return windows.find((window) => {
      return this.isEqual(appName, window.owner.name);
    });
  }

  killApp(appName) {
    return new Promise(async (resolve, reject) => {
      const appInfo = await this.getAppInfo(appName);

      if (appInfo) {
        const pid = appInfo.owner.processId;

        try {
          await fkill(pid, {
            force: true,
          });
        } catch (err) {
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
    });
  }
}

module.exports = AppScheduler;
