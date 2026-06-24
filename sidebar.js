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
    const firstItem = sidebar.querySelector('.ph-nav-item');
    if (firstItem) firstItem.focus();
  }

  function closeSidebar() {
    sidebar.classList.remove('ph-open');
    overlay.classList.remove('ph-open');
    btnMenu.setAttribute('aria-expanded', 'false');
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('ph-open')) {
      closeSidebar();
      btnMenu.focus();
    }
  });

  // ── Inicialização ──────────────────────────────────
  function init() {
    const defaultModule = document.getElementById('module-dashboard');
    if (defaultModule) defaultModule.classList.add('ph-active-module');

    const defaultNav = document.querySelector('.ph-nav-item[data-module="dashboard"]');
    if (defaultNav) {
      defaultNav.classList.add('ph-active');
      defaultNav.setAttribute('aria-current', 'page');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── API pública ─────────────────────────────────────
  window.ProtoNav = { go: activateModule };

})();
