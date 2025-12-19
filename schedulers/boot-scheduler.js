const CONSTANTS = require("../config/constants");
const Scheduler = require("./scheduler");

class BootScheduler extends Scheduler {
  constructor(store) {
    super(store);
  }

  bootstrap() {
    super.bootstrap(CONSTANTS.STORE_BOOT_KEY);
    this.shouldHibernate();
  }

  shouldHibernate() {
    const list = this.store.get(CONSTANTS.STORE_BOOT_KEY, []);

    const todayIndex = new Date().getDay();

    list.forEach((s) => {
      const dayIndex = s.days.find(
        (dayIndex) =>
          dayIndex === todayIndex && !s.completedTask.includes(todayIndex)
      );

      if (dayIndex !== null) {
        const allowedTime = new Date();

        allowedTime.setHours(s.hour, s.minute, 0, 0);

        const now = new Date().getTime();

        if (now < allowedTime.getTime()) {
          this.shouldShowNotification(s, CONSTANTS.STORE_BOOT_KEY);
        }
      }
    });
  }
}

module.exports = BootScheduler;
