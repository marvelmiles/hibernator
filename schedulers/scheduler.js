const { dialog } = require("electron");
const CONSTANTS = require("../config/constants");
const { v4: uniqId } = require("uuid");
const { joinArr, sortDays } = require("../utils/helper");
const { showHibernateNotification } = require("../windows/notificationWindow");
const { isScheduleActive } = require("../utils/validators");

class Scheduler {
  constructor(store) {
    this.store = store;
    this.activeSchedule = null;
  }

  bootstrap(storeKey) {
    const isHib = storeKey === CONSTANTS.STORE_HIB_KEY;

    const list = this.store.get(storeKey, []);

    const valid = [];

    for (const s of list) {
      if (isScheduleActive(s)) {
        if (isHib) this.scheduleJob(s);

        valid.push(s);
      }
    }

    this.store.set(storeKey, valid);
  }

  hasConflict(schedule, storeKey, withEnable = false) {
    const invalid = [];

    let hasConflict = false,
      sameTime = false;

    const map = {};

    const list = this.store.get(storeKey, []);

    const isBoot = storeKey === CONSTANTS.STORE_BOOT_KEY;

    for (const item of list) {
      if (item.disable) continue;

      if (!sameTime)
        sameTime =
          item.hour === schedule.hour && item.minute === schedule.minute;

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

    if (isBoot) hasConflict = !!invalid.length;
    else hasConflict = sameTime && !!invalid.length;

    if (hasConflict)
      dialog.showErrorBox(
        "Schedule Conflict",
        `Sorry can't ${
          withEnable ? "enable" : "add"
        } schedule. A schedule is active${
          isBoot ? "" : " at the specified time"
        }${invalid.length ? ` on ${joinArr(sortDays(invalid))}` : ""}.`
      );
    else if (list.length > 7) {
      dialog.showErrorBox("Schedule limit", "Max Schedule Reached.");
      hasConflict = true;
    }

    return hasConflict;
  }

  add(schedule, storeKey) {
    schedule = {
      ...CONSTANTS.DEFAULT_SCHEDULE_PROPS,
      ...schedule,
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
      .get(storeKey, [])
      .filter((s) => s.id !== scheduleId);

    this.store.set(storeKey, list);
  }

  addToStore(schedule, storeKey) {
    this.store.set(storeKey, [schedule, ...this.store.get(storeKey, [])]);
  }

  markTodayTask(scheduleId, storeKey) {
    const list = this.store.get(storeKey, []).map((sch) => {
      if (sch.id === scheduleId) {
        const updatedSchedule = {
          ...sch,
          completedTask: sch.completedTask.concat(new Date().getDay()),
        };

        if (this.activeSchedule?.id === updatedSchedule?.id)
          this.activeSchedule = updatedSchedule;

        return updatedSchedule;
      }

      return sch;
    });

    this.store.set(storeKey, list);
  }

  shouldShowNotification(schedule, storeKey) {
    const disable = this.store
      .get(storeKey, [])
      .find((s) => s.id === schedule.id)?.disable;

    console.log(disable, "shoul noti");

    if (disable) return;

    const isHib = storeKey === CONSTANTS.STORE_HIB_KEY;

    if (!this.activeSchedule) {
      this.activeSchedule = schedule;

      showHibernateNotification(this.activeSchedule, storeKey);
    }

    if (!schedule.repeat) {
      this.markTodayTask(schedule.id, storeKey);

      if (isHib) this.cancelJob(schedule.id);
    }
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
      : this.store.get(storeKey, []).filter((s) => s.id !== scheduleId);

    this.store.set(storeKey, list);

    return clearAll;
  }

  toggleDisableSchedule(scheduleId, storeKey) {
    const list = this.store.get(storeKey, []).map((s) => {
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

    this.store.set(storeKey, list);
  }
}

module.exports = Scheduler;
