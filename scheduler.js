const { dialog } = require("electron");
const CONSTANTS = require("./config/constants");
const schedule = require("node-schedule");
const { showHibernateNotification } = require("./notificationWindow");
const { v4: uniqId } = require("uuid");

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

      if (
        list.find(
          (item) =>
            item.hour === schedule.hour && item.minute === schedule.minute
        )
      ) {
        dialog.showErrorBox(
          "Schedule Conflict",
          "Sorry can't add schedule. A schedule is active at the specified time."
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
        this.cancel(actionName, s.id, !!this.activeSchedule || false);

        if (!s.repeat) {
          const list = this.store.get(CONSTANTS.STORE_HIB_KEY, []).map((sch) =>
            sch.id === s.id
              ? {
                  ...sch,
                  completedTask: sch.completedTask.push(new Date().getDay()),
                }
              : sch
          );

          this.store.set(CONSTANTS.STORE_HIB_KEY, list);
        }

        if (!this.activeSchedule) {
          this.activeSchedule = s;

          showHibernateNotification(this.activeSchedule);
        }
      });

      this.hibSchedules = this.hibSchedules.concat(jobs);
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

  cancel(actionName, id, filterList = true) {
    if (actionName === "hibernate") {
      if (id === undefined) {
        this.cancelJobs(actionName);
        this.store.set(CONSTANTS.STORE_HIB_KEY, []);
      } else {
        if (filterList) {
          const list = this.store
            .get(CONSTANTS.STORE_HIB_KEY, [])
            .filter((s) => s.id !== id);

          this.store.set(CONSTANTS.STORE_HIB_KEY, list);
        }

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

  setActiveSchedule(schedule) {
    this.activeSchedule = schedule;
  }

  removeActiveScheduleFromList(window) {
    if (this.activeSchedule) {
      const list = this.store
        .get(CONSTANTS.STORE_HIB_KEY, [])
        .filter((s) => s.id !== this.activeSchedule.id);

      this.store.set(CONSTANTS.STORE_HIB_KEY, list);
      this.activeSchedule = null;

      if (window) window.webContents.send(CONSTANTS.HIB_LIST_CHANGE);
    }
  }
}

module.exports = Scheduler;
