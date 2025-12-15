const { dialog } = require("electron");
const CONSTANTS = require("./config/constants");
const schedule = require("node-schedule");
const { showHibernateNotification } = require("./notificationWindow");
const { v4: uniqId } = require("uuid");
const { joinArr } = require("./utils/helper");

class Scheduler {
  constructor(store) {
    this.store = store;
    this.hibEntities = [];
    this.bootEntities = [];
    this.activeSchedule = null;
  }

  getEntities(storeKey) {
    return storeKey === CONSTANTS.STORE_BOOT_KEY
      ? this.bootEntities
      : this.hibEntities;
  }

  setEntities(storeKey, entities) {
    if (storeKey === CONSTANTS.STORE_BOOT_KEY)
      this.bootEntities = this.bootEntities.concat(entities);
    else this.hibEntities = this.hibEntities.concat(entities);
  }

  add(schedule, storeKey) {
    const isBoot = storeKey === CONSTANTS.STORE_BOOT_KEY;

    schedule = {
      ...CONSTANTS.DEFAULT_SCHEDULE_PROPS,
      ...schedule,
      storeKey,
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

    this.scheduleJob(schedule, storeKey);
  }

  scheduleJob(s, storeKey) {
    const entities = this.schedule(s, async () => {
      console.log("schedule reached.", s.hour, s.minute);

      if (!s.repeat) {
        this.cancelJob(storeKey, s.id);

        const list = this.store.get(storeKey, []).map((sch) => {
          if (sch.id === s.id) {
            const updatedSchedule = {
              ...sch,
              completedTask: sch.completedTask.push(new Date().getDay()),
            };

            if (this.activeSchedule?.id === updatedSchedule?.id)
              this.activeSchedule = updatedSchedule;

            return updatedSchedule;
          }
          return sch;
        });

        this.store.set(storeKey, list);
      }

      if (!this.activeSchedule) {
        this.activeSchedule = s;

        showHibernateNotification(this.activeSchedule);
      }
    });

    this.setEntities(storeKey, entities);

    console.log("done scheduling...");
  }

  schedule({ hour, minute, days, repeat, id }, cb) {
    const entities = [];

    days.forEach((dayIndex) => {
      if (repeat) {
        const rule = new schedule.RecurrenceRule();
        rule.dayOfWeek = dayIndex;
        rule.hour = hour;
        rule.minute = minute;

        const job = schedule.scheduleJob(rule, cb);
        entities.push({ id, dayIndex, job });
      } else {
        const now = new Date();
        let runDate = new Date(now);
        runDate.setHours(hour, minute, 0, 0);

        // Calculate days difference
        const diff = (dayIndex + 7 - runDate.getDay()) % 7;

        if (diff === 0 && runDate <= now) {
          runDate.setDate(runDate.getDate() + 7); // next week
        } else {
          runDate.setDate(runDate.getDate() + diff);
        }

        const job = schedule.scheduleJob(runDate, cb);
        entities.push({ id, dayIndex, job });
      }
    });

    return entities;
  }

  cancelJobs(storeKey) {
    for (const { job } of this.getEntities(storeKey)) {
      job.cancel();
    }
  }

  cancelJob(storeKey, scheduleId) {
    if (scheduleId === undefined) {
      this.cancelJobs(storeKey);
      this.store.set(storeKey, []);
    } else {
      const entity = this.getEntities(storeKey).find(
        (s) => s.id === scheduleId && new Date().getDay() === s.dayIndex
      );

      if (!entity) {
        dialog.showErrorBox(
          "Cancel Failure",
          "Something went wrong failed to cancel schedule."
        );
        return;
      }

      entity.job.cancel();
    }
  }

  cancelSchedule(scheduleId, storeKey) {
    const clearAll = scheduleId === undefined;

    if (this.activeSchedule?.id === scheduleId) this.activeSchedule = null;

    const others = [];

    const entities = this.getEntities(storeKey);

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      if (clearAll) entity.job.cancel();
      else {
        if (entity.id === scheduleId) {
          entity.job.cancel();

          continue;
        }

        others.push(entity);
      }
    }

    this.setEntities(storeKey, others);

    const list = clearAll
      ? []
      : this.store.get(storeKey, []).filter((s) => s.id !== scheduleId);

    this.store.set(storeKey, list);
  }

  setActiveSchedule(schedule) {
    this.activeSchedule = schedule;
  }

  removeActiveScheduleFromList(window) {
    if (this.activeSchedule) {
      const storeKey = this.activeSchedule.storeKey;

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
