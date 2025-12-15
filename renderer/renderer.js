(async () => {
  const api = window.electronApi;

  if (!api) {
    alert("Application Error");
    return;
  }

  const showError = (message) => {
    api.toast(message);
  };

  /**
   * SHARED CONTEXT
   */

  const getDoms = (domType) => {
    return {
      minuteEl: document.getElementById(`${domType}_min`),
      hourEl: document.getElementById(`${domType}_hr`),
      modeEl: document.getElementById(`${domType}_schedule_mode`),
      scheduleBtnEl: document.getElementById(`${domType}_schedule_btn`),
      listEl: document.getElementById(`${domType}_schedule_list`),
      stopAllBtnEl: document.getElementById(`${domType}_stop_all`),
      presetsEl: document.querySelectorAll(
        `input[name="${domType}_days_preset"]`
      ),
      customDaysEl: document.getElementById(`${domType}_days_preset_custom`),
      repeatFreqEl: document.getElementById(`${domType}_repeat_freq`),
    };
  };

  const setupDoms = async (domType) => {
    const isBoot = domType === "boot";

    const {
      presetsEl,
      customDaysEl,
      scheduleBtnEl,
      stopAllBtnEl,
      listEl,
      hourEl,
      minuteEl,
      modeEl,
      repeatFreqEl,
    } = getDoms(domType);

    const renderList = async () => {
      const { hibernateSchedules = [], bootSchedules = [] } =
        await api.getStore();

      const schedules = isBoot ? bootSchedules : hibernateSchedules;

      listEl.innerHTML = "";

      schedules.forEach((s) => {
        const btn = document.createElement("button");

        btn.innerHTML = "Stop";

        btn.onclick = async () => {
          if (isBoot) await api.boot.cancelSchedule(s.id);
          else await api.hibernate.cancelSchedule(s.id);

          await renderList();
        };

        const d = document.createElement("div");

        d.innerHTML = `
          <div class="hour">Hour: ${s.hour}</div>
      <div class="minute">Minute: ${s.minute}</div>
      <div class="level">Mode: ${
        {
          very_strict: "Very Strict",
          less_strict: "Less Strict",
          medium_strict: "Medium Strict",
        }[s.mode]
      }</div>
    
      <div>
    <div class="minute">Schedule Days: ${s.preset}</div>
    </div>
    `;

        d.appendChild(btn);

        const div = document.createElement("div");

        const hr = document.createElement("hr");

        div.appendChild(d);
        div.appendChild(hr);

        listEl.appendChild(div);
      });
    };

    presetsEl.forEach((el) => {
      el.onchange = (e) => {
        const value = e.target.value;
        if (value === "custom") customDaysEl.style.display = "block";
        else customDaysEl.style.display = "none";
      };
    });

    scheduleBtnEl.onclick = async () => {
      const hour = Number(hourEl.value);
      const minute = Number(minuteEl.value);

      if (hour > 23 || hour < 0) {
        showError("Invalid hour value. Should be between 0 - 23.");
        return;
      }
      if (minute > 59 || minute < 0) {
        showError("Invalid minute value. Should be between 0 - 59.");
        return;
      }

      const hibSchType = document.querySelector(
        `input[name="${domType}_days_preset"]:checked`
      );
      const preset = hibSchType.value;

      let days = [];

      switch (preset) {
        case "custom":
          days = Array.from(
            document.querySelectorAll(
              `input[name="${domType}_schedule_day"]:checked`
            )
          ).map((el) => Number(el.value));
          break;
        case "everyday":
          days = [0, 1, 2, 3, 4, 5, 6];
          break;
        case "weekends":
          days = [5, 6, 0];
          break;
        case "weekdays":
          days = [1, 2, 3, 4, 5];
          break;
      }

      if (!days.length) {
        showError("You didn't specify your schedule days.");
        return;
      }

      const schedule = {
        days,
        preset,
        repeat: repeatFreqEl.checked,
        hour,
        minute,
        mode: modeEl.value,
      };

      if (isBoot) await api.boot.addSchedule(schedule);
      else await api.hibernate.addSchedule(schedule);

      await renderList();
    };

    stopAllBtnEl.onclick = async () => {
      if (isBoot) await api.boot.cancelSchedule();
      else await api.hibernate.cancelSchedule();

      await renderList();
    };

    await renderList();

    api.onListChange(`${domType}-list`, async () => {
      await renderList();
    });
  };

  setupDoms("boot");

  setupDoms("hib");
})();
