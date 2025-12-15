const CONSTANTS = require("../config/constants");
const { showHibernateNotification } = require("../notificationWindow");
const Scheduler = require("./scheduler");

class BootScheduler extends Scheduler {
  constructor(store) {
    super(store);
  }

  shouldHibernate() {
    const list = this.store.get(CONSTANTS.STORE_BOOT_KEY, []);

    const todayIndex = new Date().getDay();

    const schedule = list.find((s) => s.dayIndex === todayIndex);

    if (schedule) {
      const allowedTime = new Date();

      allowedTime.setHours(schedule.hour, schedule.minute, 0, 0);

      const now = new Date().getTime();

      if (now < allowedTime.getTime()) {
        showHibernateNotification(schedule, CONSTANTS.STORE_BOOT_KEY);
      }
    }
  }
  removeActiveScheduleFromList() {}
  setActiveSchedule() {}
}

module.exports = BootScheduler;
