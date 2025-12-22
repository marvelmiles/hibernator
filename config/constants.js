const { app } = require("electron");

const CONSTANTS = {
  GET_STORE: "get-store",
  ADD_HIB_SCHEDULE: "add-hib-schedule",
  CANCEL_HIB_SCHEDULE: "cancel-hib-schedule",
  DISABLE_HIB_SCHEDULE: "disable-hib-schedule",
  ADD_BOOT_SCHEDULE: "add-boot-schedule",
  CANCEL_BOOT_SCHEDULE: "cancel-boot-schedule",
  DISABLE_BOOT_SCHEDULE: "disable-boot-schedule",
  STORE_HIB_KEY: "hibernateSchedules",
  STORE_BOOT_KEY: "bootSchedules",
  DEFAULT_SCHEDULE_PROPS: {
    mode: "very_strict",
    preset: "weekdays",
    days: [1, 2, 3, 4, 5], // zero-based day index
    repeat: true,
    snoozeCount: 0,
    completedTask: [],
    disable: false,
  },
  MESSAGE_DIALOG: "message-dialog",
  HIB_LIST_CHANGE: "hib-list",
  BOOT_LIST_CHANGE: "boot-list",
  MAX_SNOOZE_COUNT: 3,
  APP_ROOT_DIRECTORY: app.getAppPath(),
  OPEN_APP_INITIAL_GUIDE: "OPEN_APP_INITIAL_GUIDE",
};

module.exports = CONSTANTS;
