<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quiz Buzzer - Join or Create Team</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="login-screen">
    <h2>Join an Existing Team</h2>
    <ul id="team-list"></ul>

    <h2>Or Create a New Team</h2>
    <form id="create-team-form">
      <input type="text" id="new-team-name" placeholder="Team name" required>

      <h3>Pick a Colour</h3>
      <ul id="colour-list" class="option-list"></ul>
      <input type="hidden" id="selected-colour" name="colour" required>

      <h3>Pick a Sound</h3>
      <ul id="sound-list" class="option-list"></ul>
      <input type="hidden" id="selected-sound" name="sound" required>

      <button type="submit">Create Team</button>
    </form>
  </div>

  <div id="buzzer-screen" style="display:none;">
    <h2 id="team-info"></h2>
    <button id="buzz-button">Buzz!</button>
    <p id="buzz-feedback"></p>
    <button id="logout-button">Log Out</button>
  </div>

  <script src="/scripts.js"></script>
</body>
</html>