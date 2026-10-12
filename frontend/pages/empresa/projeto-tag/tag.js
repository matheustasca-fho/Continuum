// Referências DOM
const canvas = document.getElementById('canvas-area');
const sizeSelect = document.getElementById('tag-size');
const qtyInput = document.getElementById('tag-qty');
const showDesignerCheck = document.getElementById('tag-show-designer');

// Dados Mock do Projeto #PRJ-05
const projeto = {
  peca: "Jaqueta Upcycling",
  designer: "Samuel Pires",
  material: "Jeans lavado / Retalhos 100% Algodão"
};

// Função de Renderização
function renderTags() {
  const sizeParts = sizeSelect.value.split('x');
  const width = `${sizeParts[0]}mm`;
  const height = `${sizeParts[1]}mm`;
  const qty = parseInt(qtyInput.value) || 1;
  const showDesigner = showDesignerCheck.checked;

  // Gera os "quadradinhos" pro QR fake
  let qrDivs = '';
  for(let i=0; i<64; i++) { qrDivs += `<div></div>`; }

  const tagHTML = `
    <div class="tag-container" style="width: ${width}; height: ${height};">
      <div class="tag-hole"></div>
      
      <div class="tag-brand">CONTINUUM</div>
      
      <div class="tag-info">
        <div class="tag-piece">${projeto.peca}</div>
        ${showDesigner ? `<div class="tag-designer">por ${projeto.designer}</div>` : ''}
        <div class="tag-material">${projeto.material}</div>
      </div>
      
      <!-- Mock QR (Placeholder exigido pelo Guard-rail) -->
      <div class="qr-mock">
        ${qrDivs}
        <div class="qr-warning">QR DEMO<br>Não escaneável</div>
      </div>
      
      <div class="tag-footer">Escaneie e conheça a<br>história desta peça</div>
    </div>
  `;

  // Limpa e injeta N cópias
  canvas.innerHTML = '';
  for(let i=0; i<qty; i++) {
    canvas.innerHTML += tagHTML;
  }
}

// Listeners
sizeSelect.addEventListener('change', renderTags);
qtyInput.addEventListener('input', renderTags);
showDesignerCheck.addEventListener('change', renderTags);

// Initial render
renderTags();
