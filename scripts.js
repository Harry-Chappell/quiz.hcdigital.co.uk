// scripts.js — cleaned, single-source-of-truth version for index.php

// --- Session state ---
let teamName  = sessionStorage.getItem("teamName")  || null;
let teamColor = sessionStorage.getItem("teamColor") || null;
let lastResetTime = 0;

// --- DOM refs (will be set on DOMContentLoaded) ---
let loginScreen, buzzScreen, teamListEl, createForm, newTeamNameEl, newTeamColEl;
let buzzBtn, buzzFeedbackEl, logoutBtn, teamInfoEl;

// --- Colour palette (hex) ---
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
  return await res.json(); // array [{name,color,score}, ...]
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
      teamName = t.name;
      teamColor = t.color;
      showBuzzScreen();
    });

    // Mark if this is your team
    if (teamName && teamName === t.name) {
      li.style.fontWeight = "700";
    }

    li.append(swatch, label, btn);
    teamListEl.appendChild(li);
  });
}

function renderColourOptions(teams) {
  // teams: array of {name,color,score}
  const taken = new Set(teams.map(t => String(t.color).toLowerCase()));
  const previous = newTeamColEl.value;
  newTeamColEl.innerHTML = "";
  let availableCount = 0;

  PALETTE.forEach(c => {
    if (!taken.has(c.value.toLowerCase())) {
      const opt = document.createElement("option");
      opt.value = c.value;
      opt.textContent = c.label;
      newTeamColEl.appendChild(opt);
      availableCount++;
    }
  });

  // restore previous selection if still available
  if (previous && [...newTeamColEl.options].some(o => o.value.toLowerCase() === previous.toLowerCase())) {
    newTeamColEl.value = previous;
  }

  // disable create if no colours left
  createForm.querySelector('button[type="submit"]').disabled = availableCount === 0;
}

// refresh login UI
async function refreshLoginUI() {
  try {
    const teams = await fetchTeams();
    renderTeamList(teams);
    renderColourOptions(teams);

    // If currently logged in, ensure our team still exists
    if (teamName) {
      const stillExists = teams.some(t => t.name === teamName);
      if (!stillExists) {
        // team was removed by admin — force logout
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
  showLoginScreen();
  refreshLoginUI();
}

// ---------- DOM ready ----------
document.addEventListener("DOMContentLoaded", () => {
  // DOM refs
  loginScreen   = document.getElementById("login-screen");
  buzzScreen    = document.getElementById("buzzer-screen");
  teamListEl    = document.getElementById("team-list");
  createForm    = document.getElementById("create-team-form");
  newTeamNameEl = document.getElementById("new-team-name");
  newTeamColEl  = document.getElementById("new-team-colour");
  buzzBtn       = document.getElementById("buzz-button");
  buzzFeedbackEl= document.getElementById("buzz-feedback");
  logoutBtn     = document.getElementById("logout-button");
  teamInfoEl    = document.getElementById("team-info");

  // Ensure required elements exist
  if (!teamListEl || !createForm || !newTeamNameEl || !newTeamColEl || !buzzBtn || !buzzFeedbackEl || !logoutBtn || !teamInfoEl) {
    console.error("Missing expected DOM elements. Check your index.php IDs.");
    return;
  }

  // Create form submit (create team)
  createForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = newTeamNameEl.value.trim();
    const color = newTeamColEl.value;
    if (!name || !color) return;

    try {
      const res = await fetch("/functions.php?action=register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color })
      });
      const data = await res.json();
      if (data.status !== "ok") {
        alert(data.msg || "Error creating team");
        return;
      }
      // success: store and show buzzer
      sessionStorage.setItem("teamName", name);
      sessionStorage.setItem("teamColor", color);
      teamName = name;
      teamColor = color;
      showBuzzScreen();
      // refresh team list so everyone sees it quickly
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
        body: JSON.stringify({ name: teamName, color: teamColor })
      });
      const data = await res.json();

      // flash the team color briefly
      buzzScreen.style.transition = "background-color 0.15s";
      buzzScreen.style.backgroundColor = teamColor;
      setTimeout(() => (buzzScreen.style.backgroundColor = ""), 400);

      // show server result
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
      buzzBtn.disabled = false; // allow retry
    }
  });

  // Manual logout button
  logoutBtn.addEventListener("click", () => doLogout());

  // Boot: show correct screen
  if (teamName && teamColor) {
    showBuzzScreen();
  } else {
    showLoginScreen();
  }

  // Live refresh list every 3s (and initial load)
  refreshLoginUI();
  setInterval(refreshLoginUI, 3000);

  // Poll status every 1s to detect resets + re-enable buzz buttons
  setInterval(async () => {
    try {
      const res = await fetch("/functions.php?action=status", {cache: "no-store"});
      if (!res.ok) return;
      const s = await res.json();

      // If reset time advanced, re-enable buzz
      if (s.resetTime && s.resetTime > lastResetTime) {
        lastResetTime = s.resetTime;
        buzzBtn.disabled = false;
        buzzFeedbackEl.textContent = "";
      }

      // Also ensure logged-in user's team still exists (extra safety)
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