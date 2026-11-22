import { api } from "../../../js/shared/api.js";

const canvas = document.getElementById("canvas-area");
const sizeSelect = document.getElementById("tag-size");
const qtyInput = document.getElementById("tag-qty");
const showDesignerCheck = document.getElementById("tag-show-designer");

let projeto = {
  id: "1",
  peca: "Peça Upcycling",
  designer: "Designer",
  material: "Material têxtil reaproveitado",
  codigoQr: "CNT-QR-0001",
  qrSvg: "",
  urlPublica: "",
};

function renderTags() {
  const sizeParts = sizeSelect.value.split("x");
  const width = `${sizeParts[0]}mm`;
  const height = `${sizeParts[1]}mm`;
  const qty = parseInt(qtyInput.value, 10) || 1;
  const showDesigner = showDesignerCheck.checked;

  // Renderiza o SVG real do QR Code gerado pela API (BE-13.5)
  const qrContent = projeto.qrSvg
    ? `<div class="qr-svg-container" data-qr-url="${projeto.urlPublica}" style="width:96px;height:96px;margin:0 auto;">${projeto.qrSvg}</div>`
    : `<div class="qr-code-label">${projeto.codigoQr}</div>`;

  const tagHTML = `
    <div class="tag-container" style="width: ${width}; height: ${height};">
      <div class="tag-hole"></div>
      <div class="tag-brand">CONTINUUM</div>
      <div class="tag-info">
        <div class="tag-piece">${projeto.peca}</div>
        ${showDesigner ? `<div class="tag-designer">por ${projeto.designer}</div>` : ""}
        <div class="tag-material">${projeto.material}</div>
      </div>
      <div class="qr-box">
        ${qrContent}
        <div class="qr-warning">${projeto.codigoQr || "QR TAG"}</div>
      </div>
      <div class="tag-footer">Escaneie e conheça a<br>história desta peça</div>
    </div>
  `;

  canvas.innerHTML = "";
  for (let i = 0; i < qty; i++) {
    canvas.innerHTML += tagHTML;
  }
}

sizeSelect.addEventListener("change", renderTags);
qtyInput.addEventListener("input", renderTags);
showDesignerCheck.addEventListener("change", renderTags);

document.addEventListener("DOMContentLoaded", async () => {
  const id = new URLSearchParams(location.search).get("id") || "1";
  try {
    const p =
      (await api.getProjeto(id)) || (await api.listarProjetosEmpresa())?.[0];
    if (p) {
      const codigoQr = p.codigoPublicoQr || `CNT-QR-${String(p.id).padStart(4, "0")}`;
      let qrInfo = null;
      try {
        qrInfo = await api.obterQrCodeProjeto(codigoQr);
      } catch {
        /* fallback */
      }

      projeto = {
        id: p.id,
        peca: p.tituloPeca || p.lote_nome || `Projeto #${p.id}`,
        designer: p.designer_nome || "Designer",
        material: p.lote?.descricao || "Material têxtil reaproveitado",
        codigoQr,
        qrSvg: qrInfo?.svg || "",
        urlPublica: qrInfo?.urlPublica || `../peca-publica/index.html?codigo=${encodeURIComponent(codigoQr)}`,
      };
      const bc = document.querySelector(".breadcrumb");
      if (bc) {
        bc.innerHTML = `<a href="../projetos/index.html">Projetos</a> › PRJ-${String(p.id).padStart(2, "0")}`;
      }
      const qrLink = document.querySelector(
        'a[href*="../peca-publica/index.html"]',
      );
      if (qrLink) {
        qrLink.href = `../peca-publica/index.html?codigo=${encodeURIComponent(codigoQr)}&id=${encodeURIComponent(p.id)}`;
      }
    }
  } catch (err) {
    console.error("Erro ao carregar projeto para a Tag:", err);
  }
  renderTags();
});
