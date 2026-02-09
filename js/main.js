window.TuringApp = window.TuringApp || {};

(function () {
    'use strict';

    const BASE_STEPS_PER_FRAME = 8;

    function init() {
        const canvas = document.getElementById('simulation-canvas');
        const errorEl = document.getElementById('error-message');

        let sim;
        try {
            sim = new TuringApp.Simulation(canvas);
        } catch (e) {
            if (errorEl) {
                errorEl.textContent = e.message;
                errorEl.style.display = 'block';
            }
            console.error('Simulation init failed:', e);
            return;
        }

        const app = {
            playing: true,
            speed: 1.0,
            stepsPerFrame: BASE_STEPS_PER_FRAME,
            simulation: sim,
        };

        const controls = new TuringApp.Controls(sim, app);

        // ── Canvas Resize ──

        function resizeCanvas() {
            const container = canvas.parentElement;
            const rect = container.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = Math.floor(rect.width * dpr);
            const h = Math.floor(rect.height * dpr);
            if (canvas.width !== w || canvas.height !== h) {
                sim.resizeCanvas(w, h);
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
            }
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        // ── FPS Counter ──

        const fpsEl = document.getElementById('fps-counter');
        let frameCount = 0;
        let lastFpsTime = performance.now();

        function updateFPS() {
            frameCount++;
            const now = performance.now();
            if (now - lastFpsTime >= 1000) {
                if (fpsEl) fpsEl.textContent = frameCount + ' FPS';
                frameCount = 0;
                lastFpsTime = now;
            }
        }

        // ── Animation Loop ──

        function animate() {
            if (app.playing) {
                const steps = Math.max(1,
                    Math.round(app.stepsPerFrame * app.speed));
                for (let i = 0; i < steps; i++) {
                    sim.step();
                }
            }

            sim.render();
            updateFPS();
            requestAnimationFrame(animate);
        }

        // Start
        requestAnimationFrame(animate);
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
