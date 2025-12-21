const CONSTANTS = require("../config/constants");
const { showHibernateNotification } = require("../windows/notificationWindow");
const Scheduler = require("./scheduler");

class BootScheduler extends Scheduler {
  constructor(store) {
    super(store);
  }

  bootstrap() {
    super.bootstrap(CONSTANTS.STORE_BOOT_KEY);
    this.shouldHibernate();
  }

  scheduleShouldShowNotification(s, canShow) {
    if (s.disable) return false;

    const todayIndex = new Date().getDay();

    const dayIndex = s.days.find(
      (dayIndex) =>
        dayIndex === todayIndex &&
        (canShow || !s.completedTask.includes(todayIndex))
    );

    if (dayIndex !== undefined) {
      const allowedTime = new Date();

      allowedTime.setHours(s.hour, s.minute, 0, 0);

      const now = new Date().getTime();

      if (now < allowedTime.getTime()) {
        if (canShow) {
          showHibernateNotification(s, CONSTANTS.STORE_BOOT_KEY);
          return true;
        } else return this.shouldShowNotification(s, CONSTANTS.STORE_BOOT_KEY);
      }
    }

    return false;
  }

  shouldHibernate() {
    const list = this.store.get(CONSTANTS.STORE_BOOT_KEY, []);

    list.forEach((s) => this.scheduleShouldShowNotification(s));
  }
}

module.exports = BootScheduler;
