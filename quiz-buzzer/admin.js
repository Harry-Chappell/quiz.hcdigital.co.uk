const REST_BASE = (window.QuizBuzzerConfig && window.QuizBuzzerConfig.restBase) ? window.QuizBuzzerConfig.restBase : '/wp-json/quiz/v1/';

async function loadTeams(){
    const res = await fetch(REST_BASE + 'teams');
    const data = await res.json();
    const container = document.getElementById('team-list');
    container.innerHTML = '';

    data.forEach(team=>{
        const div = document.createElement('div');
        div.style.border = `2px solid ${team.color}`;
        div.style.padding = '0.5rem';
        div.style.margin = '0.5rem';
        div.innerHTML = `
            <strong>${team.name}</strong> - Score: <span class="score">${team.score}</span>
            <button class="add button">+1</button>
            <input type="number" class="score-input" placeholder="Add points" style="width:60px;">
            <button class="add-custom button">Add</button>
            <button class="delete button">Delete</button>
        `;

        // +1 button
        div.querySelector('.add').addEventListener('click', ()=>adjustScore(team.name,1));

        // custom input
        div.querySelector('.add-custom').addEventListener('click', ()=>{
            const inputVal = parseInt(div.querySelector('.score-input').value);
            if (!isNaN(inputVal) && inputVal !== 0){
                adjustScore(team.name, inputVal);
                div.querySelector('.score-input').value = '';
            }
        });

        // Delete button
        div.querySelector('.delete').addEventListener('click', ()=>deleteTeam(team.name));

        container.appendChild(div);
    });
}

async function adjustScore(name, delta){
    await fetch(REST_BASE + `adjustScore?team=${encodeURIComponent(name)}&delta=${delta}`);
    loadTeams();
}

async function deleteTeam(name){
    await fetch(REST_BASE + `deleteTeam?team=${encodeURIComponent(name)}`);
    loadTeams();
}

// Reset buzzers + initialization helper
function initAdminUI(){
    const resetBtn = document.getElementById('reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', async ()=>{
            await fetch(REST_BASE + 'reset', {method:'POST'});
            loadTeams();
        });
    }
    loadTeams();
    // optional auto-refresh
    // setInterval(loadTeams,5000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminUI);
} else {
    initAdminUI();
}
