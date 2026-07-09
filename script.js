/* ================================================================
   BANCA — script.js
   Interactions du site : navbar intelligente, révélations au scroll,
   compteur de cagnotte animé, carte flottante, accordéon FAQ fluide,
   boutons "magnétiques". Le tout léger, sans dépendance, et safe
   même si certains éléments (ex: une carte Leaflet) sont absents.
   ================================================================ */

(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------
     ✏️ CONFIG — à modifier uniquement ici
  --------------------------------------------------------------- */
  const CONFIG = {
    goal: 2500,
    raised: 0
  };

  /* ---------------------------------------------------------------
     Utils
  --------------------------------------------------------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const euro = (n) => `${Math.round(n).toLocaleString("fr-FR")} €`;

  let ticking = false;
  function onScroll(fn) {
    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            fn();
            ticking = false;
          });
          ticking = true;
        }
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------------
     Styles d'exécution (animations) — injectés ici pour que ce
     script reste 100% autonome, sans retoucher style.css
  --------------------------------------------------------------- */
  (function injectRuntimeStyles() {
    const css = `
      .top-progress{
        position:fixed; top:0; left:0; height:3px; width:0%;
        background:linear-gradient(90deg,var(--accent),#e8955f);
        z-index:100; transition:width .12s linear;
        pointer-events:none;
      }
      .nav{ transition:transform .4s cubic-bezier(.65,0,.35,1), box-shadow .3s ease; }
      .nav.nav--hidden{ transform:translateY(-100%); }
      .links a{ position:relative; }
      .links a::after{
        content:""; position:absolute; left:0; right:100%; bottom:-4px; height:1px;
        background:var(--accent); transition:right .3s cubic-bezier(.65,0,.35,1);
      }
      .links a.active{ opacity:1; }
      .links a.active::after{ right:0; }

      .reveal{
        opacity:0; transform:translateY(28px);
        transition:opacity .9s cubic-bezier(.16,1,.3,1), transform .9s cubic-bezier(.16,1,.3,1);
        will-change:opacity, transform;
      }
      .reveal.in-view{ opacity:1; transform:none; }

      .faq-panel{
        overflow:hidden; max-height:0;
        transition:max-height .45s cubic-bezier(.65,0,.35,1);
      }
      .faq details.is-open summary::after{ content:"\\2013" !important; }
      .faq details:not(.is-open) summary::after{ content:"+" !important; }
      .faq summary{ transition:color .2s ease; }
      .faq details.is-open summary{ color:var(--accent); }

      .magnetic{ transition:transform .25s cubic-bezier(.34,1.56,.64,1); }

      @media (prefers-reduced-motion: reduce){
        .reveal{ opacity:1 !important; transform:none !important; transition:none !important; }
        .faq-panel{ transition:none !important; }
        .nav{ transition:none !important; }
      }
    `;
    const style = document.createElement("style");
    style.setAttribute("data-source", "script.js");
    style.textContent = css;
    document.head.appendChild(style);
  })();

  /* ---------------------------------------------------------------
     Barre de progression de lecture
  --------------------------------------------------------------- */
  function initScrollProgress() {
    const bar = document.createElement("div");
    bar.className = "top-progress";
    document.body.appendChild(bar);

    onScroll(() => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      bar.style.width = `${pct}%`;
    });
  }

  /* ---------------------------------------------------------------
     Navbar : ombre au scroll + auto-hide intelligent + lien actif
  --------------------------------------------------------------- */
  function initNavbar() {
    const nav = $("#nav");
    if (!nav) return;

    let lastY = window.scrollY;

    onScroll(() => {
      const y = window.scrollY;

      nav.style.boxShadow = y > 40 ? "0 1px 0 rgba(20,19,16,.08)" : "none";

      // masque la nav quand on descend, la ré-affiche quand on remonte
      if (y > lastY && y > 200) {
        nav.classList.add("nav--hidden");
      } else {
        nav.classList.remove("nav--hidden");
      }
      lastY = y;
    });

    // Surligne le lien correspondant à la section visible
    const links = $$(".links a");
    if (!links.length) return;

    const sections = links
      .map((a) => document.getElementById(a.getAttribute("href").slice(1)))
      .filter(Boolean);

    if (!sections.length) return;

    const linkFor = (id) => links.find((a) => a.getAttribute("href") === `#${id}`);

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const link = linkFor(entry.target.id);
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach((a) => a.classList.remove("active"));
            link.classList.add("active");
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach((s) => navObserver.observe(s));
  }

  /* ---------------------------------------------------------------
     Révélations au scroll (fade + slide), avec effet cascade
  --------------------------------------------------------------- */
  function initReveal() {
    const targets = $$(
      [
        ".statement-text",
        ".s-img",
        ".story-text",
        ".story-media",
        ".expedition-head",
        ".route-map",
        ".spec-card",
        ".budget-table",
        ".heritage-text",
        ".faq details",
        ".follow .kicker",
        ".follow .display-lg",
        ".video-wrapper",
        ".location-tag"
      ].join(",")
    );

    if (!targets.length) return;

    if (reduceMotion) {
      targets.forEach((el) => el.classList.add("in-view"));
      return;
    }

    // délai en cascade pour les éléments groupés (ex: cartes specs)
    const groups = new Map();
    targets.forEach((el) => {
      const parent = el.parentElement;
      const list = groups.get(parent) || [];
      list.push(el);
      groups.set(parent, list);
    });
    groups.forEach((list) => {
      list.forEach((el, i) => {
        el.classList.add("reveal");
        el.style.transitionDelay = `${Math.min(i, 5) * 90}ms`;
      });
    });

    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    targets.forEach((el) => revealObserver.observe(el));
  }

  /* ---------------------------------------------------------------
     Cagnotte : compteur animé (déclenché à l'entrée dans le viewport)
  --------------------------------------------------------------- */
  function initDonationProgress() {
    const card = $(".progress-card");
    const raisedEl = $("#raised");
    const percentEl = $("#percent");
    const barEl = $("#progress-fill");
    if (!card || !raisedEl || !percentEl || !barEl) return;

    const percent = clamp((CONFIG.raised / CONFIG.goal) * 100, 0, 100);
    let done = false;

    function animate() {
      if (done) return;
      done = true;

      if (reduceMotion) {
        raisedEl.textContent = euro(CONFIG.raised);
        percentEl.textContent = `${Math.round(percent)}%`;
        barEl.style.width = `${percent}%`;
        return;
      }

      const duration = 1400;
      const start = performance.now();

      function step(now) {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = easeOutExpo(t);

        raisedEl.textContent = euro(eased * CONFIG.raised);
        percentEl.textContent = `${Math.round(eased * percent)}%`;
        barEl.style.width = `${eased * percent}%`;

        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animate();
          obs.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(card);
  }

  /* ---------------------------------------------------------------
     Carte de don flottante
  --------------------------------------------------------------- */
  function initFloatingDonate() {
  const floating = $("#floatingDonate");
  const floatingFill = $("#floatingFill");
  const floatingRaised = $("#floatingRaised");
  const donateSection = $("#soutenir");

  if (!floating || !donateSection) return;

  const percent = clamp((CONFIG.raised / CONFIG.goal) * 100, 0, 100);

  if (floatingRaised) floatingRaised.textContent = euro(CONFIG.raised);
  if (floatingFill) floatingFill.style.width = `${percent}%`;

  function update() {
    const rect = donateSection.getBoundingClientRect();

    const showFloating = window.scrollY > 500;

    // la section est réellement visible
    const donateVisible =
      rect.top < window.innerHeight &&
      rect.bottom > 0;

    floating.classList.toggle("show", showFloating && !donateVisible);
  }

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);

  update();
}


  /* ---------------------------------------------------------------
     FAQ — accordéon animé (remplace le comportement natif instantané)
  --------------------------------------------------------------- */
  function initFAQ() {
    const items = $$(".faq details");
    if (!items.length) return;

    items.forEach((details, i) => {
      const summary = $("summary", details);
      if (!summary) return;

      // regroupe tout le contenu (hors summary) dans un panneau animable
      const panel = document.createElement("div");
      panel.className = "faq-panel";
      Array.from(details.children).forEach((child) => {
        if (child !== summary) panel.appendChild(child);
      });
      details.appendChild(panel);

      // conserve "open" natif pour l'accessibilité, gère le visuel via classe
      details.open = true;
      const startOpen = i === 0;
      details.classList.toggle("is-open", startOpen);
      panel.style.maxHeight = startOpen ? `${panel.scrollHeight}px` : "0px";

      summary.addEventListener("click", (e) => {
        e.preventDefault();
        const willOpen = !details.classList.contains("is-open");

        details.classList.toggle("is-open", willOpen);
        panel.style.maxHeight = willOpen ? `${panel.scrollHeight}px` : "0px";
      });
    });

    // recalcule les hauteurs ouvertes si la fenêtre est redimensionnée
    window.addEventListener(
      "resize",
      () => {
        items.forEach((details) => {
          if (!details.classList.contains("is-open")) return;
          const panel = $(".faq-panel", details);
          if (panel) panel.style.maxHeight = `${panel.scrollHeight}px`;
        });
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------------
     Carte Leaflet — optionnelle. Ne s'exécute que si un élément
     #map est présent sur la page ET que Leaflet est chargé.
     (La page utilise par défaut une image statique .route-map ;
     ajoute simplement <div id="map"></div> pour réactiver la carte live.)
  --------------------------------------------------------------- */
  function initMap() {
    const mapEl = document.getElementById("map");
    if (!mapEl || typeof L === "undefined") return;

    const map = L.map("map", { scrollWheelZoom: false }).setView([13.2, 122.0], 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: ""
    }).addTo(map);

    L.marker([13.52, 122.4]).addTo(map).bindPopup("<b>Mulanay</b><br>Départ");
    L.marker([13.35, 121.9]).addTo(map).bindPopup("<b>Marinduque</b><br>Arrivée");
  }

  /* ---------------------------------------------------------------
     Init
  --------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initScrollProgress();
    initNavbar();
    initReveal();
    initDonationProgress();
    initFloatingDonate();
    initFAQ();
    initMap();
  });
})();


/*HERITAGE IMAGE*/
function initHeritageSlider(){

    const images = document.querySelectorAll(".heritage-slider img");

    if(images.length < 2) return;

    let current = 0;

    setInterval(() => {

        images[current].classList.remove("active");

        current = (current + 1) % images.length;

        images[current].classList.add("active");

    }, 5500);

}

document.addEventListener("DOMContentLoaded", initHeritageSlider);