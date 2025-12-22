const { spawn } = require("child_process");
const { dialog } = require("electron");
const os = require("os");

const _runCommand = (cmd, args = []) => {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(cmd, args, { detached: true, stdio: "ignore" });

      child.on("error", reject);

      child.on("exit", (code) => {
        // Windows returns 0 for success, Linux/macOS might differ
        if (code === 0 || code === null) resolve();
        else reject(new Error(`Command exited with code ${code}`));
      });

      child.unref();
    } catch (e) {
      reject(e);
    }
  });
};

const hibernateOrShutdown = async () => {
  const platform = os.platform();

  const onError = () => {
    dialog.showErrorBox(
      "Hibernate Error",
      "Hibernate and Shutdown not supported."
    );
  };

  try {
    // Attempt hibernate if the platform supports it
    if (platform === "win32") {
      await _runCommand("shutdown", ["/h", "/f"]);
    } else if (platform === "linux") {
      await _runCommand("systemctl", ["hibernate", "--force", "--quiet"]);
    } else if (platform === "darwin") {
      await _runCommand("pmset", ["sleepnow"]);
    } else {
      // Any other platform -> treat as unsupported
      throw new Error("Hibernate not supported on this platform");
    }
  } catch (err) {
    // Force shutdown as a fallback
    try {
      if (platform === "win32") {
        await _runCommand("shutdown", ["/s", "/f", "/t", "0"]);
      } else if (platform === "linux") {
        await _runCommand("shutdown", ["-h", "now"]);
      } else if (platform === "darwin") {
        await _runCommand("osascript", [
          "-e",
          'tell app "System Events" to shut down',
        ]);
      } else {
        onError();
      }
    } catch (shutdownErr) {
      onError();
    }
  }
};

module.exports = hibernateOrShutdown;
