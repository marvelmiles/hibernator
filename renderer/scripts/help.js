document.querySelectorAll(".faq-question").forEach((question) => {
  question.addEventListener("click", () => {
    const answer = question.nextElementSibling;
    const chevron = question.querySelector(".chevron");
    const isOpen = answer.classList.contains("open");

    // Close all others (accordion behavior)
    document.querySelectorAll(".faq-answer").forEach((el) => {
      el.style.maxHeight = null;
      el.classList.remove("open");
    });

    document.querySelectorAll(".chevron").forEach((el) => {
      el.classList.remove("open");
    });

    if (!isOpen) {
      answer.classList.add("open");
      chevron.classList.add("open");
      answer.style.maxHeight = answer.scrollHeight + "px";
    }
  });
});
