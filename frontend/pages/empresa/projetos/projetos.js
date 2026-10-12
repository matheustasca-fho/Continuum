import { getProjetos, updateProjeto } from '../../../js/shared/store.js';

let filtroAtual = 'TODOS';
let projetoSelecionado = null;

const grid = document.getElementById('projetos-grid');
const searchInput = document.getElementById('search-input');
const drawer = document.getElementById('drawer-detalhe');
const modal = document.getElementById('modal-acao');
const filtroBtn = document.getElementById('filtro-btn');
const dropdownBox = document.getElementById('dropdown-menu-box');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarRestore = document.getElementById('sidebarRestore');

// ==========================================
// RENDERIZAÇÃO E CÓDIGOS DE LOTE
// ==========================================
function getBadgeConfig(status) {
  if(status === 'FINALIZADO') return { class: 'badge--finalizado', text: 'FINALIZADO' };
  if(status === 'EM_PRODUCAO') return { class: 'badge--andamento', text: 'EM ANDAMENTO' };
  if(status === 'ENVIADO') return { class: 'badge--reservado', text: 'ENVIADO' };
  if(status === 'EXCEDIDO') return { class: 'badge--excedido', text: 'EXCEDIDO' };
  return { class: 'badge--reservado', text: status };
}

// Lógica da equipe: Gera um código falso para o lote baseado no ID e na data
function gerarCodigoLote(id) {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `L${String(id).padStart(3, '0')}${day}${month}${year}`;
}
function getDataMock() {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function renderGrid() {
  const projetos = getProjetos();
  const termoBusca = searchInput.value.toLowerCase();
  
  const filtrados = projetos.filter(p => {
    const matchStatus = filtroAtual === 'TODOS' || p.status === filtroAtual;
    const matchBusca = p.designer_nome.toLowerCase().includes(termoBusca) || p.ds_descricao.toLowerCase().includes(termoBusca);
    return matchStatus && matchBusca;
  });

  grid.innerHTML = '';

  if (filtrados.length === 0) {
    grid.innerHTML = '<p style="color:var(--color-muted-text); grid-column: 1/-1;">Nenhum projeto encontrado.</p>';
    return;
  }

  filtrados.forEach(p => {
    const badge = getBadgeConfig(p.status);
    const card = document.createElement('div');
    card.className = 'proj-card';
    card.onclick = () => abrirDrawer(p);
    
    // Novo layout com o padrão de código gerado e data
    card.innerHTML = `
      <div class="proj-card__thumb">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
          <defs>
            <pattern id="pat-${p.cd_projeto}" width="38" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-34)">
              <text x="-4" y="12" fill="var(--color-primary)" font-family="var(--font-title)" font-size="7" opacity="0.8">CONTINUUM</text>
            </pattern>
          </defs>
          <rect width="64" height="64" fill="var(--color-sand-offwhite)"/>
          <rect width="64" height="64" fill="url(#pat-${p.cd_projeto})"/>
        </svg>
      </div>
      <div class="proj-card__body">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 class="proj-card__designer" style="font-size: 14px; font-weight: bold; color: var(--color-charcoal-text); margin: 0;">${gerarCodigoLote(p.cd_projeto)}</h3>
          <span style="font-size: 11px; color: var(--color-muted-text);">${getDataMock()}</span>
        </div>
        <p style="font-size: 11px; font-weight: bold; color: var(--color-primary); margin-bottom: 8px; text-transform: uppercase;">DESIGNER: ${p.designer_nome}</p>
        <p class="proj-card__desc" style="font-size: 12px; color: #666; margin-bottom: 16px; min-height: 36px;">${p.ds_descricao}</p>
        <div class="proj-card__footer">
          <span class="badge ${badge.class}">${badge.text}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ==========================================
// FILTROS & SIDEBAR (Interatividade)
// ==========================================
filtroBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  dropdownBox.style.display = dropdownBox.style.display === 'none' || dropdownBox.style.display === '' ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
  if(!filtroBtn.contains(e.target) && !dropdownBox.contains(e.target)) {
    dropdownBox.style.display = 'none';
  }
});

document.getElementById('filter-menu').addEventListener('click', (e) => {
  const item = e.target.closest('.dropdown-item');
  if(item) {
    document.querySelectorAll('.dropdown-item').forEach(c => c.classList.remove('dropdown-item--active'));
    item.classList.add('dropdown-item--active');
    filtroAtual = item.dataset.status;
    
    document.getElementById('filtro-texto').textContent = item.textContent.trim();
    dropdownBox.style.display = 'none';
    renderGrid();
  }
});

searchInput.addEventListener('input', renderGrid);

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => document.querySelector('.app-layout').classList.add('sidebar-collapsed'));
}
if (sidebarRestore) {
  sidebarRestore.addEventListener('click', () => document.querySelector('.app-layout').classList.remove('sidebar-collapsed'));
}

// ==========================================
// MODAL DE GERENCIAMENTO (Substitui Drawer)
// ==========================================
function getIconForStatus(status) {
  if(status === 'DISPONIVEL') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-success)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg>`;
  if(status === 'RESERVADO') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#E57373" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
  if(status === 'EM_PRODUCAO') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#D4A017" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
  if(status === 'ENVIADO') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-success)" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
  if(status === 'FINALIZADO') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
  if(status === 'EXCEDIDO') return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--color-error)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  return '';
}

function abrirDrawer(p) {
  projetoSelecionado = p;
  
  const body = document.getElementById('drawer-body');
  body.innerHTML = `
    <div class="form-group">
      <label>Código do Projeto</label>
      <input type="text" class="form-control" value="${gerarCodigoLote(p.cd_projeto)}" readonly>
      <span class="form-helper">Gerado automaticamente pelo sistema.</span>
    </div>
    <div class="form-group">
      <label>Descrição do Projeto</label>
      <textarea class="form-control" rows="3" readonly>${p.ds_descricao}</textarea>
    </div>
    <div class="form-group">
      <label>Designer Responsável</label>
      <input type="text" class="form-control" value="${p.designer_nome}" readonly>
    </div>
    <div class="form-group">
      <label>Status</label>
      <div class="form-control" style="display:flex; align-items:center; gap:8px;">
         ${getIconForStatus(p.status)} <strong style="color:var(--color-charcoal-text);">${getBadgeConfig(p.status).text}</strong>
      </div>
    </div>
  `;

  const footer = document.getElementById('drawer-footer');
  let acaoEsquerda = `<button class="btn-form-cancel" style="border:none; color:var(--color-primary); background:transparent; padding:0; box-shadow:none;" onclick="window.location.href='../projeto-detalhe/index.html'">Acessar Histórico</button>`;
  let acaoDireita = '';

  if(p.status === 'EM_PRODUCAO' || p.status === 'ENVIADO') {
    acaoDireita = `
      <button class="btn-form-cancel" id="btn-cancelar-modal-form">Cancelar</button>
      <button class="btn-form-submit" onclick="window.location.href='../projeto-revisao/index.html'">Avançar e Concluir</button>
    `;
  } else if(p.status === 'EXCEDIDO') {
    acaoDireita = `
      <button class="btn-form-cancel" id="btn-cancelar-modal-form">Cancelar</button>
      <button class="btn-form-danger" onclick="abrirModal('EM_PRODUCAO')">Liberar Prazo</button>
    `;
  } else if(p.status === 'FINALIZADO') {
    acaoDireita = `
      <button class="btn-form-cancel" id="btn-cancelar-modal-form">Fechar</button>
      <button class="btn-form-submit" style="background:var(--color-charcoal-text);" onclick="window.location.href='../projeto-tag/index.html'">Imprimir Tag</button>
    `;
  } else {
    acaoDireita = `<button class="btn-form-cancel" id="btn-cancelar-modal-form">Fechar</button>`;
  }

  footer.innerHTML = `
    <div>${acaoEsquerda}</div>
    <div class="modal-form__footer-right">${acaoDireita}</div>
  `;

  drawer.showModal();
  
  const btnCancelar = document.getElementById('btn-cancelar-modal-form');
  if(btnCancelar) btnCancelar.onclick = () => drawer.close();
}

document.getElementById('btn-close-drawer').onclick = () => {
  drawer.close();
};

// ==========================================
// MODAL
// ==========================================
window.abrirModal = function(acaoDestino) {
  document.getElementById('modal-title').textContent = 'Sinalizar Recebimento';
  document.getElementById('modal-desc').textContent = 'Confirma o recebimento físico do material deste designer?';
  document.getElementById('btn-confirmar-modal').textContent = 'Confirmar Recebimento';
  document.getElementById('btn-confirmar-modal').dataset.acao = acaoDestino;
  drawer.classList.remove('drawer--open');
  modal.showModal();
}

document.getElementById('btn-cancelar-modal').onclick = () => modal.close();

document.getElementById('btn-confirmar-modal').onclick = (e) => {
  const acao = e.target.dataset.acao;
  if (projetoSelecionado) {
    updateProjeto(projetoSelecionado.cd_projeto, acao);
    renderGrid();
  }
  modal.close();
};

// Start
renderGrid();
