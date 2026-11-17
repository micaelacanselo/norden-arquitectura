(() => {
  const S = window.SITE || {};
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 760px)").matches;


  /* ── Rolagem que toca o vídeo ─────────────────────────────────────────── */
  const cine = document.querySelector(".cine");
  const canvas = cine && cine.querySelector(".cine-canvas");
  const iniciarVideo = () => {
    if (!(cine && canvas && S.frames && S.frames.total) || iniciarVideo.feito) return;
    iniciarVideo.feito = true;
    const ctx = canvas.getContext("2d");
    const total = S.frames.total;
    const padrao = celular ? S.frames.mobile : S.frames.desktop;
    const src = (i) => padrao.replace("{n}", String(i + 1).padStart(4, "0"));
    const quadros = new Array(total);
    const momentos = [...cine.querySelectorAll(".momento")];
    let alvo = 0, atual = 0, desenhado = -1;

    const carregar = (i) => {
      if (quadros[i]) return quadros[i];
      const img = new Image();
      img.decoding = "async";
      img.src = src(i);
      img.onload = () => { if (Math.round(atual) === i || desenhado === -1) desenhar(i, true); };
      return (quadros[i] = img);
    };

    // Carrega em passadas (1 a cada 8, depois 1 a cada 4…) para cobrir o filme inteiro cedo
    carregar(0);
    if (!reduzir) {
      const fila = [];
      for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
      let k = 0;
      const lote = () => { for (let n = 0; n < 6 && k < fila.length; n++) carregar(fila[k++]); if (k < fila.length) setTimeout(lote, 40); };
      lote();
    }

    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => {
      for (let d = 0; d < total; d++) {
        if (pronto(i - d)) return i - d;
        if (pronto(i + d)) return i + d;
      }
      return -1;
    };

    const ajustar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      desenhado = -1;
      desenhar(Math.round(atual), true);
    };

    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar)) return;
      const img = quadros[j];
      const cw = canvas.width, ch = canvas.height;
      const escala = Math.max(cw / img.naturalWidth, ch / img.naturalHeight); // "cover"
      const w = img.naturalWidth * escala, h = img.naturalHeight * escala;
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      desenhado = j;
    }

    const progresso = () => {
      const r = cine.getBoundingClientRect();
      const curso = cine.offsetHeight - innerHeight;
      return Math.min(1, Math.max(0, -r.top / (curso || 1)));
    };

    // Indicador "01 Terreno": etapas definidas en config.js
    const etapaEl = cine.querySelector(".etapa");
    const etapas = S.etapas || [];
    let etapaAtual = -1;
    if (etapaEl && etapas.length) document.documentElement.classList.add("tem-etapas");
    const marcarEtapa = (p) => {
      if (!etapaEl || !etapas.length) return;
      let i = 0;
      for (let j = 0; j < etapas.length; j++) if (p >= etapas[j][0]) i = j;
      if (i !== etapaAtual) {
        etapaAtual = i;
        etapaEl.querySelector(".etapa-n").textContent = String(i + 1).padStart(2, "0");
        etapaEl.querySelector(".etapa-nome").textContent = etapas[i][1];
        etapaEl.classList.remove("troca"); void etapaEl.offsetWidth; etapaEl.classList.add("troca");
      }
      etapaEl.querySelector(".etapa-barra b").style.transform = `scaleX(${p.toFixed(4)})`;
    };

    const atualizarMomentos = (p) => {
      marcarEtapa(p);
      for (const m of momentos) {
        const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
        m.classList.toggle("ativo", p >= de && (p < ate || (ate >= 1 && p >= 1)));
      }
      cine.classList.toggle("andou", p > 0.02);
    };

    const quadro = () => {
      alvo = progresso() * (total - 1);
      atual += (alvo - atual) * 0.18; // suaviza: sensação de filme, não de slide
      if (Math.abs(alvo - atual) < 0.05) atual = alvo;
      desenhar(Math.round(atual));
      atualizarMomentos(atual / (total - 1));
      requestAnimationFrame(quadro);
    };

    addEventListener("resize", ajustar);
    ajustar();
    if (reduzir) atualizarMomentos(0);
    else requestAnimationFrame(quadro);
  };

  // Apertura: casa 3D que se construye (casa3d.js). Si no hay WebGL, queda el video.
  window.NORDEN_video = iniciarVideo;
  const temGL = (() => {
    try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }
    catch (e) { return false; }
  })();
  if (S.abertura === "casa3d" && temGL) window.NORDEN_3d = true;
  else iniciarVideo();

  /* ── Parallax leve nas artes ──────────────────────────────────────────── */
  const artes = reduzir ? [] : [...document.querySelectorAll(".arte:not(.arte--cartao):not(.arte--obra)")];
  if (artes.length) {
    const mover = () => {
      for (const a of artes) {
        const r = a.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        a.style.transform = `translate3d(0, ${(c * -60).toFixed(1)}px, 0) scale(1.08)`;
      }
    };
    addEventListener("scroll", () => requestAnimationFrame(mover), { passive: true });
    mover();
  }

  /* ── Topo, revelar e ano ──────────────────────────────────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  let formNaTela = false; // o botão flutuante se recolhe para não cobrir o "Enviar"
  const aoRolar = () => {
    topo && topo.classList.toggle("rolou", scrollY > 40);
    whats && whats.classList.toggle("visivel", scrollY > innerHeight * 0.6 && !formNaTela);
  };
  const formEl = document.querySelector(".form");
  if (formEl) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(formEl);
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
  }), { threshold: 0.18 });
  document.querySelectorAll(".revelar").forEach((el) => io.observe(el));
  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ── WhatsApp ─────────────────────────────────────────────────────────── */
  if (whats && S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    whats.href = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
  }

  /* ── Formulário → e-mail ──────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return; // robô
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        c.closest(".campo").classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Revisá los campos marcados.", "falha");
      if (S.contato.demo) {
        form.reset();
        return avisar("Este formulario está en modo demostración y todavía no envía consultas. Mientras tanto, escribinos al correo de abajo.", "demo");
      }

      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `Nueva consulta desde el sitio ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }

      botao.disabled = true;
      avisar("Enviando…");
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(corpo),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        avisar("Recibimos tu consulta. Te respondemos a la brevedad.", "ok");
      } catch (e) {
        console.warn("No se pudo enviar el formulario:", e);
        avisar("No pudimos enviar tu consulta. Probá de nuevo o escribinos por WhatsApp.", "falha");
      } finally {
        botao.disabled = false;
      }
    });
  }

  /* ── Recorrido de obra: la etapa cambia con el scroll ─────────────────── */
  const obra = document.querySelector(".obra");
  if (obra) {
    const capas = [...obra.querySelectorAll(".obra-capa")];
    const pasos = [...obra.querySelectorAll(".passos li")];
    const plano = obra.querySelector(".plano");
    const trazos = plano ? [...plano.querySelectorAll(".trazo")] : [];
    const barra = obra.querySelector(".obra-barra");
    const etiqueta = obra.querySelector("[data-obra-etapa]");
    const nombres = ["Boceto", "Plano", "Documentación", "Losa y armaduras", "Estructura", "Obra terminada"];
    const dentro = (el, p) => { const de = +el.dataset.de, ate = +el.dataset.ate; return p >= de && (p < ate || (ate >= 1 && p >= 1)); };

    const pintar = (p) => {
      capas.forEach((c, i) => {
        const on = dentro(c, p);
        c.classList.toggle("activa", on);
        if (on && etiqueta) etiqueta.textContent = nombres[i] || "";
      });
      pasos.forEach((li) => li.classList.toggle("activo", dentro(li, p)));
      if (barra) barra.style.setProperty("--p", p.toFixed(3));
      if (plano) {
        // El plano se dibuja dentro de su tramo (0.2 a 0.42): cada trazo arranca un poco después del anterior
        const t = Math.min(1, Math.max(0, (p - 0.2) / 0.18));
        trazos.forEach((tr, i) => {
          const local = Math.min(1, Math.max(0, t * 1.6 - i * 0.1));
          tr.style.strokeDashoffset = (1 - local).toFixed(3);
        });
        plano.classList.toggle("listo", t >= 0.95);
      }
    };

    if (reduzir) {
      trazos.forEach((tr) => (tr.style.strokeDashoffset = 0));
      plano && plano.classList.add("listo");
      pasos.forEach((li) => li.classList.add("activo"));
    } else {
      let pendiente = false;
      const medir = () => {
        pendiente = false;
        const r = obra.getBoundingClientRect();
        const curso = obra.offsetHeight - innerHeight;
        pintar(Math.min(1, Math.max(0, -r.top / (curso || 1))));
      };
      addEventListener("scroll", () => { if (!pendiente) { pendiente = true; requestAnimationFrame(medir); } }, { passive: true });
      addEventListener("resize", medir);
      medir();
    }
  }
})();
