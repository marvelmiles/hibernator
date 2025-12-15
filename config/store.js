const { default: Store } = require("electron-store");
const CONSTANTS = require("./constants");

class AppStore extends Store {
  constructor() {
    super({
      name: "hibernator-settings",
      defaults: {
        [CONSTANTS.STORE_BOOT_KEY]: [
          {
            ...CONSTANTS.DEFAULT_SCHEDULE_PROPS,
            minute: 30,
            hour: 9,
          },
        ],
        [CONSTANTS.STORE_HIB_KEY]: [
          {
            ...CONSTANTS.DEFAULT_SCHEDULE_PROPS,
            minute: 30,
            hour: 17,
          },
        ],
      },
    });
  }
}

module.exports = AppStore;
