window.TuringApp = window.TuringApp || {};

TuringApp.Simulation = class {
    constructor(canvas) {
        this.canvas = canvas;
        const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
        if (!gl) {
            throw new Error('WebGL2 is not supported in your browser.');
        }
        this.gl = gl;

        const extFloat = gl.getExtension('EXT_color_buffer_float');
        if (!extFloat) {
            throw new Error('EXT_color_buffer_float extension not supported.');
        }
        gl.getExtension('OES_texture_float_linear');

        this.gridWidth = 256;
        this.gridHeight = 256;

        this.params = {
            feed: 0.055,
            kill: 0.062,
            da: 1.0,
            db: 0.5,
            dt: 1.0
        };

        this.mouseActive = false;
        this.mouseX = -1;
        this.mouseY = -1;
        this.brushRadius = 10;

        this.currentBuffer = 0;

        this._initShaders();
        this._initGeometry();
        this._createSimulationResources();
        this._createColorLUT('plasma');
        this.reset('random');
    }

    // ──── Shader Sources ────

    get _vertexShaderSource() {
        return `#version 300 es
        in vec2 aPosition;
        out vec2 vUv;
        void main() {
            vUv = aPosition * 0.5 + 0.5;
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }`;
    }

    get _computeShaderSource() {
        return `#version 300 es
        precision highp float;

        uniform sampler2D uState;
        uniform vec2 uTexelSize;
        uniform float uFeed;
        uniform float uKill;
        uniform float uDa;
        uniform float uDb;
        uniform float uDt;
        uniform vec2 uMousePos;
        uniform float uBrushRadius;
        uniform float uMouseActive;

        in vec2 vUv;
        out vec4 fragColor;

        void main() {
            vec2 dx = vec2(uTexelSize.x, 0.0);
            vec2 dy = vec2(0.0, uTexelSize.y);

            vec2 st = texture(uState, vUv).rg;
            float u = st.r;
            float v = st.g;

            // 9-point Laplacian stencil (more isotropic)
            vec2 sL  = texture(uState, vUv - dx).rg;
            vec2 sR  = texture(uState, vUv + dx).rg;
            vec2 sU  = texture(uState, vUv + dy).rg;
            vec2 sD  = texture(uState, vUv - dy).rg;
            vec2 sUL = texture(uState, vUv - dx + dy).rg;
            vec2 sUR = texture(uState, vUv + dx + dy).rg;
            vec2 sDL = texture(uState, vUv - dx - dy).rg;
            vec2 sDR = texture(uState, vUv + dx - dy).rg;

            vec2 laplacian = 0.2 * (sL + sR + sU + sD)
                           + 0.05 * (sUL + sUR + sDL + sDR)
                           - 1.0 * st;

            float uvv = u * v * v;
            float du = uDa * laplacian.r - uvv + uFeed * (1.0 - u);
            float dv = uDb * laplacian.g + uvv - (uFeed + uKill) * v;

            float newU = u + du * uDt;
            float newV = v + dv * uDt;

            // Mouse interaction: add chemical B
            if (uMouseActive > 0.5) {
                vec2 fragPixel = vUv / uTexelSize;
                float dist = distance(fragPixel, uMousePos);
                if (dist < uBrushRadius) {
                    float strength = smoothstep(uBrushRadius, 0.0, dist);
                    newV = mix(newV, 1.0, strength * 0.8);
                    newU = mix(newU, 0.0, strength * 0.5);
                }
            }

            fragColor = vec4(clamp(newU, 0.0, 1.0), clamp(newV, 0.0, 1.0), 0.0, 1.0);
        }`;
    }

    get _renderShaderSource() {
        return `#version 300 es
        precision highp float;

        uniform sampler2D uState;
        uniform sampler2D uColorLUT;

        in vec2 vUv;
        out vec4 fragColor;

        void main() {
            float v = texture(uState, vUv).g;
            float t = clamp(v * 2.5, 0.0, 1.0);
            vec3 color = texture(uColorLUT, vec2(t, 0.5)).rgb;
            fragColor = vec4(color, 1.0);
        }`;
    }

    // ──── Initialization ────

    _initShaders() {
        const gl = this.gl;

        this.computeProgram = this._createProgram(
            this._vertexShaderSource,
            this._computeShaderSource
        );
        this.computeUniforms = {
            uState:       gl.getUniformLocation(this.computeProgram, 'uState'),
            uTexelSize:   gl.getUniformLocation(this.computeProgram, 'uTexelSize'),
            uFeed:        gl.getUniformLocation(this.computeProgram, 'uFeed'),
            uKill:        gl.getUniformLocation(this.computeProgram, 'uKill'),
            uDa:          gl.getUniformLocation(this.computeProgram, 'uDa'),
            uDb:          gl.getUniformLocation(this.computeProgram, 'uDb'),
            uDt:          gl.getUniformLocation(this.computeProgram, 'uDt'),
            uMousePos:    gl.getUniformLocation(this.computeProgram, 'uMousePos'),
            uBrushRadius: gl.getUniformLocation(this.computeProgram, 'uBrushRadius'),
            uMouseActive: gl.getUniformLocation(this.computeProgram, 'uMouseActive'),
        };

        this.renderProgram = this._createProgram(
            this._vertexShaderSource,
            this._renderShaderSource
        );
        this.renderUniforms = {
            uState:    gl.getUniformLocation(this.renderProgram, 'uState'),
            uColorLUT: gl.getUniformLocation(this.renderProgram, 'uColorLUT'),
        };
    }

    _createProgram(vertSrc, fragSrc) {
        const gl = this.gl;
        const vert = this._compileShader(gl.VERTEX_SHADER, vertSrc);
        const frag = this._compileShader(gl.FRAGMENT_SHADER, fragSrc);

        const program = gl.createProgram();
        gl.attachShader(program, vert);
        gl.attachShader(program, frag);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const log = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('Program link failed: ' + log);
        }

        gl.deleteShader(vert);
        gl.deleteShader(frag);
        return program;
    }

    _compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('Shader compile failed: ' + log);
        }

        return shader;
    }

    _initGeometry() {
        const gl = this.gl;

        const vertices = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1,
        ]);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const posLoc = gl.getAttribLocation(this.computeProgram, 'aPosition');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindVertexArray(null);
    }

    _createSimulationResources() {
        this.stateTextures = [
            this._createStateTexture(),
            this._createStateTexture(),
        ];

        this.framebuffers = [
            this._createFramebuffer(this.stateTextures[0]),
            this._createFramebuffer(this.stateTextures[1]),
        ];
    }

    _createStateTexture() {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F,
            this.gridWidth, this.gridHeight, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        return tex;
    }

    _createFramebuffer(texture) {
        const gl = this.gl;
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D, texture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw new Error('Framebuffer not complete: ' + status);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return fb;
    }

    _createColorLUT(schemeName) {
        const gl = this.gl;
        const scheme = TuringApp.COLOR_SCHEMES[schemeName];
        if (!scheme) return;

        const data = this._generateGradient(scheme.stops, 256);

        if (!this.colorLUTTexture) {
            this.colorLUTTexture = gl.createTexture();
        }

        gl.bindTexture(gl.TEXTURE_2D, this.colorLUTTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    _generateGradient(hexStops, size) {
        const stops = hexStops.map(hex => this._hexToRGB(hex));
        const data = new Uint8Array(size * 4);

        for (let i = 0; i < size; i++) {
            const t = i / (size - 1);
            const segCount = stops.length - 1;
            const seg = Math.min(Math.floor(t * segCount), segCount - 1);
            const localT = t * segCount - seg;

            const c1 = stops[seg];
            const c2 = stops[seg + 1];

            data[i * 4 + 0] = Math.round(c1[0] + (c2[0] - c1[0]) * localT);
            data[i * 4 + 1] = Math.round(c1[1] + (c2[1] - c1[1]) * localT);
            data[i * 4 + 2] = Math.round(c1[2] + (c2[2] - c1[2]) * localT);
            data[i * 4 + 3] = 255;
        }

        return data;
    }

    _hexToRGB(hex) {
        return [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16),
        ];
    }

    // ──── State Management ────

    reset(initType) {
        initType = initType || 'random';
        const gl = this.gl;
        const w = this.gridWidth;
        const h = this.gridHeight;
        const data = new Float32Array(w * h * 4);

        // Fill with u=1, v=0
        for (let i = 0; i < w * h; i++) {
            data[i * 4]     = 1.0;
            data[i * 4 + 1] = 0.0;
            data[i * 4 + 2] = 0.0;
            data[i * 4 + 3] = 1.0;
        }

        if (initType === 'random') {
            const numSeeds = 15 + Math.floor(Math.random() * 10);
            for (let s = 0; s < numSeeds; s++) {
                const cx = Math.floor(Math.random() * w);
                const cy = Math.floor(Math.random() * h);
                const size = 3 + Math.floor(Math.random() * 8);
                this._addSeed(data, w, h, cx, cy, size);
            }
        } else if (initType === 'center') {
            this._addSeed(data, w, h, Math.floor(w / 2), Math.floor(h / 2), 15);
        } else if (initType === 'multi') {
            const spots = [
                [0.25, 0.25], [0.75, 0.25], [0.5, 0.5],
                [0.25, 0.75], [0.75, 0.75],
                [0.5, 0.25],  [0.5, 0.75],
                [0.25, 0.5],  [0.75, 0.5],
            ];
            for (const [fx, fy] of spots) {
                this._addSeed(data, w, h,
                    Math.floor(fx * w), Math.floor(fy * h), 8);
            }
        }

        for (let i = 0; i < 2; i++) {
            gl.bindTexture(gl.TEXTURE_2D, this.stateTextures[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0,
                gl.RGBA, gl.FLOAT, data);
        }

        this.currentBuffer = 0;
    }

    _addSeed(data, w, h, cx, cy, radius) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    const x = ((cx + dx) % w + w) % w;
                    const y = ((cy + dy) % h + h) % h;
                    const idx = (y * w + x) * 4;
                    const noise = 0.9 + Math.random() * 0.1;
                    data[idx]     = 0.5 * noise;
                    data[idx + 1] = 0.25 * noise;
                }
            }
        }
    }

    // ──── Simulation Step ────

    step() {
        const gl = this.gl;
        const src = this.currentBuffer;
        const dst = 1 - src;

        gl.useProgram(this.computeProgram);
        gl.bindVertexArray(this.vao);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.stateTextures[src]);
        gl.uniform1i(this.computeUniforms.uState, 0);

        gl.uniform2f(this.computeUniforms.uTexelSize,
            1.0 / this.gridWidth, 1.0 / this.gridHeight);
        gl.uniform1f(this.computeUniforms.uFeed, this.params.feed);
        gl.uniform1f(this.computeUniforms.uKill, this.params.kill);
        gl.uniform1f(this.computeUniforms.uDa, this.params.da);
        gl.uniform1f(this.computeUniforms.uDb, this.params.db);
        gl.uniform1f(this.computeUniforms.uDt, this.params.dt);
        gl.uniform2f(this.computeUniforms.uMousePos, this.mouseX, this.mouseY);
        gl.uniform1f(this.computeUniforms.uBrushRadius, this.brushRadius);
        gl.uniform1f(this.computeUniforms.uMouseActive,
            this.mouseActive ? 1.0 : 0.0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[dst]);
        gl.viewport(0, 0, this.gridWidth, this.gridHeight);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.currentBuffer = dst;
    }

    render() {
        const gl = this.gl;

        gl.useProgram(this.renderProgram);
        gl.bindVertexArray(this.vao);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.stateTextures[this.currentBuffer]);
        gl.uniform1i(this.renderUniforms.uState, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.colorLUTTexture);
        gl.uniform1i(this.renderUniforms.uColorLUT, 1);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // ──── Configuration ────

    setGridSize(width, height) {
        if (width === this.gridWidth && height === this.gridHeight) return;

        const gl = this.gl;
        this.stateTextures.forEach(t => gl.deleteTexture(t));
        this.framebuffers.forEach(f => gl.deleteFramebuffer(f));

        this.gridWidth = width;
        this.gridHeight = height;

        // Scale brush radius proportionally
        this.brushRadius = Math.round(10 * (width / 256));

        this._createSimulationResources();
    }

    setColorScheme(schemeName) {
        this._createColorLUT(schemeName);
    }

    setCustomColors(hexColors) {
        const gl = this.gl;
        const data = this._generateGradient(hexColors, 256);

        if (!this.colorLUTTexture) {
            this.colorLUTTexture = gl.createTexture();
        }

        gl.bindTexture(gl.TEXTURE_2D, this.colorLUTTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, data);
    }

    setMouse(active, x, y) {
        this.mouseActive = active;
        if (active) {
            this.mouseX = x;
            this.mouseY = y;
        }
    }

    resizeCanvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
    }
};
