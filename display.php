<?php include '../functions.php'; ?>
<!DOCTYPE html>
<html>
<head>
  <title>Buzz Queue Display</title>
  <link rel="stylesheet" href="../style.css">
  <style>
    body { text-align: center; font-size: 2em; }
    .first { color: green; font-weight: bold; }
    .others { color: gray; }
  </style>
</head>
<body>
  <h1>Buzz Queue</h1>
  <div id="queue"></div>

  <script>
    async function fetchQueue() {
      const res = await fetch('../functions.php?action=get');
      const data = await res.json();
      const queueDiv = document.getElementById('queue');

      if (data.length === 0) {
        queueDiv.innerHTML = "<p>No buzzers yet</p>";
        return;
      }

      let firstTime = data[0].time;
      let html = "<ol>";
      data.forEach((b, i) => {
        let delay = (b.time - firstTime).toFixed(3);
        let delayText = i === 0 ? " (FIRST)" : ` (+${delay}s)`;
        html += `<li class="${i===0?'first':'others'}">${b.team} ${delayText}</li>`;
      });
      html += "</ol>";
      queueDiv.innerHTML = html;
    }

    setInterval(fetchQueue, 500);
  </script>
</body>
</html>