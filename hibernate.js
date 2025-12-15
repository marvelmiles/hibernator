const { spawn } = require("child_process");
const os = require("os");

const _runCommand = (cmd, args = [], callback) => {
  try {
    const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
    child.on("error", (err) => callback(err));
    child.unref();
    callback(null);
  } catch (e) {
    callback(e);
  }
};

const hibernate = (callback = () => {}) => {
  return;
  const platform = os.platform();
  if (platform === "win32") {
    return _runCommand("shutdown", ["/h"], callback);
  } else if (platform === "linux") {
    return _runCommand("systemctl", ["hibernate"], callback);
  } else if (platform === "darwin") {
    return _runCommand("pmset", ["sleepnow"], callback);
  } else {
    return callback(new Error("Unsupported platform"));
  }
};

module.exports = hibernate;
