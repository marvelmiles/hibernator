const START_YEAR = 2020;
const currentYear = new Date().getFullYear();

const yearsOfExperience = Math.max(currentYear - START_YEAR, 0);

const experienceEl = document.getElementById("experience");

experienceEl.textContent = `${yearsOfExperience}+ years of experience building production-grade software.`;
