// Eliud — Portfolio Interactions & Enhancements
// - Theme switcher with ripple and accent cycling
// - Scroll-triggered reveal animations
// - Snapshot counters, particle canvas, contact form feedback
// - Reduced-motion safeguards
(function () {
  const docEl = document.documentElement;
  const rippleRoot = document.getElementById('ripple-root');
  const themeToggle = document.getElementById('themeToggle');
  const footerYear = document.getElementById('footerYear');
  const particleCanvas = document.getElementById('particleCanvas');
  let particleCtx, particles = [];
  let animationFrame;

  const ACCENTS = [
    { name: 'blue', main: getCSS('--accent-blue') || '#4cc9ff', secondary: '#72ddff' },
    { name: 'green', main: getCSS('--accent-green') || '#00f5a0', secondary: '#44ffc3' },
    { name: 'orange', main: getCSS('--accent-orange') || '#ff8a00', secondary: '#ffb357' },
    { name: 'pink', main: getCSS('--accent-pink') || '#ff46c6', secondary: '#ff7bdd' }
  ];
  let accentIndex = Number(localStorage.getItem('eliud-accent-index') || 0);

  function getCSS(varName) {
    return getComputedStyle(docEl).getPropertyValue(varName).trim();
  }

  function setCSS(varName, value) {
    docEl.style.setProperty(varName, value);
  }

  function hexToRgba(hex, alphaDefault) {
    const hx = hex.replace('#', '');
    const bigint = parseInt(hx.length === 3 ? hx.replace(/(.)/g, '$1$1') : hx, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return (alpha = alphaDefault) => `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function currentTheme() {
    return docEl.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function setTheme(theme) {
    docEl.setAttribute('data-theme', theme);
    localStorage.setItem('eliud-theme', theme);
  }

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }

  function updateAccent(index) {
    const accent = ACCENTS[index % ACCENTS.length];
    setCSS('--accent', accent.main);
    setCSS('--accent-2', accent.secondary);
    const rgba = hexToRgba(accent.main, 1);
    setCSS('--accent-shadow', rgba(0.32));
    setCSS('--glow', `0 0 24px ${rgba(0.65)}, 0 0 48px ${rgba(0.30)}`);
    localStorage.setItem('eliud-accent-index', index % ACCENTS.length);
  }

  function rippleFrom(el) {
    if (!rippleRoot || !el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rip = document.createElement('span');
    rip.className = 'ripple';
    rip.style.left = `${cx}px`;
    rip.style.top = `${cy}px`;
    rippleRoot.appendChild(rip);
    rip.addEventListener('animationend', () => rip.remove());
  }

  function triggerRevealOnToggle() {
    document.querySelectorAll('.reveal').forEach((el) => {
      if (el.classList.contains('is-visible')) {
        el.classList.remove('is-visible');
        void el.offsetWidth; // reflow
        el.classList.add('is-visible');
      }
    });
  }

  function initTheme() {
    const storedTheme = localStorage.getItem('eliud-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
    } else {
      setTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    }
    updateAccent(accentIndex);
  }

  function initToggle() {
    if (!themeToggle) return;
    themeToggle.addEventListener('click', () => {
      accentIndex = (accentIndex + 1) % ACCENTS.length;
      updateAccent(accentIndex);
      toggleTheme();
      rippleFrom(themeToggle);
      setTimeout(triggerRevealOnToggle, 150);
    });
  }

  function initReveals() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -10% 0px' }
    );
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  }

  function initCounters() {
    const counterEls = document.querySelectorAll('[data-count]');
    if (!counterEls.length) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animateCount = (el) => {
      const target = Number(el.dataset.count || 0);
      if (!target) return;
      if (prefersReduced) {
        el.textContent = target;
        return;
      }
      const duration = 2000;
      const start = performance.now();

      function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = easeOutExpo(progress);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    };

    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.35 }
    );

    counterEls.forEach((el) => counterObserver.observe(el));
  }

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function initFooterYear() {
    if (footerYear) footerYear.textContent = new Date().getFullYear();
  }

  function initParticleCanvas() {
    if (!particleCanvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    particleCtx = particleCanvas.getContext('2d');
    resizeCanvas();
    createParticles();
    animateParticles();
    window.addEventListener('resize', handleResize, { passive: true });
  }

  function handleResize() {
    cancelAnimationFrame(animationFrame);
    resizeCanvas();
    createParticles();
    animateParticles();
  }

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    particleCanvas.width = particleCanvas.clientWidth * dpr;
    particleCanvas.height = particleCanvas.clientHeight * dpr;
    if (particleCtx) particleCtx.scale(dpr, dpr);
  }

  function createParticles() {
    const { innerWidth, innerHeight } = window;
    const count = Math.min(120, Math.floor((innerWidth * innerHeight) / 15000));
    particles = Array.from({ length: count }).map(() => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      radius: Math.random() * 1.8 + 0.4,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: (Math.random() - 0.5) * 0.6,
      alpha: Math.random() * 0.6 + 0.1
    }));
  }

  function animateParticles() {
    if (!particleCtx) return;
    const { innerWidth, innerHeight } = window;
    particleCtx.clearRect(0, 0, particleCanvas.clientWidth, particleCanvas.clientHeight);
    particles.forEach((p) => {
      particleCtx.beginPath();
      particleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      particleCtx.fillStyle = `rgba(255,255,255,${p.alpha})`;
      particleCtx.fill();
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.x < -10) p.x = innerWidth + 10;
      if (p.x > innerWidth + 10) p.x = -10;
      if (p.y < -10) p.y = innerHeight + 10;
      if (p.y > innerHeight + 10) p.y = -10;
    });
    animationFrame = requestAnimationFrame(animateParticles);
  }

  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    const feedbackEl = form.querySelector('.form-feedback');

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = formData.get('name').trim();
      const email = formData.get('email').trim();
      const message = formData.get('message').trim();

      let isValid = true;
      clearErrors(form);

      if (!name) {
        showError(form, 'name', 'Name is required.');
        isValid = false;
      }

      if (!email || !/^[\w-.]+@[\w-]+\.[a-z]{2,}$/i.test(email)) {
        showError(form, 'email', 'Enter a valid email.');
        isValid = false;
      }

      if (!message || message.length < 24) {
        showError(form, 'message', 'Share at least 24 characters so I can prep properly.');
        isValid = false;
      }

      if (!isValid) {
        setFeedback('Please correct the highlighted fields.', false);
        return;
      }

      setFeedback('Thanks! Your message is on its way. I’ll respond within 48 hours.', true);
      form.reset();
    });

    function clearErrors(formEl) {
      formEl.querySelectorAll('.error').forEach((el) => (el.textContent = ''));
    }

    function showError(formEl, name, message) {
      const field = formEl.querySelector(`[name="${name}"]`);
      const errorEl = field?.parentElement?.querySelector('.error');
      if (errorEl) errorEl.textContent = message;
    }

    function setFeedback(message, success) {
      if (!feedbackEl) return;
      feedbackEl.textContent = message;
      feedbackEl.style.color = success ? getCSS('--accent-2') : '#ff6b6b';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initToggle();
    initReveals();
    initCounters();
    initFooterYear();
    initParticleCanvas();
    initContactForm();
  });
})();
