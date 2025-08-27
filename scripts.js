document.addEventListener('DOMContentLoaded', () => {
  const buzzBtn = document.getElementById('buzzBtn');
  const teamInput = document.getElementById('teamName');
  const status = document.getElementById('status');

  if (buzzBtn) {
    buzzBtn.addEventListener('click', async () => {
      let team = teamInput.value.trim();
      if (!team) {
        status.innerText = "Please enter a team name first.";
        return;
      }

      const formData = new FormData();
      formData.append('action', 'buzz');
      formData.append('team', team);

      const res = await fetch('functions.php', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.status === 'ok') {
        status.innerText = "Buzzed!";
      } else if (data.status === 'duplicate') {
        status.innerText = "Already buzzed!";
      }
    });
  }
});