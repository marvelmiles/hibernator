const isScheduleActive = ({ repeat, days, completedTask, disable }) => {
  if (repeat || disable) return true;

  return completedTask.length < days.length;
};

const validators = { isScheduleActive };

module.exports = validators;
