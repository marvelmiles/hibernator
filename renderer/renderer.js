(async () => {
  const api = window.electronApi;

  if (!api) {
    alert("Application Error");
    return;
  }

  const showError = (message) => {
    api.toast(message);
  };

  const startMin = document.getElementById("start_min");
  const startHr = document.getElementById("start_hr");
  const startLevel = document.getElementById("start_level");
  const startBtn = document.getElementById("start_btn");
  const startList = document.getElementById("start_list");

  const hibMin = document.getElementById("hib_min");
  const hibHr = document.getElementById("hib_hr");
  const hibLevel = document.getElementById("hib_level");
  const hibBtn = document.getElementById("hib_btn");
  const hibList = document.getElementById("hib_list");
  const hibDeleteAllBtn = document.getElementById("hib_delete_all");
  const hibSchTypes = document.querySelectorAll(
    'input[name="hib_schedule_type"]'
  );
  const hibSchDays = document.getElementById("hib_schedule_days");
  const hibRepeat = document.getElementById("hib_repeat");

  hibSchTypes.forEach((el) => {
    el.onchange = (e) => {
      const value = e.target.value;
      if (value === "custom") hibSchDays.style.display = "block";
      else hibSchDays.style.display = "none";
    };
  });

  const renderItem = ({
    hour,
    minute,
    mode,
    preset,
    days,
    snoozeCount,
    btnLabel,
    id,
  }) => {
    const btn = document.createElement("button");

    btn.innerHTML = btnLabel;

    btn.onclick = async () => {
      await api.hibernate.cancelSchedule(id);
      await renderHibList();
    };

    const d = document.createElement("div");

    d.innerHTML = `
          <div class="hour">Hour: ${hour}</div>
      <div class="minute">Minute: ${minute}</div>
      <div class="level">Mode: ${
        {
          very_strict: "Very Strict",
          less_strict: "Less Strict",
          medium_strict: "Medium Strict",
        }[mode]
      }</div>
    
      <div>
    <div class="minute">Schedule Days: ${preset}</div>
    </div>
    `;

    d.appendChild(btn);

    const div = document.createElement("div");

    const hr = document.createElement("hr");

    div.appendChild(d);
    div.appendChild(hr);

    return div;
  };

  startBtn.onclick = () => {
    const hour = Number(startHr.value);

    const min = Number(startMin.value);

    const level = startLevel.value;

    if (!hour || !min) {
      showError("Enter valid hour/minute");
      return;
    }

    startList.innerHTML = renderItem({
      hour,
      min,
      level,
    });
  };

  const renderHibList = async () => {
    const { hibernateSchedules = [] } = await api.getStore();

    hibList.innerHTML = "";

    hibernateSchedules.forEach((s) => {
      const node = renderItem({
        ...s,
        btnLabel: "Stop",
      });

      hibList.appendChild(node);
    });
  };

  hibDeleteAllBtn.onclick = async () => {
    await api.hibernate.cancelSchedule();
    await renderHibList();
  };

  hibBtn.onclick = async () => {
    const minute = Number(hibMin.value);
    const hour = Number(hibHr.value);

    if (hour > 23 || hour < 1) {
      showError("Invalid hour value. Should be between 1-23.");
      return;
    }
    if (minute > 59 || minute < 1) {
      showError("Invalid minute value. Should be between 1-59.");
      return;
    }

    const hibSchType = document.querySelector(
      'input[name="hib_schedule_type"]:checked'
    );
    const preset = hibSchType.value;

    let days = [];

    switch (preset) {
      case "custom":
        days = Array.from(
          document.querySelectorAll('input[name="hib_schedule_day"]:checked')
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
      repeat: hibRepeat.checked,
      hour,
      minute,
      mode: hibLevel.value,
    };

    await api.hibernate.addSchedule(schedule);

    await renderHibList();
  };

  await renderHibList();

  api.onHibernateListChange(async () => {
    await renderHibList();
  });
})();
