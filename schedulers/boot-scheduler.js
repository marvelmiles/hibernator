const CONSTANTS = require("../config/constants");
const { isAllowedBootTime } = require("../utils/validators");
const { showHibernateNotification } = require("../windows/notificationWindow");
const Scheduler = require("./scheduler");

class BootScheduler extends Scheduler {
  constructor(store) {
    super(store);
  }

  bootstrap(window) {
    super.bootstrap(CONSTANTS.STORE_BOOT_KEY);
    this.shouldHibernate(window);
  }

  scheduleShouldShowNotification(s, canShow) {
    if (s.disable) return false;

    const todayIndex = new Date().getDay();

    const dayIndex = s.days.find(
      (dayIndex) =>
        dayIndex === todayIndex &&
        (canShow || !s.completedTask.includes(todayIndex))
    );

    console.log(dayIndex, isAllowedBootTime(s), " day index is allowed...");

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

  shouldHibernate(window) {
    const list = this.store.get(CONSTANTS.STORE_BOOT_KEY, []);

    list.forEach((s) => this.scheduleShouldShowNotification(s));

    window.webContents.send(CONSTANTS.BOOT_LIST_CHANGE);
  }
}

module.exports = BootScheduler;
