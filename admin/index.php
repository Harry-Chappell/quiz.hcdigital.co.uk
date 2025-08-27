<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quiz Admin</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <h1>Admin Controls</h1>
  <button id="reset">Reset Buzzers</button>

  <script>
    document.getElementById("reset").addEventListener("click", async () => {
      await fetch("/functions.php?action=reset", { method: "POST" });
    });
  </script>
</body>
</html>