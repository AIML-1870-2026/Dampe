// Decision Neuron — Core Logic, Sliders & UI

// ─── Slider Configuration ──────────────────────────────────────────────

function formatTime(minutes) {
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours >= 24) hours -= 24;
  const period = hours >= 12 ? "PM" : "AM";
  let display = hours % 12;
  if (display === 0) display = 12;
  return `${display}:${mins.toString().padStart(2, "0")} ${period}`;
}

const EXERCISE_LABELS = ["None", "Light", "Moderate", "Intense"];
const ALCOHOL_LABELS = ["None", "One", "A Few", "Several"];
const SLEEP_DESIRE_LABELS = ["Fighting it", "Not really", "Neutral", "Getting there", "Ready to crash"];

const SLIDER_GROUPS = [
  {
    id: "schedule",
    title: "Schedule & Time",
    icon: "\u{1F4C5}",
    sliders: [
      {
        id: "currentTime", label: "Current Time", icon: "\u{1F570}",
        min: 1260, max: 1680, step: 15, default: 1380,
        format: formatTime,
      },
      {
        id: "wakeUpTime", label: "Wake-up Time", icon: "\u{23F0}",
        min: 300, max: 840, step: 15, default: 420,
        format: formatTime,
      },
      {
        id: "busynessTomorrow", label: "Busyness Tomorrow", icon: "\u{1F4CB}",
        min: 0, max: 100, step: 1, default: 50,
        format: v => `${v}%`,
      },
      {
        id: "assignmentUrgency", label: "Assignment Urgency", icon: "\u{1F4DA}",
        min: 0, max: 100, step: 1, default: 0,
        format: v => `${v}%`,
      },
    ],
  },
  {
    id: "physical",
    title: "Physical State",
    icon: "\u{1F4AA}",
    sliders: [
      {
        id: "physicalTiredness", label: "Physical Tiredness", icon: "\u{1F6CC}",
        min: 0, max: 100, step: 1, default: 50,
        format: v => `${v}%`,
      },
      {
        id: "mentalExhaustion", label: "Mental Exhaustion", icon: "\u{1F9E0}",
        min: 0, max: 100, step: 1, default: 50,
        format: v => `${v}%`,
      },
      {
        id: "exerciseToday", label: "Exercise Today", icon: "\u{1F3CB}",
        min: 0, max: 3, step: 1, default: 0,
        format: v => EXERCISE_LABELS[v],
      },
    ],
  },
  {
    id: "stimulants",
    title: "Stimulants",
    icon: "\u{2615}",
    sliders: [
      {
        id: "caffeineRecency", label: "Caffeine Recency", icon: "\u{23F1}",
        min: 0, max: 8, step: 0.5, default: 4,
        format: v => v === 0 ? "Just now" : `${v} hr${v !== 1 ? "s" : ""} ago`,
      },
      {
        id: "caffeineQuantity", label: "Caffeine Quantity", icon: "\u{1F375}",
        min: 0, max: 5, step: 1, default: 1,
        format: v => v === 0 ? "None" : `${v} drink${v > 1 ? "s" : ""}`,
      },
      {
        id: "alcoholConsumed", label: "Alcohol Consumed", icon: "\u{1F377}",
        min: 0, max: 3, step: 1, default: 0,
        format: v => ALCOHOL_LABELS[v],
      },
    ],
  },
  {
    id: "context",
    title: "Context & Honesty",
    icon: "\u{1F914}",
    sliders: [
      {
        id: "stressLevel", label: "Stress / Anxiety Level", icon: "\u{1F616}",
        min: 0, max: 100, step: 1, default: 30,
        format: v => `${v}%`,
      },
      {
        id: "productivity", label: "Are You Being Productive?", icon: "\u{1F4F1}",
        min: 0, max: 100, step: 1, default: 50,
        format: v => `${v}%`,
      },
      {
        id: "sleepDesire", label: "How Much Do You Want to Sleep?", icon: "\u{1F634}",
        min: 0, max: 4, step: 1, default: 2,
        format: v => SLEEP_DESIRE_LABELS[v],
      },
    ],
  },
];

// ─── State ──────────────────────────────────────────────────────────────

const state = {};
let neuron = null;
let currentMessage = "";
let convinceIndex = -1;
let convinceMessages = [];

// ─── Score Calculation ──────────────────────────────────────────────────

function calculateScore() {
  const currentTimeMin = state.currentTime;   // 1260–1680
  const wakeUpMin = state.wakeUpTime;         // 300–840

  // Available sleep hours
  let currentHour = currentTimeMin / 60;      // 21–28
  const wakeHour = wakeUpMin / 60;            // 5–14
  const availableSleep = wakeHour - currentHour + 24; // hours

  // Normalize each factor to 0–1

  // Available sleep: less sleep = higher (12+ hrs = 0, 2 hrs = 1)
  const sleepFactor = Math.max(0, Math.min(1, 1 - (availableSleep - 2) / 10));

  // Physical tiredness: direct map
  const tiredFactor = state.physicalTiredness / 100;

  // Mental exhaustion: direct map
  const mentalFactor = state.mentalExhaustion / 100;

  // Current time: later = higher (9PM=0, 4AM=1)
  const timeFactor = (currentTimeMin - 1260) / (1680 - 1260);

  // Busyness tomorrow: direct map
  const busyFactor = state.busynessTomorrow / 100;

  // Assignment urgency: direct map
  const urgencyFactor = state.assignmentUrgency / 100;

  // Caffeine recency: longer ago = higher (just now=0, 8hrs=1)
  const cafRecencyFactor = state.caffeineRecency / 8;

  // Caffeine quantity: more = lower (0 drinks=1, 5=0)
  const cafQuantityFactor = 1 - state.caffeineQuantity / 5;

  // Stress: direct map
  const stressFactor = state.stressLevel / 100;

  // Productivity: less productive = higher (0%=1, 100%=0)
  const prodFactor = 1 - state.productivity / 100;

  // Exercise: more exercise = more physically tired = higher score
  const exerciseMap = [0, 0.33, 0.67, 1.0];
  const exerciseFactor = exerciseMap[state.exerciseToday];

  // Alcohol: more = higher (None=0, Several=1)
  const alcoholFactor = state.alcoholConsumed / 3;

  // Sleep desire: more ready = higher (0=0, 4=1)
  const desireFactor = state.sleepDesire / 4;

  // Weighted sum
  let score =
    sleepFactor   * 25 +
    tiredFactor   * 15 +
    mentalFactor  * 12 +
    timeFactor    * 10 +
    busyFactor    * 8 +
    urgencyFactor * 8 +
    cafRecencyFactor  * 7 +
    cafQuantityFactor * 5 +
    stressFactor  * 5 +
    prodFactor    * 5 +
    exerciseFactor * 3 +
    alcoholFactor * 3 +
    desireFactor  * 2;

  // Special rules
  // Past 2 AM bonus (+15%)
  if (currentTimeMin >= 1560) { // 26*60 = 1560 = 2:00 AM
    score += 15;
  }

  // Available sleep < 5 hours (+10%)
  if (availableSleep < 5) {
    score += 10;
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  return { score, availableSleep };
}

// ─── UI Updates ─────────────────────────────────────────────────────────

function getAccentColor(score) {
  if (score <= 40) return "#6b8cff";
  if (score <= 65) return "#50d0a0";
  if (score <= 80) return "#f0c040";
  if (score <= 94) return "#ff6030";
  return "#ff4444";
}

function updateDisplay() {
  const { score, availableSleep } = calculateScore();
  const band = getToneBand(score);
  const accent = getAccentColor(score);

  // Update neuron
  if (neuron) {
    neuron.setScore(score);
  }

  // Score display
  const scoreEl = document.getElementById("score-value");
  scoreEl.textContent = Math.round(score);
  scoreEl.style.color = accent;
  document.querySelector(".score-percent").style.color = accent;

  // Verdict label
  const verdictLabel = document.getElementById("verdict-label");
  verdictLabel.textContent = VERDICT_LABELS[band];
  verdictLabel.style.color = accent;

  // Verdict message — only change if band changed
  const prevBand = verdictLabel.dataset.band;
  if (prevBand !== band) {
    verdictLabel.dataset.band = band;
    currentMessage = getRandomMessage(band);
    const msgEl = document.getElementById("verdict-message");
    msgEl.style.opacity = 0;
    setTimeout(() => {
      msgEl.textContent = currentMessage;
      msgEl.style.opacity = 1;
    }, 200);
  }

  // Convince me messages — regenerate pool
  const convinceState = {
    availableSleep,
    caffeineQuantity: state.caffeineQuantity,
    caffeineRecency: state.caffeineRecency,
    busynessTomorrow: state.busynessTomorrow,
    mentalExhaustion: state.mentalExhaustion,
    stressLevel: state.stressLevel,
    physicalTiredness: state.physicalTiredness,
  };
  convinceMessages = getConvinceMeMessage(convinceState);

  // Available sleep display
  const sleepInfo = document.getElementById("sleep-info");
  if (sleepInfo) {
    sleepInfo.textContent = `${availableSleep.toFixed(1)} hrs of sleep available`;
    sleepInfo.style.color = availableSleep < 5 ? "#ff4444" : availableSleep < 7 ? "#f0c040" : "#6b8cff";
  }

  // Update slider track fills and accent
  document.documentElement.style.setProperty("--accent", accent);
  updateSliderTracks(accent);
}

function updateSliderTracks(accent) {
  if (!accent) {
    accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
  }
  const sliders = document.querySelectorAll('input[type="range"]');

  sliders.forEach(slider => {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`;
  });
}

// ─── Slider Rendering ───────────────────────────────────────────────────

function renderSliders() {
  const container = document.getElementById("sliders-container");

  SLIDER_GROUPS.forEach(group => {
    const groupEl = document.createElement("div");
    groupEl.className = "slider-group";

    const header = document.createElement("div");
    header.className = "slider-group-header";
    header.innerHTML = `
      <span class="group-icon">${group.icon}</span>
      <span class="group-title">${group.title}</span>
      <span class="group-chevron">\u25BC</span>
    `;
    header.addEventListener("click", () => {
      groupEl.classList.toggle("collapsed");
    });

    const body = document.createElement("div");
    body.className = "slider-group-body";

    group.sliders.forEach(config => {
      state[config.id] = config.default;

      const row = document.createElement("div");
      row.className = "slider-row";

      const labelRow = document.createElement("div");
      labelRow.className = "slider-label-row";
      labelRow.innerHTML = `
        <span class="slider-icon">${config.icon}</span>
        <span class="slider-label">${config.label}</span>
        <span class="slider-value" id="val-${config.id}">${config.format(config.default)}</span>
      `;

      const input = document.createElement("input");
      input.type = "range";
      input.id = `slider-${config.id}`;
      input.min = config.min;
      input.max = config.max;
      input.step = config.step;
      input.value = config.default;

      input.addEventListener("input", () => {
        const val = parseFloat(input.value);
        state[config.id] = val;
        document.getElementById(`val-${config.id}`).textContent = config.format(val);
        updateDisplay();
      });

      row.appendChild(labelRow);
      row.appendChild(input);
      body.appendChild(row);
    });

    groupEl.appendChild(header);
    groupEl.appendChild(body);
    container.appendChild(groupEl);
  });
}

// ─── Convince Me Button ─────────────────────────────────────────────────

function setupConvinceButton() {
  const btn = document.getElementById("convince-btn");
  const msgEl = document.getElementById("convince-message");

  btn.addEventListener("click", () => {
    if (convinceMessages.length === 0) return;

    convinceIndex = (convinceIndex + 1) % convinceMessages.length;
    const msg = convinceMessages[convinceIndex];

    // Fade out current message
    msgEl.style.opacity = 0;
    setTimeout(() => {
      msgEl.textContent = msg;
      // Ensure element is visible and force reflow before fading in
      msgEl.style.display = "block";
      msgEl.offsetHeight; // force reflow
      msgEl.style.opacity = 1;
    }, 200);

    // Button animation
    btn.classList.add("clicked");
    setTimeout(() => btn.classList.remove("clicked"), 300);
  });
}

// ─── Initialization ─────────────────────────────────────────────────────

function init() {
  renderSliders();

  // Init neuron animation
  const canvas = document.getElementById("neuron-canvas");
  neuron = new NeuronAnimation(canvas);

  // Handle resize — keep dendrites, just update canvas dimensions
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      neuron.resize();
    }, 100);
  });

  setupConvinceButton();

  // Initial calculation and display
  updateDisplay();
}

document.addEventListener("DOMContentLoaded", init);
