const { dialog } = require("electron");
const CONSTANTS = require("./config/constants");
const schedule = require("node-schedule");
const { showHibernateNotification } = require("./notificationWindow");
const { v4: uniqId } = require("uuid");
const { joinArr } = require("./utils/helper");

class Scheduler {
  constructor(store) {
    this.store = store;
    this.hibSchedules = [];
    this.activeSchedule = null;
  }

  add(actionName, schedule) {
    schedule = {
      ...CONSTANTS.DEFAULT_SCHEDULE_PROPS,
      ...schedule,
      id: uniqId(),
    };

    if (actionName === "hibernate") {
      const list = this.store.get(CONSTANTS.STORE_HIB_KEY, []);

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

        return sameTime && !!invalid.length;
      })();

      if (hasConflict) {
        dialog.showErrorBox(
          "Schedule Conflict",
          `Sorry can't add schedule. A schedule is active at the specified time on ${joinArr(
            invalid
          )}.`
        );
        return;
      }

      if (list.length > 7) {
        dialog.showErrorBox("Schedule limit", "Max Schedule Reached.");
        return;
      }

      list.push(schedule);

      this.store.set(CONSTANTS.STORE_HIB_KEY, list);

      this.scheduleJob(actionName, schedule);
    } else {
    }
  }

  scheduleJob(actionName, s) {
    if (actionName === "hibernate") {
      const jobs = this.schedule(s, async () => {
        console.log("schedule reached.", s.hour, s.minute);

        if (!s.repeat) {
          this.cancelJob(actionName, s.id);

          const list = this.store
            .get(CONSTANTS.STORE_HIB_KEY, [])
            .map((sch) => {
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

          this.store.set(CONSTANTS.STORE_HIB_KEY, list);
        }

        if (!this.activeSchedule) {
          this.activeSchedule = s;

          showHibernateNotification(this.activeSchedule);
        }
      });

      this.hibSchedules = this.hibSchedules.concat(jobs);
      console.log("done scheduling...");
    }
  }

  schedule({ hour, minute, days, repeat, id }, cb) {
    const jobs = [];

    days.forEach((dayIndex) => {
      if (repeat) {
        const rule = new schedule.RecurrenceRule();
        rule.dayOfWeek = dayIndex;
        rule.hour = hour;
        rule.minute = minute;

        const job = schedule.scheduleJob(rule, cb);
        jobs.push({ id, dayIndex, job });
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
        jobs.push({ id, dayIndex, job });
      }
    });

    return jobs;
  }

  cancelJobs(actionName) {
    if (actionName === "hibernate") {
      for (const { job } of this.hibSchedules) {
        job.cancel();
      }
    }
  }

  cancelJob(actionName, id) {
    if (actionName === "hibernate") {
      if (id === undefined) {
        this.cancelJobs(actionName);
        this.store.set(CONSTANTS.STORE_HIB_KEY, []);
      } else {
        const sch = this.hibSchedules.find(
          (s) => s.id === id && new Date().getDay() === s.dayIndex
        );

        if (!sch) {
          dialog.showErrorBox(
            "Cancel Failure",
            "Something went wrong failed to cancel schedule."
          );
          return;
        }

        sch.job.cancel();
      }
    }
  }

  cancelSchedule(sid, actionName = "hibernate") {
    const clearAll = sid === undefined;

    if (this.activeSchedule?.id === sid) this.activeSchedule = null;

    if (actionName === "hibernate") {
      const others = [];

      for (let i = 0; i < this.hibSchedules.length; i++) {
        const entity = this.hibSchedules[i];

        if (clearAll) entity.job.cancel();
        else {
          if (entity.id === sid) {
            entity.job.cancel();

            continue;
          }

          others.push(entity);
        }
      }

      this.hibSchedules = others;

      const list = clearAll
        ? []
        : this.store
            .get(CONSTANTS.STORE_HIB_KEY, [])
            .filter((s) => s.id !== sid);

      this.store.set(CONSTANTS.STORE_HIB_KEY, list);
    }
  }

  setActiveSchedule(schedule) {
    this.activeSchedule = schedule;
  }

  removeActiveScheduleFromList(window) {
    if (this.activeSchedule) {
      if (
        this.activeSchedule.days.length ===
        this.activeSchedule.completedTask.length
      ) {
        const list = this.store
          .get(CONSTANTS.STORE_HIB_KEY, [])
          .filter((s) => s.id !== this.activeSchedule.id);

        this.store.set(CONSTANTS.STORE_HIB_KEY, list);
      }

      this.activeSchedule = null;

      if (window) window.webContents.send(CONSTANTS.HIB_LIST_CHANGE);
    }
  }
}

module.exports = Scheduler;
