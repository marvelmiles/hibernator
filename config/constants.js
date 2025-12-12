const CONSTANTS = {
  GET_STORE: "get-store",
  ADD_HIB_SCHEDULE: "add-hib-schedule",
  CANCEL_HIB_SCHEDULE: "cancel-hib-schedule",
  STORE_HIB_KEY: "hibernateSchedules",
  STORE_BOOT_KEY: "allowedBootSchedule",
  DEFAULT_SCHEDULE_PROPS: {
    mode: "very_strict",
    preset: "weekdays",
    days: [1, 2, 3, 4, 5], // zero-based day index
    repeat: true,
    snoozeCount: 0,
    completedTask: [],
  },
  MESSAGE_DIALOG: "message-dialog",
  HIB_LIST_CHANGE: "hib-list",
  MAX_SNOOZE_COUNT: 3,
  COUNTDOWN: 15,
};

module.exports = CONSTANTS;
