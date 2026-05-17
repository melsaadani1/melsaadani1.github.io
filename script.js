document.getElementById("year").textContent = new Date().getFullYear();

const header = document.querySelector(".site-header");

window.addEventListener("scroll", () => {
  const current = window.scrollY;
  header.dataset.compact = current > 24 ? "true" : "false";
  header.style.boxShadow = current > 24 ? "0 10px 28px rgba(23, 32, 38, 0.08)" : "none";
});
