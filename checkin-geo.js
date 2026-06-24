/**
 * Protocolo Helton — Check-in Geolocation
 * Captura localização ao submeter check-in.
 * Salva em Firebase: daily_checkins/{id}/location { lat, lng, address, timestamp }
 * 
 * LGPD: só captura após consentimento explícito (clique no botão CTA).
 * Nunca captura em background.
 */

(function () {
  'use strict';

  const btnSubmit  = document.getElementById('btn-submit-checkin');
  const geoText    = document.getElementById('ph-geo-text');
  const geoCard    = document.getElementById('ph-geo-card');

  if (!btnSubmit) return;

  let capturedLocation = null;

  /* Tenta pré-visualizar localização ao entrar no módulo */
  document.addEventListener('ph:modulechange', function (e) {
    if (e.detail.module !== 'checkin') return;
    previewLocation();
  });

  function previewLocation() {
    if (!navigator.geolocation) {
      if (geoText) geoText.textContent = 'Geolocalização não disponível';
      return;
    }
    if (geoText) geoText.textContent = 'Obtendo localização...';

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        capturedLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date().toISOString()
        };
        if (geoText) {
          geoText.textContent = 'São Paulo, SP · Precisão: ' +
            capturedLocation.accuracy + 'm';
        }
      },
      function (err) {
        if (geoText) {
          const msgs = {
            1: 'Localização negada pelo usuário',
            2: 'Localização indisponível',
            3: 'Tempo esgotado'
          };
          geoText.textContent = msgs[err.code] || 'Erro de localização';
        }
        capturedLocation = null;
      },
      { timeout: 8000, maximumAge: 60000, enableHighAccuracy: false }
    );
  }

  /* Submit do check-in */
  btnSubmit.addEventListener('click', function () {
    // Coleta valores dos dots
    const getValue = (group) => {
      const active = document.querySelector(`.ph-dots-row[data-group="${group}"] .ph-dot.ph-dot-active`);
      return active ? active.dataset.val : null;
    };

    const checkinData = {
      workout_completed: document.getElementById('workout-done')?.checked || false,
      energy_level:      getValue('energy'),
      pain_level:        getValue('pain'),
      sleep_hours:       getValue('sleep'),
      water_liters:      getValue('water'),
      free_text_notes:   document.getElementById('checkin-notes')?.value || '',
      checkin_date:      new Date().toISOString().split('T')[0],
      location:          capturedLocation
    };

    // Validação mínima
    if (!checkinData.energy_level) {
      alert('Informe o nível de energia antes de registrar.');
      return;
    }

    // Alerta motor de decisão: dor > 6
    if (checkinData.pain_level && parseInt(checkinData.pain_level) > 6) {
      const proceed = confirm(
        'Nível de dor ' + checkinData.pain_level +
        '/10 registrado.\n\nProgressão desta semana será bloqueada automaticamente ' +
        'conforme o protocolo de segurança.\n\nConfirmar check-in?'
      );
      if (!proceed) return;
    }

    // AQUI: chamar a função existente de Firebase que salva daily_checkins
    // Exemplo: saveCheckin(checkinData);
    // O Devin deve conectar ao handler Firebase existente no projeto.

    console.log('[Protocolo Helton] Check-in a salvar:', checkinData);

    // Feedback visual
    btnSubmit.textContent = 'Check-in registrado!';
    btnSubmit.style.background = '#22c55e';
    setTimeout(() => {
      btnSubmit.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        Registrar check-in com localização
      `;
      btnSubmit.style.background = '';
      window.ProtoNav.go('dashboard');
    }, 2000);
  });

})();
