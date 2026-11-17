/* ── Apertura 3D: la casa se construye con el scroll ──────────────────────
   Etapas (progreso 0 a 1 del bloque #inicio):
   01 Terreno · 02 Cimientos · 03 Estructura · 04 Muros · 05 Cerramientos · 06 Casa terminada
   Si algo falla (sin WebGL o sin conexión al CDN), vuelve al video original. */

const S = window.SITE || {};
const cine = document.querySelector(".cine");

if (window.NORDEN_3d && cine) {
  import("three")
    .then((THREE) => iniciar(THREE))
    .catch((e) => { console.warn("[casa3d] vuelve al video:", e); volverAlVideo(); });
}

function volverAlVideo() {
  const c = cine.querySelector(".cine-3d");
  if (c) c.remove();
  const e = cine.querySelector(".etapa");
  if (e) e.remove();
  if (window.NORDEN_video) window.NORDEN_video();
}

function iniciar(THREE) {
  const palco = cine.querySelector(".cine-palco");
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = () => innerWidth <= 760;

  /* Colores del sitio */
  const C = {
    fundo: 0xF3F0E9, terra: 0xE6DFD1, escavacao: 0xC9B89C, gramado: 0xC7CBB0,
    concreto: 0xD6D2CA, concretoEstrutura: 0xC4BFB6, carvao: 0x3A3936,
    carvalho: 0xA98466, acento: 0xA66D55, linho: 0xDDD4C5, agua: 0x9DBAB5,
    folha: 0x9DA68A, luzQuente: 0xFFC98A,
  };

  /* ── Escena ── */
  const canvas = document.createElement("canvas");
  canvas.className = "cine-3d";
  canvas.setAttribute("aria-hidden", "true");
  palco.prepend(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  } catch (e) { volverAlVideo(); return; }
  renderer.setClearColor(C.fundo);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const cena = new THREE.Scene();
  cena.fog = new THREE.Fog(C.fundo, 38, 95);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 300);

  const ceu = new THREE.HemisphereLight(0xFFF7EC, 0xD8CFBE, 1.5);
  cena.add(ceu);
  const sol = new THREE.DirectionalLight(0xFFEAD2, 2.4);
  sol.position.set(14, 22, 12);
  sol.castShadow = true;
  sol.shadow.mapSize.set(celular() ? 1024 : 2048, celular() ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
  sol.shadow.bias = -0.0004;
  sol.shadow.radius = 4;
  cena.add(sol);

  /* ── Materiales ── */
  const mat = (cor, extra = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: 0.9, metalness: 0, ...extra });
  const M = {
    terra: mat(C.terra, { roughness: 1 }),
    escavacao: mat(C.escavacao, { roughness: 1 }),
    gramado: mat(C.gramado, { roughness: 1 }),
    concreto: mat(C.concreto),
    estrutura: mat(C.concretoEstrutura),
    carvao: mat(C.carvao, { roughness: 0.6 }),
    carvalho: mat(C.carvalho, { roughness: 0.75 }),
    acento: mat(C.acento, { roughness: 0.8 }),
    linho: mat(C.linho),
    agua: mat(C.agua, { roughness: 0.15, metalness: 0.1 }),
    folha: mat(C.folha, { flatShading: true }),
    interior: mat(0xEFE6D8, { emissive: C.luzQuente, emissiveIntensity: 0 }),
  };
  const linha = new THREE.LineBasicMaterial({ color: 0x6F6B64, transparent: true, opacity: 0.28 });

  /* ── Piezas animadas ── */
  const grupo = new THREE.Group();
  cena.add(grupo);
  const pecas = [];

  // ancla: "base" (crece desde abajo), "esq" (desde la izquierda), "fundo" (desde atrás), "centro"
  function caixa(w, h, d, ancora = "centro") {
    const g = new THREE.BoxGeometry(w, h, d);
    if (ancora === "base") g.translate(0, h / 2, 0);
    if (ancora === "esq") g.translate(w / 2, 0, 0);
    if (ancora === "fundo") g.translate(0, 0, d / 2);
    return g;
  }

  // modo: y | x | z (crece en ese eje), plano (crece en x y z), cair (baja desde arriba), escala, vidro
  function peca(geo, material, [x, y, z], modo, t0, t1, op = {}) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = op.sombra !== false;
    m.receiveShadow = true;
    if (op.borda !== false) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), linha));
    m.userData = { modo, t0, t1, sai: op.sai, y0: y };
    m.visible = false;
    grupo.add(m);
    pecas.push(m);
    return m;
  }

  // Reparte n piezas dentro de un tramo, una detrás de otra
  const escalonar = (i, n, de, ate, largo = 0.35) => {
    const passo = (ate - de) * (1 - largo) / Math.max(1, n - 1);
    const t0 = de + passo * i;
    return [t0, t0 + (ate - de) * largo];
  };

  /* Suelo */
  const solo = new THREE.Mesh(new THREE.CircleGeometry(140, 64), M.terra);
  solo.rotation.x = -Math.PI / 2;
  solo.receiveShadow = true;
  cena.add(solo);

  /* 01 Terreno: estacas e hilos de replanteo (terracota) */
  const lote = [[-8, -6], [11, -6], [11, 6], [-8, 6]];
  lote.forEach(([x, z], i) => {
    const [a, b] = escalonar(i, 4, -0.06, 0, 0.5);
    peca(caixa(0.12, 0.7, 0.12, "base"), M.carvalho, [x, 0, z], "y", a, b, { sai: [0.2, 0.25] });
  });
  const fio = (w, d, x, z, ancora, t0, t1) =>
    peca(caixa(w, 0.03, d, ancora), M.acento, [x, 0.6, z], ancora === "esq" ? "x" : "z", t0, t1, { borda: false, sombra: false, sai: [0.2, 0.25] });
  fio(19, 0.03, -8, -6, "esq", -0.1, -0.01);
  fio(0.03, 12, 11, -6, "fundo", -0.1, -0.01);
  fio(19, 0.03, -8, 6, "esq", -0.1, -0.01);
  fio(0.03, 12, -8, -6, "fundo", -0.1, -0.01);
  peca(new THREE.BoxGeometry(15, 0.02, 10), M.escavacao, [0.5, 0.01, 0], "plano", 0.08, 0.14, { borda: false, sombra: false, sai: [0.8, 0.86] });

  /* 02 Cimientos: zapatas y platea */
  const colX = [-6, -2, 2, 6], colZ = [-3.6, 3.6];
  let k = 0;
  for (const x of colX) for (const z of colZ) {
    const [a, b] = escalonar(k++, 8, 0.12, 0.18, 0.4);
    peca(caixa(1.1, 0.25, 1.1, "base"), M.estrutura, [x, 0, z], "y", a, b);
  }
  peca(caixa(13.4, 0.4, 8.4, "base"), M.concreto, [0, 0, 0], "y", 0.17, 0.24);

  /* 03 Estructura: columnas, vigas, losas */
  k = 0;
  for (const x of colX) for (const z of colZ) {
    const [a, b] = escalonar(k++, 8, 0.24, 0.31, 0.4);
    peca(caixa(0.35, 3, 0.35, "base"), M.estrutura, [x, 0.4, z], "y", a, b);
  }
  for (const [i, z] of colZ.entries())
    peca(caixa(12.4, 0.35, 0.35, "esq"), M.estrutura, [-6.2, 3.22, z], "x", 0.29 + i * 0.015, 0.34 + i * 0.015);
  peca(caixa(13.4, 0.35, 8.4, "base"), M.concreto, [0, 3.4, 0], "cair", 0.32, 0.36);
  peca(caixa(3.2, 0.35, 7.4, "base"), M.concreto, [8.2, 3.4, 0], "cair", 0.34, 0.37); // voladizo
  k = 0;
  for (const x of [-2, 2, 6]) for (const z of [-3.3, 3.3]) {
    const [a, b] = escalonar(k++, 6, 0.36, 0.42, 0.4);
    peca(caixa(0.3, 2.85, 0.3, "base"), M.estrutura, [x, 3.75, z], "y", a, b);
  }

  /* Grúa (aparece con los cimientos y se va al final) */
  const mastro = peca(caixa(0.6, 17, 0.6, "base"), M.carvao, [3, 0, -17], "y", 0.12, 0.2, { sai: [0.8, 0.88], borda: false });
  const lanca = new THREE.Group();
  const braco = new THREE.Mesh(caixa(17, 0.45, 0.45, "esq"), M.carvao); braco.position.set(-4, 0, 0);
  const contra = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1), M.estrutura); contra.position.set(-3.6, -0.5, 0);
  const cabo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 6, 0.04), M.carvao); cabo.position.set(9, -3, 0);
  const carga = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.8), M.acento); carga.position.set(9, -6.2, 0);
  for (const p of [braco, contra, cabo, carga]) { p.castShadow = true; lanca.add(p); }
  lanca.position.y = 17;
  mastro.add(lanca);

  /* 04 Muros de hormigón (bajan como si los pusiera la grúa) */
  const muros = [
    // planta baja: fondo, lados y frente ciego
    [caixa(4.5, 3, 0.3, "base"), [-4.25, 0.4, -4.05]],
    [caixa(4.5, 3, 0.3, "base"), [0.25, 0.4, -4.05]],
    [caixa(4.5, 3, 0.3, "base"), [4.75, 0.4, -4.05]],
    [caixa(0.3, 3, 8.4, "base"), [-6.55, 0.4, 0]],
    [caixa(4, 3, 0.3, "base"), [-4.6, 0.4, 4.05]],
    [caixa(0.3, 3, 3.5, "base"), [6.55, 0.4, -2.3]],
    // planta alta: fondo y lado ciego
    [caixa(5.8, 2.85, 0.3, "base"), [0.9, 3.75, -3.55]],
    [caixa(5.8, 2.85, 0.3, "base"), [6.6, 3.75, -3.55]],
    [caixa(0.3, 2.85, 7.4, "base"), [-2.15, 3.75, 0]],
  ];
  muros.forEach(([g, pos], i) => { const [a, b] = escalonar(i, muros.length, 0.44, 0.6, 0.3); peca(g, M.concreto, pos, "cair", a, b); });

  /* 05 Cerramientos: techo, vidrios, carpinterías, parasoles de roble e interior */
  peca(caixa(12.6, 0.35, 8.2, "base"), M.concreto, [3.7, 6.6, 0], "cair", 0.58, 0.62);

  const vidro = (w, h, d, pos, a, b) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x5E6B6D, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0 });
    peca(new THREE.BoxGeometry(w, h, d), m, pos, "vidro", a, b, { borda: false, sombra: false });
  };
  vidro(9, 3, 0.05, [2, 1.9, 4.05], 0.62, 0.68);        // frente planta baja
  vidro(0.05, 3, 4.9, [6.55, 1.9, 1.65], 0.63, 0.69);   // lateral planta baja
  vidro(11.4, 2.85, 0.05, [3.7, 5.17, 3.45], 0.64, 0.7);// frente planta alta
  vidro(0.05, 2.85, 6.8, [9.75, 5.17, 0], 0.65, 0.71);  // punta del voladizo

  for (let i = 0; i <= 6; i++) { // carpintería negra del frente
    const [a, b] = escalonar(i, 7, 0.62, 0.68, 0.4);
    peca(caixa(0.07, 3, 0.09, "base"), M.carvao, [-2.5 + i * 1.5, 0.4, 4.08], "y", a, b, { borda: false });
  }
  const ripas = 44; // parasoles verticales de roble en la planta alta
  for (let i = 0; i < ripas; i++) {
    const [a, b] = escalonar(i, ripas, 0.64, 0.76, 0.18);
    peca(caixa(0.09, 2.85, 0.16, "base"), M.carvalho, [-1.9 + i * 0.265, 3.75, 3.62], "y", a, b, { borda: false });
  }

  // Interior que se ve a través del vidrio (se ilumina al final)
  const luzes = [
    peca(new THREE.BoxGeometry(12.6, 2.9, 0.05), M.interior, [0.2, 1.9, -3.85], "escala", 0.62, 0.66, { borda: false, sombra: false }),
    peca(new THREE.BoxGeometry(11.2, 2.75, 0.05), M.interior, [3.7, 5.17, -3.35], "escala", 0.62, 0.66, { borda: false, sombra: false }),
  ];
  const moveis = [
    [caixa(2.8, 0.45, 1, "base"), M.linho, [1.4, 0.4, 1.4]],     // sillón
    [caixa(2.8, 0.5, 0.25, "base"), M.linho, [1.4, 0.85, 0.95]], // respaldo
    [caixa(1, 0.75, 1, "base"), M.acento, [-0.8, 0.4, 2]],       // butaca
    [caixa(1.6, 0.35, 0.9, "base"), M.carvalho, [3.6, 0.4, 2.2]],// mesa baja
    [caixa(2.2, 0.75, 1, "base"), M.carvalho, [6.5, 3.75, 0.5]], // mesa planta alta
  ];
  moveis.forEach(([g, m, pos], i) => { const [a, b] = escalonar(i, moveis.length, 0.66, 0.74, 0.4); peca(g, m, pos, "escala", a, b, { borda: false }); });

  /* 06 Casa terminada: deck, pileta, césped, árboles y luces */
  peca(caixa(10.5, 0.15, 2.6, "esq"), M.carvalho, [-2.5, 0, 5.5], "x", 0.76, 0.82);
  peca(caixa(9.6, 0.3, 3, "base"), M.concreto, [5.2, 0, 9], "plano", 0.78, 0.83);
  peca(caixa(8.8, 0.06, 2.3, "base"), M.agua, [5.2, 0.27, 9], "plano", 0.81, 0.85, { borda: false, sombra: false });
  peca(new THREE.BoxGeometry(30, 0.02, 24), M.gramado, [1.5, 0.015, 3], "plano", 0.8, 0.87, { borda: false, sombra: false });

  const arvores = [[-11, -1, 0.8], [-12.5, -6, 1], [14, -5, 0.9], [15.5, 1.5, 0.7], [-3, -11, 1.1], [8, -11.5, 1], [-14, 6, 0.65]];
  arvores.forEach(([x, z, s], i) => {
    const [a, b] = escalonar(i, arvores.length, 0.82, 0.93, 0.35);
    const g = new THREE.Group();
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 2.2 * s, 6), M.carvalho);
    tronco.position.y = 1.1 * s;
    const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 * s, 1), M.folha);
    copa.position.y = 3 * s; copa.scale.y = 1.15;
    for (const p of [tronco, copa]) { p.castShadow = true; g.add(p); }
    g.position.set(x, 0, z);
    g.userData = { modo: "escala", t0: a, t1: b, y0: 0 };
    g.visible = false;
    grupo.add(g);
    pecas.push(g);
  });

  /* ── Animación ── */
  const lim = (v) => Math.min(1, Math.max(0, v));
  const suave = (a, b, v) => { const t = lim((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const saida = (t) => 1 - Math.pow(1 - t, 3);
  const rebote = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  function montar(p) {
    for (const m of pecas) {
      const u = m.userData;
      let t = lim((p - u.t0) / (u.t1 - u.t0));
      if (u.sai) t = Math.min(t, 1 - lim((p - u.sai[0]) / (u.sai[1] - u.sai[0])));
      m.visible = t > 0.001;
      if (!m.visible) continue;
      const e = saida(t);
      switch (u.modo) {
        case "y": m.scale.y = e; break;
        case "x": m.scale.x = e; break;
        case "z": m.scale.z = e; break;
        case "plano": m.scale.set(e, 1, e); break;
        case "cair": m.position.y = u.y0 + (1 - e) * 7; break;
        case "escala": m.scale.setScalar(Math.max(0.001, rebote(t))); break;
        case "vidro": m.material.opacity = e * 0.42; break;
      }
    }
    // Grúa: gira mientras trabaja
    lanca.rotation.y = 0.9 - p * 3.2;
    // Luces de adentro y luz de la tarde al final
    const noite = suave(0.84, 0.96, p);
    M.interior.emissiveIntensity = noite * 0.85;
    sol.color.setHSL(0.08, 0.9, 0.91 - noite * 0.06);
    sol.intensity = 2.4 - noite * 0.5;
  }

  /* ── Cámara: de vista aérea del terreno a la altura de los ojos ── */
  const centro = new THREE.Vector3(1.8, 2.6, 0.5);
  const alvo = new THREE.Vector3();
  const direita = new THREE.Vector3();
  const lerp = (a, b, t) => a + (b - a) * t;

  function enquadrar(p) {
    const cel = celular();
    camera.fov = cel ? 48 : 35;
    const tanMeia = Math.tan((camera.fov * Math.PI) / 360);
    const e = suave(0, 1, p);
    const az = (lerp(38, -26, e) * Math.PI) / 180;
    const el = (lerp(52, 11, suave(0, 0.92, p)) * Math.PI) / 180;
    // Que entre la casa entera (unos 24 m de ancho) también en el celular
    const rMin = (cel ? 19 : 24) / (2 * tanMeia * camera.aspect);
    const r = Math.max(lerp(46, 34, e), rMin);
    const altoVisto = 2 * r * tanMeia, anchoVisto = altoVisto * camera.aspect;

    // El texto se mueve: izquierda → derecha → centro abajo. La casa le deja lugar.
    let lado = 0, abajo = 0;
    if (!cel) {
      lado = 0.14 * anchoVisto * (1 - 2 * suave(0.27, 0.4, p)) * (1 - suave(0.64, 0.76, p));
      abajo = 0.07 * altoVisto * suave(0.66, 0.78, p);
    } else {
      abajo = 0.07 * altoVisto;
    }

    camera.position.set(
      centro.x + r * Math.sin(az) * Math.cos(el),
      centro.y + r * Math.sin(el),
      centro.z + r * Math.cos(az) * Math.cos(el)
    );
    camera.lookAt(centro);
    direita.setFromMatrixColumn(camera.matrixWorld, 0);
    alvo.copy(centro).addScaledVector(direita, -lado);
    alvo.y -= abajo;
    camera.position.addScaledVector(direita, -lado);
    camera.position.y -= abajo;
    camera.lookAt(alvo);
    camera.updateProjectionMatrix();
    cena.fog.near = r * 1.05; cena.fog.far = r * 2.6; // la niebla acompaña a la distancia
  }

  /* ── Indicador de etapa ── */
  const etapas = [[0, "Terreno"], [0.12, "Cimientos"], [0.24, "Estructura"], [0.44, "Muros"], [0.6, "Cerramientos"], [0.76, "Casa terminada"]];
  const etapaEl = cine.querySelector(".etapa");
  const nEl = etapaEl && etapaEl.querySelector(".etapa-n");
  const nomeEl = etapaEl && etapaEl.querySelector(".etapa-nome");
  const barra = etapaEl && etapaEl.querySelector(".etapa-barra b");
  let etapaAtual = -1;
  function marcarEtapa(p) {
    if (!etapaEl) return;
    let i = 0;
    for (let j = 0; j < etapas.length; j++) if (p >= etapas[j][0]) i = j;
    if (i !== etapaAtual) {
      etapaAtual = i;
      nEl.textContent = String(i + 1).padStart(2, "0");
      nomeEl.textContent = etapas[i][1];
      etapaEl.classList.remove("troca"); void etapaEl.offsetWidth; etapaEl.classList.add("troca");
    }
    barra.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  /* ── Textos de la apertura ── */
  const momentos = [...cine.querySelectorAll(".momento")];
  function atualizarMomentos(p) {
    for (const m of momentos) {
      const de = parseFloat(m.dataset.de || 0), ate = parseFloat(m.dataset.ate || 1);
      m.classList.toggle("ativo", p >= de && (p < ate || (ate >= 1 && p >= 1)));
    }
    cine.classList.toggle("andou", p > 0.02);
  }

  /* ── Bucle ── */
  const progresso = () => {
    const r = cine.getBoundingClientRect();
    const curso = cine.offsetHeight - innerHeight;
    return lim(-r.top / (curso || 1));
  };

  function ajustar() {
    const w = palco.clientWidth, h = palco.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, celular() ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    desenhar(atual, true);
  }

  let atual = 0, desenhadoEm = -1, visivel = true;
  function desenhar(p, forcar) {
    if (!forcar && Math.abs(p - desenhadoEm) < 0.0002) return;
    montar(p);
    enquadrar(p);
    renderer.render(cena, camera);
    desenhadoEm = p;
  }

  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(cine);
  addEventListener("resize", ajustar);
  document.documentElement.classList.add("tem-3d");

  if (reduzir) {
    // Sin movimiento: se muestra la casa terminada, quieta
    atual = 1;
    ajustar();
    atualizarMomentos(0);
    marcarEtapa(1);
    return;
  }

  ajustar();
  (function quadro() {
    if (visivel) {
      const alvoP = progresso();
      atual += (alvoP - atual) * 0.12;
      if (Math.abs(alvoP - atual) < 0.0005) atual = alvoP;
      desenhar(atual);
      atualizarMomentos(atual);
      marcarEtapa(atual);
    }
    requestAnimationFrame(quadro);
  })();
}
