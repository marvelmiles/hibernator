const isScheduleActive = ({ repeat, days, completedTask, disable }) => {
  if (repeat || disable) return true;

  return completedTask.length < days.length;
};

const isAllowedBootTime = (s) => {
  const allowedTime = new Date();

  allowedTime.setHours(s.hour, s.minute, 0, 0);

  const now = new Date().getTime();

  return now >= allowedTime.getTime();
};

const validators = { isScheduleActive, isAllowedBootTime };

module.exports = validators;
