// ===============================
// NAVBAR
// ===============================

const nav = document.getElementById("nav");

window.addEventListener(
  "scroll",
  () => {
    nav.style.boxShadow =
      window.scrollY > 40
        ? "0 1px 0 rgba(20,19,16,.08)"
        : "none";
  },
  { passive: true }
);

// ===============================
// DONATION PROGRESS
// ===============================

// ✏️ À modifier uniquement ici
const goal = 2500;
const raised = 0;

// ===============================

const percent = Math.min((raised / goal) * 100, 100);

const raisedEl = document.getElementById("raised");
const percentEl = document.getElementById("percent");
const barEl = document.getElementById("progress-fill");

let animationDone = false;

function animateDonation() {

  if (animationDone) return;
  animationDone = true;

  const duration = 1200;
  const start = performance.now();

  function animate(time) {

    const progress = Math.min((time - start) / duration, 1);

    const value = Math.floor(progress * raised);
    const pct = Math.round(progress * percent);

    raisedEl.textContent = `${value.toLocaleString("fr-FR")} €`;
    percentEl.textContent = `${pct}%`;
    barEl.style.width = `${progress * percent}%`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);

}

// Lance l'animation uniquement lorsque la section apparaît
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      animateDonation();
      observer.disconnect();
    }
  },
  {
    threshold: 0.35
  }
);

observer.observe(document.querySelector(".progress-card"));