const { dialog, app } = require("electron");
const CONSTANTS = require("../config/constants");
const Scheduler = require("./scheduler");
const schedule = require("node-schedule");

class HibernateScheduler extends Scheduler {
  constructor(store) {
    super(store);
    this.entities = [];
  }

  bootstrap() {
    this.cancelJobs();
    super.bootstrap(CONSTANTS.STORE_HIB_KEY);
  }

  add(schedule) {
    const newSchedule = super.add(schedule, CONSTANTS.STORE_HIB_KEY);
    if (newSchedule) this.scheduleJob(newSchedule);
  }

  scheduleJob(s) {
    const entities = this.schedule(s, async () => {
      this.shouldShowNotification(s, CONSTANTS.STORE_HIB_KEY);
    });

    this.entities = entities;
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

  cancelJobs() {
    for (const { job } of this.entities) {
      job.cancel();
    }

    this.entities = [];
  }

  cancelJob(scheduleId) {
    const todayIndex = new Date().getDay();

    const entity = this.entities.find(
      (s) => s.id === scheduleId && todayIndex === s.dayIndex
    );

    if (!entity) {
      if (!app.isPackaged)
        dialog.showErrorBox(
          "Cancel Failure",
          "Something went wrong failed to cancel schedule."
        );

      return;
    }

    entity.job.cancel();

    this.entities = this.entities.filter(
      (s) => s.id !== scheduleId && todayIndex === s.dayIndex
    );
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

module.exports = HibernateScheduler;
