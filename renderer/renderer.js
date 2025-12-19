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
      addBtnEl: document.getElementById(`${domType}_add_btn`),
      closeAddBtnEl: document.getElementById(`${domType}_close_add_btn`),
      scheduleFormEl: document.getElementById(`${domType}_schedule_form`),
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

  const to12HourFromat = (hour24, minute) => {
    let hour = hour24 % 12;
    if (hour === 0) hour = 12;

    return {
      hour,
      minute,
      meridiem: hour24 >= 12 ? "pm" : "am",
    };
  };

  const padWithZero = (value, size = 2) => {
    return String(value).padStart(size, "0");
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
      addBtnEl,
      scheduleFormEl,
      closeAddBtnEl,
    } = getDoms(domType);

    const renderList = async () => {
      const { hibernateSchedules = [], bootSchedules = [] } =
        await api.getStore();

      const schedules = isBoot ? bootSchedules : hibernateSchedules;

      listEl.innerHTML = "";

      schedules.forEach(async (s) => {
        const card = document.createElement("div");

        const { hour, minute, meridiem } = to12HourFromat(s.hour, s.minute);

        card.className = "schedule-card";
        card.dataset.id = s.id;

        // ----- Header -----
        const header = document.createElement("div");
        header.className = "card-header";

        const time = document.createElement("div");
        time.className = "time";
        time.innerHTML = `${padWithZero(hour)}:${padWithZero(
          minute
        )}<span>${meridiem}</span>`;

        const actions = document.createElement("div");
        actions.className = "actions";

        const toggleLabel = document.createElement("label");
        toggleLabel.className = "toggle";

        const toggleInput = document.createElement("input");
        toggleInput.type = "checkbox";
        toggleInput.checked = !s.disable;

        const toggleSpan = document.createElement("span");

        toggleLabel.append(toggleInput, toggleSpan);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.title = "Delete schedule";
        deleteBtn.textContent = "🗑️";

        actions.append(toggleLabel, deleteBtn);
        header.append(time, actions);

        // ----- Meta -----
        const meta = document.createElement("div");
        meta.className = "card-meta";

        meta.innerHTML = `
    <div class="meta-item">🔁 <span>Repeat ${
      s.repeat ? "Weekly" : "Once"
    }</span></div>
    <div class="meta-item">⚙️ <span>${
      {
        very_strict: "Very strict",
        medium_strict: "Medium strict",
        less_strict: "Less strict",
      }[s.mode]
    }</span></div>
  `;

        // ----- Days -----
        const days = document.createElement("div");
        days.className = "days";

        s.days.forEach((dayIndex) => {
          const isActive = !s.disable && !s.completedTask.includes(dayIndex);

          const span = document.createElement("span");
          span.className = `day ${isActive ? "active" : ""}`;
          span.title = isActive ? "Active Schedule" : "Inactive Schedule";

          span.textContent = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][
            dayIndex
          ];
          days.appendChild(span);
        });

        // --- EVENTS ----

        deleteBtn.onclick = async () => {
          if (isBoot) await api.boot.cancelSchedule(s.id);
          else await api.hibernate.cancelSchedule(s.id);

          await renderList();
        };

        toggleInput.onclick = async () => {
          if (isBoot) api.boot.disableSchedule(s.id);
          else api.hibernate.disableSchedule(s.id);
        };

        card.append(header, meta, days);

        listEl.appendChild(card);
      });
    };

    const todaysDate = new Date();

    const { hour, minute, meridiem } = to12HourFromat(
      todaysDate.getHours(),
      todaysDate.getMinutes()
    );

    hourEl.value = hour;

    minuteEl.value = minute;

    meridiemEl.value = meridiem;

    presetsEl.forEach((el) => {
      el.onchange = (e) => {
        const value = e.target.value;
        if (value === "custom") customDaysRootEl.style.display = "block";
        else customDaysRootEl.style.display = "none";
      };
    });

    addBtnEl.onclick = () => {
      scheduleFormEl.style.display = "flex";
    };

    closeAddBtnEl.onclick = () => {
      scheduleFormEl.reset();
      scheduleFormEl.style.display = "none";
    };

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

  // setupDoms("boot");

  setupDoms("hib");
})();
