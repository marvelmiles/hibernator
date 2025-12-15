const CONSTANTS = require("../config/constants");
const { showHibernateNotification } = require("../notificationWindow");
const Scheduler = require("./scheduler");
const schedule = require("node-schedule");

class HibernateScheduler extends Scheduler {
  constructor(store) {
    super(store);
  }

  add(schedule) {
    const newSchedule = super.add(schedule, CONSTANTS.STORE_HIB_KEY);
    if (newSchedule) this.scheduleJob(newSchedule);
  }

  scheduleJob(s) {
    const entities = this.schedule(s, async () => {
      console.log("schedule reached.", s.hour, s.minute, this.activeSchedule);

      if (!s.repeat) {
        this.cancelJob(s.id);

        const list = this.store.get(CONSTANTS.STORE_HIB_KEY, []).map((sch) => {
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

        showHibernateNotification(this.activeSchedule, CONSTANTS.STORE_HIB_KEY);
      }
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
    const entity = this.entities.find(
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

    this.entities = this.entities.filter((s) => s.id !== scheduleId);
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
