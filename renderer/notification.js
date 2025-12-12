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

  window.notificationApi.onShowNotification(({ seconds, schedule }) => {
    console.log(seconds, schedule);

    let currentSeconds = seconds;

    const id = setInterval(() => {
      currentSeconds = --currentSeconds;

      countdown.innerHTML = `${currentSeconds} second${
        currentSeconds === 0 ? "" : "s"
      } remaining...`;

      if (!currentSeconds) {
        clearInterval(id);
        api.proceed();
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
      api.proceed();
    };

    const mode = schedule.mode;

    const less = mode === "less_strict";

    if (
      (less || mode === "medium_strict") &&
      schedule &&
      schedule.snoozeCount < 3
    )
      snoozeBtn.style.display = "block";

    if (less) cancelBtn.style.display = "block";
  });
})();
