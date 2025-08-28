let teamName = sessionStorage.getItem("teamName") || null;
let teamColor = sessionStorage.getItem("teamColor") || null;
let buzzButton = null;
let lastResetTime = 0;

document.addEventListener("DOMContentLoaded", async () => {
  buzzButton = document.getElementById("buzz-button");
  const joinScreen     = document.getElementById("join-screen");
  const buzzScreen     = document.getElementById("buzz-screen");
  const playerNameElem = document.getElementById("player-team-name");
  const existingTeams  = document.getElementById("existing-teams");
  const newTeamForm    = document.getElementById("new-team-form");
  const buzzResult     = document.getElementById("buzz-result");     // ensure exists in HTML
  const logoutBtn      = document.getElementById("logout-button");   // ensure exists in HTML

  // Populate existing teams
  await updateTeamsDropdown(existingTeams);

  // Resume session if present
  if (teamName && teamColor) {
    joinScreen.style.display = "none";
    buzzScreen.style.display = "block";
    playerNameElem.textContent = teamName;
  }

  // Toggle new-team form
  existingTeams.addEventListener("change", () => {
    newTeamForm.style.display = existingTeams.value ? "none" : "block";
  });

  // Join
  document.getElementById("join-button").addEventListener("click", async () => {
    if (existingTeams.value) {
      teamName = existingTeams.value;
      teamColor = existingTeams.selectedOptions[0].dataset.color;
    } else {
      teamName = document.getElementById("team-name").value.trim();
      teamColor = document.getElementById("team-color").value;
      if (!teamName || !teamColor) return;

      const res = await fetch("/functions.php?action=register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, color: teamColor })
      });
      const result = await res.json();
      if (result.status !== "ok") {
        alert(result.msg || "Error registering team");
        return;
      }

      // add to dropdown for others (and for us if we go back)
      const opt = document.createElement("option");
      opt.value = teamName;
      opt.dataset.color = teamColor;
      opt.textContent = teamName;
      existingTeams.appendChild(opt);
    }

    sessionStorage.setItem("teamName", teamName);
    sessionStorage.setItem("teamColor", teamColor);

    joinScreen.style.display = "none";
    buzzScreen.style.display = "block";
    playerNameElem.textContent = teamName;
  });

  // Buzz
  buzzButton.addEventListener("click", async () => {
    if (!teamName || !teamColor) return;

    buzzButton.disabled = true;

    const res = await fetch("/functions.php?action=buzz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName, color: teamColor })
    });
    const result = await res.json();

    // Visual highlight for any buzz attempt
    buzzScreen.style.transition = "background-color 0.2s";
    buzzScreen.style.backgroundColor = teamColor;
    setTimeout(() => (buzzScreen.style.backgroundColor = ""), 500);

    // Show accurate server-derived result
    if (result.first) {
      buzzResult.textContent = "✅ You buzzed FIRST!";
      buzzResult.style.color = "green";
    } else {
      // prefer delay_s from server; fallback to ms if needed
      const delayText = typeof result.delay_s === "number"
        ? `${result.delay_s.toFixed(2)}s`
        : `${result.delay_ms ?? 0}ms`;
      buzzResult.textContent = `⏱ You were ${delayText} late.`;
      buzzResult.style.color = "red";
    }
  });

  // Poll: reset + team existence (for auto-logout)
  setInterval(async () => {
    const res = await fetch("/functions.php?action=status");
    const data = await res.json();

    // Enable after reset
    if (data.resetTime && data.resetTime > lastResetTime) {
      buzzButton.disabled = false;
      lastResetTime = data.resetTime;
      buzzResult.textContent = "";
    }

    // Auto-logout if admin deleted our team
    if (teamName && Array.isArray(data.teams)) {
      const stillExists = data.teams.some(t => t.name === teamName);
      if (!stillExists) {
        alert("Your team has been removed by the admin.");
        doLogout();
      }
    }
  }, 1000);

  // Manual logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => doLogout());
  }

  function doLogout() {
    sessionStorage.clear();
    teamName = null;
    teamColor = null;
    // Reset UI
    joinScreen.style.display = "block";
    buzzScreen.style.display = "none";
    buzzResult.textContent = "";
    // Refresh teams list so the dropdown reflects current state
    updateTeamsDropdown(existingTeams);
  }
});

async function updateTeamsDropdown(selectEl) {
  selectEl.innerHTML = '<option value="">--Create New Team--</option>';
  try {
    const resTeams = await fetch("/functions.php?action=teams");
    const teams = await resTeams.json();
    teams.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.name;
      opt.dataset.color = t.color;
      opt.textContent = t.name;
      selectEl.appendChild(opt);
    });
  } catch (e) {
    // ignore
  }
}