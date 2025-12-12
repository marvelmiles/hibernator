const isScheduleActive = ({ repeat, days, completedTask }) => {
  if (repeat) return true;

  return completedTask.length < days.length;
};

const validators = { isScheduleActive };

module.exports = validators;
