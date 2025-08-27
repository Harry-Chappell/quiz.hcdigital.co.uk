<?php include '../functions.php'; ?>
<!DOCTYPE html>
<html>
<head>
  <title>Admin - Quiz Buzzer</title>
  <link rel="stylesheet" href="../style.css">
</head>
<body>
  <h1>Admin Controls</h1>
  <button id="resetBtn">Reset Buzzers</button>
  <p id="resetStatus"></p>

  <script>
    document.getElementById('resetBtn').addEventListener('click', async () => {
      const formData = new FormData();
      formData.append('action', 'reset');
      const res = await fetch('../functions.php', { method: 'POST', body: formData });
      const data = await res.json();
      document.getElementById('resetStatus').innerText = "Queue Reset!";
    });
  </script>
</body>
</html>