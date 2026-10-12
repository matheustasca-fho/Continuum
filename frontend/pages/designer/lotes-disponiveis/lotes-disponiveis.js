import { getLotes, getLojas, getDesigner, toggleFavorito, setReservaAtiva } from '../../../js/shared/store.js';

// Elementos da DOM
const grid = document.getElementById('lotes-grid');
const lojasRibbon = document.getElementById('lojas-ribbon');
const countSalvos = document.getElementById('count-salvos');
const emptyState = document.getElementById('empty-state');
const bannerReserva = document.getElementById('faixa-reserva');
const textoReserva = document.getElementById('reserva-banner-texto');
const demoToggle = document.getElementById('demo-toggle');

// Estado Local
let currentAba = 'todos'; // todos | salvos
let designer = null;
let lotes = [];
let lojas = [];

// Formatação
const fmtTempo = (isoString) => {
  const diffHoras = Math.floor((new Date() - new Date(isoString)) / 3600000);
  if (diffHoras < 24) return `há ${diffHoras} h`;
  return `há ${Math.floor(diffHoras / 24)} dias`;
};

// Inicialização
async function init() {
  // Simula latência de rede
  await new Promise(r => setTimeout(r, 400));
  
  designer = getDesigner();
  lotes = getLotes().filter(l => l.status === 'DISPONIVEL' || l.id === designer.reservaAtiva);
  lojas = getLojas();

  renderLojas();
  renderGrid();
  renderFaixaReserva();
  setupListeners();
}

function renderLojas() {
  let html = `<button class="chip chip--active">Todas as lojas</button>`;
  lojas.forEach(loja => {
    // Conta quantos lotes disponiveis da loja
    const qtde = lotes.filter(l => l.lojaId === loja.id && l.status === 'DISPONIVEL').length;
    if(qtde > 0) {
      html += `<button class="chip">${loja.nome} (${qtde})</button>`;
    }
  });
  lojasRibbon.innerHTML = html;
}

function renderFaixaReserva() {
  if (designer.reservaAtiva) {
    const lote = lotes.find(l => l.id === designer.reservaAtiva);
    const loja = lojas.find(l => l.id === lote.lojaId);
    textoReserva.innerHTML = `${lote.id} • ${loja.nome} • retirar em 10 dias úteis`;
    bannerReserva.hidden = false;
  } else {
    bannerReserva.hidden = true;
  }
}

function renderGrid() {
  grid.innerHTML = '';
  
  const exibirLotes = lotes.filter(l => {
    // Se tiver aba salvos, mostra so os favoritos
    if (currentAba === 'salvos' && !designer.favoritos.includes(l.id)) return false;
    // Omitir o reservado atual da grade, pois ele fica na faixa de topo
    if (l.id === designer.reservaAtiva) return false;
    return l.status === 'DISPONIVEL';
  });

  countSalvos.textContent = designer.favoritos.length;

  if (exibirLotes.length === 0) {
    emptyState.hidden = false;
    return;
  }
  
  emptyState.hidden = true;

  exibirLotes.forEach((lote, index) => {
    const loja = lojas.find(lj => lj.id === lote.lojaId);
    const isFav = designer.favoritos.includes(lote.id);
    const isNovo = (new Date() - new Date(lote.publicado_em)) < 172800000; // < 48h
    
    // Icone de logística (ilustrativo sem emoji)
    const iconEnvio = lote.logistica_aceita.includes('envio') ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" title="Entrega disponível"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>` : '';
    
    const div = document.createElement('div');
    div.className = 'lote-card';
    div.style.animationDelay = `${index * 0.08}s`; // Delightful UX: Entrada Coreografada
    
    div.innerHTML = `
      <div class="lote-card__header">
        ${isNovo ? `<span class="lote-card__badge-novo">Novo</span>` : `<div></div>`}
        <button class="lote-card__btn-fav ${isFav ? 'lote-card__btn-fav--active' : ''}" data-id="${lote.id}" aria-label="Favoritar lote" aria-pressed="${isFav}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
        </button>
      </div>
      <div class="lote-card__body">
        <h3 class="lote-card__title">${lote.titulo}</h3>
        <p class="lote-card__tech">${lote.peso} • ${loja.nome}</p>
        <p style="font-size: 11px; color: var(--color-muted-text); display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <span style="display:flex; align-items:center; gap:4px;">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> 
            a ${lote.distancia} 
            ${iconEnvio}
          </span>
          <span>Publicado ${fmtTempo(lote.publicado_em)}</span>
        </p>
        <div class="lote-card__footer">
          <button class="btn btn--secondary" style="width: 100%">Ver detalhes</button>
          <button class="btn btn--primary lote-card__btn-reservar" 
                  ${designer.reservaAtiva ? 'aria-disabled="true" title="Você já tem um lote reservado"' : ''}>
            Reservar
          </button>
        </div>
      </div>
    `;
    grid.appendChild(div);
  });
}

// Variáveis de Painel
const drawerLote = document.getElementById('drawer-lote');
const drawerLoja = document.getElementById('drawer-loja');
let loteSelecionado = null;

function openDrawerLote(id) {
  const lote = lotes.find(l => l.id === id);
  if(!lote) return;
  const loja = lojas.find(l => l.id === lote.lojaId);
  if(!loja) return;
  
  loteSelecionado = lote;

  const body = document.getElementById('dl-body');
  body.innerHTML = `
    <div class="form-group">
      <label>Código do Lote</label>
      <input type="text" class="form-control" value="${lote.id}" readonly>
      <span class="form-helper">Gerado automaticamente pelo sistema.</span>
    </div>
    <div class="form-group">
      <label>Descrição e Direção</label>
      <textarea class="form-control" rows="3" readonly>${lote.direcao}</textarea>
    </div>
    <div class="form-group">
      <label>Peso / Quantidade</label>
      <input type="text" class="form-control" value="${lote.peso}" readonly>
    </div>
    <div class="form-group">
      <label>Logística e Origem</label>
      <div class="form-control" style="background:var(--color-sand-offwhite); display:flex; flex-direction:column; gap:4px; height:auto;">
         <strong style="color:var(--color-charcoal-text);">${loja.nome}</strong>
         <span style="font-size:11px; color:var(--color-muted-text);">Aprox. ${lote.distancia} • ${lote.logistica_aceita.includes('envio') ? 'Aceita Envio ou Retirada' : 'Somente Retirada'}</span>
      </div>
    </div>
    <button type="button" class="btn btn--secondary" id="btn-ver-loja" style="width:100%">Ver perfil da loja</button>
  `;
  document.getElementById('btn-ver-loja').addEventListener('click', () => { drawerLote.close(); openDrawerLoja(loja); });

  const btnReserva = document.getElementById('btn-drawer-reservar');
  const hintReserva = document.getElementById('dl-reserva-hint');
  
  if(designer.reservaAtiva) {
    btnReserva.disabled = true;
    btnReserva.textContent = 'Indisponível (Você já possui reserva)';
    btnReserva.style.background = 'var(--color-border)';
    btnReserva.style.color = 'var(--color-muted-text)';
    if(hintReserva) hintReserva.hidden = false;
  } else {
    btnReserva.disabled = false;
    btnReserva.textContent = 'Reservar este lote';
    btnReserva.style.background = 'var(--color-primary)';
    btnReserva.style.color = 'var(--color-white)';
    if(hintReserva) hintReserva.hidden = true;
  }

  drawerLote.showModal();
}

function openDrawerLoja(loja) {
  document.getElementById('dloja-title').textContent = loja.nome;
  document.getElementById('dloja-sobre').textContent = loja.sobre;
  document.getElementById('dloja-endereco').textContent = loja.endereco;
  document.getElementById('dloja-horario').textContent = loja.horario_retirada;
  drawerLoja.classList.add('drawer--open');
  drawerLoja.setAttribute('aria-hidden', 'false');
}

function closeDrawerLoja() {
  drawerLoja.classList.remove('drawer--open');
  drawerLoja.setAttribute('aria-hidden', 'true');
}

function closeDrawers() {
  if (drawerLote && drawerLote.open) drawerLote.close();
  closeDrawerLoja();
}

// Inicia o fluxo de reserva (M5 se já houver reserva; senão M1) para o lote em loteSelecionado
function iniciarReserva() {
  const m1 = document.getElementById('modal-m1');
  const m5 = document.getElementById('modal-m5');
  if(!loteSelecionado) return;

  // Regra R1: Se já tem reserva, abre M5
  if (designer.reservaAtiva) {
    document.getElementById('m5-lote-atual').textContent = `#${designer.reservaAtiva}`;
    m5.showModal();
    return;
  }

  // Calcula 10 dias úteis para o M1
  const hoje = new Date();
  let diasAdicionados = 0;
  while(diasAdicionados < 10) {
    hoje.setDate(hoje.getDate() + 1);
    if(hoje.getDay() !== 0 && hoje.getDay() !== 6) diasAdicionados++;
  }
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  // Prepara M1
  document.getElementById('m1-lote-nome').textContent = loteSelecionado.titulo;
  document.getElementById('m1-loja-nome').textContent = lojas.find(l => l.id === loteSelecionado.lojaId).nome;
  document.getElementById('m1-data-limite').textContent = dataFormatada;

  document.getElementById('chk-termo').checked = false;
  document.getElementById('btn-m1-confirmar').disabled = true;

  m1.showModal();
}

function setupListeners() {
  // ... Listeners anteriores
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab--active'));
      e.currentTarget.classList.add('tab--active');
      currentAba = e.currentTarget.dataset.aba;
      renderGrid();
    });
  });

  grid.addEventListener('click', (e) => {
    // Favo
    const btnFav = e.target.closest('.lote-card__btn-fav');
    if (btnFav) {
      const id = btnFav.dataset.id;
      designer.favoritos = toggleFavorito(id);
      renderGrid();
      if (loteSelecionado && loteSelecionado.id === id) {
        openDrawerLote(id); // atualiza estado no drawer
      }
      return;
    }

    const card = e.target.closest('.lote-card');
    if (!card) return;
    const title = card.querySelector('.lote-card__title').textContent;
    const lote = lotes.find(l => l.titulo === title); // Busca pelo titulo (simplificado pro mock)
    if (!lote) return;

    // Botão "Reservar" do card: inicia direto o fluxo de reserva
    if (e.target.closest('.lote-card__btn-reservar')) {
      loteSelecionado = lote;
      iniciarReserva();
      return;
    }

    // Clique no Card (Ver detalhes)
    openDrawerLote(lote.id);
  });

  // Drawer Lote Fechar
  document.getElementById('btn-close-lote').addEventListener('click', closeDrawers);
  const btnDrawerCancel = document.getElementById('btn-drawer-cancel');
  if(btnDrawerCancel) btnDrawerCancel.addEventListener('click', closeDrawers);

  // Teclado (Acessibilidade)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawers();
  });

  // ==========================================
  // FLUXO DE RESERVA (Modais M1, M2, M3, M5)
  // ==========================================
  
  const m1 = document.getElementById('modal-m1');
  const m2 = document.getElementById('modal-m2');
  const m3 = document.getElementById('modal-m3');
  const m5 = document.getElementById('modal-m5');

  // Abre M1 ou M5
  document.getElementById('btn-drawer-reservar').addEventListener('click', iniciarReserva);

  // Drawer do perfil da loja
  document.getElementById('btn-close-loja').addEventListener('click', closeDrawerLoja);

  // M1: Validar Checkbox
  document.getElementById('chk-termo').addEventListener('change', (e) => {
    document.getElementById('btn-m1-confirmar').disabled = !e.target.checked;
  });

  // M1 -> M2
  document.getElementById('btn-m1-confirmar').addEventListener('click', () => {
    m1.close();
    
    // Configura opções de logística no M2
    const aceitaEnvio = loteSelecionado.logistica_aceita.includes('envio');
    const boxEnvio = document.getElementById('m2-opt-envio-box');
    const inputEnvio = document.getElementById('m2-opt-envio');
    const txtRetirada = document.getElementById('m2-txt-retirada');
    
    const loja = lojas.find(l => l.id === loteSelecionado.lojaId);
    txtRetirada.textContent = `${loja.endereco} (${loja.horario_retirada})`;

    if(!aceitaEnvio) {
      boxEnvio.style.opacity = '0.5';
      inputEnvio.disabled = true;
      document.getElementById('m2-opt-retirada').checked = true;
    } else {
      boxEnvio.style.opacity = '1';
      inputEnvio.disabled = false;
    }

    m2.showModal();
  });

  // M2 -> M3 (E salva no banco falso)
  document.getElementById('btn-m2-salvar').addEventListener('click', () => {
    const modo = document.querySelector('input[name="logistica"]:checked');
    if(!modo) return;

    m2.close();
    
    // Efetiva reserva
    setReservaAtiva(loteSelecionado.id);
    designer.reservaAtiva = loteSelecionado.id; // atualiza estado local

    // Prepara M3
    document.getElementById('m3-loja-nome').textContent = lojas.find(l => l.id === loteSelecionado.lojaId).nome;
    const txtLog = modo.value === 'retirada' ? 'Você escolheu <strong>Retirar na loja</strong>. Organize-se para o prazo.' : 'Você escolheu <strong>Receber em casa</strong>. A loja enviará em breve.';
    document.getElementById('m3-resumo-logistica').innerHTML = txtLog;

    // Dispara animação
    const tagAnim = document.getElementById('m3-tag-anim');
    tagAnim.classList.remove('anim-drop-tag');
    void tagAnim.offsetWidth; // trigger reflow
    tagAnim.classList.add('anim-drop-tag');

    m3.showModal();
  });



  // Fechamentos M1, M2, M5
  document.getElementById('btn-m1-cancelar').addEventListener('click', () => m1.close());
  document.getElementById('btn-m2-depois').addEventListener('click', () => {
    setReservaAtiva(loteSelecionado.id); // Salva sem escolher
    location.reload();
  });
  document.getElementById('btn-m5-fechar').addEventListener('click', () => m5.close());
  document.getElementById('btn-m5-meu-lote').addEventListener('click', () => {
    m5.close();
    closeDrawers();
    location.reload(); // abriria o detalhe da reserva atual
  });

  // Final M3
  document.getElementById('btn-m3-meus-lotes').addEventListener('click', () => location.href = '../meus-lotes/index.html');
  document.getElementById('btn-m3-explorar').addEventListener('click', () => location.reload());

  // Demo Switch
  demoToggle.addEventListener('click', () => {
    if(designer.reservaAtiva) setReservaAtiva(null);
    else setReservaAtiva('LT-01');
    location.reload();
  });
}

init();
