const { dialog, app } = require("electron");
const CONSTANTS = require("../config/constants");
const Scheduler = require("./scheduler");
const schedule = require("node-schedule");

class JobScheduler extends Scheduler {
  constructor(store, schedulerType) {
    super(store, schedulerType);
    this.entities = [];
  }

  createScheduleJob(schedule) {
    const newSchedule = super.add(schedule, CONSTANTS.STORE_HIB_KEY);
    if (newSchedule) this.scheduleJob(newSchedule);

    return newSchedule;
  }

  scheduleJob(s) {
    const entities = this.schedule(s, () => {
      this.shouldShowNotification(s, CONSTANTS.STORE_HIB_KEY);
    });

    this.entities = [...entities, ...this.entities];
  }

  schedule({ hour, minute, days, repeat, id, disable }, cb) {
    if (disable) return [];

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

  cancelJobs() {
    for (const { job } of this.entities) {
      job.cancel();
    }

    this.entities = [];
  }

  removeEntity(entity) {
    entity.job.cancel();

    this.entities = this.entities.filter(
      (e) => e.id !== entity.id || entity.dayIndex !== e.dayIndex
    );
  }

  cancelJob(scheduleId, dayIndex = new Date().getDay()) {
    const entity = this.entities.find(
      (s) => s.id === scheduleId && dayIndex === s.dayIndex
    );

    if (!entity) {
      if (!app.isPackaged)
        dialog.showErrorBox(
          "Cancel Failure",
          "Something went wrong failed to cancel schedule."
        );

      return;
    }

    this.removeEntity(entity);
  }

  cancelSchedule(scheduleId) {
    const clearAll = super.cancelSchedule(scheduleId, CONSTANTS.STORE_HIB_KEY);

    const otherEntities = [];

    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];

      if (clearAll) entity.job.cancel();
      else {
        if (entity.id === scheduleId) {
          entity.job.cancel();

          continue;
        }

        otherEntities.push(entity);
      }
    }

    this.entities = otherEntities;
  }
}

module.exports = JobScheduler;
