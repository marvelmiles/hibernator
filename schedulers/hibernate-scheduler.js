const CONSTANTS = require("../config/constants");
const Scheduler = require("./scheduler");
const schedule = require("node-schedule");

class HibernateScheduler extends Scheduler {
  constructor(store) {
    super(store);
    this.entities = [];
  }

  bootstrap() {
    const list = this.store.get(CONSTANTS.STORE_HIB_KEY, []);

    this.cancelJobs();

    const valid = [];

    for (const s of list) {
      if (isScheduleActive(s)) {
        this.scheduleJob(s);
        valid.push(s);
      }
    }

    this.store.set(CONSTANTS.STORE_HIB_KEY, valid);
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

    console.log("done scheduling job...");
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
    const clearAll = scheduleId === undefined;

    if (this.activeSchedule?.id === scheduleId) this.activeSchedule = null;

    const others = [];

    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];

      if (clearAll) entity.job.cancel();
      else {
        if (entity.id === scheduleId) {
          entity.job.cancel();

          continue;
        }

        others.push(entity);
      }
    }

    this.entities = others;

    const list = clearAll
      ? []
      : this.store
          .get(CONSTANTS.STORE_HIB_KEY, [])
          .filter((s) => s.id !== scheduleId);

    this.store.set(CONSTANTS.STORE_HIB_KEY, list);
  }
}

module.exports = HibernateScheduler;
