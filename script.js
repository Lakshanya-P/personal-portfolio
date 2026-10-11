/* =========================================================
   Space portfolio: interactions
   No libraries; everything here is progressive enhancement.
   ========================================================= */
(() => {
  "use strict";

  document.documentElement.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Starfield (parallax, twinkle, shooting stars, warp) ---------- */
  const canvas = $("#starfield");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;
  let stars = [];
  let shooters = [];
  let warp = 0;                 // 0..1, spikes when jumping between sections
  const mouse = { x: -9999, y: -9999, px: 0, py: 0 };
  let scrollY = window.scrollY;

  const STAR_COLORS = ["#ffffff", "#cfe9ff", "#b69cff", "#6ee7ff", "#ffe6c4"];

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const count = Math.min(420, Math.round((W * H) / 4200));
    stars = Array.from({ length: count }, () => {
      const z = Math.random();                // depth: 0 = far, 1 = near
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        z,
        r: 0.3 + z * 1.4,
        a: 0.3 + Math.random() * 0.7,
        tw: Math.random() * Math.PI * 2,      // twinkle phase
        ts: 0.5 + Math.random() * 2,          // twinkle speed
        c: STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0],
      };
    });
    if (reduceMotion) draw(0);
  }

  function spawnShooter() {
    const fromLeft = Math.random() < 0.5;
    shooters.push({
      x: fromLeft ? Math.random() * W * 0.5 : W * 0.5 + Math.random() * W * 0.5,
      y: Math.random() * H * 0.4,
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 5),
      vy: 2.5 + Math.random() * 2.5,
      life: 1,
    });
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const time = t / 1000;

    // Smooth mouse parallax
    mouse.px += ((mouse.x > -1 ? (mouse.x / W - 0.5) : 0) - mouse.px) * 0.05;
    mouse.py += ((mouse.y > -1 ? (mouse.y / H - 0.5) : 0) - mouse.py) * 0.05;

    const near = [];
    for (const s of stars) {
      // Parallax: nearer stars move more with scroll and mouse
      let x = s.x - mouse.px * 30 * s.z;
      let y = (s.y - scrollY * (0.05 + s.z * 0.25)) % H;
      if (y < 0) y += H;
      y -= mouse.py * 30 * s.z;

      const twinkle = reduceMotion ? 1 : 0.65 + 0.35 * Math.sin(time * s.ts + s.tw);
      ctx.globalAlpha = s.a * twinkle;
      ctx.fillStyle = s.c;

      if (warp > 0.02) {
        // Streak outward from the center during warp
        const dx = x - W / 2, dy = y - H / 2;
        const len = warp * 40 * (0.3 + s.z);
        const d = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = s.c;
        ctx.lineWidth = s.r;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (dx / d) * len, y + (dy / d) * len);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Collect stars near the cursor for constellation lines
      if (s.z > 0.35 && Math.abs(x - mouse.x) < 140 && Math.abs(y - mouse.y) < 140) {
        near.push({ x, y });
      }
    }

    // Constellation lines around cursor
    if (near.length > 1) {
      ctx.lineWidth = 0.6;
      for (let i = 0; i < near.length; i++) {
        for (let j = i + 1; j < near.length; j++) {
          const d = Math.hypot(near[i].x - near[j].x, near[i].y - near[j].y);
          if (d < 90) {
            ctx.globalAlpha = (1 - d / 90) * 0.5;
            ctx.strokeStyle = "#8fdcff";
            ctx.beginPath();
            ctx.moveTo(near[i].x, near[i].y);
            ctx.lineTo(near[j].x, near[j].y);
            ctx.stroke();
          }
        }
      }
    }

    // Shooting stars
    for (const sh of shooters) {
      const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 12, sh.y - sh.vy * 12);
      grad.addColorStop(0, "rgba(255,255,255,0.9)");
      grad.addColorStop(1, "rgba(110,231,255,0)");
      ctx.globalAlpha = sh.life;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x - sh.vx * 12, sh.y - sh.vy * 12);
      ctx.stroke();
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.life -= 0.012;
    }
    shooters = shooters.filter((s) => s.life > 0 && s.x > -200 && s.x < W + 200 && s.y < H + 200);

    ctx.globalAlpha = 1;
  }

  let running = true;
  function loop(t) {
    if (!running) return;
    warp *= 0.94;
    if (Math.random() < 0.004) spawnShooter();
    draw(t);
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") { mouse.x = e.clientX; mouse.y = e.clientY; }
  }, { passive: true });
  document.addEventListener("mouseleave", () => { mouse.x = mouse.y = -9999; });
  resize();

  if (!reduceMotion) {
    requestAnimationFrame(loop);
    // Pause the animation when the tab is hidden (saves battery)
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(loop);
    });
  }

  /* ---------- Scroll: progress bar, nav state, star parallax ---------- */
  const nav = $("#nav");
  const bar = $(".progress span");
  function onScroll() {
    scrollY = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    nav.classList.toggle("scrolled", scrollY > 20);
    if (reduceMotion) draw(0);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const toggle = $(".nav-toggle");
  const links = $("#nav-links");
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    links.classList.toggle("open", open);
  });

  // Warp effect + close menu when jumping to a section
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", () => {
      if (!reduceMotion) warp = 1;
      toggle.setAttribute("aria-expanded", "false");
      links.classList.remove("open");
    });
  });

  /* ---------- Active nav link ---------- */
  const navLinks = $$(".nav-links a");
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + entry.target.id));
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  $$("main > section[id]").forEach((s) => sectionObserver.observe(s));

  /* ---------- Reveal on scroll + count-up numbers ---------- */
  function countUp(el) {
    const target = Number(el.dataset.count);
    if (reduceMotion || !target) return;
    const start = performance.now();
    const dur = 1200;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      $$("[data-count]", entry.target).forEach(countUp);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el) => revealObserver.observe(el));

  /* ---------- Missing images → labeled placeholders ---------- */
  // Any <img> inside .frame that fails to load shows the file name it expects.
  $$(".frame img").forEach((img) => {
    const frame = img.closest(".frame");
    const markMissing = () => frame.classList.add("missing");
    if (img.complete && img.naturalWidth === 0) markMissing();
    img.addEventListener("error", markMissing);
    img.addEventListener("load", () => frame.classList.remove("missing"));
  });

  /* ---------- Lightweight YouTube embeds ---------- */
  // Only loads the YouTube player after a click, so the page stays fast.
  function playVideo(frame, start = 0) {
    const id = (frame.dataset.youtube || "").trim();
    if (!id) return;
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&start=${start | 0}`;
    iframe.title = frame.getAttribute("aria-label") || "Project demo video";
    iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    frame.replaceChildren(iframe);
  }
  $$(".frame.video").forEach((frame) => {
    const id = (frame.dataset.youtube || "").trim();
    if (!id) { frame.classList.add("missing"); return; }
    frame.style.backgroundImage = `url(https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg)`;
    $(".play", frame).addEventListener("click", () => playVideo(frame));
  });
  // Chapter buttons: <button class="chapter" data-target="#clarity .video" data-start="75">
  $$(".chapter").forEach((btn) => {
    btn.addEventListener("click", () => {
      const frame = $(btn.dataset.target);
      if (!frame) return;
      playVideo(frame, Number(btn.dataset.start));
      frame.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  });

  /* ---------- Lightbox (with prev/next through a project's images) ---------- */
  const lb = $("#lightbox");
  const lbImg = $("img", lb);
  const lbCap = $(".lb-caption", lb);
  const lbPrev = $(".lb-prev", lb);
  const lbNext = $(".lb-next", lb);
  let lastFocus = null;
  let group = [];
  let index = 0;

  // A group is every loaded image in the same gallery, case study, or [data-gallery] card.
  // Hidden extras use data-src so they only download when opened.
  function groupFor(img) {
    const root = img.closest("[data-gallery], .gallery, .case") || img.parentElement;
    return $$("img", root).filter((i) =>
      !i.closest(".frame.missing") && !i.classList.contains("case-icon") && !i.closest(".video") &&
      (i.closest(".zoomable") || i.dataset.src));
  }
  function show(i) {
    index = (i + group.length) % group.length;
    const img = group[index];
    lbImg.src = img.dataset.src || img.currentSrc || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = group.length > 1 ? `${index + 1} / ${group.length} · ${img.alt}` : img.alt;
  }
  function openLightbox(img) {
    lastFocus = document.activeElement;
    group = groupFor(img);
    lbPrev.hidden = lbNext.hidden = group.length < 2;
    show(Math.max(0, group.indexOf(img)));
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    $(".lb-close", lb).focus();
  }
  function closeLightbox() {
    lb.hidden = true;
    lbImg.src = "";
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  $$(".zoomable").forEach((frame) => {
    frame.setAttribute("tabindex", "0");
    frame.setAttribute("role", "button");
    const open = () => { if (!frame.classList.contains("missing")) openLightbox($("img", frame)); };
    frame.addEventListener("click", open);
    frame.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });
  lbPrev.addEventListener("click", (e) => { e.stopPropagation(); show(index - 1); });
  lbNext.addEventListener("click", (e) => { e.stopPropagation(); show(index + 1); });
  lb.addEventListener("click", (e) => { if (e.target !== lbImg) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft" && group.length > 1) show(index - 1);
    else if (e.key === "ArrowRight" && group.length > 1) show(index + 1);
  });
  // Swipe on touch screens
  let touchX = null;
  lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null || group.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- 3D tilt on project cards (mouse only) ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    $$(".card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-4px)`;
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  /* ---------- Copy email ---------- */
  $$(".copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const label = $("span", btn);
        const old = label.textContent;
        label.textContent = "Copied!";
        btn.classList.add("done");
        setTimeout(() => { label.textContent = old; btn.classList.remove("done"); }, 1800);
      } catch {
        window.location.href = "mailto:" + btn.dataset.copy;
      }
    });
  });

  /* ---------- Back to top: rocket launch ---------- */
  const toTop = $(".to-top");
  toTop.addEventListener("click", () => {
    if (!reduceMotion) { warp = 1; toTop.classList.add("launch"); }
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    setTimeout(() => toTop.classList.remove("launch"), 1200);
  });

  $("#year").textContent = new Date().getFullYear();
})();
