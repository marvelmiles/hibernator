const { app, nativeImage } = require("electron");
const path = require("path");

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

  const iconPath = path.join(process.cwd(), iconFile);

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

module.exports = { joinArr, setAppIcon, sortDays };
