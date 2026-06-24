/**
 * Protocolo Helton — Sidebar Navigation Controller
 * 
 * REGRA CRÍTICA: nunca usar display:none/block para controlar sidebar.
 * Estado gerenciado via classes CSS — funciona em qualquer orientação.
 * 
 * Módulos disponíveis: dashboard | checkin | treinos | cardio |
 *                      nutricao | sono | evolucao | fotos | historico | coach |
 *                      config | backup | logout
 */

(function () {
  'use strict';

  // ── Elementos ──────────────────────────────────────
  const sidebar  = document.getElementById('ph-sidebar');
  const overlay  = document.getElementById('ph-overlay');
  const btnMenu  = document.getElementById('ph-btn-menu');
  const navItems = document.querySelectorAll('.ph-nav-item[data-module]');
  const tabs     = document.querySelectorAll('.ph-tab[data-module]');

  if (!sidebar || !overlay || !btnMenu) {
    console.warn('[Protocolo Helton] Sidebar: elementos não encontrados.');
    return;
  }

  // ── Estado ─────────────────────────────────────────
  let currentModule = 'dashboard';

  // ── Sidebar: abrir / fechar ────────────────────────
  function openSidebar() {
    sidebar.classList.add('ph-open');
    overlay.classList.add('ph-open');
    btnMenu.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const firstItem = sidebar.querySelector('.ph-nav-item');
    if (firstItem) firstItem.focus();
  }

  function closeSidebar() {
    sidebar.classList.remove('ph-open');
    overlay.classList.remove('ph-open');
    btnMenu.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function toggleSidebar() {
    sidebar.classList.contains('ph-open') ? closeSidebar() : openSidebar();
  }

  // ── Módulos: ativar ────────────────────────────────
  function activateModule(moduleName) {
    if (moduleName === currentModule) {
      closeSidebar();
      return;
    }

    const prevModule = document.querySelector('.ph-module.ph-active-module');
    if (prevModule) prevModule.classList.remove('ph-active-module');

    const nextModule = document.getElementById('module-' + moduleName);
    if (nextModule) {
      nextModule.classList.add('ph-active-module');
    } else {
      console.warn('[Protocolo Helton] Módulo não encontrado: module-' + moduleName);
    }

    navItems.forEach(item => {
      const isActive = item.dataset.module === moduleName;
      item.classList.toggle('ph-active', isActive);
      item.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Sincroniza bottom tabs
    tabs.forEach(tab => {
      tab.classList.toggle('ph-tab-active', tab.dataset.module === moduleName);
    });

    currentModule = moduleName;
    closeSidebar();

    const main = document.getElementById('ph-main');
    if (main) main.scrollTop = 0;
  }

  // ── Event listeners ────────────────────────────────
  btnMenu.addEventListener('click', toggleSidebar);
  overlay.addEventListener('click', closeSidebar);

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      activateModule(item.dataset.module);
    });
  });

  // Listeners de tabs (bottom nav)
  tabs.forEach(tab => {
    tab.addEventListener('click', () => activateModule(tab.dataset.module));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('ph-open')) {
      closeSidebar();
      btnMenu.focus();
    }
  });

  // ── Dashboard: barchart + streak ─────────────────────
  function initDashboard() {
    // Score bar
    const scoreBar = document.getElementById('score-bar');
    if (scoreBar) setTimeout(() => { scoreBar.style.width = '78%'; }, 400);

    // Week bars (Seg-Dom)
    const barsContainer = document.getElementById('week-bars');
    const daysContainer = document.getElementById('week-days');
    const dayNames = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
    const barData   = [80, 0, 75, 90, 70, 0, 50]; // 0 = descanso
    const barDone   = [true, false, true, true, true, false, false];
    const isToday   = [false,false,false,false,false,false,true];

    if (barsContainer && daysContainer) {
      dayNames.forEach((d, i) => {
        const bar = document.createElement('div');
        bar.className = 'ph-week-bar' +
          (isToday[i] ? ' today' : barDone[i] ? ' done' : barData[i] === 0 ? ' rest' : '');
        bar.style.height = '4px';
        bar.setAttribute('aria-label', d + ': ' + (barData[i] || 'descanso'));
        barsContainer.appendChild(bar);

        const day = document.createElement('div');
        day.className = 'ph-week-day' + (isToday[i] ? ' today' : '');
        day.textContent = d;
        daysContainer.appendChild(day);
      });

      // Animação após render
      setTimeout(() => {
        barsContainer.querySelectorAll('.ph-week-bar').forEach((bar, i) => {
          bar.style.transition = `height 0.5s ${i * 0.07}s cubic-bezier(0.4,0,0.2,1)`;
          bar.style.height = barData[i] + '%';
        });
      }, 300);
    }

    // Streak dots
    const streakDots = document.getElementById('streak-week-dots');
    if (streakDots) {
      const doneWeekDays = [true, false, true, true, true, false, false];
      doneWeekDays.forEach((done, i) => {
        const dot = document.createElement('div');
        dot.className = 'ph-streak-dot' + (done ? ' done' : i === 6 ? ' today' : '');
        streakDots.appendChild(dot);
      });
    }
  }

  // ── Check-in: dots interativos ───────────────────────
  function initCheckin() {
    document.querySelectorAll('.ph-dots-row').forEach(row => {
      const group = row.dataset.group;
      const valEl = document.getElementById(group + '-val');

      row.querySelectorAll('.ph-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          row.querySelectorAll('.ph-dot').forEach(d => d.classList.remove('ph-dot-active'));
          dot.classList.add('ph-dot-active');
          if (valEl) valEl.textContent = dot.dataset.val;

          // Alerta de dor > 6
          if (group === 'pain') {
            const warning = document.getElementById('pain-warning');
            if (warning) warning.hidden = parseInt(dot.dataset.val) <= 6;
          }
        });
      });
    });

    // Toggle treino
    const toggle = document.getElementById('workout-done');
    if (toggle) {
      toggle.addEventListener('change', () => {
        // Atualiza badge do check-in no sidebar e bottom nav
        const badge = document.getElementById('nav-badge-checkin');
        const tabDot = document.getElementById('tab-dot-checkin');
        if (toggle.checked) {
          if (badge) badge.hidden = true;
          if (tabDot) tabDot.hidden = true;
        }
      });
    }
  }

  // ── Gym favs ─────────────────────────────────────────
  function initAcademias() {
    document.querySelectorAll('.ph-gym-fav').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
      });
    });
  }

  // ── Inicialização ──────────────────────────────────
  function init() {
    const defaultModule = document.getElementById('module-dashboard');
    if (defaultModule) defaultModule.classList.add('ph-active-module');

    const defaultNav = document.querySelector('.ph-nav-item[data-module="dashboard"]');
    if (defaultNav) {
      defaultNav.classList.add('ph-active');
      defaultNav.setAttribute('aria-current', 'page');
    }

    // Ativa tab dashboard por padrão
    const defaultTab = document.querySelector('.ph-tab[data-module="dashboard"]');
    if (defaultTab) defaultTab.classList.add('ph-tab-active');

    initDashboard();
    initCheckin();
    initAcademias();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── API pública ─────────────────────────────────────
  window.ProtoNav = { go: activateModule };

})();
