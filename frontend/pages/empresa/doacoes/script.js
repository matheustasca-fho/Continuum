import { api, cpfValido, STATUS_CURADORIA } from "../../../js/shared/api.js";
import { store } from "../../../js/shared/store.js";
import { onlyDigits, mascaraCPF } from "../../../js/shared/validators.js";
import { runWithDynamicLoading } from "../../../js/shared/loader.js";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);

  const form = $("registroDoacaoForm");
  const cpfEl = $("cpfDoador");
  const tipoPecaEl = $("tipoPeca");
  const qtdEl = $("quantidadePecas");
  const pesoEl = $("pesoEstimado");
  const obsEl = $("observacoesDoacao");
  const errorEl = $("doacaoFormError");
  const searchEl = $("searchDoacoes");
  const listBody = $("doacoesListBody");
  const filterBtns = document.querySelectorAll(".filter-btn");

  const trackerBox = $("cpfTrackerBox");
  const trackerDonor = $("cpfTrackerDonor");
  const trackerCount = $("cpfTrackerCount");
  const trackerDots = [...document.querySelectorAll("#cpfTrackerDots .cpf-dot")];
  const trackerHint = $("cpfTrackerHint");
  const trackerCoupons = $("cpfTrackerCoupons");

  const celebration = $("couponCelebration");
  const celebrationTitle = $("couponCelebrationTitle");
  const celebrationDesc = $("couponCelebrationDesc");
  const celebrationCode = $("couponCelebrationCode");

  const toast = $("doacaoToast");
  const toastMsg = $("doacaoToastMsg");

  let filtroAtual = "TODOS";
  let buscaAtual = "";
  let toastTimer = null;
  const empresa = await api.getEmpresa();
  const empId = empresa?.id || "EMP-01";
  const pctDesconto = empresa?.politicaCupom?.percentual || 15;

  if ($("storeCouponPolicyBadge")) {
    $("storeCouponPolicyBadge").textContent = `5 doações = Cupom ${pctDesconto}% OFF`;
  }

  const showToast = (text) => {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = text;
    toast.classList.add("toast--visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("toast--visible");
    }, 3200);
  };

  const escapeHtml = (str) =>
    String(str ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[c],
    );

  const renderTracker = () => {
    const digits = onlyDigits(cpfEl.value);
    trackerCoupons.innerHTML = "";
    trackerBox.classList.remove("is-linked", "is-invalid");

    if (!digits) {
      trackerDonor.textContent = "Vínculo de Fidelidade Circular";
      trackerCount.textContent = "0 / 5 doações";
      trackerDots.forEach((d) => d.classList.remove("is-filled", "is-next"));
      trackerHint.textContent =
        "Digite o CPF para consultar o progresso atual do doador. Sem CPF, a doação entra na curadoria normalmente, mas não conta para cupom.";
      return;
    }

    if (digits.length < 11) {
      trackerDonor.textContent = "Digitando CPF…";
      trackerCount.textContent = `${digits.length} / 11 dígitos`;
      trackerDots.forEach((d) => d.classList.remove("is-filled", "is-next"));
      trackerHint.textContent =
        "Complete os 11 dígitos do CPF para verificar doações acumuladas e cupons ativos.";
      return;
    }

    if (!cpfValido(digits)) {
      trackerBox.classList.add("is-invalid");
      trackerDonor.textContent = "CPF inválido";
      trackerCount.textContent = "Verifique os dígitos";
      trackerDots.forEach((d) => d.classList.remove("is-filled", "is-next"));
      trackerHint.textContent =
        "Este CPF não passou na validação de dígitos verificadores.";
      return;
    }

    const info = api.consultarProgressoCupomCpf(digits, empId);
    trackerBox.classList.add("is-linked");
    trackerDonor.textContent = info.doador
      ? `Doador(a): ${info.doador.nome}`
      : "CPF válido (será vinculado automaticamente ao cadastro)";

    const atual = info.contandoNaLoja;
    const aposEsta = atual + 1;
    trackerCount.textContent = `${atual} / 5 no ciclo atual`;

    trackerDots.forEach((dot, idx) => {
      dot.classList.toggle("is-filled", idx < atual);
      dot.classList.toggle("is-next", idx === atual);
    });

    if (aposEsta >= 5) {
      trackerHint.innerHTML = `<strong>Esta doação completará 5/5!</strong> Um cupom de <strong>${pctDesconto}% OFF</strong> será gerado imediatamente ao salvar.`;
    } else {
      trackerHint.innerHTML = `Com esta doação, o CPF ficará em <strong>${aposEsta}/5</strong> (faltarão ${5 - aposEsta} para liberar o próximo cupom de ${pctDesconto}% OFF).`;
    }

    if (info.cuponsAtivosLoja.length > 0) {
      trackerCoupons.innerHTML = info.cuponsAtivosLoja
        .map(
          (c) =>
            `<span class="mini-coupon-pill">🎟 ${escapeHtml(c.codigo)} (${c.percentual}% OFF ativo)</span>`,
        )
        .join("");
    }
  };

  const updateKpis = (doacoesLoja) => {
    const cuponsLoja = (store.get("cupons") || []).filter(
      (c) => c.empresaId === empId,
    );
    if ($("kpiTotalDoacoes")) {
      $("kpiTotalDoacoes").textContent = String(doacoesLoja.length);
    }
    if ($("kpiAguardando")) {
      $("kpiAguardando").textContent = String(
        doacoesLoja.filter(
          (d) => d.statusCuradoria === STATUS_CURADORIA.AGUARDANDO,
        ).length,
      );
    }
    if ($("kpiComCpf")) {
      $("kpiComCpf").textContent = String(
        doacoesLoja.filter((d) => onlyDigits(d.cpfInformado).length === 11)
          .length,
      );
    }
    if ($("kpiCuponsAtivos")) {
      $("kpiCuponsAtivos").textContent = String(cuponsLoja.length);
    }
  };

  const renderDoacoes = () => {
    const todas = (store.get("doacoes") || [])
      .filter((d) => !d.empresaId || d.empresaId === empId)
      .slice()
      .reverse();

    updateKpis(todas);

    const q = buscaAtual.trim().toLowerCase();
    const qDigits = onlyDigits(buscaAtual);

    const filtradas = todas.filter((d) => {
      if (filtroAtual !== "TODOS" && d.statusCuradoria !== filtroAtual) {
        return false;
      }
      if (!q) return true;
      const matchText =
        String(d.id || "").toLowerCase().includes(q) ||
        String(d.tipoPeca || d.tipo || "").toLowerCase().includes(q);
      const matchCpf =
        qDigits.length > 0 && onlyDigits(d.cpfInformado).includes(qDigits);
      return matchText || matchCpf;
    });

    if (filtradas.length === 0) {
      listBody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:var(--color-muted-text);padding:2rem;">Nenhuma doação encontrada para este filtro.</td></tr>';
      return;
    }

    const doadores = store.get("doadores") || [];

    listBody.innerHTML = filtradas
      .map((d) => {
        const dt = d.criadoEm
          ? new Date(d.criadoEm).toLocaleDateString("pt-BR")
          : "—";
        const badgeClass =
          d.statusCuradoria === STATUS_CURADORIA.AGUARDANDO
            ? "badge-aguardando"
            : "badge-emlote";

        const cpfDigits = onlyDigits(d.cpfInformado);
        let cpfMarkup = '<span class="cpf-cell__empty">Sem CPF · Sem cupom</span>';
        if (cpfDigits.length === 11) {
          const donor = doadores.find((u) => onlyDigits(u.cpf) === cpfDigits);
          const prog = api.consultarProgressoCupomCpf(cpfDigits, empId);
          const statusProg =
            d.statusContagem === "EM_CUPOM"
              ? `Convertida em cupom (${prog.cuponsAtivosLoja.length} ativo(s))`
              : `Ciclo atual: ${prog.contandoNaLoja}/5 doações`;
          cpfMarkup = `
            <div class="cpf-cell">
              <span class="cpf-cell__num">${escapeHtml(mascaraCPF(cpfDigits))}${donor ? ` · ${escapeHtml(donor.nome.split(" ")[0])}` : ""}</span>
              <span class="cpf-cell__prog">${escapeHtml(statusProg)}</span>
            </div>
          `;
        }

        return `
          <tr>
            <td>
              <div class="doacao-id">${escapeHtml(d.id)}</div>
              <div style="font-size:0.75rem;color:var(--color-muted-text);">${escapeHtml(dt)}</div>
            </td>
            <td>
              <div style="font-weight:600;">${escapeHtml(d.tipoPeca || d.tipo || "Peças diversas")}</div>
              <div style="font-size:0.76rem;color:var(--color-muted-text);">${Number(d.pecas || 1)} pç(s) · ${Number(d.pesoKg || 0).toFixed(1).replace(".", ",")} kg</div>
            </td>
            <td>${cpfMarkup}</td>
            <td><span class="badge-status ${badgeClass}">${escapeHtml(d.statusCuradoria)}</span></td>
          </tr>
        `;
      })
      .join("");
  };

  cpfEl.addEventListener("input", () => {
    cpfEl.value = mascaraCPF(cpfEl.value);
    errorEl.textContent = "";
    renderTracker();
  });

  searchEl?.addEventListener("input", () => {
    buscaAtual = searchEl.value;
    renderDoacoes();
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filtroAtual = btn.dataset.filter;
      renderDoacoes();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    celebration.classList.remove("is-visible");

    const tipo = tipoPecaEl.value.trim();
    if (!tipo) {
      errorEl.textContent = "Informe o tipo de peça ou material doado.";
      tipoPecaEl.focus();
      return;
    }

    const cpfDigits = onlyDigits(cpfEl.value);
    if (cpfDigits.length > 0 && !cpfValido(cpfDigits)) {
      errorEl.textContent =
        "O CPF digitado é inválido. Corrija os 11 dígitos ou limpe o campo para registrar sem CPF.";
      cpfEl.focus();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const formCard = form.closest(".doacao-card");

    try {
      const { doacao, progresso } = await runWithDynamicLoading({
        button: submitBtn,
        container: formCard,
        title: "Registrando doação no balcão",
        steps: [
          "Catalogando peças na fila de curadoria…",
          cpfDigits.length === 11
            ? "Atualizando ciclo de fidelidade do CPF…"
            : "Sincronizando estoque têxtil da loja…",
        ],
        buttonLabel: "Registrando…",
        successText: "Doação registrada!",
        minDuration: 720,
        task: () =>
          api.registrarDoacaoEmpresa({
            empresaId: empId,
            cpfInformado: cpfDigits,
            tipoPeca: tipo,
            pecas: Number(qtdEl.value) || 1,
            pesoKg: Number(pesoEl.value) || 1,
            observacoes: obsEl.value.trim(),
          }),
      });

      form.reset();
      qtdEl.value = "1";
      pesoEl.value = "1.0";
      renderTracker();
      renderDoacoes();

      if (progresso?.novosCupons?.length > 0) {
        const cupom = progresso.novosCupons[0];
        celebrationTitle.textContent = `🎉 5/5 Doações! Cupom de ${cupom.percentual}% OFF liberado`;
        celebrationDesc.textContent = `O CPF ${mascaraCPF(cpfDigits)} completou o ciclo na loja e já pode usar o cupom abaixo no painel do doador.`;
        celebrationCode.textContent = cupom.codigo;
        celebration.classList.add("is-visible");
        showToast(`Doação ${doacao.id} salva e cupom ${cupom.codigo} emitido!`);
      } else if (progresso) {
        showToast(
          `Doação ${doacao.id} vinculada ao CPF (${progresso.contandoNaLoja}/5 para cupom)!`,
        );
      } else {
        showToast(`Doação ${doacao.id} enviada para curadoria!`);
      }
    } catch (err) {
      errorEl.textContent = err.message || "Erro ao registrar doação.";
    }
  });

  renderTracker();
  renderDoacoes();
});
