'use strict';
// ================================================================
//  MEDIEVAL KINGDOM RUNNER  — v2
//  Outdoor sunset theme · Platforms · Archer arrows · Smooth guards
// ================================================================

// ----------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------
const CFG = {
  W: 800, H: 450,
  GY: 390,           // ground top y
  SCALE: 3,          // 1 game-px = 3 canvas-px
  GRAV: 2700,        // px/s²
  JUMP_V: -860,      // initial jump velocity  (peak ~140 px above ground)
  JUMP_CUT: -280,    // velocity after early key-release
  BASE_SPD: 250,     // initial scroll speed
  MAX_SPD: 680,      // speed cap
  SPD_RAMP: 18,      // speed increase per second
  PLAYER_X: 110,     // fixed player x
  MIN_GAP: 360,      // minimum px between obstacle groups
  PATROL_SPD: 38,    // guard world-space patrol speed px/s (constant)
  PATROL_W: 70,      // guard patrol half-width px
};

// Character size in canvas pixels
const CW  = 12 * CFG.SCALE;  // 36
const CH  = 18 * CFG.SCALE;  // 54
const PY0 = CFG.GY - CH;     // player resting y (ground)

// Five platform heights (surface y).
// Levels 0-2 are reachable directly from the ground (max ground jump ≈ 137 px).
// Every level is reachable from every other level via a jump, enabling chain hopping.
const PLAT_HEIGHTS = [
  CFG.GY - 80,   // 0 — low        (y≈310)  easy from ground
  CFG.GY - 108,  // 1 — medium-low (y≈282)  comfortable from ground
  CFG.GY - 132,  // 2 — medium     (y≈258)  near-full jump from ground
  CFG.GY - 156,  // 3 — medium-high(y≈234)  reachable from level 0+
  CFG.GY - 180,  // 4 — high       (y≈210)  reachable from level 1+
];

// ----------------------------------------------------------------
// MATH UTILS
// ----------------------------------------------------------------
const rnd    = (a, b) => Math.random() * (b - a) + a;
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
const clamp  = (v, a, b) => Math.max(a, Math.min(b, v));

// ----------------------------------------------------------------
// PIXEL DRAW HELPER
// ----------------------------------------------------------------
function makeR(ctx, ox, oy, S) {
  return (gx, gy, gw, gh, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(
      Math.round(ox + gx * S),
      Math.round(oy + gy * S),
      Math.ceil(gw * S),
      Math.ceil(gh * S)
    );
  };
}

// ================================================================
//  SPRITES  (12 × 18 game-px · scale 3 → 36 × 54 canvas px)
// ================================================================

// ---- KNIGHT (Player) -------------------------------------------
function drawKnight(ctx, ox, oy, frame, state) {
  const S = CFG.SCALE;
  const r = makeR(ctx, ox, oy, S);

  // Helmet
  r(3,0,6,1,'#D97706'); r(4,0,4,1,'#FCD34D');
  r(2,1,8,4,'#FCD34D'); r(2,1,8,1,'#B45309'); r(2,4,8,1,'#B45309');
  r(2,2,1,3,'#B45309'); r(9,2,1,3,'#B45309');
  r(3,2,6,2,'#111827'); r(4,2,4,1,'#93C5FD');
  // Neck
  r(4,5,4,1,'#6B7280');
  // Shoulders
  r(1,6,2,2,'#FCD34D'); r(9,6,2,2,'#FCD34D');
  r(1,7,2,1,'#B45309'); r(9,7,2,1,'#B45309');
  // Torso
  r(2,6,8,5,'#3B82F6'); r(3,6,6,1,'#1E40AF'); r(2,9,8,2,'#1E40AF');
  r(5,7,2,3,'#1D4ED8'); r(3,8,2,1,'#60A5FA'); r(7,8,2,1,'#60A5FA');
  // Belt
  r(3,11,6,1,'#FCD34D'); r(5,11,2,1,'#B45309');
  // Tabard
  r(3,12,6,2,'#1E40AF'); r(4,12,4,2,'#1D4ED8');
  // Arms
  const swing = (state === 'run') ? (Math.floor(frame/2)%2) : 0;
  const la = swing, ra = 1-swing;
  r(0,6+la,2,4,'#3B82F6'); r(0,9+la,2,1,'#9CA3AF');
  r(10,6+ra,2,4,'#3B82F6'); r(10,9+ra,2,1,'#9CA3AF');
  // Sword
  if (state !== 'dead') {
    r(11,5+ra,1,7,'#D1D5DB'); r(11,4+ra,1,1,'#F8FAFC');
    r(10,9+ra,2,1,'#FCD34D'); r(11,11+ra,1,2,'#92400E');
  }
  drawKnightLegs(ctx, ox, oy, frame, state, S);
}

function drawKnightLegs(ctx, ox, oy, frame, state, S) {
  const r = makeR(ctx, ox, oy, S);
  if (state === 'dead') {
    r(1,14,10,2,'#3B82F6'); r(0,15,5,2,'#1E40AF'); r(7,15,5,2,'#1E40AF');
    r(0,17,5,1,'#111111'); r(7,17,5,1,'#111111'); return;
  }
  if (state === 'jump' || state === 'fall') {
    r(3,14,3,3,'#3B82F6'); r(6,14,3,3,'#3B82F6');
    r(2,16,4,1,'#1E40AF'); r(6,16,4,1,'#1E40AF');
    r(2,17,4,1,'#111111'); r(6,17,4,1,'#111111'); return;
  }
  const f = Math.floor(frame) % 4;
  const poses = [
    [2,14,4, 7,14,4, 1,7],
    [0,13,5, 7,15,3, 0,7],
    [2,14,4, 7,14,4, 2,6],
    [2,15,3, 8,13,5, 2,8],
  ];
  const [lx,ly,lh, rx,ry,rh, lbx,rbx] = poses[f];
  r(lx,ly,3,lh,'#3B82F6'); r(rx,ry,3,rh,'#3B82F6');
  r(lbx,17,4,1,'#111111'); r(rbx,17,4,1,'#111111');
  r(lbx,16,4,1,'#1E40AF'); r(rbx,16,4,1,'#1E40AF');
}

// ---- GUARD (patrol enemy) --------------------------------------
function drawGuard(ctx, ox, oy, frame) {
  const S = CFG.SCALE;
  const r = makeR(ctx, ox, oy, S);
  // Red plume
  r(4,0,4,2,'#DC2626'); r(5,0,2,1,'#EF4444');
  // Gray helmet
  r(2,2,8,4,'#9CA3AF'); r(2,2,8,1,'#6B7280'); r(2,5,8,1,'#6B7280');
  r(3,3,6,2,'#1F2937'); r(4,3,4,1,'#374151');
  // Neck
  r(4,6,4,1,'#6B7280');
  // Shield (left)
  r(0,7,2,7,'#DC2626'); r(0,7,2,1,'#991B1B'); r(0,13,2,1,'#991B1B');
  r(0,10,2,1,'#FCD34D');
  // Breastplate
  r(2,7,8,4,'#9CA3AF'); r(3,7,6,1,'#6B7280'); r(2,10,8,1,'#6B7280');
  r(5,8,2,2,'#6B7280');
  // Tabard
  r(2,11,8,3,'#DC2626'); r(3,11,6,3,'#B91C1C');
  // Spear
  r(11,0,1,17,'#78350F'); r(11,0,1,3,'#9CA3AF'); r(11,0,1,1,'#F8FAFC');
  // Right arm
  r(9,8,2,4,'#9CA3AF');
  // Legs
  const f = Math.floor(frame) % 4;
  const poses = [
    [3,14,3,4,6,14,3,4,2,6],
    [1,13,4,4,6,15,3,3,1,6],
    [3,14,3,4,6,14,3,4,2,6],
    [3,15,3,3,7,13,4,4,2,7],
  ];
  const [lx,ly,lw,lh,rx,ry,rw,rh,lbx,rbx] = poses[f];
  r(lx,ly,lw,lh,'#6B7280'); r(rx,ry,rw,rh,'#6B7280');
  r(lbx,17,4,1,'#111111'); r(rbx,17,4,1,'#111111');
  r(lbx,16,4,1,'#374151'); r(rbx,16,4,1,'#374151');
}

// ---- ARCHER (stationary enemy) ---------------------------------
function drawArcher(ctx, ox, oy, shootPhase) {
  const S = CFG.SCALE;
  const r = makeR(ctx, ox, oy, S);
  // Green hood
  r(3,0,6,5,'#15803D'); r(2,1,8,4,'#16A34A');
  r(4,3,4,1,'#166534'); r(3,0,6,1,'#4ADE80');
  // Face
  r(3,4,6,2,'#FED7AA'); r(4,4,4,1,'#FDBA74');
  r(3,5,2,1,'#1F2937'); r(7,5,2,1,'#1F2937');
  // Tunic
  r(2,6,8,5,'#78350F'); r(3,6,6,1,'#451A03');
  r(5,7,2,2,'#451A03'); r(2,10,8,1,'#451A03');
  // Belt
  r(3,11,6,1,'#111111');
  // Lower tunic
  r(3,12,6,2,'#78350F');
  // Quiver
  r(9,6,2,5,'#451A03'); r(9,5,1,2,'#9CA3AF'); r(10,5,1,2,'#D1D5DB');
  // Bow
  r(1,6,1,8,'#92400E'); r(0,7,1,1,'#92400E'); r(0,12,1,1,'#92400E');
  r(1,7,1,6,'#E5E7EB');
  if (shootPhase === 'drawing') {
    r(2,9,2,1,'#E5E7EB');        // pulled string
    r(2,9,7,1,'#92400E');        // nocked arrow
    r(8,9,2,1,'#9CA3AF');        // arrowhead
    r(2,9,1,1,'#C4B5FD');        // fletching
  }
  // Right arm
  r(10,7,2,4,'#78350F'); r(10,10,2,1,'#FED7AA');
  // Legs (idle)
  r(3,14,3,4,'#78350F'); r(6,14,3,4,'#78350F');
  r(2,17,4,1,'#111111'); r(6,17,4,1,'#111111');
  r(2,16,4,1,'#451A03'); r(6,16,4,1,'#451A03');
}

// ---- ARROW (projectile) — 10×4 game-px, travels left -----------
function drawArrow(ctx, ox, oy) {
  const S = CFG.SCALE;
  const r = makeR(ctx, ox, oy, S);
  // Bright arrowhead (orange/white so it stands out)
  r(0,1,2,2,'#F97316');   // head body
  r(0,1,1,1,'#FDE68A');   // bright tip
  // Shaft (two-tone for thickness)
  r(2,1,5,1,'#FCD34D');   // shaft top (gold)
  r(2,2,5,1,'#D97706');   // shaft bottom (shadow)
  // Fletching
  r(7,0,2,1,'#60A5FA');   // fletching top
  r(7,2,2,1,'#3B82F6');   // fletching bottom
  r(9,1,1,2,'#78350F');   // nock
}

// ---- COIN — 8×8 game-px, 4-frame spin --------------------------
function drawCoin(ctx, ox, oy, frame) {
  const S = CFG.SCALE;
  const r = makeR(ctx, ox, oy, S);
  const f = Math.floor(frame/6) % 4;
  if (f === 0) {
    r(2,0,4,8,'#FCD34D'); r(1,1,6,6,'#FCD34D'); r(0,2,8,4,'#FCD34D');
    r(2,1,4,1,'#F59E0B'); r(1,2,1,4,'#F59E0B'); r(6,2,1,4,'#F59E0B');
    r(2,6,4,1,'#F59E0B'); r(3,3,2,2,'#B45309'); r(2,2,4,4,'#FDE68A');
  } else if (f === 1) {
    r(2,0,4,8,'#FCD34D'); r(1,1,5,6,'#FCD34D'); r(0,2,5,4,'#FCD34D');
    r(2,2,3,4,'#FDE68A');
  } else if (f === 2) {
    r(3,0,2,8,'#FCD34D'); r(3,1,2,6,'#FDE68A');
  } else {
    r(2,0,4,8,'#FCD34D'); r(2,1,5,6,'#FCD34D'); r(3,2,5,4,'#FCD34D');
    r(3,2,3,4,'#FDE68A');
  }
}

// ---- PLATFORM (stone ledge) ------------------------------------
function drawPlatform(ctx, x, y, w) {
  const ix = Math.round(x);
  // Top surface (lighter)
  ctx.fillStyle = '#D1D5DB';
  ctx.fillRect(ix, y,   w, 5);
  // Main body
  ctx.fillStyle = '#9CA3AF';
  ctx.fillRect(ix, y+5, w, 9);
  // Shadow line
  ctx.fillStyle = '#6B7280';
  ctx.fillRect(ix, y+5, w, 2);
  // Stone block dividers
  ctx.fillStyle = '#6B7280';
  for (let bx = ix; bx < ix + w; bx += 36) ctx.fillRect(bx, y, 3, 14);
  // Support column(s)
  const colH = CFG.GY - y - 14;
  if (colH > 0) {
    ctx.fillStyle = '#4B5563';
    ctx.fillRect(ix + 6,     y+14, 8, colH);
    if (w > 60) ctx.fillRect(ix + w - 14, y+14, 8, colH);
    ctx.fillStyle = '#374151';
    ctx.fillRect(ix + 7,     y+14, 4, colH);
    if (w > 60) ctx.fillRect(ix + w - 13, y+14, 4, colH);
  }
}

// ================================================================
//  PARTICLES
// ================================================================
class Particle {
  constructor(x, y, vx, vy, color, life) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.life = this.maxLife = life;
    this.size = rnd(2, 5);
  }
  update(dt) {
    this.x += this.vx*dt; this.y += this.vy*dt;
    this.vy += 900*dt; this.life -= dt;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life/this.maxLife);
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
    ctx.globalAlpha = 1;
  }
}
function spawnLand(particles, x, y) {
  const cols = ['#D1D5DB','#9CA3AF','#6B7280','#FCD34D'];
  for (let i=0;i<8;i++)
    particles.push(new Particle(x+rnd(0,CW),y+CH,rnd(-80,80),rnd(-200,-50),cols[rndInt(0,3)],rnd(0.3,0.6)));
}
function spawnDeath(particles, x, y) {
  const cols = ['#EF4444','#FCD34D','#3B82F6','#F8FAFC'];
  for (let i=0;i<16;i++)
    particles.push(new Particle(x+rnd(0,CW),y+rnd(0,CH),rnd(-200,200),rnd(-350,-80),cols[rndInt(0,3)],rnd(0.5,1.0)));
}

// ================================================================
//  OUTDOOR SUNSET BACKGROUND
//  4 parallax layers · single consistent theme
//  Foreground zones cycle: market → guard tower → village
// ================================================================
const ZONE_LEN   = 700;   // world-units before zone changes
const ZONE_NAMES = ['market', 'tower', 'village'];

class OutdoorScene {
  constructor() {
    this.off  = [0, 0, 0, 0]; // layer offsets (speeds: 8%, 22%, 50%, 78%)
    this.time = 0;
  }

  get zoneIndex() { return Math.floor(this.off[2] / ZONE_LEN) % ZONE_NAMES.length; }
  get zoneName()  { return ZONE_NAMES[this.zoneIndex]; }

  update(dt, speed) {
    this.time     += dt;
    const f = [0.08, 0.22, 0.50, 0.78];
    for (let i=0; i<4; i++) this.off[i] += speed * f[i] * dt;
  }

  draw(ctx) {
    const W = CFG.W, GY = CFG.GY, t = this.time;

    // ── Layer 0: Sky gradient ──────────────────────────────────
    const sky = ctx.createLinearGradient(0,0,0,GY);
    sky.addColorStop(0,   '#1a0033');   // deep purple top
    sky.addColorStop(0.3, '#7c1f0a');   // burnt sienna
    sky.addColorStop(0.65,'#d4500a');   // orange
    sky.addColorStop(1,   '#ffd580');   // warm horizon
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GY);

    // Setting sun
    const sunX = W*0.68, sunY = GY - 22;
    // glow halo
    const glow = ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,70);
    glow.addColorStop(0,  'rgba(255,220,80,0.35)');
    glow.addColorStop(1,  'rgba(255,100,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.ellipse(sunX,sunY,70,70,0,0,Math.PI*2); ctx.fill();
    // sun disc
    ctx.fillStyle = '#FFD166';
    ctx.beginPath(); ctx.ellipse(sunX,sunY,30,30,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFF0A0';
    ctx.beginPath(); ctx.ellipse(sunX,sunY,22,22,0,0,Math.PI*2); ctx.fill();

    // ── Layer 1: Distant castle silhouette (8% speed) ──────────
    this._drawCastle(ctx, W, GY, this.off[0]);

    // ── Layer 2: Rolling hills + far trees (22% speed) ─────────
    this._drawHills(ctx, W, GY, this.off[1]);

    // ── Layer 3: Mid-ground zone elements (50% speed) ──────────
    this._drawZone(ctx, W, GY, this.off[2], t);

    // ── Ground platform ────────────────────────────────────────
    // Stone cobblestone ground
    ctx.fillStyle = '#4B5563';
    ctx.fillRect(0, GY, W, CFG.H - GY);
    ctx.fillStyle = '#6B7280';
    ctx.fillRect(0, GY, W, 6);
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, GY+6, W, 2);
    // Cobble lines
    const cobOff = this.off[3] % 48;
    ctx.fillStyle = '#374151';
    for (let x = -cobOff; x < W; x += 48) {
      ctx.fillRect(x, GY+2, 2, 6);
      ctx.fillRect(x+24, GY+8, 2, 6);
    }
  }

  _drawCastle(ctx, W, GY, offset) {
    const segW = 620;
    const start = -(offset % segW);
    ctx.fillStyle = '#1a0a2e';
    for (let sx = start; sx < W + segW; sx += segW) {
      const x = sx;
      // Main keep
      ctx.fillRect(x+200, GY-240, 90, 240);
      // Left tower
      ctx.fillRect(x+130, GY-200, 55, 200);
      // Right tower
      ctx.fillRect(x+300, GY-210, 55, 210);
      // Far left thin tower
      ctx.fillRect(x+60,  GY-160, 38, 160);
      // Connecting curtain wall
      ctx.fillRect(x+98,  GY-90,  35, 90);
      ctx.fillRect(x+355, GY-90,  40, 90);

      // Darker top details
      ctx.fillStyle = '#110820';
      // Battlements on main keep
      for (let i=0;i<6;i++) ctx.fillRect(x+200+i*15, GY-252, 9,14);
      // Left tower battlements
      for (let i=0;i<3;i++) ctx.fillRect(x+130+i*16, GY-212, 9,14);
      // Right tower
      for (let i=0;i<3;i++) ctx.fillRect(x+300+i*16, GY-222, 9,14);
      // Far tower
      for (let i=0;i<2;i++) ctx.fillRect(x+60+i*18,  GY-172, 9,14);

      ctx.fillStyle = '#1a0a2e';
      // Lit windows (orange/amber for sunset glow)
      ctx.fillStyle = '#f97316';
      ctx.fillRect(x+226, GY-200, 14,22); ctx.fillRect(x+248, GY-200, 14,22);
      ctx.fillRect(x+226, GY-163, 14,22); ctx.fillRect(x+248, GY-163, 14,22);
      ctx.fillRect(x+150, GY-170, 12,18); ctx.fillRect(x+315, GY-178, 12,18);
      // Bright window centres
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(x+229, GY-198, 8,8); ctx.fillRect(x+251, GY-198, 8,8);
      // Flags
      ctx.fillStyle = '#c41111';
      ctx.fillRect(x+243, GY-270, 3,26); ctx.fillRect(x+246, GY-270, 20,11);
      ctx.fillRect(x+169, GY-226, 3,22); ctx.fillRect(x+172, GY-226, 16,9);
      ctx.fillStyle = '#ff5555';
      ctx.fillRect(x+246, GY-270, 20,5); ctx.fillRect(x+172, GY-226, 16,4);
      ctx.fillStyle = '#1a0a2e';
    }
  }

  _drawHills(ctx, W, GY, offset) {
    // Dark rolling hills silhouette (far)
    ctx.fillStyle = '#2d1244';
    const seg1 = 420;
    let s = -(offset % seg1);
    for (let x = s; x < W + seg1; x += seg1) {
      ctx.beginPath();
      ctx.moveTo(x, GY);
      ctx.bezierCurveTo(x+80,GY-110, x+160,GY-140, x+210,GY-90);
      ctx.bezierCurveTo(x+260,GY-50, x+330,GY-130, x+420,GY);
      ctx.fill();
    }
    // Mid hills (slightly lighter)
    ctx.fillStyle = '#3b1a5c';
    const seg2 = 340;
    s = -(offset % seg2);
    for (let x = s; x < W + seg2; x += seg2) {
      ctx.beginPath();
      ctx.moveTo(x, GY);
      ctx.bezierCurveTo(x+60,GY-80, x+120,GY-95, x+170,GY-60);
      ctx.bezierCurveTo(x+220,GY-30, x+280,GY-85, x+340,GY);
      ctx.fill();
    }
    // Tree silhouettes on hills
    ctx.fillStyle = '#1a0a2e';
    const tSeg = 55;
    s = -(offset % tSeg);
    for (let x = s; x < W + tSeg; x += tSeg) {
      const h = 38 + 14*Math.sin(x*0.12);
      ctx.fillRect(x+4, GY-h, 6, h);
      ctx.beginPath();
      ctx.moveTo(x-4,GY-h);
      ctx.lineTo(x+7,GY-h-20);
      ctx.lineTo(x+18,GY-h);
      ctx.fill();
    }
  }

  _drawZone(ctx, W, GY, offset, t) {
    // Draw TWO zone widths so seams never show
    const totalOffset = offset;
    for (let z = -1; z <= 1; z++) {
      const zoneStart = (Math.floor(totalOffset / ZONE_LEN) + z) * ZONE_LEN;
      const zIdx = ((Math.floor(totalOffset / ZONE_LEN) + z) % ZONE_NAMES.length + ZONE_NAMES.length) % ZONE_NAMES.length;
      const localX = -(totalOffset - zoneStart);
      this._drawZoneContent(ctx, W, GY, localX, ZONE_NAMES[zIdx], t);
    }
  }

  _drawZoneContent(ctx, _W, GY, xBase, zoneName, t) {
    if (zoneName === 'market')  this._drawMarket(ctx, GY, xBase, t);
    if (zoneName === 'tower')   this._drawGuardTower(ctx, GY, xBase, t);
    if (zoneName === 'village') this._drawVillage(ctx, GY, xBase, t);
  }

  // ── MARKET foreground ──────────────────────────────────────────
  _drawMarket(ctx, GY, xBase, _t) {
    const segW = 220;
    for (let x = xBase - segW; x < CFG.W + segW; x += segW) {
      // Market stall with awning
      this._stall(ctx, x + 20,  GY - 100, 90, '#DC2626');
      this._stall(ctx, x + 130, GY - 100, 70, '#1D4ED8');
      // Hanging cloth banner
      ctx.fillStyle = '#B91C1C';
      ctx.fillRect(x+60, GY-170, 5, 75);
      ctx.fillRect(x+58, GY-120, 36, 22);
      ctx.fillStyle = '#FCD34D'; ctx.fillRect(x+62, GY-115, 28, 4);
      // Barrels and crates near stall
      this._barrel(ctx, x + 8,   GY - 30);
      this._crate(ctx,  x + 95,  GY - 30);
      this._barrel(ctx, x + 185, GY - 30);
    }
  }
  _stall(ctx, x, y, w, col) {
    // Awning
    ctx.fillStyle = col;
    ctx.fillRect(x, y-28, w, 22);
    // Stripes
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i=0;i<4;i++) ctx.fillRect(x + i*(w/4), y-28, w/8, 22);
    // Posts
    ctx.fillStyle = '#78350F';
    ctx.fillRect(x+2,  y-28, 5, 58);
    ctx.fillRect(x+w-7,y-28, 5, 58);
    // Counter
    ctx.fillStyle = '#A16207';
    ctx.fillRect(x,   y,    w, 10);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(x+2, y+2,  w-4, 6);
  }

  // ── GUARD TOWER foreground ─────────────────────────────────────
  _drawGuardTower(ctx, GY, xBase, t) {
    const segW = 260;
    for (let x = xBase - segW; x < CFG.W + segW; x += segW) {
      // Stone guard tower (tall)
      ctx.fillStyle = '#374151';
      ctx.fillRect(x+30,  GY-200, 60, 200);
      ctx.fillStyle = '#4B5563';
      ctx.fillRect(x+32,  GY-198, 56, 195);
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(x+32,  GY-198, 56, 4); // top ledge
      // Merlons
      ctx.fillStyle = '#374151';
      for (let i=0;i<4;i++) ctx.fillRect(x+30+i*16, GY-214, 10,16);
      // Arrow slits
      ctx.fillStyle = '#1F2937';
      ctx.fillRect(x+50, GY-160, 6, 22);
      ctx.fillRect(x+50, GY-120, 6, 22);
      // Lit window
      ctx.fillStyle = '#F97316';
      ctx.fillRect(x+52, GY-158, 2, 6);
      ctx.fillRect(x+52, GY-118, 2, 6);
      // Doorway arch
      ctx.fillStyle = '#1F2937';
      ctx.fillRect(x+47, GY-50, 16, 50);
      ctx.beginPath();
      ctx.ellipse(x+55, GY-50, 8, 10, 0, Math.PI, 0); ctx.fill();
      // Connecting wall to right
      ctx.fillStyle = '#374151';
      ctx.fillRect(x+90, GY-80, 130, 80);
      ctx.fillStyle = '#4B5563';
      ctx.fillRect(x+90, GY-80, 130, 5);
      // Merlons on wall
      for (let i=0;i<5;i++) ctx.fillRect(x+90+i*26, GY-92, 14,14);
      // Brazier / torch on tower
      this._brazier(ctx, x+58, GY-215, t);
      // Barrels at base
      this._barrel(ctx, x+8,   GY-30);
      this._barrel(ctx, x+200, GY-30);
    }
  }

  // ── VILLAGE foreground ─────────────────────────────────────────
  _drawVillage(ctx, GY, xBase, t) {
    const segW = 240;
    for (let x = xBase - segW; x < CFG.W + segW; x += segW) {
      // Thatched house
      ctx.fillStyle = '#78350F'; ctx.fillRect(x+10, GY-110, 80, 110);
      ctx.fillStyle = '#92400E'; ctx.fillRect(x+12, GY-108, 76, 106);
      // Thatch roof
      ctx.fillStyle = '#A16207';
      ctx.beginPath();
      ctx.moveTo(x+5,  GY-110);
      ctx.lineTo(x+50, GY-150);
      ctx.lineTo(x+95, GY-110);
      ctx.fill();
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.moveTo(x+10, GY-110);
      ctx.lineTo(x+50, GY-146);
      ctx.lineTo(x+90, GY-110);
      ctx.fill();
      // Door
      ctx.fillStyle = '#451A03';
      ctx.fillRect(x+38, GY-50, 22, 50);
      ctx.beginPath();
      ctx.ellipse(x+49, GY-50, 11,14,0,Math.PI,0); ctx.fill();
      // Window
      ctx.fillStyle = '#F97316';
      ctx.fillRect(x+14, GY-85, 20, 18);
      ctx.fillStyle = '#FDE68A'; ctx.fillRect(x+16, GY-83, 8,5); ctx.fillRect(x+16, GY-77, 8,4);
      // Wooden fence
      ctx.fillStyle = '#78350F';
      for (let i=0;i<7;i++) {
        ctx.fillRect(x+100+i*16, GY-36, 8, 36);
        ctx.fillRect(x+100+i*16, GY-38, 8, 4); // picket top
      }
      ctx.fillRect(x+100, GY-28, 6*16+8, 5);
      ctx.fillRect(x+100, GY-20, 6*16+8, 5);
      // Torch on house wall
      this._smallTorch(ctx, x+95, GY-90, t);
      // Barrels and cart
      this._barrel(ctx, x+195, GY-30);
      this._crate(ctx,  x+220, GY-30);
    }
  }

  // ── Shared props ───────────────────────────────────────────────
  _barrel(ctx, x, y) {
    ctx.fillStyle = '#78350F'; ctx.fillRect(x,   y,   24,30);
    ctx.fillStyle = '#92400E'; ctx.fillRect(x+2, y+2, 20,26);
    ctx.fillStyle = '#6B7280'; ctx.fillRect(x-2, y+6, 28,4); ctx.fillRect(x-2,y+20,28,4);
    ctx.fillStyle = '#4B5563'; ctx.fillRect(x-2, y+6, 28,2); ctx.fillRect(x-2,y+20,28,2);
  }
  _crate(ctx, x, y) {
    ctx.fillStyle = '#A16207'; ctx.fillRect(x,  y,   28,28);
    ctx.fillStyle = '#78350F';
    ctx.fillRect(x,  y,   28,3); ctx.fillRect(x,  y,   3,28);
    ctx.fillRect(x+25,y,   3,28); ctx.fillRect(x,  y+25,28,3);
    ctx.fillRect(x+12,y,   3,28); ctx.fillRect(x,  y+12,28,3);
  }
  _brazier(ctx, x, y, t) {
    // Iron stand
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(x-1, y+10, 12, 3); ctx.fillRect(x+2, y, 6, 12);
    // Fire
    const fl = Math.sin(t*14)*2;
    ctx.fillStyle = '#F97316'; ctx.fillRect(x+fl,   y-10, 10, 14);
    ctx.fillStyle = '#FCD34D'; ctx.fillRect(x+1+fl, y-14, 8,  12);
    ctx.fillStyle = '#FDE68A'; ctx.fillRect(x+2+fl, y-17, 6,  8);
    // Glow
    ctx.fillStyle = 'rgba(249,115,22,0.12)';
    ctx.fillRect(x-10, y-22, 30, 40);
  }
  _smallTorch(ctx, x, y, t) {
    ctx.fillStyle = '#374151'; ctx.fillRect(x,   y+14, 10, 6);
    ctx.fillRect(x+3, y+8,  4,  8);
    ctx.fillStyle = '#78350F'; ctx.fillRect(x+3, y,    4, 10);
    const fl = Math.sin(t*12)*2;
    ctx.fillStyle = '#F97316'; ctx.fillRect(x+2+fl, y-8,  6, 10);
    ctx.fillStyle = '#FCD34D'; ctx.fillRect(x+3+fl, y-12, 4, 8);
    ctx.fillStyle = '#FDE68A'; ctx.fillRect(x+4+fl, y-14, 2, 4);
    ctx.fillStyle = 'rgba(249,115,22,0.1)';
    ctx.fillRect(x-8, y-20, 26, 36);
  }
}

// ================================================================
//  PLATFORM
// ================================================================
class Platform {
  constructor(x, y, w) {
    this.x = x;
    this.y = y;   // top surface y
    this.w = w;
    this.active = true;
  }

  update(dt, scrollSpd) {
    this.x -= scrollSpd * dt;
    if (this.x + this.w < -20) this.active = false;
  }

  draw(ctx) {
    drawPlatform(ctx, this.x, this.y, this.w);
  }
}

// ================================================================
//  PLAYER
// ================================================================
class Player {
  constructor() {
    this.x          = CFG.PLAYER_X;
    this.y          = PY0;
    this.vy         = 0;
    this.grounded   = true;
    this.frame      = 0;
    this.frameTimer = 0;
    this.state      = 'run';
    this.dead       = false;
    this.deadTimer  = 0;
    this.justLanded = false;
  }

  get hitbox() {
    return { x: this.x+6, y: this.y+6, x2: this.x+CW-6, y2: this.y+CH };
  }

  jump() {
    if (this.grounded && !this.dead) {
      this.vy = CFG.JUMP_V;
      this.grounded = false;
      this.state    = 'jump';
    }
  }

  cutJump() {
    if (!this.grounded && this.vy < CFG.JUMP_CUT) this.vy = CFG.JUMP_CUT;
  }

  kill() {
    if (this.dead) return;
    this.dead  = true;
    this.state = 'dead';
    this.vy    = -400;
  }

  // platforms: array of Platform objects
  update(dt, platforms) {
    if (this.dead) {
      this.deadTimer += dt;
      this.y  += this.vy * dt;
      this.vy += CFG.GRAV * dt;
      return;
    }

    const prevY = this.y;
    const wasGrounded = this.grounded;

    // Apply gravity & vertical movement when airborne
    if (!this.grounded) {
      this.vy += CFG.GRAV * dt;
      this.y  += this.vy * dt;
    }

    // Reset grounded — will be re-established below
    this.grounded   = false;
    this.justLanded = false;

    // ── Ground check ──
    if (this.y >= PY0) {
      if (!wasGrounded) this.justLanded = true;
      this.y        = PY0;
      this.vy       = 0;
      this.grounded = true;
    }

    // ── Platform checks (only needed if falling or on platform) ──
    if (!this.grounded && this.vy >= 0) {
      for (const plat of platforms) {
        const pLeft  = this.x + 8;
        const pRight = this.x + CW - 8;
        if (pRight > plat.x && pLeft < plat.x + plat.w) {
          // Detect crossing the platform surface top-down
          if (prevY + CH <= plat.y + 6 && this.y + CH >= plat.y) {
            if (!wasGrounded) this.justLanded = true;
            this.y        = plat.y - CH;
            this.vy       = 0;
            this.grounded = true;
            break;
          }
        }
      }
    }

    // When grounded, re-check if still over a platform (it may have scrolled away)
    if (this.grounded && this.y < PY0) {
      let stillOn = false;
      for (const plat of platforms) {
        if (this.x+8 < plat.x+plat.w && this.x+CW-8 > plat.x) { stillOn = true; break; }
      }
      if (!stillOn) {
        this.grounded = false; // platform scrolled away — fall
      }
    }

    // State
    if (this.grounded)    this.state = 'run';
    else if (this.vy < 0) this.state = 'jump';
    else                  this.state = 'fall';

    // Animate run frames
    this.frameTimer += dt;
    if (this.frameTimer >= 0.1) { this.frameTimer = 0; this.frame = (this.frame+1)%4; }
  }

  draw(ctx) {
    drawKnight(ctx, Math.round(this.x), Math.round(this.y), this.frame, this.state);
  }
}

// ================================================================
//  GUARD  — constant-speed back-and-forth patrol
// ================================================================
class Guard {
  constructor(x, y) {
    this.x          = x;
    this.y          = y !== undefined ? y : PY0;
    this.dir        = -1;   // starts walking left (toward player)
    this.patrolW    = rndInt(50, CFG.PATROL_W);
    this.startX     = x;
    this.frame      = 0;
    this.frameTimer = 0;
    this.active     = true;
  }

  get hitbox() {
    return { x: this.x+4, y: this.y+4, x2: this.x+CW-4, y2: this.y+CH };
  }

  update(dt, scrollSpd) {
    // Scroll with world
    this.x      -= scrollSpd * dt;
    this.startX -= scrollSpd * dt;

    // Constant-speed patrol (same speed regardless of direction)
    this.x += this.dir * CFG.PATROL_SPD * dt;
    if (this.x < this.startX - this.patrolW) { this.x = this.startX - this.patrolW; this.dir = 1; }
    if (this.x > this.startX + this.patrolW) { this.x = this.startX + this.patrolW; this.dir = -1; }

    // Animation — tied to time, not direction, so speed is visually constant
    this.frameTimer += dt;
    if (this.frameTimer >= 0.11) { this.frameTimer = 0; this.frame = (this.frame+1)%4; }

    if (this.x + CW < -20) this.active = false;
  }

  draw(ctx) {
    drawGuard(ctx, Math.round(this.x), Math.round(this.y), this.frame);
  }
}

// ================================================================
//  ARCHER  — aims at player's ground-level center
// ================================================================
class Archer {
  constructor(x, y) {
    this.x          = x;
    this.y          = y !== undefined ? y : PY0;
    this.shootTimer = rnd(0.8, 1.8);
    this.shootCool  = rnd(2.0, 3.5);
    this.phase      = 'idle';
    this.drawTimer  = 0;
    this.arrows     = [];
    this.active     = true;
  }

  get hitbox() {
    return { x: this.x+4, y: this.y+4, x2: this.x+CW-4, y2: this.y+CH };
  }

  update(dt, scrollSpd) {
    this.x -= scrollSpd * dt;
    if (this.x + CW < -20) { this.active = false; return; }

    if (this.phase === 'idle') {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) { this.phase = 'drawing'; this.drawTimer = 0.7; }
    } else if (this.phase === 'drawing') {
      this.drawTimer -= dt;
      if (this.drawTimer <= 0) {
        this.phase = 'shot';
        this.drawTimer = 0;
        // Arrow fires from the archer's actual bow position
        const arrowX = this.x - 2;
        const arrowY = this.y + CH * 0.5;  // mid-torso of archer, wherever they're standing
        this.arrows.push(new Arrow(arrowX, arrowY));
        this.shootTimer = this.shootCool;
      }
    } else {
      // brief post-shot
      this.drawTimer += dt;
      if (this.drawTimer >= 0.35) this.phase = 'idle';
    }

    for (const a of this.arrows) a.update(dt, scrollSpd);
    this.arrows = this.arrows.filter(a => a.active);
  }

  draw(ctx) {
    drawArcher(ctx, Math.round(this.x), Math.round(this.y), this.phase);
    for (const a of this.arrows) a.draw(ctx);
  }
}

// ================================================================
//  ARROW  — travels left at fixed visual speed
// ================================================================
class Arrow {
  constructor(x, y) {
    this.x      = x;
    this.y      = y;
    this.vx     = -440;    // leftward velocity in world space (px/s)
    this.active = true;
  }

  // Hitbox: full arrow width, 3 game-px tall
  get hitbox() {
    const S = CFG.SCALE;
    return {
      x:  this.x,
      y:  this.y,
      x2: this.x + 10 * S,
      y2: this.y + 4  * S,
    };
  }

  update(dt, scrollSpd) {
    // Arrow moves leftward at its own velocity AND with the world scroll
    this.x += (this.vx - scrollSpd) * dt;
    if (this.x + 10 * CFG.SCALE < 0) this.active = false;
  }

  draw(ctx) {
    drawArrow(ctx, Math.round(this.x), Math.round(this.y));
  }
}

// ================================================================
//  COIN
// ================================================================
class Coin {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.frame  = rndInt(0, 23);
    this.active = true;
    this.W = 8 * CFG.SCALE; this.H = 8 * CFG.SCALE;
  }
  get hitbox() {
    return { x: this.x+2, y: this.y+2, x2: this.x+this.W-2, y2: this.y+this.H-2 };
  }
  update(dt, scrollSpd) {
    this.x -= scrollSpd * dt;
    this.frame = (this.frame+1) % 24;
    if (this.x + this.W < -20) this.active = false;
  }
  draw(ctx) { drawCoin(ctx, Math.round(this.x), Math.round(this.y), this.frame); }
}

// ================================================================
//  OBSTACLE MANAGER  — now includes platforms
// ================================================================
class ObstacleManager {
  constructor() {
    this.platforms = [];
    this.guards    = [];
    this.archers   = [];
    this.coins     = [];
    this.spawnTimer     = 1.5;
    this.sinceLastSpawn = 0;
  }

  clear() {
    this.platforms = []; this.guards = []; this.archers = []; this.coins = [];
    this.spawnTimer = 1.5; this.sinceLastSpawn = 0;
  }

  update(dt, scrollSpd) {
    for (const p of this.platforms) p.update(dt, scrollSpd);
    for (const g of this.guards)    g.update(dt, scrollSpd);
    for (const a of this.archers)   a.update(dt, scrollSpd);
    for (const c of this.coins)     c.update(dt, scrollSpd);

    this.platforms = this.platforms.filter(p => p.active);
    this.guards    = this.guards.filter(g => g.active);
    this.archers   = this.archers.filter(a => a.active);
    this.coins     = this.coins.filter(c => c.active);

    const minGap = Math.max(220, CFG.MIN_GAP - (scrollSpd - CFG.BASE_SPD) * 0.18);
    this.spawnTimer     -= dt;
    this.sinceLastSpawn += scrollSpd * dt;

    if (this.spawnTimer <= 0 && this.sinceLastSpawn >= minGap) {
      this.spawn(scrollSpd);
    }
  }

  spawn(scrollSpd) {
    const X    = CFG.W + 55;
    const roll = Math.random();

    // Helper: place a platform at a given height level with an optional occupant.
    // Returns the Platform object so callers can read its .x/.y/.w.
    const addPlat = (x, level, w, occupant = 'none') => {
      const lvl  = Math.max(0, Math.min(4, level));
      const y    = PLAT_HEIGHTS[lvl];
      const plat = new Platform(x, y, w);
      this.platforms.push(plat);
      if (occupant === 'archer') {
        this.archers.push(new Archer(x + w / 2 - CW / 2, y - CH));
      } else if (occupant === 'guard') {
        this.guards.push(new Guard(x + w / 2 - CW / 2, y - CH));
      }
      return plat;
    };

    if (roll < 0.12) {
      // ── Ground guard ──────────────────────────────────────────────
      this.guards.push(new Guard(X));

    } else if (roll < 0.22) {
      // ── Ground archer ─────────────────────────────────────────────
      this.archers.push(new Archer(X));

    } else if (roll < 0.34) {
      // ── Single platform at a random height (0–4) ──────────────────
      const lvl  = rndInt(0, 4);
      const w    = rndInt(90, 160);
      const occ  = Math.random() < 0.6 ? (Math.random() < 0.55 ? 'archer' : 'guard') : 'none';
      addPlat(X, lvl, w, occ);

    } else if (roll < 0.48) {
      // ── Step-up pair: two platforms, each ~28 px higher ───────────
      // Player can hop from platform 1 → platform 2, or from ground → 1 → 2.
      const baseLvl = rndInt(0, 3);
      const w1 = rndInt(80, 130);
      const w2 = rndInt(80, 130);
      const gap = rndInt(100, 160);           // horizontal gap between platforms
      const occ1 = Math.random() < 0.5 ? 'archer' : 'none';
      const occ2 = Math.random() < 0.5 ? (Math.random() < 0.5 ? 'archer' : 'guard') : 'none';
      addPlat(X,           baseLvl,     w1, occ1);
      addPlat(X + w1 + gap, baseLvl + 1, w2, occ2);

    } else if (roll < 0.60) {
      // ── Step-down pair: high first, then lower ────────────────────
      const baseLvl = rndInt(1, 4);
      const w1 = rndInt(80, 130);
      const w2 = rndInt(80, 130);
      const gap = rndInt(100, 160);
      const occ1 = Math.random() < 0.5 ? 'archer' : 'none';
      const occ2 = Math.random() < 0.4 ? 'guard'  : 'none';
      addPlat(X,            baseLvl,     w1, occ1);
      addPlat(X + w1 + gap, baseLvl - 1, w2, occ2);

    } else if (roll < 0.70) {
      // ── Rising staircase: 3 platforms stepping up ─────────────────
      const baseLvl = rndInt(0, 2);   // levels baseLvl, +1, +2
      const w  = rndInt(70, 110);
      const gap = rndInt(90, 140);
      for (let i = 0; i < 3; i++) {
        const occ = (i === 2 && Math.random() < 0.65) ? 'archer' : 'none';
        addPlat(X + i * (w + gap), baseLvl + i, w, occ);
      }

    } else if (roll < 0.79) {
      // ── Descending staircase: 3 platforms stepping down ───────────
      const baseLvl = rndInt(2, 4);   // levels baseLvl, -1, -2
      const w  = rndInt(70, 110);
      const gap = rndInt(90, 140);
      for (let i = 0; i < 3; i++) {
        const occ = (i === 0 && Math.random() < 0.6) ? 'archer' : 'none';
        addPlat(X + i * (w + gap), baseLvl - i, w, occ);
      }

    } else if (roll < 0.90) {
      // ── Ground guard + elevated platform with archer behind ────────
      this.guards.push(new Guard(X));
      const lvl    = rndInt(1, 3);
      const platW  = rndInt(80, 130);
      const offset = rndInt(200, 320);
      addPlat(X + offset, lvl, platW, 'archer');

    } else {
      // ── Breather — coins only ─────────────────────────────────────
    }

    // ── Coin cluster (~55 % chance, sometimes placed on the last platform) ──
    if (Math.random() < 0.55) {
      const onPlat   = Math.random() < 0.35 && this.platforms.length > 0;
      const lastPlat = this.platforms[this.platforms.length - 1];
      const coinY    = onPlat
        ? lastPlat.y - 8 * CFG.SCALE - 10
        : PY0 + CH - 8 * CFG.SCALE - rndInt(0, 3) * 22;
      const coinBaseX = onPlat ? lastPlat.x + 10 : X + rnd(-60, -220);
      const count = rndInt(3, 7);
      for (let i = 0; i < count; i++) {
        this.coins.push(new Coin(coinBaseX + i * (8 * CFG.SCALE + 5), coinY));
      }
    }

    this.sinceLastSpawn = 0;
    this.spawnTimer = Math.max(0.4, 1.4 - (scrollSpd - CFG.BASE_SPD) / 650);
  }

  draw(ctx) {
    for (const p of this.platforms) p.draw(ctx);
    for (const c of this.coins)     c.draw(ctx);
    for (const g of this.guards)    g.draw(ctx);
    for (const a of this.archers)   a.draw(ctx);
  }

  get arrows() { return this.archers.flatMap(a => a.arrows); }
}

// ================================================================
//  HUD
// ================================================================
function drawHUD(ctx, score, highScore, zoneName) {
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.textBaseline = 'top';
  const scoreStr = String(Math.floor(score)).padStart(6, '0');
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(scoreStr, CFG.W-140, 14);
  ctx.fillStyle = '#FCD34D';         ctx.fillText(scoreStr, CFG.W-142, 12);
  const hiStr = 'HI ' + String(Math.floor(highScore)).padStart(6, '0');
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(hiStr, 16, 14);
  ctx.fillStyle = '#9CA3AF';         ctx.fillText(hiStr, 14, 12);
  // Zone indicator
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillStyle = 'rgba(255,220,120,0.4)';
  ctx.fillText(zoneName.toUpperCase(), CFG.W - 90, CFG.H - 18);
}

// ================================================================
//  SCREEN SHAKE
// ================================================================
class ScreenShake {
  constructor() { this.intensity=0; this.duration=0; this.timer=0; }
  trigger(i,d) { this.intensity=i; this.duration=d; this.timer=d; }
  update(dt)   { if(this.timer>0) this.timer-=dt; }
  apply(ctx)   {
    if(this.timer<=0) return;
    const m = this.intensity * (this.timer/this.duration);
    ctx.translate(rnd(-m,m), rnd(-m,m));
  }
}

// ================================================================
//  GAME
// ================================================================
const STATES = { MENU:0, PLAYING:1, DEAD:2 };

class Game {
  constructor(canvas) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.state     = STATES.MENU;
    this.score     = 0;
    this.highScore = parseInt(localStorage.getItem('mkrHighScore')||'0',10);
    this.speed     = CFG.BASE_SPD;
    this.player    = new Player();
    this.obstacles = new ObstacleManager();
    this.scene     = new OutdoorScene();
    this.shake     = new ScreenShake();
    this.particles = [];
    this.prevTime  = null;
    this.raf       = null;
    this._bindInputs();
    this._bindUI();
  }

  _bindInputs() {
    const jump = () => { if(this.state===STATES.PLAYING) this.player.jump(); };
    const cut  = () => { if(this.state===STATES.PLAYING) this.player.cutJump(); };
    window.addEventListener('keydown', e => {
      if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();jump();}
      if(e.code==='KeyR'&&this.state===STATES.DEAD) this.restart();
    });
    window.addEventListener('keyup', e => {
      if(e.code==='Space'||e.code==='ArrowUp') cut();
    });
    this.canvas.addEventListener('pointerdown', ()=>jump());
    this.canvas.addEventListener('pointerup',   ()=>cut());
  }

  _bindUI() {
    document.getElementById('start-btn').addEventListener('click',   ()=>this.start());
    document.getElementById('restart-btn').addEventListener('click', ()=>this.restart());
    document.getElementById('menu-btn').addEventListener('click',    ()=>this.showMenu());
    document.getElementById('menu-best').textContent = this.highScore;
  }

  start() {
    this._hideScreens();
    this.state     = STATES.PLAYING;
    this.score     = 0;
    this.speed     = CFG.BASE_SPD;
    this.player    = new Player();
    this.obstacles.clear();
    this.particles = [];
    this.scene     = new OutdoorScene();
    this.prevTime  = null;
    if (!this.raf) this._loop(performance.now());
  }

  restart() { this.start(); }

  showMenu() {
    this._hideScreens();
    document.getElementById('menu-screen').classList.remove('hidden');
    document.getElementById('menu-best').textContent = this.highScore;
    this.state = STATES.MENU;
  }

  _die() {
    this.state = STATES.DEAD;
    this.player.kill();
    this.shake.trigger(8, 0.35);
    spawnDeath(this.particles, this.player.x, this.player.y);
    const isNew = this.score > this.highScore;
    if (isNew) {
      this.highScore = Math.floor(this.score);
      localStorage.setItem('mkrHighScore', this.highScore);
    }
    setTimeout(() => {
      document.getElementById('go-score').textContent = Math.floor(this.score);
      document.getElementById('go-best').textContent  = this.highScore;
      const nr = document.getElementById('new-record');
      isNew ? nr.classList.remove('hidden') : nr.classList.add('hidden');
      document.getElementById('gameover-screen').classList.remove('hidden');
    }, 900);
  }

  _hideScreens() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
  }

  _loop(ts) {
    this.raf = requestAnimationFrame(t => this._loop(t));
    if (this.prevTime === null) { this.prevTime = ts; return; }
    const dt = Math.min((ts - this.prevTime)/1000, 0.05);
    this.prevTime = ts;
    this._update(dt);
    this._render();
  }

  _update(dt) {
    this.shake.update(dt);
    const platforms = this.obstacles.platforms;

    if (this.state === STATES.PLAYING) {
      this.speed  = Math.min(this.speed + CFG.SPD_RAMP*dt, CFG.MAX_SPD);
      this.score += this.speed * dt * 0.05;
      this.scene.update(dt, this.speed);

      this.player.update(dt, platforms);
      if (this.player.justLanded) spawnLand(this.particles, this.player.x, this.player.y);

      this.obstacles.update(dt, this.speed);

      // Coin collection
      const ph = this.player.hitbox;
      this.obstacles.coins = this.obstacles.coins.filter(c => {
        if (c.active && rectsOverlap(ph, c.hitbox)) { this.score+=25; c.active=false; return false; }
        return true;
      });

      // Collision — guards
      for (const g of this.obstacles.guards) {
        if (rectsOverlap(ph, g.hitbox)) { this._die(); return; }
      }
      // Collision — archers (body)
      for (const a of this.obstacles.archers) {
        if (rectsOverlap(ph, a.hitbox)) { this._die(); return; }
      }
      // Collision — arrows
      for (const ar of this.obstacles.arrows) {
        if (ar.active && rectsOverlap(ph, ar.hitbox)) { this._die(); return; }
      }
    }

    if (this.state === STATES.DEAD) {
      this.scene.update(dt*0.15, this.speed*0.15);
      this.player.update(dt, platforms);
      this.obstacles.update(dt, this.speed*0.15);
    }

    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => p.life > 0);
  }

  _render() {
    const ctx = this.ctx;
    ctx.save();
    this.shake.apply(ctx);

    this.scene.draw(ctx);
    this.obstacles.draw(ctx);
    this.player.draw(ctx);
    for (const p of this.particles) p.draw(ctx);

    if (this.state !== STATES.MENU) {
      drawHUD(ctx, this.score, this.highScore, this.scene.zoneName);
    }
    ctx.restore();
  }
}

// ----------------------------------------------------------------
// Axis-aligned bounding box overlap
// ----------------------------------------------------------------
function rectsOverlap(a, b) {
  return a.x < b.x2 && a.x2 > b.x && a.y < b.y2 && a.y2 > b.y;
}

// ================================================================
//  BOOT
// ================================================================
const canvas = document.getElementById('canvas');
const game   = new Game(canvas);

// Show menu; draw a static preview frame while waiting
(function renderMenuFrame() {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const previewScene = new OutdoorScene();
  previewScene.draw(ctx);
  // Static knight
  drawKnight(ctx, CFG.PLAYER_X, PY0, 0, 'run');
  // Static platforms at varied heights for menu preview
  drawPlatform(ctx, 380, PLAT_HEIGHTS[0], 110);
  drawPlatform(ctx, 530, PLAT_HEIGHTS[2],  90);
  drawPlatform(ctx, 660, PLAT_HEIGHTS[4],  80);
})();

document.getElementById('menu-screen').classList.remove('hidden');
