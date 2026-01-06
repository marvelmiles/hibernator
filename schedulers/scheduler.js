const { dialog } = require("electron");
const CONSTANTS = require("../config/constants");
const { v4: uniqId } = require("uuid");
const {
  joinArr,
  sortDays,
  createSchedulerStoreKey,
} = require("../utils/helper");
const { showHibernateNotification } = require("../windows/notificationWindow");
const { isScheduleActive, isAllowedBootTime } = require("../utils/validators");

class Scheduler {
  constructor(store, schedulerType) {
    this.store = store;
    this.activeSchedule = null;
    this.schedulerType = schedulerType;
    this.queue = [];
  }

  shiftQueue() {
    for (const s of [...this.queue]) {
      if (
        this.scheduleShouldShowNotification(s, parseStoreKey(storeKey).storeKey)
      ) {
        this.queue = this.queue.filter((sch) => sch.id !== s.id);
        break;
      }
    }
  }

  bootstrap(storeKey) {
    const isHib = storeKey === CONSTANTS.STORE_HIB_KEY;

    const list = this.store.get(this.normalizeKey(storeKey), []);

    const valid = [];

    for (const s of list) {
      if (isScheduleActive(s)) {
        if (isHib) this.scheduleJob(s);

        valid.push(s);
      }
    }

    this.store.set(this.normalizeKey(storeKey), valid);
  }

  hasConflict(schedule, storeKey, withEnable = false) {
    let hasConflict = false;

    const isBoot = storeKey === CONSTANTS.STORE_BOOT_KEY;

    let timeConflict = false;

    const withTimeConflict = (schedule, storeKey) => {
      for (const item of this.store.get(this.normalizeKey(storeKey), [])) {
        if (item.disable) continue;

        if (item.hour === schedule.hour && item.minute === schedule.minute) {
          timeConflict = true;
          break;
        }
      }

      return timeConflict;
    };

    const list = this.store.get(this.normalizeKey(storeKey), []);

    const invalid = [];

    const withDayConflict = () => {
      const map = {};

      for (const item of list) {
        if (item.disable) continue;

        for (let i = 0; i < item.days.length; i++) {
          const day = item.days[i];

          if (!map[day] && schedule.days.includes(day)) {
            map[day] = true;

            const dayWord =
              {
                0: "Sunday",
                1: "Monday",
                2: "Tuesday",
                3: "Wednesday",
                4: "Thursday",
                5: "Friday",
                6: "Saturday",
              }[day] || "";

            invalid.push(dayWord);
          }
        }
      }

      return !!invalid.length;
    };

    if (isBoot) {
      hasConflict =
        withTimeConflict(schedule, CONSTANTS.STORE_HIB_KEY) ||
        withTimeConflict(schedule, CONSTANTS.STORE_BOOT_KEY) ||
        withDayConflict();
    } else {
      hasConflict =
        withTimeConflict(schedule, CONSTANTS.STORE_BOOT_KEY) ||
        (withTimeConflict(schedule, CONSTANTS.STORE_HIB_KEY) &&
          withDayConflict());
    }

    if (hasConflict)
      dialog.showErrorBox(
        "Schedule Conflict",
        `Sorry can't ${
          withEnable ? "enable" : "add"
        } schedule. A schedule is active${
          timeConflict ? " at the specified time" : ""
        }${invalid.length ? ` on ${joinArr(sortDays(invalid))}` : ""}.`
      );
    else if (list.length > 10) {
      dialog.showErrorBox("Schedule limit", "Max Schedule Reached.");
      hasConflict = true;
    }

    return hasConflict;
  }

  add(schedule, storeKey) {
    schedule = {
      ...schedule,
      completedTask: [],
      id: uniqId(),
    };

    if (this.hasConflict(schedule, storeKey)) return;

    this.addToStore(schedule, storeKey);

    return schedule;
  }

  setActiveSchedule(schedule) {
    this.activeSchedule = schedule;
  }

  removeFromStore(scheduleId, storeKey) {
    const list = this.store
      .get(this.normalizeKey(storeKey), [])
      .filter((s) => s.id !== scheduleId);

    this.store.set(this.normalizeKey(storeKey), list);
  }

  normalizeKey(storeKey) {
    return createSchedulerStoreKey(storeKey, this.schedulerType);
  }

  addToStore(schedule, storeKey) {
    this.store.set(this.normalizeKey(storeKey), [
      schedule,
      ...this.store.get(this.normalizeKey(storeKey), []),
    ]);
  }

  markTodayTask(scheduleId, storeKey) {
    const list = this.store.get(this.normalizeKey(storeKey), []).map((sch) => {
      const now = new Date();

      if (sch.id === scheduleId) {
        const dayIndex = now.getDay();

        const updatedSchedule = {
          ...sch,
          completedTask: sch.completedTask.includes(dayIndex)
            ? sch.completedTask
            : sch.completedTask.concat(dayIndex),
        };

        if (this.activeSchedule?.id === updatedSchedule?.id)
          this.activeSchedule = updatedSchedule;

        return updatedSchedule;
      }

      return sch;
    });

    this.store.set(this.normalizeKey(storeKey), list);
  }

  shouldShowNotification(schedule, storeKey) {
    const disable = this.store
      .get(this.normalizeKey(storeKey), [])
      .find((s) => s.id === schedule.id)?.disable;

    if (disable) return false;

    const isHib = storeKey === CONSTANTS.STORE_HIB_KEY;

    if (!this.activeSchedule) {
      this.activeSchedule = schedule;

      showHibernateNotification(
        this.activeSchedule,
        storeKey,
        this.schedulerType
      );
    }

    if (!schedule.repeat) {
      if (isHib || isAllowedBootTime(schedule))
        this.markTodayTask(schedule.id, storeKey);

      if (isHib) this.cancelJob(schedule.id);
    }

    return !!this.activeSchedule;
  }

  shouldRemoveActiveScheduleFromList(window, storeKey) {
    if (this.activeSchedule) {
      if (!this.activeSchedule.repeat) {
        if (
          this.activeSchedule.days.length ===
          this.activeSchedule.completedTask.length
        )
          this.removeFromStore(this.activeSchedule.id, storeKey);
      }

      this.activeSchedule = null;
    }

    if (window)
      window.webContents.send(
        storeKey === CONSTANTS.STORE_BOOT_KEY
          ? CONSTANTS.BOOT_LIST_CHANGE
          : CONSTANTS.HIB_LIST_CHANGE
      );
  }

  cancelSchedule(scheduleId, storeKey) {
    const clearAll = scheduleId === undefined;

    if (this.activeSchedule?.id === scheduleId) {
      this.activeSchedule = null;
    }

    const list = clearAll
      ? []
      : this.store
          .get(this.normalizeKey(storeKey), [])
          .filter((s) => s.id !== scheduleId);

    this.store.set(this.normalizeKey(storeKey), list);

    return clearAll;
  }

  toggleDisableSchedule(scheduleId, storeKey) {
    const list = this.store.get(this.normalizeKey(storeKey), []).map((s) => {
      if (s.id === scheduleId) {
        if (s.disable) {
          if (this.hasConflict(s, storeKey, true)) return s;
        }

        if (storeKey === CONSTANTS.STORE_HIB_KEY) {
          const entities = (this.entities || []).filter(
            (e) => e.id === scheduleId
          );

          for (const entity of entities) {
            if (entity.id === scheduleId) {
              if (s.disable) this.scheduleJob(s);
              else this.removeEntity(entity);
            }
          }
        }

        return { ...s, disable: !s.disable };
      } else return s;
    });

    this.store.set(this.normalizeKey(storeKey), list);
  }

  shouldHibernate(window, storeKey, opts) {
    const list = this.store.get(this.normalizeKey(storeKey), []);

    list.forEach((s) => this.scheduleShouldShowNotification(s, opts));

    window.webContents.send(CONSTANTS.BOOT_LIST_CHANGE);
  }

  scheduleShouldShowNotification(s, storeKey, canShow) {
    if (s.disable) return false;

    const todayIndex = new Date().getDay();

    const dayIndex = s.days.find(
      (dayIndex) =>
        dayIndex === todayIndex &&
        (canShow || !s.completedTask.includes(todayIndex))
    );

    if (dayIndex !== undefined) {
      if (isAllowedBootTime(s)) {
        if (!s.repeat) this.markTodayTask(s.id, storeKey);
      } else {
        if (canShow) {
          showHibernateNotification(s, storeKey, this.schedulerType);
          return true;
        } else return this.shouldShowNotification(s, storeKey);
      }
    }

    return false;
  }
}

module.exports = Scheduler;
