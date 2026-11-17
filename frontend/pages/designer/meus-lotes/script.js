import { api, STATUS_LOTE } from "../../../js/shared/api.js";
import { dates } from "../../../js/shared/dates.js";
import { store } from "../../../js/shared/store.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (s) => document.querySelector(s),
    list = $("#lotes"),
    empty = $("#empty"),
    search = $("#search"),
    modal = $("#confirmModal"),
    confirm = $("#modalConfirm");

  const designer = await api.getDesigner();
  let lots = await api.listarMeusLotesDesigner(designer.id),
    selected = null;

  // Inject Cancel Modal for FE-31
  const cancelModal = document.createElement("dialog");
  cancelModal.id = "cancelModal";
  cancelModal.style.cssText = "border:none;border-radius:12px;padding:1.5rem;max-width:460px;width:90%;box-shadow:0 12px 32px rgba(0,0,0,0.2);";
  cancelModal.innerHTML = `
    <h3 style="margin-top:0;font-family:'Anton',sans-serif;">Cancelar Reserva / Produção</h3>
    <div style="background:#ffebee;border:1px solid #ef9a9a;color:#b71c1c;padding:0.75rem;border-radius:8px;font-size:0.85rem;margin-bottom:1rem;">
      <strong>⚠️ Atenção:</strong> O cancelamento reduz sua nota de reputação. Se o lote já foi recebido, sua conta receberá um selo de <strong>RESTRIÇÃO</strong>.
    </div>
    <form id="cancelForm" style="display:flex;flex-direction:column;gap:0.75rem;">
      <label style="font-weight:600;font-size:0.9rem;">Motivo do cancelamento *
        <select id="cancelMotivo" required style="width:100%;padding:0.5rem;margin-top:0.25rem;border:1px solid #ccc;border-radius:6px;">
          <option value="">Selecione um motivo...</option>
          <option value="Imprevisto pessoal">Imprevisto pessoal</option>
          <option value="Falta de capacidade produtiva">Falta de capacidade produtiva</option>
          <option value="Material incompatível">Material incompatível</option>
          <option value="Outro">Outro</option>
        </select>
      </label>
      <label style="font-weight:600;font-size:0.9rem;">Texto explicativo *
        <textarea id="cancelTexto" rows="3" required placeholder="Explique o motivo do cancelamento..." style="width:100%;padding:0.5rem;margin-top:0.25rem;border:1px solid #ccc;border-radius:6px;"></textarea>
      </label>
      <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:0.5rem;">
        <button type="button" id="cancelCloseBtn" class="btn-pill" style="background:#eee;color:#111;">Voltar</button>
        <button type="submit" class="btn-pill" style="background:#b71c1c;color:#fff;">Confirmar Cancelamento</button>
      </div>
    </form>
  `;
  document.body.appendChild(cancelModal);
  cancelModal.querySelector("#cancelCloseBtn").addEventListener("click", () => cancelModal.close());

  const render = () => {
    const query = (search.value || "").toLowerCase(),
      items = lots.filter((l) =>
        `${l.codigo} ${l.titulo} ${l.empresaParceira}`
          .toLowerCase()
          .includes(query),
      );
    list.innerHTML = items
      .map((l) => {
        const prazoInfo = dates.getPrazoStatus(l.reservadoEm || l.criadoEm);
        const prazoLabel = `Prazo (10 dias úteis): ${dates.formatShort(prazoInfo.prazoISO)}`;
        const modalidade = l.modalidade === "envio" ? "Envio (Correios)" : "Retirada na loja";
        const tracking =
          l.modalidade === "envio"
            ? `<p class="lote__meta">Rastreio: <strong>${l.codigoRastreio || "Aguardando postagem"}</strong></p>`
            : "";
        const canReceive =
          l.status === STATUS_LOTE.RESERVADO || l.status === STATUS_LOTE.EM_TRANSPORTE;

        return `
          <li class="lote" data-id="${l.id}">
            <div class="lote__row">
              <div class="lote__info">
                <h3 class="lote__title">${l.titulo}</h3>
                <p class="lote__meta">${l.codigo} · ${l.pesoKg} kg · Empresa Parceira: ${l.empresaParceira}</p>
                <p class="lote__meta">Modalidade: <strong>${modalidade}</strong> · ${prazoLabel}</p>
                ${tracking}
              </div>
              <div class="lote__aside" style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
                <span class="badge">${l.status}</span>
                ${canReceive ? '<button class="btn-pill" data-action="receive">Sinalizar recebido</button>' : ""}
                <button class="btn-pill" data-action="cancel" style="background:#ffebee;color:#b71c1c;">Cancelar</button>
              </div>
            </div>
          </li>
        `;
      })
      .join("");
    empty.hidden = items.length > 0;
    $("#totalKg").textContent = items
      .reduce((n, l) => n + (Number(l.pesoKg) || 0), 0)
      .toFixed(1);
    $("#totalSub").textContent = `${items.length} lote(s) reservado(s)`;
  };

  search.addEventListener("input", render);

  list.addEventListener("click", (e) => {
    const receiveBtn = e.target.closest('[data-action="receive"]');
    if (receiveBtn) {
      selected = receiveBtn.closest("[data-id]").dataset.id;
      $("#modalLote").textContent =
        lots.find((l) => l.id === selected)?.titulo || "";
      modal.showModal();
      return;
    }

    const cancelBtn = e.target.closest('[data-action="cancel"]');
    if (cancelBtn) {
      selected = cancelBtn.closest("[data-id]").dataset.id;
      cancelModal.querySelector("#cancelMotivo").value = "";
      cancelModal.querySelector("#cancelTexto").value = "";
      cancelModal.showModal();
    }
  });

  confirm.addEventListener("click", async (e) => {
    if (!selected) return;
    e.preventDefault();
    try {
      await api.confirmarRecebimentoDesigner(selected);
      lots = await api.listarMeusLotesDesigner(designer.id);
      modal.close();
      render();
    } catch (err) {
      alert(err.message);
    }
  });

  cancelModal.querySelector("#cancelForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selected) return;
    const motivo = cancelModal.querySelector("#cancelMotivo").value;
    const texto = cancelModal.querySelector("#cancelTexto").value.trim();
    if (!motivo || !texto) return;

    const allLots = store.get("lotes") || [];
    const lot = allLots.find((x) => x.id === selected);
    const jaRecebido = lot && lot.status === STATUS_LOTE.EM_PRODUCAO;
    if (lot) {
      lot.status = STATUS_LOTE.INTERROMPIDO;
      lot.cancelamento = { motivo, texto, data: new Date().toISOString() };
      store.set("lotes", allLots);
    }

    const designers = store.get("confeccionistas") || [];
    const d = designers.find((x) => x.id === designer.id);
    if (d) {
      d.nota = Math.max(1, Number((d.nota || 5) - 0.5).toFixed(1));
      if (jaRecebido) d.restricaoAtiva = true;
      store.set("confeccionistas", designers);
    }

    lots = await api.listarMeusLotesDesigner(designer.id);
    cancelModal.close();
    render();
  });

  render();
});
