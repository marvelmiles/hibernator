const { app, nativeImage, screen } = require("electron");
const path = require("path");
const CONSTANTS = require("../config/constants");

const joinArr = (arr, sep = ", ", lastSep = " and ") => {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]}${lastSep}${arr[1]}`;

  const others = arr.slice(0, -1).join(sep);
  const last = arr[arr.length - 1];
  return `${others}${lastSep}${last}`;
};

const setAppIcon = () => {
  let iconFile;

  switch (process.platform) {
    case "darwin":
      iconFile = "icon.icns";
      break;
    case "win32":
      iconFile = "icon.ico";
      break;
    default:
      iconFile = "icon.png";
  }

  const iconPath = path.join(CONSTANTS.APP_ROOT_DIRECTORY, iconFile);

  if (app.dock && process.platform === "darwin") {
    const dockIcon = nativeImage.createFromPath(iconPath);
    app.dock.setIcon(dockIcon);
  }

  return iconPath;
};

const sortDays = (days) => {
  const DAYS_ORDER = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  return [...days].sort(
    (a, b) =>
      DAYS_ORDER.indexOf(a.toLowerCase()) - DAYS_ORDER.indexOf(b.toLowerCase())
  );
};

/**
 * Clamp window size to parent + screen, and optionally watch parent resize.
 * @param {object} options
 * @param {number} options.width - Desired width
 * @param {number} options.height - Desired height
 * @param {BrowserWindow} [options.parent] - Optional parent window
 */
const clampWindowSize = ({ width, height, parent }) => {
  const display = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = display.workArea;

  const parentBounds = parent
    ? parent.getContentBounds()
    : { width: screenWidth, height: screenHeight };

  const clampedWidth = Math.min(width, parentBounds.width, screenWidth);
  const clampedHeight = Math.min(height, parentBounds.height, screenHeight);

  return {
    x: parentBounds.width - clampedWidth,
    y: 0,
    width: clampedWidth,
    height: clampedHeight,
  };
};

const withAppUpdate = (store) => {
  return store.get(CONSTANTS.APP_HAS_UPDATE, false);
};

module.exports = {
  joinArr,
  setAppIcon,
  sortDays,
  clampWindowSize,
  withAppUpdate,
};
