const joinArr = (arr, sep = ", ", lastSep = " and ") => {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]}${lastSep}${arr[1]}`;

  const allButLast = arr.slice(0, -1).join(sep);
  const last = arr[arr.length - 1];
  return `${allButLast}${lastSep}${last}`;
};

module.exports = { joinArr };
