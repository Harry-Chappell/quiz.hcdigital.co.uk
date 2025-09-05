// public.js — adapted from original scripts.js to use WP REST base
const REST_BASE = (window.QuizBuzzerConfig && window.QuizBuzzerConfig.restBase) ? window.QuizBuzzerConfig.restBase : '/wp-json/quiz/v1/';

// --- Session state ---
let teamName  = sessionStorage.getItem("teamName")  || null;
let teamColor = sessionStorage.getItem("teamColor") || null;
let teamSoundRaw = sessionStorage.getItem("teamSound") || null; // stored as JSON string when object
let teamSound = null; // normalized object or null
let lastResetTime = 0;

// DOM refs
let loginScreen, buzzScreen, teamListEl, createForm, newTeamNameEl;
let colourListEl, soundListEl, selectedColourEl, selectedSoundEl;
let buzzBtn, buzzFeedbackEl, logoutBtn, teamInfoEl, standingsEl;

const DEFAULT_PALETTE = [
  { label: "Red",    value: "#e53935" },
  { label: "Blue",   value: "#1e88e5" },
  { label: "Green",  value: "#43a047" },
  { label: "Yellow", value: "#fdd835" },
  { label: "Purple", value: "#8e24aa" },
  { label: "Orange", value: "#fb8c00" },
  { label: "Teal",   value: "#00acc1" },
  { label: "Indigo", value: "#5e35b1" }
];

const DEFAULT_SOUNDS = ["Beep","Boop","Clap","Horn","Laser"];

// use configured values when available
const CONFIG = (window.QuizBuzzerConfig && window.QuizBuzzerConfig.config) ? window.QuizBuzzerConfig.config : null;

// normalize sounds to objects: { name, url }
function normalizeSound(s) {
  if (!s) return { name: '', url: null };
  if (typeof s === 'string') return { name: s, url: null };
  if (typeof s === 'object') return { name: s.name || s.label || '', url: s.url || s.link || null };
  return { name: String(s), url: null };
}

const PALETTE = (CONFIG && Array.isArray(CONFIG.colors) && CONFIG.colors.length)
  ? CONFIG.colors.map(c => ({ label: c.name, value: c.hex }))
  : DEFAULT_PALETTE;
const SOUNDS = (CONFIG && Array.isArray(CONFIG.sounds) && CONFIG.sounds.length)
  ? CONFIG.sounds.map(normalizeSound)
  : DEFAULT_SOUNDS.map(name => ({ name, url: null }));
const JUST_CREATED_GRACE_MS = 5000; // grace period after creating a team

async function fetchTeams() {
  const res = await fetch(REST_BASE + 'teams', {cache: 'no-store'});
  if (!res.ok) throw new Error('Failed to load teams');
  return await res.json();
}

function renderTeamList(teams) {
  teamListEl.innerHTML = "";
  teams.forEach(t => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '8px';
    li.style.margin = '6px 0';

    const swatch = document.createElement('span');
    swatch.style.width = '16px';
    swatch.style.height = '16px';
    swatch.style.borderRadius = '3px';
    swatch.style.background = t.color;
    swatch.style.display = 'inline-block';
    swatch.title = t.color;

    const label = document.createElement('span');
    label.textContent = `${t.name} (score: ${t.score})`;

    const btn = document.createElement('button');
    btn.textContent = 'Join';
    btn.addEventListener('click', () => {
      sessionStorage.setItem('teamName', t.name);
      sessionStorage.setItem('teamColor', t.color);
      // normalize incoming team.sound which may be string or object
      let soundObj = null;
      if (t.sound) {
        soundObj = (typeof t.sound === 'string') ? { name: t.sound, url: null } : t.sound;
      }
      if (soundObj) sessionStorage.setItem('teamSound', JSON.stringify(soundObj)); else sessionStorage.removeItem('teamSound');
      teamName = t.name; teamColor = t.color; teamSound = soundObj || null;
      showBuzzScreen();
    });

    if (teamName && teamName === t.name) li.style.fontWeight = '700';
    li.append(swatch, label, btn);
    teamListEl.appendChild(li);
  });
}

function renderColourOptions(teams) {
  const taken = new Set(teams.map(t => String(t.color).toLowerCase()));
  colourListEl.innerHTML = '';
  PALETTE.forEach(c => {
    const li = document.createElement('li');
    li.textContent = c.label;
    li.style.background = c.value;
    li.style.color = '#fff';
    li.dataset.value = c.value;
    if (taken.has(c.value.toLowerCase())) { li.style.opacity = 0.4; li.style.pointerEvents = 'none'; }
    if (selectedColourEl.value === c.value) li.classList.add('selected');
    li.addEventListener('click', () => {
      selectedColourEl.value = c.value;
      document.querySelectorAll('#colour-list li').forEach(el => el.classList.remove('selected'));
      li.classList.add('selected');
    });
    colourListEl.appendChild(li);
  });
  const createBtn = createForm.querySelector('button[type="submit"]');
  if (createBtn) createBtn.disabled = [...colourListEl.querySelectorAll('li')].every(li => li.style.pointerEvents === 'none');
}

let selectedSoundObj = null;
function renderSoundOptions() {
  soundListEl.innerHTML = '';
  SOUNDS.forEach((s, idx) => {
    const li = document.createElement('li');
    li.textContent = s.name;
    li.dataset.idx = String(idx);
    li.dataset.name = s.name;
    if (s.url) li.title = s.url;
    if (selectedSoundObj && selectedSoundObj.name === s.name) li.classList.add('selected');
    li.addEventListener('click', () => {
      selectedSoundObj = s;
      selectedSoundEl.value = s.name;
      document.querySelectorAll('#sound-list li').forEach(el => el.classList.remove('selected'));
      li.classList.add('selected');
    });
    soundListEl.appendChild(li);
  });
}

function renderStandings(teams) {
  if (!standingsEl) return;
  // sort by score descending
  const sorted = Array.isArray(teams) ? teams.slice().sort((a,b) => (b.score||0) - (a.score||0)) : [];
  standingsEl.innerHTML = '';
  sorted.forEach(t => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.gap = '8px';
    li.style.margin = '4px 0';

    const swatch = document.createElement('span');
    swatch.style.width = '16px';
    swatch.style.height = '16px';
    swatch.style.borderRadius = '3px';
    swatch.style.background = t.color || '#999';
    swatch.style.display = 'inline-block';
    swatch.style.border = '1px solid rgba(0,0,0,0.15)';

    const label = document.createElement('span');
    label.textContent = `${t.name}`;

    const score = document.createElement('span');
    score.textContent = String(t.score ?? 0);
    score.style.marginLeft = 'auto';
    score.style.fontWeight = '600';

    if (teamName && teamName === t.name) {
      li.style.background = 'rgba(255,255,0,0.08)';
      li.style.borderRadius = '4px';
      label.style.fontWeight = '700';
    }

    li.appendChild(swatch);
    li.appendChild(label);
    li.appendChild(score);
    standingsEl.appendChild(li);
  });
}

async function refreshLoginUI() {
  try {
    const teams = await fetchTeams();
  renderTeamList(teams);
  renderColourOptions(teams);
  renderSoundOptions();
  renderStandings(teams);
    if (teamName) {
      const stillExists = teams.some(t => t.name === teamName);
      if (!stillExists) {
        const justCreated = parseInt(sessionStorage.getItem('justCreatedTeam') || '0', 10);
        if (justCreated && (Date.now() - justCreated) < JUST_CREATED_GRACE_MS) {
          // still within grace window — skip the removal message
        } else {
          alert('Your team has been removed by the admin.');
          doLogout();
        }
      }
    }
  } catch (err) { console.error('refreshLoginUI error:', err); }
}

function showBuzzScreen() {
  loginScreen.style.display = 'none';
  buzzScreen.style.display = 'block';
  teamInfoEl.textContent = sessionStorage.getItem('teamName') || '';
}
function showLoginScreen() {
  loginScreen.style.display = 'block';
  buzzScreen.style.display = 'none';
  buzzFeedbackEl.textContent = '';
}

function doLogout() {
  sessionStorage.clear(); teamName = null; teamColor = null; teamSound = null; showLoginScreen(); refreshLoginUI();
}

document.addEventListener('DOMContentLoaded', () => {
  loginScreen      = document.getElementById('login-screen');
  buzzScreen       = document.getElementById('buzzer-screen');
  teamListEl       = document.getElementById('team-list');
  createForm       = document.getElementById('create-team-form');
  newTeamNameEl    = document.getElementById('new-team-name');
  colourListEl     = document.getElementById('colour-list');
  soundListEl      = document.getElementById('sound-list');
  selectedColourEl = document.getElementById('selected-colour');
  selectedSoundEl  = document.getElementById('selected-sound');
  buzzBtn          = document.getElementById('buzz-button');
  buzzFeedbackEl   = document.getElementById('buzz-feedback');
  logoutBtn        = document.getElementById('logout-button');
  teamInfoEl       = document.getElementById('team-info');
  standingsEl      = document.getElementById('current-standings');

  if (!teamListEl || !createForm || !newTeamNameEl || !colourListEl || !soundListEl || !selectedColourEl || !selectedSoundEl || !buzzBtn || !buzzFeedbackEl || !logoutBtn || !teamInfoEl) {
    console.error('Missing expected DOM elements.'); return;
  }

  // initialize teamSound from session storage and ensure selectedSoundObj reflects it
  if (teamSoundRaw) {
    try {
      const parsed = JSON.parse(teamSoundRaw);
      if (parsed && parsed.name) {
        teamSound = parsed;
        selectedSoundObj = parsed;
        selectedSoundEl.value = parsed.name;
      } else {
        // fallback to string
        teamSound = { name: String(teamSoundRaw), url: null };
        selectedSoundEl.value = teamSound.name;
      }
    } catch (e) {
      // not JSON, keep as string
      teamSound = { name: String(teamSoundRaw), url: null };
      selectedSoundEl.value = teamSound.name;
    }
  }

  createForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = newTeamNameEl.value.trim();
    const color = selectedColourEl.value; const sound = selectedSoundEl.value;
    if (!name || !color || !sound) return;
    try {
      // include sound object when available
      const soundPayload = selectedSoundObj || (selectedSoundEl.value ? { name: selectedSoundEl.value, url: null } : null);
      const res = await fetch(REST_BASE + 'register', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name,color,sound: soundPayload}) });
      const data = await res.json();
      if (data.status !== 'ok') { alert(data.msg || 'Error creating team'); return; }
      // store the selected sound as JSON so we keep the URL if present
      sessionStorage.setItem('teamName', name);
      sessionStorage.setItem('teamColor', color);
      if (soundPayload) sessionStorage.setItem('teamSound', JSON.stringify(soundPayload)); else sessionStorage.removeItem('teamSound');
      // mark as just-created to avoid immediate "removed by admin" race
      sessionStorage.setItem('justCreatedTeam', String(Date.now()));
      teamName = name; teamColor = color; teamSound = soundPayload; showBuzzScreen(); refreshLoginUI();
      // clear the just-created marker after grace window
      setTimeout(() => sessionStorage.removeItem('justCreatedTeam'), JUST_CREATED_GRACE_MS + 100);
    } catch (err) { console.error('Create team error', err); alert('Error creating team'); }
  });

  buzzBtn.addEventListener('click', async () => {
    if (!teamName || !teamColor) return; buzzBtn.disabled = true;
    try {
      const soundPayload = (teamSound && typeof teamSound === 'object') ? teamSound : (teamSound ? { name: String(teamSound), url: null } : null);
      const res = await fetch(REST_BASE + 'buzz', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: teamName, color: teamColor, sound: soundPayload }) });
      const data = await res.json();
      buzzScreen.style.transition = 'background-color 0.15s';
      buzzScreen.style.backgroundColor = teamColor;
      setTimeout(() => (buzzScreen.style.backgroundColor = ''), 400);
      if (data.first) { buzzFeedbackEl.textContent = '✅ You buzzed FIRST!'; buzzFeedbackEl.style.color = 'green'; }
      else { const delayText = (typeof data.delay_s === 'number') ? `${data.delay_s.toFixed(3)}s` : `${data.delay_ms ?? 0}ms`; buzzFeedbackEl.textContent = `⏱ You were ${delayText} late.`; buzzFeedbackEl.style.color = 'red'; }
    } catch (err) { console.error('Buzz error', err); buzzFeedbackEl.textContent = 'Error sending buzz'; buzzFeedbackEl.style.color = 'orange'; buzzBtn.disabled = false; }
  });

  logoutBtn.addEventListener('click', () => doLogout());

  if (teamName && teamColor) showBuzzScreen(); else showLoginScreen();
  refreshLoginUI(); setInterval(refreshLoginUI, 3000);

  setInterval(async () => {
    try {
      const res = await fetch(REST_BASE + 'status', {cache: 'no-store'});
      if (!res.ok) return; const s = await res.json();
      if (s.resetTime && s.resetTime > lastResetTime) { lastResetTime = s.resetTime; buzzBtn.disabled = false; buzzFeedbackEl.textContent = ''; }
      if (teamName && Array.isArray(s.teams)) {
        const stillExists = s.teams.some(t => t.name === teamName);
        if (!stillExists) {
          const justCreated = parseInt(sessionStorage.getItem('justCreatedTeam') || '0', 10);
          if (justCreated && (Date.now() - justCreated) < JUST_CREATED_GRACE_MS) {
            // skip
          } else {
            alert('Your team has been removed by the admin.');
            doLogout();
          }
        }
      }
    } catch (err) { }
  }, 1000);
});
