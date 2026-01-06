(async () => {
  const api = window.notificationApi;

  if (!api) {
    alert("Application Error");
    return;
  }

  const countdown = document.getElementById("countdown");
  const snoozeBtn = document.getElementById("snooze");
  const cancelBtn = document.getElementById("cancel");
  const proceedBtn = document.getElementById("proceed");
  const messageEl = document.getElementById("message");

  window.notificationApi.onShowNotification(
    ({ schedule, isBoot, schedulerType }) => {
      const mode = schedule.mode || "less_strict";

      messageEl.innerHTML = `Your system is about to hibernate${
        isBoot ? " because your allowed boot time has not started yet" : ""
      }.${
        mode === "very_strict"
          ? ""
          : " Please save your work or choose an action below."
      }`;

      let currentSeconds =
        {
          very_strict: 5,
          medium_strict: 10,
          less_strict: 15,
        }[schedule.mode] || 45;

      countdown.innerHTML = `${currentSeconds} seconds remaining...`;

      const id = setInterval(() => {
        currentSeconds = --currentSeconds;

        countdown.innerHTML = `${currentSeconds} second${
          currentSeconds === 0 ? "" : "s"
        } remaining...`;

        if (!currentSeconds) {
          clearInterval(id);
          api.proceed(schedulerType, schedule.payload);
        }
      }, 1000);

      cancelBtn.onclick = () => {
        clearInterval(id);
        api.closeNotification();
      };

      snoozeBtn.onclick = () => {
        clearInterval(id);
        api.snooze();
      };

      proceedBtn.onclick = () => {
        clearInterval(id);
        api.proceed(schedulerType, schedule.payload);
      };

      const less = mode === "less_strict";

      if (
        (less || mode === "medium_strict") &&
        schedule &&
        schedule.snoozeCount < 3
      )
        snoozeBtn.style.display = "block";

      if (less) cancelBtn.style.display = "block";
    }
  );
})();
