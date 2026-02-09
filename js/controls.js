window.TuringApp = window.TuringApp || {};

TuringApp.Controls = class {
    constructor(simulation, app) {
        this.sim = simulation;
        this.app = app;
        this.currentPreset = 'spots';
        this.currentScheme = 'plasma';
        this.initPattern = 'random';
        this.paintMode = true;

        this._bindPresets();
        this._bindPlayback();
        this._bindParameters();
        this._bindColorSchemes();
        this._bindCanvasSettings();
        this._bindCollapsibles();
        this._bindCanvasMouse();
        this._bindScreenshot();
        this._initPhaseDiagram();

        // Set initial preset
        this.applyPreset('spots');
    }

    // ──── Presets ────

    _bindPresets() {
        const btns = document.querySelectorAll('.preset-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyPreset(preset);
            });
        });
    }

    applyPreset(name) {
        const preset = TuringApp.PRESETS[name];
        if (!preset) return;

        this.currentPreset = name;

        // Update simulation parameters
        this.sim.params.feed = preset.feed;
        this.sim.params.kill = preset.kill;
        this.sim.params.da = preset.da;
        this.sim.params.db = preset.db;

        // Update sliders
        this._setSlider('feed', preset.feed);
        this._setSlider('kill', preset.kill);
        this._setSlider('da', preset.da);
        this._setSlider('db', preset.db);

        // Update active button
        document.querySelectorAll('.preset-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.preset === name));

        // Reset simulation with current init pattern
        this.sim.reset(this.initPattern);

        // Update phase diagram
        this._updatePhaseDiagram();
    }

    _setSlider(id, value) {
        const slider = document.getElementById(id);
        const display = document.getElementById(id + '-value');
        if (slider) slider.value = value;
        if (display) display.textContent = value.toFixed(3);
    }

    // ──── Playback ────

    _bindPlayback() {
        const playBtn = document.getElementById('play-pause');
        const stepBtn = document.getElementById('step');
        const resetBtn = document.getElementById('reset');
        const speedSlider = document.getElementById('speed');
        const speedDisplay = document.getElementById('speed-value');

        playBtn.addEventListener('click', () => {
            this.app.playing = !this.app.playing;
            playBtn.textContent = this.app.playing ? 'Pause' : 'Play';
            playBtn.classList.toggle('playing', this.app.playing);
        });

        stepBtn.addEventListener('click', () => {
            if (!this.app.playing) {
                this.sim.step();
                this.sim.render();
            }
        });

        resetBtn.addEventListener('click', () => {
            this.sim.reset(this.initPattern);
        });

        speedSlider.addEventListener('input', () => {
            this.app.speed = parseFloat(speedSlider.value);
            speedDisplay.textContent = this.app.speed + 'x';
        });
    }

    // ──── Parameters ────

    _bindParameters() {
        this._bindSlider('feed', val => {
            this.sim.params.feed = val;
            this._updatePhaseDiagram();
        });
        this._bindSlider('kill', val => {
            this.sim.params.kill = val;
            this._updatePhaseDiagram();
        });
        this._bindSlider('da', val => {
            this.sim.params.da = val;
        });
        this._bindSlider('db', val => {
            this.sim.params.db = val;
        });
    }

    _bindSlider(id, onChange) {
        const slider = document.getElementById(id);
        const display = document.getElementById(id + '-value');
        if (!slider) return;

        slider.addEventListener('input', () => {
            const val = parseFloat(slider.value);
            if (display) display.textContent = val.toFixed(3);
            onChange(val);
        });
    }

    // ──── Color Schemes ────

    _bindColorSchemes() {
        const btns = document.querySelectorAll('.scheme-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                const scheme = btn.dataset.scheme;
                this.currentScheme = scheme;
                this.sim.setColorScheme(scheme);

                document.querySelectorAll('.scheme-btn').forEach(b =>
                    b.classList.toggle('active', b.dataset.scheme === scheme));
            });
        });

        // Custom color inputs
        const c1 = document.getElementById('custom-color-1');
        const c2 = document.getElementById('custom-color-2');
        if (c1 && c2) {
            const applyCustom = () => {
                this.sim.setCustomColors([c1.value, c2.value]);
                document.querySelectorAll('.scheme-btn').forEach(b =>
                    b.classList.remove('active'));
            };
            c1.addEventListener('input', applyCustom);
            c2.addEventListener('input', applyCustom);
        }
    }

    // ──── Canvas Settings ────

    _bindCanvasSettings() {
        const gridSelect = document.getElementById('grid-size');
        if (gridSelect) {
            gridSelect.addEventListener('change', () => {
                const size = TuringApp.GRID_SIZES[gridSelect.value];
                if (size) {
                    this.sim.setGridSize(size.width, size.height);
                    this.sim.reset(this.initPattern);
                }
            });
        }

        const initSelect = document.getElementById('init-pattern');
        if (initSelect) {
            initSelect.addEventListener('change', () => {
                this.initPattern = initSelect.value;
            });
        }
    }

    // ──── Collapsible Sections ────

    _bindCollapsibles() {
        document.querySelectorAll('.collapsible-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const section = toggle.closest('.collapsible');
                section.classList.toggle('collapsed');
            });
        });
    }

    // ──── Canvas Mouse Interaction ────

    _bindCanvasMouse() {
        const canvas = this.sim.canvas;
        let isDown = false;

        const getGridPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const uvX = (e.clientX - rect.left) / rect.width;
            const uvY = 1.0 - (e.clientY - rect.top) / rect.height;
            return {
                x: uvX * this.sim.gridWidth,
                y: uvY * this.sim.gridHeight,
            };
        };

        canvas.addEventListener('mousedown', (e) => {
            if (!this.paintMode) return;
            isDown = true;
            const pos = getGridPos(e);
            this.sim.setMouse(true, pos.x, pos.y);
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDown || !this.paintMode) return;
            const pos = getGridPos(e);
            this.sim.setMouse(true, pos.x, pos.y);
        });

        const stopPaint = () => {
            isDown = false;
            this.sim.setMouse(false, -1, -1);
        };
        canvas.addEventListener('mouseup', stopPaint);
        canvas.addEventListener('mouseleave', stopPaint);

        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            if (!this.paintMode) return;
            e.preventDefault();
            isDown = true;
            const touch = e.touches[0];
            const pos = getGridPos(touch);
            this.sim.setMouse(true, pos.x, pos.y);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if (!isDown || !this.paintMode) return;
            e.preventDefault();
            const touch = e.touches[0];
            const pos = getGridPos(touch);
            this.sim.setMouse(true, pos.x, pos.y);
        }, { passive: false });

        canvas.addEventListener('touchend', stopPaint);
        canvas.addEventListener('touchcancel', stopPaint);
    }

    // ──── Screenshot ────

    _bindScreenshot() {
        const btn = document.getElementById('screenshot');
        if (!btn) return;

        btn.addEventListener('click', () => {
            // Need to render first to make sure canvas has current frame
            this.sim.render();
            const link = document.createElement('a');
            link.download = 'turing-pattern.png';
            link.href = this.sim.canvas.toDataURL('image/png');
            link.click();
        });
    }

    // ──── Phase Diagram ────

    _initPhaseDiagram() {
        this.phaseCanvas = document.getElementById('phase-diagram');
        if (!this.phaseCanvas) return;
        this.phaseCtx = this.phaseCanvas.getContext('2d');
        this._updatePhaseDiagram();
    }

    _updatePhaseDiagram() {
        const canvas = this.phaseCanvas;
        const ctx = this.phaseCtx;
        if (!canvas || !ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        const pad = 30;

        // Parameter ranges
        const fMin = 0.01, fMax = 0.10;
        const kMin = 0.03, kMax = 0.07;

        const toX = f => pad + (f - fMin) / (fMax - fMin) * (w - 2 * pad);
        const toY = k => h - pad - (k - kMin) / (kMax - kMin) * (h - 2 * pad);

        // Clear
        ctx.fillStyle = '#0f0f24';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#1a1a3a';
        ctx.lineWidth = 1;
        for (let f = 0.02; f <= 0.09; f += 0.01) {
            ctx.beginPath();
            ctx.moveTo(toX(f), pad);
            ctx.lineTo(toX(f), h - pad);
            ctx.stroke();
        }
        for (let k = 0.035; k <= 0.065; k += 0.005) {
            ctx.beginPath();
            ctx.moveTo(pad, toY(k));
            ctx.lineTo(w - pad, toY(k));
            ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = '#444466';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad, pad);
        ctx.lineTo(pad, h - pad);
        ctx.lineTo(w - pad, h - pad);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#8888aa';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Feed Rate (F)', w / 2, h - 4);
        ctx.save();
        ctx.translate(10, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Kill Rate (k)', 0, 0);
        ctx.restore();

        // Preset dots
        const presets = TuringApp.PRESETS;
        for (const [key, p] of Object.entries(presets)) {
            const x = toX(p.feed);
            const y = toY(p.kill);
            const isActive = key === this.currentPreset;

            ctx.beginPath();
            ctx.arc(x, y, isActive ? 5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = isActive ? '#6366f1' : '#555577';
            ctx.fill();

            ctx.fillStyle = '#aaaacc';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(p.name, x, y - 8);
        }

        // Current position (if different from preset)
        const cx = toX(this.sim.params.feed);
        const cy = toY(this.sim.params.kill);

        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
};
