'use strict';

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */
const API_KEY  = '14bfc32eea2b1c2859414939dd688455';
const BASE_URL = 'https://api.openweathermap.org';

/* ─────────────────────────────────────────────
   State
───────────────────────────────────────────── */
const state = {
  selectedCity:   null,   // { name, lat, lon, country, state }
  currentWeather: null,   // raw API response — always metric
  forecast:       null,   // raw API response — always metric
  tempUnit:       'C',    // 'C' | 'F'
  windUnit:       'ms',   // 'ms' | 'mph' | 'kts'
  visUnit:        'km',   // 'km' | 'mi'
  clockUnit:      '24',   // '24' | '12'
  recentSearches: [],     // max 5
  isLoading:      false,
};

/* ─────────────────────────────────────────────
   DOM refs
───────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const dom = {
  header:        $('header'),
  searchInput:   $('searchInput'),
  searchClear:   $('searchClear'),
  searchDropdown:$('searchDropdown'),
  recentWrap:    $('recentWrap'),
  recentChips:   $('recentChips'),
  loadingState:  $('loadingState'),
  errorState:    $('errorState'),
  errorMsg:      $('errorMsg'),
  retryBtn:      $('retryBtn'),
  main:          $('main'),
  // current
  cityName:      $('cityName'),
  citySub:       $('citySub'),
  conditionIcon: $('conditionIcon'),
  conditionDesc: $('conditionDesc'),
  localTime:     $('localTime'),
  localDate:     $('localDate'),
  tempValue:     $('tempValue'),
  tempUnit:      $('tempUnit'),
  feelsLike:     $('feelsLike'),
  humidity:      $('humidity'),
  wind:          $('wind'),
  visibility:    $('visibility'),
  pressure:      $('pressure'),
  sunrise:       $('sunrise'),
  sunset:        $('sunset'),
  // forecast
  forecastStrip: $('forecastStrip'),
};

/* ─────────────────────────────────────────────
   Utilities
───────────────────────────────────────────── */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/** Format unix timestamp + tz offset into HH:MM (24h or 12h) */
function formatTime(unix, tzOffsetSeconds) {
  const d = new Date((unix + tzOffsetSeconds) * 1000);
  const hours24 = d.getUTCHours();
  const mins    = d.getUTCMinutes().toString().padStart(2, '0');
  if (state.clockUnit === '12') {
    const period = hours24 >= 12 ? 'PM' : 'AM';
    const h12    = hours24 % 12 || 12;
    return `${h12}:${mins} ${period}`;
  }
  return `${hours24.toString().padStart(2, '0')}:${mins}`;
}

/** Format unix timestamp + tz offset into a full date string */
function formatDate(unix, tzOffsetSeconds) {
  const d = new Date((unix + tzOffsetSeconds) * 1000);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/* ─────────────────────────────────────────────
   Unit conversions (API always returns metric)
───────────────────────────────────────────── */
function convertTemp(celsius) {
  return state.tempUnit === 'F' ? (celsius * 9 / 5) + 32 : celsius;
}

function tempLabel() {
  return state.tempUnit === 'F' ? '°F' : '°C';
}

function convertWind(ms) {
  if (state.windUnit === 'mph') return { val: ms * 2.23694, label: 'mph' };
  if (state.windUnit === 'kts') return { val: ms * 1.94384, label: 'kts' };
  return { val: ms, label: 'm/s' };
}

function convertVis(meters) {
  if (state.visUnit === 'mi') return { val: meters / 1609.34, label: 'mi' };
  return { val: meters / 1000, label: 'km' };
}

/** ISO country code → full country name */
function countryName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch { return code; }
}

/** Animate a number counting up */
function countUp(el, target, decimals = 0, duration = 600) {
  const start = performance.now();
  const from  = 0;
  const step  = now => {
    const progress = Math.min((now - start) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const val      = from + (target - from) * ease;
    el.textContent = val.toFixed(decimals);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toFixed(decimals);
  };
  requestAnimationFrame(step);
}

/* ─────────────────────────────────────────────
   Persistence
───────────────────────────────────────────── */
function loadStorage() {
  try {
    state.tempUnit  = localStorage.getItem('atmos_tempUnit')  || 'C';
    state.windUnit  = localStorage.getItem('atmos_windUnit')  || 'ms';
    state.visUnit   = localStorage.getItem('atmos_visUnit')   || 'km';
    state.clockUnit = localStorage.getItem('atmos_clockUnit') || '24';
    const raw = localStorage.getItem('atmos_recent');
    state.recentSearches = raw ? JSON.parse(raw) : [];
  } catch { /* ignore */ }
}

function saveUnits() {
  try {
    localStorage.setItem('atmos_tempUnit',  state.tempUnit);
    localStorage.setItem('atmos_windUnit',  state.windUnit);
    localStorage.setItem('atmos_visUnit',   state.visUnit);
    localStorage.setItem('atmos_clockUnit', state.clockUnit);
  } catch { /**/ }
}

function saveRecent() {
  try { localStorage.setItem('atmos_recent', JSON.stringify(state.recentSearches)); } catch { /**/ }
}

function addRecentSearch(city) {
  const key = `${city.lat.toFixed(4)}_${city.lon.toFixed(4)}`;
  state.recentSearches = state.recentSearches.filter(
    c => `${c.lat.toFixed(4)}_${c.lon.toFixed(4)}` !== key
  );
  state.recentSearches.unshift(city);
  if (state.recentSearches.length > 5) state.recentSearches.pop();
  saveRecent();
  renderRecent();
}

/* ─────────────────────────────────────────────
   API calls
───────────────────────────────────────────── */
async function geocode(query) {
  const url = `${BASE_URL}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=10&appid=${API_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  return res.json();
}

async function fetchCurrentWeather(lat, lon) {
  // Always fetch metric — all conversions are client-side
  const url = `${BASE_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const res  = await fetch(url);
  if (res.status === 401) throw new Error('Unable to load weather data. Check API key.');
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  return res.json();
}

async function fetchForecast(lat, lon) {
  const url = `${BASE_URL}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Forecast fetch failed: ${res.status}`);
  return res.json();
}

/* ─────────────────────────────────────────────
   Search dropdown
───────────────────────────────────────────── */
function showDropdown(results) {
  const dd = dom.searchDropdown;
  dd.innerHTML = '';

  if (!results.length) {
    const li = document.createElement('li');
    li.className = 'dropdown-empty';
    li.textContent = `No cities found for "${dom.searchInput.value}"`;
    dd.appendChild(li);
  } else {
    results.forEach((r, i) => {
      const li = document.createElement('li');
      li.className = 'dropdown-item';
      li.setAttribute('role', 'option');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-selected', 'false');
      li.dataset.index = i;

      const parts = [r.state, countryName(r.country)].filter(Boolean);
      li.innerHTML = `
        <span class="dropdown-city">${r.name}</span>
        <span class="dropdown-region">${parts.join(', ')}</span>
      `;

      li.addEventListener('click', () => selectCity(r));
      li.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCity(r); }
        if (e.key === 'ArrowDown') { e.preventDefault(); focusDropdownItem(i + 1); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); i > 0 ? focusDropdownItem(i - 1) : dom.searchInput.focus(); }
        if (e.key === 'Escape')    { hideDropdown(); dom.searchInput.focus(); }
      });

      dd.appendChild(li);
    });
  }

  dd.hidden = false;
  dom.searchInput.setAttribute('aria-expanded', 'true');
}

function hideDropdown() {
  dom.searchDropdown.hidden = true;
  dom.searchInput.setAttribute('aria-expanded', 'false');
}

function focusDropdownItem(index) {
  const items = dom.searchDropdown.querySelectorAll('.dropdown-item');
  const target = items[Math.min(index, items.length - 1)];
  if (target) target.focus();
}

/* ─────────────────────────────────────────────
   City selection + data load
───────────────────────────────────────────── */
async function selectCity(cityResult) {
  hideDropdown();
  dom.searchInput.value = cityResult.name;
  dom.searchClear.hidden = false;

  state.selectedCity = {
    name:    cityResult.name,
    lat:     cityResult.lat,
    lon:     cityResult.lon,
    country: cityResult.country,
    state:   cityResult.state || null,  // null when no state/province so filter(Boolean) drops it
  };

  addRecentSearch(state.selectedCity);
  await loadWeather();
}

async function loadWeather() {
  const { lat, lon } = state.selectedCity;
  setLoading(true);
  clearError();

  try {
    const [current, forecast] = await Promise.all([
      fetchCurrentWeather(lat, lon),
      fetchForecast(lat, lon),
    ]);
    state.currentWeather = current;
    state.forecast       = forecast;
    renderWeather();
  } catch (err) {
    showError(err.message || 'Failed to load weather data.');
  } finally {
    setLoading(false);
  }
}

/* ─────────────────────────────────────────────
   Render
───────────────────────────────────────────── */
function renderWeather() {
  const w  = state.currentWeather;
  const tz = w.timezone; // seconds offset from UTC

  // Header transition to compact
  dom.header.classList.add('compact');

  // Background gradient
  applyWeatherTheme(w.weather[0].id);

  // City name — use geocoded data for consistent "City, State, Country" display
  const city = state.selectedCity;
  dom.cityName.textContent = city.name;
  const subParts = [city.state || '', countryName(city.country || w.sys.country)].filter(Boolean);
  dom.citySub.textContent  = subParts.join(', ');

  // Date & time
  dom.localTime.textContent = formatTime(w.dt, tz);
  dom.localDate.textContent = formatDate(w.dt, tz);

  // Live clock
  startClock(tz);

  // Condition
  const iconCode = w.weather[0].icon;
  dom.conditionIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  dom.conditionIcon.alt = w.weather[0].description;
  dom.conditionDesc.textContent = w.weather[0].description;

  // Temperature (count-up)
  const tempNum = Math.round(convertTemp(w.main.temp));
  countUp(dom.tempValue, tempNum, 0, 600);
  dom.tempUnit.textContent = tempLabel();

  // Feels like
  dom.feelsLike.textContent = `${Math.round(convertTemp(w.main.feels_like))}${tempLabel()}`;

  // Stats
  dom.humidity.textContent = `${w.main.humidity}%`;
  const wind = convertWind(w.wind.speed);
  const windDir = w.wind.deg !== undefined ? ` · ${Math.round(w.wind.deg)}°` : '';
  dom.wind.textContent = `${wind.val.toFixed(1)} ${wind.label}${windDir}`;
  const vis = convertVis(w.visibility);
  dom.visibility.textContent = `${vis.val.toFixed(1)} ${vis.label}`;
  dom.pressure.textContent   = `${w.main.pressure} hPa`;
  dom.sunrise.textContent    = formatTime(w.sys.sunrise, tz);
  dom.sunset.textContent     = formatTime(w.sys.sunset, tz);

  // Forecast
  renderForecast(tz);

  // Show main
  dom.main.hidden = false;
}

function renderForecast(tzOffsetSeconds) {
  const list = state.forecast.list;
  const strip = dom.forecastStrip;
  strip.innerHTML = '';

  // Group by local date
  const days = {};
  list.forEach(entry => {
    const localMs = (entry.dt + tzOffsetSeconds) * 1000;
    const dateKey = new Date(localMs).toISOString().slice(0, 10); // YYYY-MM-DD (UTC of shifted time)
    if (!days[dateKey]) days[dateKey] = [];
    days[dateKey].push(entry);
  });

  // Take up to 5 days
  const dayKeys = Object.keys(days).slice(0, 5);

  dayKeys.forEach(dateKey => {
    const entries = days[dateKey];

    // Day label
    const dayDate  = new Date(dateKey + 'T12:00:00Z');
    const dayLabel = dayDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

    // Pick representative entry: closest to local noon
    const rep = entries.reduce((best, e) => {
      const localHour = new Date((e.dt + tzOffsetSeconds) * 1000).getUTCHours();
      const bestHour  = new Date((best.dt + tzOffsetSeconds) * 1000).getUTCHours();
      return Math.abs(localHour - 12) < Math.abs(bestHour - 12) ? e : best;
    });

    const high = Math.round(convertTemp(Math.max(...entries.map(e => e.main.temp_max))));
    const low  = Math.round(convertTemp(Math.min(...entries.map(e => e.main.temp_min))));
    const unit = tempLabel();

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <p class="fc-day">${dayLabel}</p>
      <img class="fc-icon" src="https://openweathermap.org/img/wn/${rep.weather[0].icon}@2x.png"
           alt="${rep.weather[0].description}" width="52" height="52" />
      <p class="fc-desc">${rep.weather[0].description}</p>
      <div class="fc-temps">
        <span class="fc-high">${high}${unit}</span>
        <span class="fc-low">${low}${unit}</span>
      </div>
    `;
    strip.appendChild(card);
  });
}

/* ─────────────────────────────────────────────
   Recent searches render
───────────────────────────────────────────── */
function renderRecent() {
  const chips = dom.recentChips;
  chips.innerHTML = '';

  if (!state.recentSearches.length) {
    dom.recentWrap.hidden = true;
    return;
  }

  state.recentSearches.forEach(city => {
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = `${city.name}, ${city.country}`;
    btn.addEventListener('click', () => {
      state.selectedCity = city;
      dom.searchInput.value = city.name;
      dom.searchClear.hidden = false;
      loadWeather();
    });
    chips.appendChild(btn);
  });

  dom.recentWrap.hidden = false;
}

/* ─────────────────────────────────────────────
   Weather-adaptive theme
───────────────────────────────────────────── */
function applyWeatherTheme(conditionId) {
  const classes = ['wx-clear','wx-clouds','wx-rain','wx-thunder','wx-snow','wx-mist'];
  document.body.classList.remove(...classes);

  if (conditionId >= 200 && conditionId < 300) document.body.classList.add('wx-thunder');
  else if (conditionId >= 300 && conditionId < 600) document.body.classList.add('wx-rain');
  else if (conditionId >= 600 && conditionId < 700) document.body.classList.add('wx-snow');
  else if (conditionId >= 700 && conditionId < 800) document.body.classList.add('wx-mist');
  else if (conditionId === 800)                      document.body.classList.add('wx-clear');
  else if (conditionId > 800)                        document.body.classList.add('wx-clouds');
}

/* ─────────────────────────────────────────────
   Live clock
───────────────────────────────────────────── */
let clockInterval = null;

function startClock(tzOffsetSeconds) {
  if (clockInterval) clearInterval(clockInterval);
  const tick = () => {
    const now = Math.floor(Date.now() / 1000);
    dom.localTime.textContent = formatTime(now, tzOffsetSeconds);
  };
  tick();
  clockInterval = setInterval(tick, 15000); // update every 15s
}

/* ─────────────────────────────────────────────
   UI state helpers
───────────────────────────────────────────── */
function setLoading(on) {
  state.isLoading = on;
  dom.loadingState.hidden = !on;
  if (on) dom.main.hidden = true;
}

function showError(msg) {
  dom.errorMsg.textContent = msg;
  dom.errorState.hidden = false;
  dom.main.hidden = true;
}

function clearError() {
  dom.errorState.hidden = true;
}

/* ─────────────────────────────────────────────
   Unit panel (inline, delegated from document)
───────────────────────────────────────────── */
function initUnitPanel() {
  const stateKey = { temp: 'tempUnit', wind: 'windUnit', vis: 'visUnit', clock: 'clockUnit' };

  // Sync button active states to loaded storage values
  function syncButtons() {
    document.querySelectorAll('.unit-btn[data-group]').forEach(btn => {
      const key    = stateKey[btn.dataset.group];
      const active = key && state[key] === btn.dataset.unit;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  syncButtons();

  document.addEventListener('click', e => {
    const btn = e.target.closest('.unit-btn[data-group]');
    if (!btn) return;
    const group = btn.dataset.group;
    const unit  = btn.dataset.unit;
    const key   = stateKey[group];
    if (!key || state[key] === unit) return;

    state[key] = unit;
    saveUnits();
    syncButtons();

    if (!state.currentWeather) return;

    if (group === 'temp') {
      renderWeather();
    } else if (group === 'clock') {
      renderClock();
    } else {
      renderWindVis();
    }
  });
}

/** Re-render wind and visibility from cached data */
function renderWindVis() {
  const w = state.currentWeather;
  const wind = convertWind(w.wind.speed);
  const windDir = w.wind.deg !== undefined ? ` · ${Math.round(w.wind.deg)}°` : '';
  dom.wind.textContent = `${wind.val.toFixed(1)} ${wind.label}${windDir}`;
  const vis = convertVis(w.visibility);
  dom.visibility.textContent = `${vis.val.toFixed(1)} ${vis.label}`;
}

/** Re-render clock display and sunrise/sunset from cached data */
function renderClock() {
  const w  = state.currentWeather;
  const tz = w.timezone;
  const now = Math.floor(Date.now() / 1000);
  dom.localTime.textContent = formatTime(now, tz);
  dom.sunrise.textContent   = formatTime(w.sys.sunrise, tz);
  dom.sunset.textContent    = formatTime(w.sys.sunset, tz);
}

/* ─────────────────────────────────────────────
   Search init
───────────────────────────────────────────── */
const doSearch = debounce(async query => {
  query = query.trim();
  if (!query) { hideDropdown(); return; }
  try {
    const results = await geocode(query);
    showDropdown(results);
  } catch {
    // silent fail on geocoding search
    hideDropdown();
  }
}, 400);

function initSearch() {
  dom.searchInput.addEventListener('input', e => {
    const q = e.target.value;
    dom.searchClear.hidden = !q;
    doSearch(q);
  });

  dom.searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = dom.searchInput.value.trim();
      if (!q) {
        const box = dom.searchInput.closest('.search-box');
        box.classList.remove('shake');
        void box.offsetWidth; // reflow
        box.classList.add('shake');
        return;
      }
      // Select first dropdown item if visible
      const first = dom.searchDropdown.querySelector('.dropdown-item');
      if (first) first.click();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusDropdownItem(0);
    }
    if (e.key === 'Escape') {
      hideDropdown();
    }
  });

  dom.searchClear.addEventListener('click', () => {
    dom.searchInput.value = '';
    dom.searchClear.hidden = true;
    hideDropdown();
    dom.searchInput.focus();
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    const wrap = document.getElementById('searchWrap');
    if (!wrap.contains(e.target)) hideDropdown();
  });
}

/* ─────────────────────────────────────────────
   Retry
───────────────────────────────────────────── */
dom.retryBtn.addEventListener('click', () => {
  clearError();
  if (state.selectedCity) loadWeather();
});

/* ─────────────────────────────────────────────
   Boot
───────────────────────────────────────────── */
function init() {
  loadStorage();
  initUnitPanel();
  initSearch();
  renderRecent();
  dom.searchInput.focus();
}

init();
