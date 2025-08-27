<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quiz Display</title>
  <link rel="stylesheet" href="/style.css">
  <style>
    .team-box {
      border: 4px solid var(--team-color, #000);
      padding: 1rem;
      margin: 1rem;
      border-radius: 10px;
      font-size: 1.5rem;
      display: inline-block;
      min-width: 200px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>Buzz Queue</h1>
  <div id="queue"></div>

  <script>
    async function loadQueue() {
      const res = await fetch("/functions.php?action=queue");
      const data = await res.json();

      const queueDiv = document.getElementById("queue");
      queueDiv.innerHTML = "";

      data.forEach((entry, i) => {
        const div = document.createElement("div");
        div.className = "team-box";
        div.style.setProperty("--team-color", entry.color);
        div.innerHTML = `
          <strong>${i+1}. ${entry.name}</strong><br>
          <small>Delay: ${entry.delay.toFixed(2)}s</small>
        `;
        queueDiv.appendChild(div);
      });
    }

    setInterval(loadQueue, 1000);
    loadQueue();
  </script>
</body>
</html>