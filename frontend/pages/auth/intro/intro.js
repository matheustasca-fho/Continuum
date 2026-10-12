// ==========================================================================
// ANIMAÇÃO 3D: MÖBIUS GEOMÉTRICO MINIMALISTA + POEIRA
// ==========================================================================

const canvas = document.getElementById('fabric-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let points = [];
let segments = []; 
let dust = []; 
let isLoginActive = false;

let targetAngleX = 0;
let targetAngleY = 0;
let currentAngleX = 0.5;
let currentAngleY = 0;

// Transições Dinâmicas de Câmera (Para o clique)
let currentCenterX = 0;
let targetCenterX = 0;
let zoomScale = 1.0;
let targetZoomScale = 1.0;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  
  // Define o centro (Direita na intro, Centro no login)
  if (!isLoginActive) {
    targetCenterX = width > 800 ? width * 0.70 : width * 0.5;
    currentCenterX = targetCenterX;
  } else {
    targetCenterX = width * 0.5;
  }

  initGeometricMobius();
  initDust();
}
window.addEventListener('resize', resize);

function initDust() {
  dust = [];
  for (let i = 0; i < 150; i++) {
    dust.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.3 + 0.05 
    });
  }
}

function initGeometricMobius() {
  points = [];
  segments = [];
  
  const isMobile = width < 800;
  const R = isMobile ? 300 : 550;  
  const w = isMobile ? 150 : 300;  

  let numLines = isMobile ? 15 : 28;
  let steps = isMobile ? 400 : 800; 

  for (let j = 0; j <= numLines; j++) {
    let v = -w + (j / numLines) * (2 * w);
    let prevPoint = null;
    
    for (let i = 0; i <= steps; i++) {
      let u = (i / steps) * Math.PI * 4;
      
      let x = (R + v * Math.cos(u / 2)) * Math.cos(u);
      let y = (R + v * Math.cos(u / 2)) * Math.sin(u);
      let z = v * Math.sin(u / 2);

      let pt = { x, y, z };
      points.push(pt);

      if (prevPoint) {
        segments.push({ p1: prevPoint, p2: pt });
      }
      prevPoint = pt;
    }
  }
}

function rotateX(p, angle) { return { x: p.x, y: p.y * Math.cos(angle) - p.z * Math.sin(angle), z: p.y * Math.sin(angle) + p.z * Math.cos(angle) }; }
function rotateY(p, angle) { return { x: p.x * Math.cos(angle) + p.z * Math.sin(angle), y: p.y, z: -p.x * Math.sin(angle) + p.z * Math.cos(angle) }; }
function rotateZ(p, angle) { return { x: p.x * Math.cos(angle) - p.y * Math.sin(angle), y: p.x * Math.sin(angle) + p.y * Math.cos(angle), z: p.z }; }

function project(p) {
  const focalLength = 1600; 
  // Aplica o zoom na escala final
  const scale = (focalLength / (focalLength + p.z + 1000)) * zoomScale; 
  // Aplica a transição de posição X (Deslizar para o centro)
  return { x: (p.x * scale) + currentCenterX, y: (p.y * scale) + height / 2, scale: scale, origZ: p.z };
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  // Interpolações suaves de câmera
  currentAngleX += (targetAngleX - currentAngleX) * 0.03;
  currentAngleY += (targetAngleY - currentAngleY) * 0.03;
  currentCenterX += (targetCenterX - currentCenterX) * 0.03;
  zoomScale += (targetZoomScale - zoomScale) * 0.03;

  let time = performance.now() * 0.00015; 

  for (let d of dust) {
    d.x += d.vx; d.y += d.vy;
    if (d.x < 0) d.x = width; if (d.x > width) d.x = 0;
    if (d.y < 0) d.y = height; if (d.y > height) d.y = 0;
    
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(120, 39, 54, ${d.alpha})`;
    ctx.fill();
  }

  for (let i = 0; i < points.length; i++) {
    let p = points[i];
    let rot = rotateY(p, time + currentAngleY);
    rot = rotateX(rot, currentAngleX); 
    rot = rotateZ(rot, time * 0.15); 
    p.proj = project(rot);
  }

  for (let i = 0; i < segments.length; i++) {
    segments[i].z = (segments[i].p1.proj.origZ + segments[i].p2.proj.origZ) / 2;
  }
  segments.sort((a, b) => b.z - a.z);

  for (let i = 0; i < segments.length; i++) {
    let seg = segments[i];
    let proj1 = seg.p1.proj;
    let proj2 = seg.p2.proj;
    
    let opacity = Math.min(Math.max(proj1.scale * 2.0 - 0.1, 0.1), 0.9);
    
    ctx.beginPath();
    ctx.moveTo(proj1.x, proj1.y);
    ctx.lineTo(proj2.x, proj2.y);
    
    ctx.strokeStyle = `rgba(120, 39, 54, ${opacity})`;
    ctx.lineWidth = proj1.scale * 2.0; 
    ctx.stroke();
  }

  requestAnimationFrame(animate);
}

window.addEventListener('mousemove', (e) => {
  if (isLoginActive) return;
  targetAngleY = ((e.clientX / width) - 0.5) * Math.PI * 0.5; 
  targetAngleX = ((e.clientY / height) - 0.5) * Math.PI * 0.5 + 0.5; 
});

document.addEventListener('click', () => {
  if (isLoginActive) return;
  isLoginActive = true;

  // A fita vira um túnel de fundo antes de entrar na tela de login
  targetAngleX = Math.PI / 2.2; // Deita a fita
  targetAngleY = 0;             // Tira a inclinação lateral
  targetZoomScale = 2.8;        // Aumenta em quase 3x o tamanho
  targetCenterX = width * 0.5;  // Centraliza perfeitamente na tela

  document.getElementById('intro-screen').classList.add('hidden');
  document.getElementById('fabric-canvas').classList.add('blurred');

  // Fluxo: intro -> login
  setTimeout(() => {
    window.location.href = '../login/index.html';
  }, 900);
});

resize();
animate();

// ==========================================================================
// MANIFESTO DINÂMICO
// ==========================================================================
const manifestoPhrases = [
  "A trama da moda circular.",
  "Do resíduo à alta costura.",
  "Onde o ciclo nunca termina.",
  "O futuro contínuo do tecido."
];
let currentPhrase = 0;
const manifestoEl = document.getElementById('manifesto-text');

if (manifestoEl) {
  setInterval(() => {
    if (isLoginActive) return;
    manifestoEl.classList.add('fade-out');
    setTimeout(() => {
      currentPhrase = (currentPhrase + 1) % manifestoPhrases.length;
      manifestoEl.textContent = manifestoPhrases[currentPhrase];
      manifestoEl.classList.remove('fade-out');
    }, 600);
  }, 4500);
}
