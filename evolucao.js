(function () {
  'use strict';

  // Elementos
  const modal = document.getElementById('modal-evolucao');
  const btnAdd = document.getElementById('btn-add-evolucao');
  const btnClose = document.getElementById('btn-close-modal');
  const form = document.getElementById('form-evolucao');
  const lista = document.getElementById('lista-evolucao');
  const chartCanvas = document.getElementById('chart-peso');

  let chartInstance = null;

  // Função para obter o tokenKey do usuário
  function getTokenKey() {
    const session = JSON.parse(localStorage.getItem('gymai_session') || '{}');
    return session.tokenKey || null;
  }

  // Abrir modal
  btnAdd.addEventListener('click', () => {
    modal.classList.add('open');
    modal.style.display = 'flex';
    // Preencher data atual
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('evolucao-data').value = hoje;
  });

  // Fechar modal
  function closeModal() {
    modal.classList.remove('open');
    modal.style.display = 'none';
    form.reset();
  }
  btnClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Salvar registro
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tokenKey = getTokenKey();
    if (!tokenKey) {
      alert('Usuário não autenticado. Faça login novamente.');
      return;
    }

    const data = document.getElementById('evolucao-data').value;
    const peso = parseFloat(document.getElementById('evolucao-peso').value);
    const cintura = parseFloat(document.getElementById('evolucao-cintura').value) || null;
    const braco = parseFloat(document.getElementById('evolucao-braco').value) || null;
    const coxa = parseFloat(document.getElementById('evolucao-coxa').value) || null;
    const observacoes = document.getElementById('evolucao-obs').value;

    // Validação mínima
    if (!data || !peso) {
      alert('Data e peso são obrigatórios.');
      return;
    }

    // Converter fotos para base64 (se houver)
    const fotoAntesFile = document.getElementById('evolucao-foto-antes').files[0];
    const fotoDepoisFile = document.getElementById('evolucao-foto-depois').files[0];
    let fotoAntesBase64 = null;
    let fotoDepoisBase64 = null;

    if (fotoAntesFile) {
      fotoAntesBase64 = await fileToBase64(fotoAntesFile);
    }
    if (fotoDepoisFile) {
      fotoDepoisBase64 = await fileToBase64(fotoDepoisFile);
    }

    const registro = {
      data,
      peso,
      cintura,
      braco,
      coxa,
      observacoes,
      foto_antes: fotoAntesBase64,
      foto_depois: fotoDepoisBase64,
      timestamp: Date.now()
    };

    try {
      const db = firebase.database();
      const newRef = db.ref(`gymai_evolucao/${tokenKey}`).push();
      await newRef.set(registro);
      alert('Registro salvo com sucesso!');
      closeModal();
      carregarEvolucao(); // recarrega lista e gráfico
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar registro. Verifique sua conexão.');
    }
  });

  // Função para converter File para Base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  // Carregar dados do Firebase e renderizar
  async function carregarEvolucao() {
    const tokenKey = getTokenKey();
    if (!tokenKey) return;

    try {
      const db = firebase.database();
      const snapshot = await db.ref(`gymai_evolucao/${tokenKey}`).orderByChild('data').once('value');
      const registros = [];
      snapshot.forEach(child => {
        registros.push({ id: child.key, ...child.val() });
      });

      // Ordenar por data (mais recente primeiro)
      registros.sort((a, b) => new Date(b.data) - new Date(a.data));

      renderizarLista(registros);
      renderizarGrafico(registros);
    } catch (error) {
      console.error('Erro ao carregar evolução:', error);
    }
  }

  // Renderizar lista
  function renderizarLista(registros) {
    if (registros.length === 0) {
      lista.innerHTML = `
        <div style="text-align:center; color:var(--ph-text-muted); padding:30px 0;">
          Nenhum registro de evolução ainda.<br>
          Clique em "Adicionar nova medida" para começar.
        </div>
      `;
      return;
    }

    let html = '';
    registros.forEach(r => {
      const dataFormatada = new Date(r.data).toLocaleDateString('pt-BR');
      html += `
        <div class="ph-evolucao-item">
          <div class="ph-evolucao-header">
            <span>${dataFormatada}</span>
            <span class="ph-evolucao-peso">${r.peso} kg</span>
          </div>
          <div class="ph-evolucao-detalhes">
            ${r.cintura ? `<span>Cintura: ${r.cintura} cm</span>` : ''}
            ${r.braco ? `<span>Braço: ${r.braco} cm</span>` : ''}
            ${r.coxa ? `<span>Coxa: ${r.coxa} cm</span>` : ''}
          </div>
          ${r.observacoes ? `<div class="ph-evolucao-obs">${r.observacoes}</div>` : ''}
          <div class="ph-evolucao-fotos">
            ${r.foto_antes ? `<img src="${r.foto_antes}" alt="Antes">` : ''}
            ${r.foto_depois ? `<img src="${r.foto_depois}" alt="Depois">` : ''}
          </div>
        </div>
      `;
    });
    lista.innerHTML = html;
  }

  // Renderizar gráfico com Chart.js
  function renderizarGrafico(registros) {
    if (!chartCanvas) return;

    // Ordenar por data (mais antigo primeiro para o gráfico)
    const sorted = [...registros].sort((a, b) => new Date(a.data) - new Date(b.data));
    const labels = sorted.map(r => new Date(r.data).toLocaleDateString('pt-BR'));
    const dataPeso = sorted.map(r => r.peso);

    if (chartInstance) chartInstance.destroy();

    if (sorted.length === 0) {
      // Exibir mensagem no canvas
      const ctx = chartCanvas.getContext('2d');
      ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
      ctx.fillStyle = 'var(--ph-text-muted)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cadastre seu primeiro peso para ver o gráfico', chartCanvas.width/2, 50);
      return;
    }

    const ctx = chartCanvas.getContext('2d');
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Peso (kg)',
          data: dataPeso,
          borderColor: '#1ab9f5',
          backgroundColor: 'rgba(26,185,245,0.1)',
          tension: 0.3,
          pointBackgroundColor: '#1ab9f5',
          fill: true,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y} kg` } }
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(255,255,255,0.5)' }
          },
          x: {
            grid: { display: false },
            ticks: { color: 'rgba(255,255,255,0.5)', maxRotation: 45 }
          }
        }
      }
    });
  }

  // Carregar evolução ao entrar no módulo
  document.addEventListener('ph:modulechange', function (e) {
    if (e.detail.module === 'historico') {
      carregarEvolucao();
    }
  });

  // Carregar também se for a página inicial (caso histórico seja o módulo padrão)
  setTimeout(() => {
    const activeModule = document.querySelector('.ph-module.ph-active');
    if (activeModule && activeModule.id === 'module-historico') {
      carregarEvolucao();
    }
  }, 500);

})();
