let teamName = sessionStorage.getItem("teamName") || null;
let teamColor = sessionStorage.getItem("teamColor") || null;
let buzzButton = null;

document.addEventListener("DOMContentLoaded", () => {
  const joinForm = document.getElementById("join-form");
  const teamNameInput = document.getElementById("team-name");
  const teamColorInput = document.getElementById("team-color");
  buzzButton = document.getElementById("buzz-button");

  // If session storage has data, skip join screen
  if (teamName && teamColor) {
    document.getElementById("join-screen").style.display = "none";
    document.getElementById("buzz-screen").style.display = "block";
    document.getElementById("player-team-name").innerText = teamName;

    teamNameInput.value = teamName;
    teamColorInput.value = teamColor;
  }

  // Join form submission
  joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    teamName = teamNameInput.value.trim();
    teamColor = teamColorInput.value;

    if (!teamName || !teamColor) return;

    // Save to session storage
    sessionStorage.setItem("teamName", teamName);
    sessionStorage.setItem("teamColor", teamColor);

    // Register team in backend
    await fetch("/functions.php?action=register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName, color: teamColor })
    });

    // Switch to buzz screen
    document.getElementById("join-screen").style.display = "none";
    document.getElementById("buzz-screen").style.display = "block";
    document.getElementById("player-team-name").innerText = teamName;
  });

  // Buzz button click
  buzzButton.addEventListener("click", async () => {
    buzzButton.disabled = true;

    await fetch("/functions.php?action=buzz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName, color: teamColor })
    });
  });

  let lastResetTime = 0; // track last reset seen

    setInterval(async () => {
    if (!teamName) return;

    const res = await fetch("/functions.php?action=status");
    const data = await res.json();

    // If the resetTime is newer than last seen, enable button
    if (data.resetTime && data.resetTime > lastResetTime) {
        buzzButton.disabled = false;
        lastResetTime = data.resetTime;
    }
    }, 2000);
});