// Decision Neuron — Canvas Animation

class NeuronAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.score = 0;
    this.displayScore = 0;
    this.time = 0;
    this.dendrites = [];
    this.particles = [];
    this.shockwaves = [];
    this.lastFireTime = 0;
    this.fireInterval = 2500;
    this.width = 400;
    this.height = 400;
    this.centerX = 200;
    this.centerY = 200;
    this.somaRadius = 28;
    this.animating = true;

    this.resize();
    this.generateDendrites();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 400;
    this.height = rect.height || 400;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  }

  generateDendrites() {
    this.dendrites = [];
    const numMain = 8;

    for (let i = 0; i < numMain; i++) {
      const baseAngle = (i / numMain) * Math.PI * 2;
      const angle = baseAngle + (Math.random() - 0.5) * 0.3;
      const length = 75 + Math.random() * 55;

      const trunk = this.createBranch(0, 0, angle, length, 3.5, 0);
      this.dendrites.push(trunk);

      // Sub-branches from trunk
      const numSub = 1 + Math.floor(Math.random() * 2);
      for (let j = 0; j < numSub; j++) {
        const splitT = 0.35 + Math.random() * 0.4;
        const splitIdx = Math.floor(splitT * (trunk.points.length - 1));
        const sp = trunk.points[splitIdx];
        const subAngle = angle + (j % 2 === 0 ? 1 : -1) * (0.4 + Math.random() * 0.5);
        const subLen = 30 + Math.random() * 35;
        const sub = this.createBranch(sp.x, sp.y, subAngle, subLen, 2, 1);
        this.dendrites.push(sub);

        // Tertiary branches
        if (Math.random() > 0.5) {
          const tSplit = 0.5 + Math.random() * 0.3;
          const tIdx = Math.floor(tSplit * (sub.points.length - 1));
          const tp = sub.points[tIdx];
          const tAngle = subAngle + (Math.random() - 0.5) * 1.0;
          const tLen = 15 + Math.random() * 20;
          this.dendrites.push(this.createBranch(tp.x, tp.y, tAngle, tLen, 1, 2));
        }
      }
    }
  }

  createBranch(startX, startY, angle, length, width, depth) {
    const points = [];
    const segments = 6 + Math.floor(Math.random() * 3);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const drift = Math.sin(t * Math.PI * 1.5 + Math.random()) * 6;
      const x = startX + Math.cos(angle) * length * t + Math.cos(angle + Math.PI / 2) * drift;
      const y = startY + Math.sin(angle) * length * t + Math.sin(angle + Math.PI / 2) * drift;
      points.push({ x, y });
    }

    return {
      points,
      width,
      depth,
      angle,
      length,
      phaseOffset: Math.random() * Math.PI * 2,
    };
  }

  getColor(score) {
    // Smooth color transitions across score bands
    if (score <= 40) {
      // Soft blue/purple
      const t = score / 40;
      return this.lerpColor([80, 110, 220], [100, 140, 255], t);
    } else if (score <= 65) {
      // Blue to blue-green
      const t = (score - 40) / 25;
      return this.lerpColor([100, 140, 255], [80, 200, 160], t);
    } else if (score <= 80) {
      // Blue-green to yellow-orange
      const t = (score - 65) / 15;
      return this.lerpColor([80, 200, 160], [240, 192, 64], t);
    } else if (score <= 94) {
      // Yellow-orange to orange-red
      const t = (score - 80) / 14;
      return this.lerpColor([240, 192, 64], [255, 80, 50], t);
    } else {
      // Orange-red to white-red
      const t = (score - 94) / 6;
      return this.lerpColor([255, 80, 50], [255, 200, 200], t);
    }
  }

  lerpColor(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
  }

  colorStr(rgb, alpha = 1) {
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
  }

  getPulseSpeed() {
    // Pulse speed increases with score
    if (this.displayScore <= 40) return 0.8;
    if (this.displayScore <= 65) return 1.2;
    if (this.displayScore <= 80) return 1.8;
    if (this.displayScore <= 94) return 2.8;
    return 4.0;
  }

  getGlowIntensity() {
    if (this.displayScore <= 40) return 0.15;
    if (this.displayScore <= 65) return 0.25;
    if (this.displayScore <= 80) return 0.4;
    if (this.displayScore <= 94) return 0.6;
    return 0.9;
  }

  setScore(score) {
    this.score = Math.max(0, Math.min(100, score));
  }

  spawnParticle() {
    if (this.dendrites.length === 0) return;
    const dendrite = this.dendrites[Math.floor(Math.random() * this.dendrites.length)];
    this.particles.push({
      dendrite,
      t: 0,
      speed: 0.005 + Math.random() * 0.01 + this.displayScore * 0.0002,
      size: 1.5 + Math.random() * 2,
      alpha: 0.5 + Math.random() * 0.5,
    });
  }

  getPointOnDendrite(dendrite, t, timeOffset) {
    const points = dendrite.points;
    const idx = t * (points.length - 1);
    const i = Math.floor(idx);
    const frac = idx - i;
    const p0 = points[Math.min(i, points.length - 1)];
    const p1 = points[Math.min(i + 1, points.length - 1)];

    // Add subtle wave animation
    const wave = Math.sin(timeOffset + dendrite.phaseOffset + t * 3) * 2 * (1 + this.displayScore * 0.02);
    const perpAngle = dendrite.angle + Math.PI / 2;

    return {
      x: this.centerX + (p0.x + (p1.x - p0.x) * frac) + Math.cos(perpAngle) * wave,
      y: this.centerY + (p0.y + (p1.y - p0.y) * frac) + Math.sin(perpAngle) * wave,
    };
  }

  triggerFire() {
    // Shockwave ring
    this.shockwaves.push({
      radius: this.somaRadius,
      maxRadius: 180,
      alpha: 1,
      speed: 3 + this.displayScore * 0.02,
    });

    // Burst particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      this.particles.push({
        burst: true,
        x: this.centerX,
        y: this.centerY,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3),
        size: 2 + Math.random() * 3,
        alpha: 1,
        life: 1,
      });
    }
  }

  animate(timestamp) {
    if (!this.animating) return;

    const dt = 1 / 60;
    this.time += dt;

    // Smooth score transition
    this.displayScore += (this.score - this.displayScore) * 0.05;

    const ctx = this.ctx;
    const color = this.getColor(this.displayScore);
    const pulseSpeed = this.getPulseSpeed();
    const glowIntensity = this.getGlowIntensity();

    // Clear
    ctx.clearRect(0, 0, this.width, this.height);

    // Background glow
    const bgGrad = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, 200
    );
    bgGrad.addColorStop(0, this.colorStr(color, glowIntensity * 0.3));
    bgGrad.addColorStop(0.5, this.colorStr(color, glowIntensity * 0.08));
    bgGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw dendrites
    ctx.save();
    ctx.shadowColor = this.colorStr(color, 0.6);
    ctx.shadowBlur = 6 + glowIntensity * 12;

    for (const dendrite of this.dendrites) {
      const pts = dendrite.points;
      ctx.beginPath();

      const start = this.getPointOnDendrite(dendrite, 0, this.time);
      ctx.moveTo(start.x, start.y);

      for (let i = 1; i < pts.length; i++) {
        const t = i / (pts.length - 1);
        const p = this.getPointOnDendrite(dendrite, t, this.time);
        ctx.lineTo(p.x, p.y);
      }

      const alphaBase = dendrite.depth === 0 ? 0.7 : dendrite.depth === 1 ? 0.5 : 0.3;
      const flicker = this.displayScore > 65
        ? Math.sin(this.time * 5 + dendrite.phaseOffset) * 0.15
        : 0;

      ctx.strokeStyle = this.colorStr(color, alphaBase + flicker);
      ctx.lineWidth = dendrite.width * (1 - dendrite.depth * 0.2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    ctx.restore();

    // Spawn particles based on score
    const particleRate = 0.02 + this.displayScore * 0.005;
    if (Math.random() < particleRate) {
      this.spawnParticle();
    }

    // Update and draw particles
    ctx.save();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.burst) {
        // Burst particle
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= 0.02;
        p.alpha = p.life;

        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = this.colorStr(color, p.alpha * 0.8);
        ctx.shadowColor = this.colorStr(color, 0.8);
        ctx.shadowBlur = 8;
        ctx.fill();
      } else {
        // Dendrite particle
        p.t += p.speed;
        if (p.t >= 1) {
          this.particles.splice(i, 1);
          continue;
        }

        const pos = this.getPointOnDendrite(p.dendrite, p.t, this.time);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = this.colorStr(color, p.alpha * (1 - p.t * 0.5));
        ctx.shadowColor = this.colorStr(color, 0.6);
        ctx.shadowBlur = 6;
        ctx.fill();
      }
    }
    ctx.restore();

    // Cap particles
    if (this.particles.length > 80) {
      this.particles.splice(0, this.particles.length - 80);
    }

    // Draw soma (central cell body)
    const pulse = Math.sin(this.time * pulseSpeed * Math.PI) * 0.12 + 1;
    const somaR = this.somaRadius * pulse;

    ctx.save();
    ctx.shadowColor = this.colorStr(color, 0.8);
    ctx.shadowBlur = 20 + glowIntensity * 30;

    // Outer glow
    const somaGrad = ctx.createRadialGradient(
      this.centerX, this.centerY, somaR * 0.2,
      this.centerX, this.centerY, somaR * 1.5
    );
    somaGrad.addColorStop(0, this.colorStr(color, 0.9));
    somaGrad.addColorStop(0.5, this.colorStr(color, 0.4));
    somaGrad.addColorStop(1, this.colorStr(color, 0));
    ctx.fillStyle = somaGrad;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, somaR * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Core
    const coreGrad = ctx.createRadialGradient(
      this.centerX - somaR * 0.2, this.centerY - somaR * 0.2, 0,
      this.centerX, this.centerY, somaR
    );
    coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    coreGrad.addColorStop(0.3, this.colorStr(color, 0.9));
    coreGrad.addColorStop(1, this.colorStr(color, 0.6));
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, somaR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Firing animation at 95%+
    if (this.displayScore >= 95) {
      if (this.time - this.lastFireTime > this.fireInterval / 1000) {
        this.triggerFire();
        this.lastFireTime = this.time;
      }
    }

    // Update and draw shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha = 1 - (sw.radius - this.somaRadius) / (sw.maxRadius - this.somaRadius);

      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.colorStr(color, sw.alpha * 0.6);
      ctx.lineWidth = 2 + sw.alpha * 3;
      ctx.shadowColor = this.colorStr(color, sw.alpha * 0.4);
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }

    // Screen flash at 95%+ during fire
    if (this.shockwaves.length > 0 && this.displayScore >= 95) {
      const flashAlpha = this.shockwaves.reduce((max, sw) => Math.max(max, sw.alpha), 0);
      if (flashAlpha > 0.8) {
        ctx.fillStyle = this.colorStr(color, (flashAlpha - 0.8) * 0.3);
        ctx.fillRect(0, 0, this.width, this.height);
      }
    }

    requestAnimationFrame(this.animate);
  }

  destroy() {
    this.animating = false;
  }
}
