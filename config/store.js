const { default: Store } = require("electron-store");
const CONSTANTS = require("./constants");

class AppStore extends Store {
  constructor() {
    super({
      name: "hibernator-settings",
      defaults: {
        [CONSTANTS.STORE_BOOT_KEY]: [],
        [CONSTANTS.STORE_HIB_KEY]: [],
        [CONSTANTS.APP_INITIAL_GUIDE_OEPENED]: true,
        [CONSTANTS.APP_HAS_UPDATE]: false,
      },
    });
  }
}

module.exports = AppStore;
