/*!
 * Sites Incríveis — motor de rolagem
 * © 2026 Enzo Barbatto — Sparo Automações. Uso conforme LICENCA.md.
 *
 * A página declara efeitos com atributos data-fx-*; o motor observa a
 * rolagem e anima. Nada aqui conhece o conteúdo da página: comportamento
 * sob medida deve viver em <script> da própria página, nunca neste arquivo.
 */
(() => {
  "use strict";

  const doc = document;
  const raiz = doc.documentElement;
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduzido) raiz.classList.add("fx-reduzido");

  /* ---------- utilidades ---------- */

  const limitar = (v, min, max) => Math.min(Math.max(v, min), max);

  const interpolar = (a, b, t) => a + (b - a) * t;

  // "0,-200" -> [0, -200]; "0.4" -> [0.4, 0.4]
  const lerPar = (texto, padraoA, padraoB) => {
    if (!texto) return [padraoA, padraoB];
    const partes = String(texto).split(",");
    const a = parseFloat(partes[0]);
    const b = partes.length > 1 ? parseFloat(partes[1]) : a;
    return [Number.isNaN(a) ? padraoA : a, Number.isNaN(b) ? padraoB : b];
  };

  const formatarNumero = (valor, decimais) =>
    valor.toLocaleString("pt-BR", {
      minimumFractionDigits: decimais,
      maximumFractionDigits: decimais
    });

  // Valor final de um contador, lido dos atributos data-fx-*
  const valorFinalContador = (el) => parseFloat(el.dataset.fxFim || el.dataset.fxValor || "0");

  /* ---------- 1. Revelações ao entrar na tela ---------- */
  // data-fx="surgir | subir | esquerda | direita | crescer | palavras | digitar | contar"
  // extras: data-fx-atraso="200" (ms)  data-fx-duracao="900" (ms)

  const REVELACOES = ["surgir", "subir", "esquerda", "direita", "crescer", "palavras", "digitar", "contar"];

  const prepararPalavras = (el) => {
    const texto = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", texto);
    texto.split(/(\s+)/).forEach((pedaco) => {
      if (/^\s+$/.test(pedaco)) {
        el.appendChild(doc.createTextNode(pedaco));
      } else if (pedaco) {
        const palavra = doc.createElement("span");
        palavra.className = "fx-palavra";
        palavra.setAttribute("aria-hidden", "true");
        palavra.textContent = pedaco;
        el.appendChild(palavra);
      }
    });
  };

  const animarPalavras = (el) => {
    const palavras = el.querySelectorAll(".fx-palavra");
    const passo = parseFloat(el.dataset.fxDuracao || 700) / Math.max(palavras.length, 1);
    palavras.forEach((palavra, i) => {
      palavra.style.transitionDelay = `${Math.round(i * passo)}ms`;
    });
  };

  const animarDigitar = (el) => {
    const texto = el.dataset.fxTexto;
    const duracao = parseFloat(el.dataset.fxDuracao || 1400);
    let inicio = null;
    el.classList.add("fx-digitando");

    const quadro = (t) => {
      if (inicio === null) inicio = t;
      const prog = limitar((t - inicio) / duracao, 0, 1);
      el.textContent = texto.slice(0, Math.round(texto.length * prog));
      if (prog < 1) requestAnimationFrame(quadro);
      else el.classList.remove("fx-digitando");
    };
    requestAnimationFrame(quadro);
  };

  const animarContar = (el) => {
    const fim = valorFinalContador(el);
    const comeco = parseFloat(el.dataset.fxInicio || "0");
    const decimais = parseInt(el.dataset.fxDecimais || "0", 10);
    const prefixo = el.dataset.fxPrefixo || "";
    const sufixo = el.dataset.fxSufixo || "";
    const duracao = parseFloat(el.dataset.fxDuracao || 1600);
    let inicio = null;

    const quadro = (t) => {
      if (inicio === null) inicio = t;
      const prog = limitar((t - inicio) / duracao, 0, 1);
      const suave = 1 - (1 - prog) ** 3; // desacelera no final
      el.textContent = prefixo + formatarNumero(interpolar(comeco, fim, suave), decimais) + sufixo;
      if (prog < 1) requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);
  };

  const prepararRevelacao = (el) => {
    const tipo = el.dataset.fx;
    if (tipo === "palavras") prepararPalavras(el);
    if (tipo === "digitar" && el.dataset.fxTexto === undefined) {
      el.dataset.fxTexto = el.textContent;
      el.textContent = "";
      el.style.minHeight = "1em";
    }
    if (el.dataset.fxAtraso) el.style.transitionDelay = `${el.dataset.fxAtraso}ms`;
    if (el.dataset.fxDuracao && !["palavras", "digitar", "contar"].includes(tipo)) {
      el.style.transitionDuration = `${el.dataset.fxDuracao}ms`;
    }
  };

  const mostrarRevelacaoReduzida = (el) => {
    el.classList.add("fx-em-cena");
    const tipo = el.dataset.fx;
    if (tipo === "digitar") el.textContent = el.dataset.fxTexto;
    if (tipo === "contar") {
      el.textContent = (el.dataset.fxPrefixo || "") +
        formatarNumero(valorFinalContador(el), parseInt(el.dataset.fxDecimais || "0", 10)) +
        (el.dataset.fxSufixo || "");
    }
  };

  const armarRevelacoes = () => {
    const alvos = REVELACOES.flatMap((nome) => [...doc.querySelectorAll(`[data-fx="${nome}"]`)]);
    alvos.forEach(prepararRevelacao);

    if (reduzido) {
      alvos.forEach(mostrarRevelacaoReduzida);
      return;
    }

    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        const el = entrada.target;
        observador.unobserve(el);
        const tipo = el.dataset.fx;
        if (tipo === "palavras") animarPalavras(el);
        el.classList.add("fx-em-cena");
        if (tipo === "digitar") animarDigitar(el);
        if (tipo === "contar") animarContar(el);
      });
    }, { threshold: 0.25, rootMargin: "0px 0px -8% 0px" });

    alvos.forEach((el) => observador.observe(el));
  };

  /* ---------- 2. Cenas fixas com progresso ---------- */
  // <section data-fx-fixa data-fx-altura="3">
  //   <div class="fx-palco"> ...conteúdo que fica preso na tela... </div>
  // </section>
  //
  // Enquanto a cena está presa, o motor publica --progresso (0 a 1) na seção.
  // Filhos reagem com:
  //   data-fx-x="inicio,fim"          translateX em px
  //   data-fx-y="inicio,fim"          translateY em px
  //   data-fx-escala="inicio,fim"     scale
  //   data-fx-giro="inicio,fim"       rotate em graus
  //   data-fx-opacidade="inicio,fim"
  //   data-fx-faixa="0.2,0.7"         só anima dentro desse trecho do progresso
  //   data-fx="rolar-video"           <video> avança com a rolagem
  //   data-fx="trilho"                fileira horizontal desliza inteira
  //   data-fx-etapas="4"              seção ganha data-etapa="1..4" (CSS decide o resto)

  const cenas = [];

  const SELETOR_ATORES = "[data-fx-x],[data-fx-y],[data-fx-escala],[data-fx-giro],[data-fx-opacidade]";

  // Lê um par "inicio,fim" apenas se o atributo existir; senão devolve null
  const lerParOpcional = (valor, padraoA, padraoB) =>
    valor !== undefined ? lerPar(valor, padraoA, padraoB) : null;

  const criarAtor = (el) => ({
    el,
    x: lerParOpcional(el.dataset.fxX, 0, 0),
    y: lerParOpcional(el.dataset.fxY, 0, 0),
    escala: lerParOpcional(el.dataset.fxEscala, 1, 1),
    giro: lerParOpcional(el.dataset.fxGiro, 0, 0),
    opacidade: lerParOpcional(el.dataset.fxOpacidade, 1, 1),
    faixa: lerPar(el.dataset.fxFaixa, 0, 1)
  });

  const prepararVideo = (video) => {
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.pause();
  };

  const armarCenas = () => {
    doc.querySelectorAll("[data-fx-fixa]").forEach((secao) => {
      const altura = parseFloat(secao.dataset.fxAltura || "3");
      secao.style.height = `${altura * 100}vh`;

      const atores = [...secao.querySelectorAll(SELETOR_ATORES)].map(criarAtor);

      const video = secao.querySelector('[data-fx="rolar-video"]');
      if (video) prepararVideo(video);

      const trilho = secao.querySelector('[data-fx="trilho"]');
      const etapas = parseInt(secao.dataset.fxEtapas || "0", 10);

      cenas.push({ secao, atores, video, videoAlvo: 0, trilho, etapas });

      if (reduzido) {
        secao.style.height = "auto";
        if (etapas) secao.setAttribute("data-etapa", String(etapas));
      }
    });
  };

  const progressoNaFaixa = (prog, faixa) => {
    if (prog <= faixa[0]) return 0;
    if (prog >= faixa[1]) return 1;
    return (prog - faixa[0]) / (faixa[1] - faixa[0]);
  };

  const montarTransformacao = (ator, p) => {
    const partes = [];
    if (ator.x) partes.push(`translateX(${interpolar(ator.x[0], ator.x[1], p).toFixed(2)}px)`);
    if (ator.y) partes.push(`translateY(${interpolar(ator.y[0], ator.y[1], p).toFixed(2)}px)`);
    if (ator.escala) partes.push(`scale(${interpolar(ator.escala[0], ator.escala[1], p).toFixed(4)})`);
    if (ator.giro) partes.push(`rotate(${interpolar(ator.giro[0], ator.giro[1], p).toFixed(2)}deg)`);
    return partes.join(" ");
  };

  const atualizarAtor = (ator, prog) => {
    const p = progressoNaFaixa(prog, ator.faixa);
    const transformar = montarTransformacao(ator, p);
    if (transformar) ator.el.style.transform = transformar;
    if (ator.opacidade) ator.el.style.opacity = interpolar(ator.opacidade[0], ator.opacidade[1], p).toFixed(3);
  };

  const atualizarCena = (cena) => {
    const ret = cena.secao.getBoundingClientRect();
    const percurso = cena.secao.offsetHeight - window.innerHeight;
    if (percurso <= 0) return;
    const prog = limitar(-ret.top / percurso, 0, 1);
    cena.secao.style.setProperty("--progresso", prog.toFixed(4));

    cena.atores.forEach((ator) => atualizarAtor(ator, prog));

    if (cena.video?.duration) {
      cena.videoAlvo = prog * cena.video.duration;
    }

    if (cena.trilho) {
      const alcance = cena.trilho.scrollWidth - cena.trilho.clientWidth;
      if (alcance > 0) {
        cena.trilho.style.transform = `translateX(${(-prog * alcance).toFixed(1)}px)`;
      }
    }

    if (cena.etapas) {
      const etapa = limitar(Math.floor(prog * cena.etapas) + 1, 1, cena.etapas);
      if (cena.secao.getAttribute("data-etapa") !== String(etapa)) {
        cena.secao.setAttribute("data-etapa", String(etapa));
      }
    }
  };

  // vídeo: aproxima suavemente do alvo pra rolagem não "pular" quadros
  const atualizarVideos = () => {
    cenas.forEach(({ video, videoAlvo }) => {
      if (!video?.duration) return;
      const atual = video.currentTime;
      const delta = videoAlvo - atual;
      if (Math.abs(delta) > 0.01) {
        video.currentTime = atual + delta * 0.35;
      }
    });
  };

  /* ---------- 3. Fundo que viaja ---------- */
  // Qualquer seção com data-fx-fundo="#111" (e opcional data-fx-tinta="#eee"):
  // quando ela domina a tela, o fundo da página faz a transição para essa cor.

  const armarFundos = () => {
    const secoes = doc.querySelectorAll("[data-fx-fundo]");
    if (!secoes.length) return;
    raiz.classList.add("fx-fundo-ativo");
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        raiz.style.setProperty("--fx-fundo", target.dataset.fxFundo);
        if (target.dataset.fxTinta) {
          raiz.style.setProperty("--fx-tinta", target.dataset.fxTinta);
        }
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    secoes.forEach((secao) => observador.observe(secao));
  };

  /* ---------- 4. Paralaxe leve (fora das cenas fixas) ---------- */
  // data-fx-paralaxe="0.2"  → desloca contra a rolagem (0.1 sutil, 0.4 forte)

  const paralaxes = [];

  const armarParalaxes = () => {
    doc.querySelectorAll("[data-fx-paralaxe]").forEach((el) => {
      if (el.closest("[data-fx-fixa]")) return; // dentro de cena fixa use data-fx-y
      paralaxes.push({ el, forca: parseFloat(el.dataset.fxParalaxe) || 0.2 });
    });
  };

  const atualizarParalaxes = () => {
    const centroTela = window.innerHeight / 2;
    paralaxes.forEach(({ el, forca }) => {
      const ret = el.getBoundingClientRect();
      const desvio = (ret.top + ret.height / 2 - centroTela) * -forca;
      el.style.transform = `translateY(${desvio.toFixed(1)}px)`;
    });
  };

  /* ---------- 5. Reação ao ponteiro ---------- */
  // data-fx-mouse="12" → o elemento acompanha de leve o ponteiro (px máximos)

  const armarMouse = () => {
    const alvos = doc.querySelectorAll("[data-fx-mouse]");
    if (!alvos.length || reduzido || !window.matchMedia("(pointer: fine)").matches) return;
    window.addEventListener("pointermove", (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      alvos.forEach((el) => {
        const forca = parseFloat(el.dataset.fxMouse) || 10;
        el.style.transform = `translate(${(nx * forca).toFixed(1)}px,${(ny * forca).toFixed(1)}px)`;
      });
    }, { passive: true });
  };

  /* ---------- ciclo principal ---------- */

  let agendado = false;

  const atualizar = () => {
    agendado = false;
    cenas.forEach(atualizarCena);
    atualizarParalaxes();
  };

  const aoRolar = () => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(atualizar);
  };

  // laço só para suavizar vídeo (barato; dorme se não há vídeo)
  const iniciarLacoDeVideo = () => {
    const laco = () => {
      atualizarVideos();
      requestAnimationFrame(laco);
    };
    laco();
  };

  const iniciar = () => {
    armarRevelacoes();
    armarCenas();
    armarFundos();
    armarParalaxes();
    armarMouse();

    if (!reduzido) {
      window.addEventListener("scroll", aoRolar, { passive: true });
      window.addEventListener("resize", aoRolar);
      aoRolar();
      if (cenas.some((cena) => cena.video)) iniciarLacoDeVideo();
    }
    raiz.classList.add("fx-pronto");
  };

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();


/* =============================================================
   Navegação: sombra ao rolar
   ============================================================= */
(() => {
  const SCROLL_THRESHOLD_PX = 60;
  const nav = document.querySelector('.nav-topo');
  if (!nav) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle('nav--rolou', window.scrollY > SCROLL_THRESHOLD_PX);
      ticking = false;
    });
  }, { passive: true });
})();

/* =============================================================
   Movimento-assinatura: linha SVG que se desenha com a rolagem
   ============================================================= */
(() => {
  const SVG_VIEWBOX_HEIGHT = 1000;
  const NEEDLE_OFFSET_PX = 10;
  const path = document.getElementById('fio-path');
  const agulha = document.getElementById('fio-agulha');
  if (!path) return;

  // Espera o DOM renderizar para medir o comprimento
  requestAnimationFrame(() => {
    const totalLength = path.getTotalLength();
    path.style.setProperty('--fio-total', totalLength);
    path.style.setProperty('--fio-offset', totalLength);
    path.style.strokeDasharray = totalLength;
    path.style.strokeDashoffset = totalLength;

    const atualizarFio = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progresso = Math.min(window.scrollY / docHeight, 1);
      path.style.strokeDashoffset = totalLength * (1 - progresso);

      if (agulha) {
        const pt = path.getPointAtLength(totalLength * progresso);
        const viewportY = (pt.y / SVG_VIEWBOX_HEIGHT) * window.innerHeight;
        agulha.style.setProperty('--agulha-y', `${viewportY - NEEDLE_OFFSET_PX}px`);
      }
    };

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        atualizarFio();
        ticking = false;
      });
    }, { passive: true });

    atualizarFio();
  });
})();

/* =============================================================
   Menu mobile (hamburger)
   ============================================================= */
(() => {
  const btn = document.querySelector('.nav__hamburger');
  const links = document.querySelector('.nav__links');
  if (!btn || !links) return;

  const MOBILE_MENU_STYLE = {
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: '70px',
    left: '0',
    right: '0',
    background: 'rgba(245,242,235,0.97)',
    backdropFilter: 'blur(12px)',
    padding: '24px',
    gap: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
    borderRadius: '0 0 16px 16px',
    zIndex: '99'
  };

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));

    if (expanded) links.removeAttribute('style');
    else Object.assign(links.style, MOBILE_MENU_STYLE);
  });
})();

/* =============================================================
   Smooth scroll nos links internos
   ============================================================= */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Fechar menu mobile se aberto
    document.querySelector('.nav__links')?.removeAttribute('style');
    document.querySelector('.nav__hamburger')?.setAttribute('aria-expanded', 'false');
  });
});
