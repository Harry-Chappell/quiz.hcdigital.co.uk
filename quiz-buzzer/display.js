const REST_BASE = (window.QuizBuzzerConfig && window.QuizBuzzerConfig.restBase) ? window.QuizBuzzerConfig.restBase : '/wp-json/quiz/v1/';

async function loadQueue(){
  try {
    const res = await fetch(REST_BASE + 'queueFull');
    const data = await res.json();
    const queueDiv = document.getElementById('queue');
    if (!queueDiv) return;
    queueDiv.innerHTML = '';

    const teams = data.teams || {};
    const sortedTeams = Object.entries(teams).map(([name, info]) => ({ name, ...info })).sort((a,b) => b.score - a.score);

    (sortedTeams||[]).forEach(team => {
      const buzzEntry = (data.queue||[]).find(q => q.name === team.name);
      let delayText = '';
      let buzzedClass = '';
      if (buzzEntry) {
        if (buzzEntry.delay === 0) { delayText = 'Buzzed first!'; buzzedClass = 'first-buzz'; }
        else { delayText = `Delay: ${buzzEntry.delay.toFixed(2)}s`; buzzedClass = 'buzzed'; }
      }
      const div = document.createElement('div');
      div.className = `team-box ${buzzedClass}`;
      div.style.setProperty('--team-color', team.color || '#000');
      div.innerHTML = `<strong>${team.name}</strong><br>Score: ${team.score}<br>${delayText}`;
      queueDiv.appendChild(div);
    });
  } catch (err) {
    console.error('loadQueue error', err);
  }
}

document.addEventListener('DOMContentLoaded', () => { loadQueue(); setInterval(loadQueue, 1000); });
