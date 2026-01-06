const CONSTANTS = require("../config/constants");
const Scheduler = require("./scheduler");
const { openWindowsSync, openWindows } = require("get-windows");

class SystemScheduler extends Scheduler {
  constructor(store) {
    super(store, CONSTANTS.SCHEDULER_SYSTEM);
  }

  bootstrap(window) {
    super.bootstrap(CONSTANTS.STORE_BOOT_KEY);

    console.log(openWindowsSync());

    setInterval(async () => {
      const windows = await openWindows();

      const store = this.store.get();

      // windows.forEach((window)=>window.)
    }, 500);
  }
}

module.exports = SystemScheduler;
