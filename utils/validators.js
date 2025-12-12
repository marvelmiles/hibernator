const isScheduleActive = (schedule) => {
  const now = new Date();
  const currentDay = now.getDay(); // 0-6
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduleMinutes = schedule.hour * 60 + schedule.minute;

  // A schedule with custom days must include today
  const isDayAllowed = schedule.days.includes(currentDay);

  // Repeating schedules are always active if today is in allowed days
  if (schedule.repeat) {
    return isDayAllowed;
  }

  // Non-repeating schedules:
  // - Only active if today is allowed
  // - And time has not passed
  if (isDayAllowed && scheduleMinutes >= currentMinutes) {
    return true;
  }

  return false;
};

const validators = { isScheduleActive };

module.exports = validators;
