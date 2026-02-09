window.TuringApp = window.TuringApp || {};

TuringApp.PRESETS = {
    spots:     { name: 'Spots',     feed: 0.055, kill: 0.062, da: 1.0, db: 0.5, desc: 'Stable circular spots' },
    stripes:   { name: 'Stripes',   feed: 0.035, kill: 0.060, da: 1.0, db: 0.5, desc: 'Parallel stripe patterns' },
    spirals:   { name: 'Spirals',   feed: 0.030, kill: 0.055, da: 1.0, db: 0.5, desc: 'Rotating spiral waves' },
    coral:     { name: 'Coral',     feed: 0.055, kill: 0.059, da: 1.0, db: 0.5, desc: 'Branching coral-like growth' },
    labyrinth: { name: 'Labyrinth', feed: 0.029, kill: 0.057, da: 1.0, db: 0.5, desc: 'Maze-like structures' },
    waves:     { name: 'Waves',     feed: 0.014, kill: 0.054, da: 1.0, db: 0.5, desc: 'Pulsating wave patterns' },
};

TuringApp.COLOR_SCHEMES = {
    ocean:      { name: 'Ocean',      stops: ['#001133', '#0055AA', '#00DDFF'] },
    fire:       { name: 'Fire',       stops: ['#000000', '#AA0000', '#FF5500', '#FFFF00'] },
    plasma:     { name: 'Plasma',     stops: ['#220055', '#AA0055', '#FF00AA', '#FFAA00'] },
    forest:     { name: 'Forest',     stops: ['#002200', '#005500', '#00AA00', '#AAFF00'] },
    monochrome: { name: 'Monochrome', stops: ['#000000', '#888888', '#FFFFFF'] },
    neon:       { name: 'Neon',       stops: ['#000022', '#FF00FF', '#00FFFF'] },
};

TuringApp.GRID_SIZES = {
    small:  { name: 'Small (256x256)',    width: 256,  height: 256 },
    medium: { name: 'Medium (512x512)',   width: 512,  height: 512 },
    large:  { name: 'Large (1024x1024)',  width: 1024, height: 1024 },
};

TuringApp.INIT_PATTERNS = {
    random: 'Random Seeds',
    center: 'Single Spot',
    multi:  'Multiple Spots',
};
