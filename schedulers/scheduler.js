const { dialog } = require("electron");
const CONSTANTS = require("../config/constants");
const { v4: uniqId } = require("uuid");
const { joinArr } = require("../utils/helper");

class Scheduler {
  constructor(store) {
    this.store = store;
    this.activeSchedule = null;
    this.entities = [];
  }

  add(schedule, storeKey) {
    const isBoot = storeKey === CONSTANTS.STORE_BOOT_KEY;

    schedule = {
      ...CONSTANTS.DEFAULT_SCHEDULE_PROPS,
      ...schedule,
      id: uniqId(),
    };

    const list = this.store.get(storeKey, []);

    const invalid = [];

    const hasConflict = (() => {
      let sameTime = false;

      const map = {};

      for (const item of list) {
        if (!sameTime)
          sameTime =
            item.hour === schedule.hour && item.minute === schedule.minute;

        for (let i = 0; i < item.days.length; i++) {
          const day = item.days[i];

          if (!map[day] && schedule.days.includes(day)) {
            map[day] = true;

            const dayWord =
              {
                0: "sunday",
                1: "monday",
                2: "tuesday",
                3: "wednesday",
                4: "thursday",
                5: "friday",
                6: "saturday",
              }[day] || "";

            invalid.push(dayWord);
          }
        }
      }

      if (isBoot) return !!invalid.length;

      return sameTime && !!invalid.length;
    })();

    if (hasConflict) {
      dialog.showErrorBox(
        "Schedule Conflict",
        `Sorry can't add schedule. A schedule is active${
          isBoot ? "" : " at the specified time"
        } on ${joinArr(invalid)}.`
      );
      return;
    }

    if (list.length > 7) {
      dialog.showErrorBox("Schedule limit", "Max Schedule Reached.");
      return;
    }

    list.push(schedule);

    this.store.set(storeKey, list);

    console.log("done scheduling...");

    return schedule;
  }

  setActiveSchedule(schedule) {
    this.activeSchedule = schedule;
  }

  removeActiveScheduleFromList(storeKey, window) {
    if (this.activeSchedule) {
      if (
        this.activeSchedule.days.length ===
        this.activeSchedule.completedTask.length
      ) {
        const list = this.store
          .get(storeKey, [])
          .filter((s) => s.id !== this.activeSchedule.id);

        this.store.set(storeKey, list);
      }

      this.activeSchedule = null;

      if (window)
        window.webContents.send(
          storeKey === CONSTANTS.STORE_BOOT_KEY
            ? CONSTANTS.BOOT_LIST_CHANGE
            : CONSTANTS.HIB_LIST_CHANGE
        );
    }
  }
}

module.exports = Scheduler;
