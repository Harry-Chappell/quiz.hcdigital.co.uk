<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Quiz Admin</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<h1>Admin Panel</h1>

<button id="reset">Reset Buzzers</button>

<h2>Teams</h2>
<div id="team-list"></div>

<script>
async function loadTeams(){
    const res = await fetch("/functions.php?action=teams");
    const data = await res.json();
    const container = document.getElementById("team-list");
    container.innerHTML = "";

    data.forEach(team=>{
        const div = document.createElement("div");
        div.style.border = `2px solid ${team.color}`;
        div.style.padding = "0.5rem";
        div.style.margin = "0.5rem";
        div.innerHTML = `
            <strong>${team.name}</strong> - Score: <span class="score">${team.score}</span>
            <button class="add">+1</button>
            <input type="number" class="score-input" placeholder="Add points" style="width:60px;">
            <button class="add-custom">Add</button>
            <button class="delete">Delete</button>
        `;

        // +1 button
        div.querySelector(".add").addEventListener("click", ()=>adjustScore(team.name,1));

        // custom input
        div.querySelector(".add-custom").addEventListener("click", ()=>{
            const inputVal = parseInt(div.querySelector(".score-input").value);
            if (!isNaN(inputVal) && inputVal !== 0){
                adjustScore(team.name, inputVal);
                div.querySelector(".score-input").value = "";
            }
        });

        // Delete button
        div.querySelector(".delete").addEventListener("click", ()=>deleteTeam(team.name));

        container.appendChild(div);
    });
}

async function adjustScore(name, delta){
    await fetch(`/functions.php?action=adjustScore&team=${encodeURIComponent(name)}&delta=${delta}`);
    loadTeams();
}

async function deleteTeam(name){
    await fetch(`/functions.php?action=deleteTeam&team=${encodeURIComponent(name)}`);
    loadTeams();
}

// Reset buzzers
document.getElementById("reset").addEventListener("click",async()=>{
    await fetch("/functions.php?action=reset",{method:"POST"});
});

// Initial load + auto refresh every 5 seconds
loadTeams();
// setInterval(loadTeams,5000);
</script>
</body>
</html>