<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Quiz Display</title>
<link rel="stylesheet" href="/style.css">
<style>
.team-box {border:4px solid var(--team-color,#000); padding:1rem; margin:1rem; border-radius:10px; display:inline-block; min-width:200px; text-align:center;}
</style>
</head>
<body>
<h1>Buzz Queue</h1>
<div id="queue"></div>

<script>
async function loadQueue(){
    const res = await fetch("/functions.php?action=queueFull");
    const data = await res.json();
    const queueDiv = document.getElementById("queue");
    queueDiv.innerHTML = "";

    const sortedTeams = Object.entries(data.teams)
      .map(([name, info]) => ({ name, ...info }))   // Add 'name' field
      .sort((a,b) => b.score - a.score);

    sortedTeams.forEach(team => {
      const buzzEntry = data.queue.find(q => q.name === team.name);
      let delayText = "";
      let buzzedClass = "";

      if (buzzEntry) {
        if (buzzEntry.delay === 0) {
          delayText = "Buzzed first!";
          buzzedClass = "first-buzz";
        } else {
          delayText = `Delay: ${buzzEntry.delay.toFixed(2)}s`;
          buzzedClass = "buzzed";
        }
      }

      const div = document.createElement("div");
      div.className = `team-box ${buzzedClass}`;
      div.style.setProperty("--team-color", team.color);
      div.innerHTML = `<strong>${team.name}</strong><br>Score: ${team.score}<br>${delayText}`;
      queueDiv.appendChild(div);
    });
}
setInterval(loadQueue,1000);
loadQueue();
</script>
</body>
</html>