<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Quiz Buzzer</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div id="join-screen">
    <h2>Join the Quiz</h2>
    
    <label for="existing-teams">Or pick an existing team:</label>
    <select id="existing-teams">
      <option value="">--Create New Team--</option>
    </select>

    <div id="new-team-form">
      <input type="text" id="team-name" placeholder="Team Name">
      <label for="team-color">Pick a colour:</label>
      <select id="team-color">
        <option value="">--Choose--</option>
        <option value="#e74c3c">Red</option>
        <option value="#3498db">Blue</option>
        <option value="#2ecc71">Green</option>
        <option value="#f1c40f">Yellow</option>
        <option value="#9b59b6">Purple</option>
        <option value="#e67e22">Orange</option>
      </select>
    </div>

    <button id="join-button">Join</button>
  </div>

  <div id="buzz-screen" style="display:none;">
    <h2 id="player-team-name"></h2>
    <button id="buzz-button">BUZZ!</button>
  </div>

  <script src="/scripts.js"></script>
</body>
</html>