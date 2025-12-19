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
      meridiemEl: document.getElementById(`${domType}_meridiem`),
      modeEl: document.getElementById(`${domType}_schedule_mode`),
      scheduleBtnEl: document.getElementById(`${domType}_schedule_btn`),
      listEl: document.getElementById(`${domType}_schedule_list`),
      stopAllBtnEl: document.getElementById(`${domType}_stop_all`),
      presetsEl: document.querySelectorAll(
        `input[name="${domType}_days_preset"]`
      ),
      customDaysRootEl: document.getElementById(
        `${domType}_custom_preset_days`
      ),
      repeatFreqEl: document.getElementById(`${domType}_repeat_freq`),
    };
  };

  const setupDoms = async (domType) => {
    const isBoot = domType === "boot";

    const {
      presetsEl,
      scheduleBtnEl,
      stopAllBtnEl,
      listEl,
      hourEl,
      minuteEl,
      modeEl,
      repeatFreqEl,
      customDaysRootEl,
      meridiemEl,
    } = getDoms(domType);

    const renderList = async () => {
      const { hibernateSchedules = [], bootSchedules = [] } =
        await api.getStore();

      const schedules = isBoot ? bootSchedules : hibernateSchedules;

      listEl.innerHTML = "";

      schedules.forEach(async (s) => {
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
    <div class="minute">Repeat Frequency: ${
      s.repeat ? "Repeat Weekly" : "Repeat Once"
    }</div>
      <div class="minute">Days: ${[
        await api.helpers(
          "join-array",
          s.days.map(
            (dayIndex) =>
              ({
                0: "Sunday",
                1: "Monday",
                2: "Tuesday",
                3: "Wednesday",
                4: "Thursday",
                5: "Friday",
                6: "Saturday",
              }[dayIndex])
          )
        ),
      ]}</div>
    
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

    const now = new Date();

    const hour24 = now.getHours();
    const minute = now.getMinutes();

    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    hourEl.value = hour12;

    minuteEl.value = minute;

    meridiemEl.value = hour24 >= 12 ? "pm" : "am";

    presetsEl.forEach((el) => {
      el.onchange = (e) => {
        const value = e.target.value;
        if (value === "custom") customDaysRootEl.style.display = "block";
        else customDaysRootEl.style.display = "none";
      };
    });

    scheduleBtnEl.onclick = async () => {
      let hour = Number(hourEl.value);
      let minute = Number(minuteEl.value);

      const meridiem = meridiemEl.value;

      if (hour > 12 || hour < 1) {
        showError("Invalid hour value. Should be between 1 - 12.");
        return;
      }

      if (minute > 59 || minute < 0) {
        showError("Invalid minute value. Should be between 0 - 59.");
        return;
      }

      if (meridiem === "am") {
        if (hour === 12) hour = 0;
      } else if (hour !== 12) hour = hour + 12;

      const hibSchType = document.querySelector(
        `input[name="${domType}_days_preset"]:checked`
      );
      const preset = hibSchType.value;

      let days = [];

      switch (preset) {
        case "custom":
          days = Array.from(
            document.querySelectorAll(
              `input[name="${domType}_custom_preset_day"]:checked`
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
