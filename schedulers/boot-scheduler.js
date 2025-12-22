const CONSTANTS = require("../config/constants");
const { isAllowedBootTime } = require("../utils/validators");
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
      if (isAllowedBootTime(s)) {
        if (!s.repeat) this.markTodayTask(s.id, CONSTANTS.STORE_BOOT_KEY);
      } else {
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
