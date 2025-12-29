(async () => {
  const api = window.electronApi;

  if (!api) {
    alert("Application Error");
    return;
  }

  const showDialog = async (message, type) => {
    return await api.toast(message, type);
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
      modeDescEl: document.getElementById(`${domType}_mode_desc`),
    };
  };

  const to12HourFromat = (hour24, minute) => {
    let hour = hour24 % 12;
    if (hour === 0) hour = 12;

    return {
      hour,
      minute,
      meridiem: hour24 >= 12 && hour24 < 24 ? "pm" : "am",
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
      modeDescEl,
    } = getDoms(domType);

    const getSchedules = async () => {
      const { hibernateSchedules = [], bootSchedules = [] } =
        await api.getStore();

      return isBoot ? bootSchedules : hibernateSchedules;
    };

    const renderList = async () => {
      const schedules = await getSchedules();

      if (schedules.length) stopAllBtnEl.classList.remove("disable");
      else stopAllBtnEl.classList.add("disable");

      stopAllBtnEl.disabled = !schedules.length;

      listEl.innerHTML = "";

      schedules.forEach(async (s) => {
        if (!s) return;

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
        toggleLabel.title = s.disable ? "Enable Schedule" : "Disable Schedule";

        const toggleSpan = document.createElement("span");

        toggleLabel.append(toggleInput, toggleSpan);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "icon-btn delete-btn btn-danger text-danger";
        deleteBtn.title = "Delete schedule";
        deleteBtn.innerHTML = `
        <svg
  xmlns="http://www.w3.org/2000/svg"
  width="18"
  height="18"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  style="min-width: 18px; min-height: 18px;"
>
  <rect x="3" y="2" width="12" height="3" rx="1" ry="1"/>
  <rect x="4" y="5" width="10" height="11" rx="2" ry="2"/>
</svg>

        `;

        actions.append(toggleLabel, deleteBtn);
        header.append(time, actions);

        // ----- Meta -----
        const meta = document.createElement("div");
        meta.className = "card-meta";

        meta.innerHTML = `
    <div class="meta-item">${s.repeat ? "🔁" : "🔁¹"} <span>Repeat ${
          s.repeat ? "Weekly" : "Once"
        }</span></div>
    <div class="meta-item">⚙️ <span>${
      {
        very_strict: "Strict",
        medium_strict: "Moderate",
        less_strict: "Flexible",
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
          const response = await showDialog(
            "Do you want to delete this schedule?",
            "question"
          );

          if (response === 0) {
            if (isBoot) await api.boot.cancelSchedule(s.id);
            else await api.hibernate.cancelSchedule(s.id);

            await renderList();
          }
        };

        toggleInput.onclick = async () => {
          if (isBoot) api.boot.disableSchedule(s.id);
          else api.hibernate.disableSchedule(s.id);
          await renderList();
        };

        card.append(header, meta, days);

        listEl.appendChild(card);
      });
    };

    const resetTimeValues = () => {
      const todaysDate = new Date();

      const { hour, minute, meridiem } = to12HourFromat(
        todaysDate.getHours() + 1,
        todaysDate.getMinutes()
      );

      hourEl.value = hour;

      minuteEl.value = minute;

      meridiemEl.value = meridiem;
    };

    presetsEl.forEach((el) => {
      el.onchange = (e) => {
        const value = e.target.value;
        if (value === "custom") customDaysRootEl.style.display = "block";
        else customDaysRootEl.style.display = "none";
      };
    });

    modeEl.onchange = (e) => {
      const value = e.target.value;
      switch (value) {
        case "less_strict":
          modeDescEl.innerHTML = "You can cancel or snooze hibernation.";
          break;
        case "medium_strict":
          modeDescEl.innerHTML = "You are allowed to snooze hibernation only.";
          break;
        default:
          modeDescEl.innerHTML =
            "Your device will be hibernated. Enjoy your time.";
          break;
      }
    };

    addBtnEl.onclick = () => {
      scheduleFormEl.reset();
      resetTimeValues();
      customDaysRootEl.style.display = "none";
      modeDescEl.innerHTML = "Your device will be hibernated. Enjoy your time.";
      scheduleFormEl.style.display = "flex";
    };

    const onCloseAddSchedule = () => {
      scheduleFormEl.style.display = "none";
    };

    closeAddBtnEl.onclick = onCloseAddSchedule;

    scheduleBtnEl.onclick = async () => {
      let hour = Number(hourEl.value);
      let minute = Number(minuteEl.value);

      const meridiem = meridiemEl.value;

      if (hour > 12 || hour < 1) {
        await showDialog("Invalid hour value. Should be between 1 - 12.");
        return;
      }

      if (minute > 59 || minute < 0) {
        await showDialog("Invalid minute value. Should be between 0 - 59.");
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
        await showDialog("You didn't specify your schedule days.");
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

      let isValid = false;

      if (isBoot) isValid = !!(await api.boot.addSchedule(schedule));
      else isValid = !!(await api.hibernate.addSchedule(schedule));

      if (!isValid) return;

      onCloseAddSchedule();

      await renderList();
    };

    stopAllBtnEl.onclick = async () => {
      const response = await showDialog(
        "Do you want to stop all schedules?",
        "question"
      );

      if (response === 0) {
        if (isBoot) await api.boot.cancelSchedule();
        else await api.hibernate.cancelSchedule();

        await renderList();
      }
    };

    await renderList();

    api.onListChange(`${domType}-list`, async () => {
      await renderList();
    });
  };

  const hibNowBtn = document.getElementById("hib-now");

  hibNowBtn.onclick = async () => {
    const response = await showDialog("", "question");

    if (response === 0) api.helpers("hibernate");
  };

  const createScheduleSection = async (sectionName, hasClose = false) => {
    const label = hasClose ? "close" : "allowed";

    const domType = `${sectionName}_${label}`;

    const getInstalledAppOptions = async () => {
      const apps = await api.helpers("get-installed-apps");

      return apps
        .map((a) => `<option value=${a.name}>${a.name}</option>`)
        .join("");
    };

    const renderAddon = async () => {
      switch (sectionName) {
        case "app":
          return `
       <label>
                App:
                <select id="${domType}_addon_list">
                <option value="" selected>Select App</option>
                ${await getInstalledAppOptions()}
                </select>
          </label>
          <hr />
      `;
      }
    };

    return `
    <section>
      <div class="header-row">
        <h2 class="title">${
          {
            app: `${label} Time Schedules`,
          }[sectionName]
        }</h2>

        <div class="buttons-row">
          <button
            type="button"
            id="${domType}_add_btn"
            class="icon-btn btn-primary"
            title="Add schedule"
            aria-label="Add schedule"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="9" y1="4" x2="9" y2="14" />
              <line x1="4" y1="9" x2="14" y2="9" />
            </svg>
          </button>

          <button
            type="button"
            id="${domType}_stop_all"
            class="icon-btn btn-danger"
            title="Stop all schedules"
            aria-label="Stop all schedules"
          >
            ⏹
          </button>
        </div>
      </div>

      <div id="${domType}_content">
        <form class="schedule-form" id="${domType}_schedule_form">
      ${await renderAddon()} 
          <div class="time-row">
            <label>
              Hour:
              <input
                id="${domType}_hr"
                type="number"
                min="1"
                max="12"
                value="12"
              />
            </label>

            <label>
              Minute:
              <input
                id="${domType}_min"
                type="number"
                min="0"
                max="59"
                value="1"
              />
            </label>

            <select id="${domType}_meridiem">
              <option value="am" selected>AM</option>
              <option value="pm">PM</option>
            </select>
          </div>

          <hr />

          <div class="days-row">
            <label>
              <input
                type="radio"
                name="${domType}_days_preset"
                value="everyday"
              />
              Everyday
            </label>

            <label>
              <input
                type="radio"
                name="${domType}_days_preset"
                value="weekdays"
                checked
                id="${domType}_default_days_preset"
              />
              Weekdays
            </label>

            <label>
              <input
                type="radio"
                name="${domType}_days_preset"
                value="weekends"
              />
              Weekends
            </label>

            <label>
              <input
                type="radio"
                id="${domType}_days_preset_custom"
                name="${domType}_days_preset"
                value="custom"
              />
              Custom
            </label>
          </div>

          <div
            class="custom-days"
            id="${domType}_custom_preset_days"
            style="display: none"
          >
            ${[0, 1, 2, 3, 4, 5, 6]
              .map(
                (day) => `
              <label>
                <input
                  type="checkbox"
                  value="${day}"
                  name="${domType}_custom_preset_day"
                />
                ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}
              </label>
            `
              )
              .join("")}
          </div>

          <hr />

          <div class="repeat-mode-row">
            <div>
              <label>
                <input
                  type="checkbox"
                  id="${domType}_repeat_freq"
                  checked
                />
                Repeat Weekly
              </label>
              <hr />
            </div>

            <div>
              <label>
                Mode:
                <select id="${domType}_schedule_mode">
                  <option value="less_strict">Flexible</option>
                  <option value="medium_strict">Moderate</option>
                  <option value="very_strict" selected>Strict</option>
                </select>
              </label>

              <p class="mode-desc" id="${domType}_mode_desc">
                Your device will be managed. Enjoy your time.
              </p>

              <hr />
            </div>
          </div>

          <div class="buttons-row">
            <button
              type="button"
              id="${domType}_close_add_btn"
              class="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="button"
              id="${domType}_schedule_btn"
              class="btn-primary"
            >
              Schedule
            </button>
          </div>
        </form>

        <hr />
        <div
          id="${domType}_schedule_list"
          class="schedule_list"
        ></div>
      </div>
    </section>
  `;
  };

  const tabsContentEl = document.getElementById("tabs-content");

  const tabBtns = document.querySelectorAll(".tab");

  tabsContentEl.innerHTML = [
    `
 <div class="tab-content active" id="app-tab-content"> 

 ${[
   await createScheduleSection("app"),
   await createScheduleSection("app", true),
 ].join("")}
 </div>
 `,
    `
  <div class="tab-content" id="system-tab-content"> 
 ${[
   await createScheduleSection("system"),
   await createScheduleSection("system", true),
 ].join("")}
 </div>
 `,
    `
 <div class="tab-content" id="link-tab-content"> 
 ${[
   await createScheduleSection("link"),
   await createScheduleSection("link", true),
 ].join("")}
 </div>
`,
  ].join("");

  const setupContentDoms = (contentId) => {
    const [name] = contentId.split("-");

    setupDoms(`${name}_allowed`);

    setupDoms(`${name}_close`);
  };

  setupContentDoms("app-tab-content");

  tabBtns.forEach((btn) => {
    btn.onclick = () => {
      tabBtns.forEach((btn) => btn.classList.remove("active"));

      const activeEl = document.querySelector(".tab-content.active");

      const contentId = btn.dataset.tab;

      const contentEl = document.getElementById(contentId);

      activeEl.classList.remove("active");

      contentEl.classList.add("active");

      setupContentDoms(contentId);
    };
  });
})();
