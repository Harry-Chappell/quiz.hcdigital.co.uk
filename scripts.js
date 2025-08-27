let teamName = sessionStorage.getItem("teamName") || null;
let teamColor = sessionStorage.getItem("teamColor") || null;
let buzzButton = null;
let lastResetTime = 0;

document.addEventListener("DOMContentLoaded", async () => {
  buzzButton = document.getElementById("buzz-button");
  const joinScreen = document.getElementById("join-screen");
  const buzzScreen = document.getElementById("buzz-screen");
  const playerNameElem = document.getElementById("player-team-name");
  const existingTeams = document.getElementById("existing-teams");
  const newTeamForm = document.getElementById("new-team-form");

  // Fetch existing teams
  const resTeams = await fetch("/functions.php?action=teams");
  const teams = await resTeams.json();
  teams.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.name;
    opt.dataset.color = t.color;
    opt.textContent = t.name;
    existingTeams.appendChild(opt);
  });

  // Preselect existing team if session storage exists
  if (teamName && teamColor) {
    joinScreen.style.display = "none";
    buzzScreen.style.display = "block";
    playerNameElem.textContent = teamName;
  }

  // Show/hide new team form based on selection
  existingTeams.addEventListener("change", () => {
    if (existingTeams.value) {
      newTeamForm.style.display = "none";
    } else {
      newTeamForm.style.display = "block";
    }
  });

  // Join button
  document.getElementById("join-button").addEventListener("click", async () => {
    if (existingTeams.value) {
      teamName = existingTeams.value;
      teamColor = existingTeams.selectedOptions[0].dataset.color;
    } else {
      teamName = document.getElementById("team-name").value.trim();
      teamColor = document.getElementById("team-color").value;
      if (!teamName || !teamColor) return;

      // Register new team
      await fetch("/functions.php?action=register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, color: teamColor })
      });
    }

    // Save to session storage
    sessionStorage.setItem("teamName", teamName);
    sessionStorage.setItem("teamColor", teamColor);

    joinScreen.style.display = "none";
    buzzScreen.style.display = "block";
    playerNameElem.textContent = teamName;
  });

    // Buzz button
    buzzButton.addEventListener("click", async () => {
    buzzButton.disabled = true;

    await fetch("/functions.php?action=buzz", {  // ✅ Correct
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, color: teamColor })
    });
    });

  // Poll reset
  setInterval(async () => {
    const res = await fetch("/functions.php?action=status");
    const data = await res.json();

    if (data.resetTime && data.resetTime > lastResetTime) {
      buzzButton.disabled = false;
      lastResetTime = data.resetTime;
    }
  }, 2000);
});

document.getElementById("join-button").addEventListener("click", async () => {
  if (existingTeams.value) {
    teamName = existingTeams.value;
    teamColor = existingTeams.selectedOptions[0].dataset.color;
  } else {
    teamName = document.getElementById("team-name").value.trim();
    teamColor = document.getElementById("team-color").value;
    if (!teamName || !teamColor) return;

    // Register new team
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

    // Add the new team to existing teams dropdown for others
    const opt = document.createElement("option");
    opt.value = teamName;
    opt.dataset.color = teamColor;
    opt.textContent = teamName;
    existingTeams.appendChild(opt);
  }

  // Save to session storage
  sessionStorage.setItem("teamName", teamName);
  sessionStorage.setItem("teamColor", teamColor);

  joinScreen.style.display = "none";
  buzzScreen.style.display = "block";
  playerNameElem.textContent = teamName;
});