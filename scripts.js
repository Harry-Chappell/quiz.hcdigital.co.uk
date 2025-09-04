// scripts.js — cleaned, with colour+sound list selectors

// --- Session state ---
let teamName  = sessionStorage.getItem("teamName")  || null;
let teamColor = sessionStorage.getItem("teamColor") || null;
let teamSound = sessionStorage.getItem("teamSound") || null;
let lastResetTime = 0;

// --- DOM refs (will be set on DOMContentLoaded) ---
let loginScreen, buzzScreen, teamListEl, createForm, newTeamNameEl;
let colourListEl, soundListEl, selectedColourEl, selectedSoundEl;
let buzzBtn, buzzFeedbackEl, logoutBtn, teamInfoEl;

// --- Colour palette ---
const PALETTE = [
  { label: "Red",    value: "#e53935" },
  { label: "Blue",   value: "#1e88e5" },
  { label: "Green",  value: "#43a047" },
  { label: "Yellow", value: "#fdd835" },
  { label: "Purple", value: "#8e24aa" },
  { label: "Orange", value: "#fb8c00" },
  { label: "Teal",   value: "#00acc1" },
  { label: "Indigo", value: "#5e35b1" }
];

// --- Sound palette ---
const SOUNDS = [
  "Beep",
  "Boop",
  "Clap",
  "Horn",
  "Laser"
];

// ---------- helpers ----------
function showBuzzScreen() {
  loginScreen.style.display = "none";
  buzzScreen.style.display = "block";
  teamInfoEl.textContent = sessionStorage.getItem("teamName") || "";
}

function showLoginScreen() {
  loginScreen.style.display = "block";
  buzzScreen.style.display = "none";
  buzzFeedbackEl.textContent = "";
}

async function fetchTeams() {
  const res = await fetch("/functions.php?action=teams", {cache: "no-store"});
  if (!res.ok) throw new Error("Failed to load teams");
  return await res.json(); // array [{name,color,sound,score}, ...]
}

function renderTeamList(teams) {
  teamListEl.innerHTML = "";
  teams.forEach(t => {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "8px";
    li.style.margin = "6px 0";

    const swatch = document.createElement("span");
    swatch.style.width = "16px";
    swatch.style.height = "16px";
    swatch.style.borderRadius = "3px";
    swatch.style.background = t.color;
    swatch.style.display = "inline-block";
    swatch.title = t.color;

    const label = document.createElement("span");
    label.textContent = `${t.name} (score: ${t.score})`;

    const btn = document.createElement("button");
    btn.textContent = "Join";
    btn.addEventListener("click", () => {
      sessionStorage.setItem("teamName", t.name);
      sessionStorage.setItem("teamColor", t.color);
      sessionStorage.setItem("teamSound", t.sound || "");
      teamName = t.name;
      teamColor = t.color;
      teamSound = t.sound || null;
      showBuzzScreen();
    });

    if (teamName && teamName === t.name) {
      li.style.fontWeight = "700";
    }

    li.append(swatch, label, btn);
    teamListEl.appendChild(li);
  });
}

// --- Colour list renderer ---
function renderColourOptions(teams) {
  const taken = new Set(teams.map(t => String(t.color).toLowerCase()));
  colourListEl.innerHTML = "";

  PALETTE.forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.label;
    li.style.background = c.value;
    li.style.color = "#fff";
    li.dataset.value = c.value;

    if (taken.has(c.value.toLowerCase())) {
      li.style.opacity = 0.4;
      li.style.pointerEvents = "none";
    }

    if (selectedColourEl.value === c.value) {
      li.classList.add("selected");
    }

    li.addEventListener("click", () => {
      selectedColourEl.value = c.value;
      document.querySelectorAll("#colour-list li").forEach(el => el.classList.remove("selected"));
      li.classList.add("selected");
    });

    colourListEl.appendChild(li);
  });

  // disable create if no colours left
  const createBtn = createForm.querySelector('button[type="submit"]');
  if (createBtn) {
    createBtn.disabled = [...colourListEl.querySelectorAll("li")].every(li => li.style.pointerEvents === "none");
  }
}

// --- Sound list renderer ---
function renderSoundOptions() {
  soundListEl.innerHTML = "";
  SOUNDS.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;
    li.dataset.value = s;

    if (selectedSoundEl.value === s) {
      li.classList.add("selected");
    }

    li.addEventListener("click", () => {
      selectedSoundEl.value = s;
      document.querySelectorAll("#sound-list li").forEach(el => el.classList.remove("selected"));
      li.classList.add("selected");
    });

    soundListEl.appendChild(li);
  });
}

// refresh login UI
async function refreshLoginUI() {
  try {
    const teams = await fetchTeams();
    renderTeamList(teams);
    renderColourOptions(teams);
    renderSoundOptions();

    if (teamName) {
      const stillExists = teams.some(t => t.name === teamName);
      if (!stillExists) {
        alert("Your team has been removed by the admin.");
        doLogout();
      }
    }
  } catch (err) {
    console.error("refreshLoginUI error:", err);
  }
}

function doLogout() {
  sessionStorage.clear();
  teamName = null;
  teamColor = null;
  teamSound = null;
  showLoginScreen();
  refreshLoginUI();
}

// ---------- DOM ready ----------
document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  loginScreen      = document.getElementById("login-screen");
  buzzScreen       = document.getElementById("buzzer-screen");
  teamListEl       = document.getElementById("team-list");
  createForm       = document.getElementById("create-team-form");
  newTeamNameEl    = document.getElementById("new-team-name");
  colourListEl     = document.getElementById("colour-list");
  soundListEl      = document.getElementById("sound-list");
  selectedColourEl = document.getElementById("selected-colour");
  selectedSoundEl  = document.getElementById("selected-sound");
  buzzBtn          = document.getElementById("buzz-button");
  buzzFeedbackEl   = document.getElementById("buzz-feedback");
  logoutBtn        = document.getElementById("logout-button");
  teamInfoEl       = document.getElementById("team-info");

  if (!teamListEl || !createForm || !newTeamNameEl || !colourListEl || !soundListEl ||
      !selectedColourEl || !selectedSoundEl || !buzzBtn || !buzzFeedbackEl || !logoutBtn || !teamInfoEl) {
    console.error("Missing expected DOM elements. Check your index.php IDs.");
    return;
  }

  // Create form submit (create team)
  createForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = newTeamNameEl.value.trim();
    const color = selectedColourEl.value;
    const sound = selectedSoundEl.value;
    if (!name || !color || !sound) return;

    try {
      const res = await fetch("/functions.php?action=register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, sound })
      });
      const data = await res.json();
      if (data.status !== "ok") {
        alert(data.msg || "Error creating team");
        return;
      }
      sessionStorage.setItem("teamName", name);
      sessionStorage.setItem("teamColor", color);
      sessionStorage.setItem("teamSound", sound);
      teamName = name;
      teamColor = color;
      teamSound = sound;
      showBuzzScreen();
      refreshLoginUI();
    } catch (err) {
      console.error("Create team error", err);
      alert("Error creating team");
    }
  });

  // Buzz button handler
  buzzBtn.addEventListener("click", async () => {
    if (!teamName || !teamColor) return;
    buzzBtn.disabled = true;

    try {
      const res = await fetch("/functions.php?action=buzz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, color: teamColor, sound: teamSound })
      });
      const data = await res.json();

      buzzScreen.style.transition = "background-color 0.15s";
      buzzScreen.style.backgroundColor = teamColor;
      setTimeout(() => (buzzScreen.style.backgroundColor = ""), 400);

      if (data.first) {
        buzzFeedbackEl.textContent = "✅ You buzzed FIRST!";
        buzzFeedbackEl.style.color = "green";
      } else {
        const delayText = (typeof data.delay_s === "number")
          ? `${data.delay_s.toFixed(3)}s`
          : `${data.delay_ms ?? 0}ms`;
        buzzFeedbackEl.textContent = `⏱ You were ${delayText} late.`;
        buzzFeedbackEl.style.color = "red";
      }
    } catch (err) {
      console.error("Buzz error", err);
      buzzFeedbackEl.textContent = "Error sending buzz";
      buzzFeedbackEl.style.color = "orange";
      buzzBtn.disabled = false;
    }
  });

  // Manual logout button
  logoutBtn.addEventListener("click", () => doLogout());

  // Boot
  if (teamName && teamColor) {
    showBuzzScreen();
  } else {
    showLoginScreen();
  }

  refreshLoginUI();
  setInterval(refreshLoginUI, 3000);

  setInterval(async () => {
    try {
      const res = await fetch("/functions.php?action=status", {cache: "no-store"});
      if (!res.ok) return;
      const s = await res.json();

      if (s.resetTime && s.resetTime > lastResetTime) {
        lastResetTime = s.resetTime;
        buzzBtn.disabled = false;
        buzzFeedbackEl.textContent = "";
      }

      if (teamName && Array.isArray(s.teams)) {
        const stillExists = s.teams.some(t => t.name === teamName);
        if (!stillExists) {
          alert("Your team has been removed by the admin.");
          doLogout();
        }
      }
    } catch (err) {
      // ignore network blips
    }
  }, 1000);
});