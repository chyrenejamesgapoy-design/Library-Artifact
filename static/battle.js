let userTrophies = 0;

// Logic for Rank Progression
function getRank(trophies) {
    if (trophies >= 100) return "Mythical";
    if (trophies >= 60) return "Legend";
    if (trophies >= 50) return "Epic";
    if (trophies >= 40) return "Grandmaster";
    if (trophies >= 30) return "Master";
    if (trophies >= 20) return "Elite";
    return "Warrior";
}

function startBattle() {
    const container = document.getElementById('battleContainer');
    const button = document.getElementById('arenaBtn');
    
    // Disable button during search
    button.disabled = true;
    button.innerText = "SEARCHING...";

    // Inject Searching UI
    container.innerHTML = `
        <div class="radar-scope"></div>
        <div class="searching-text">FINDING OPPONENT...</div>
    `;

    // Simulate Battle Duration (Smooth animation)
    setTimeout(() => {
        userTrophies += 3; // Win 3 trophies per battle
        const currentRank = getRank(userTrophies);
        
        // Update Stats
        document.getElementById('rankName').innerText = currentRank;
        document.getElementById('trophyValue').innerText = userTrophies + " TROPHIES";
        
        // Success State
        container.innerHTML = `
            <div class="searching-text" style="color:#fbbf24">VICTORY!</div>
            <div style="font-size: 0.8rem; margin-top: 10px;">+3 TROPHIES ACQUIRED</div>
        `;
        
        button.disabled = false;
        button.innerText = "Enter Arena";
    }, 4000); // 4 seconds for a "very smooth" feel
}

let currentMode = 'ranked';
let canEarnTrophies = true;

function selectMode(element, mode, isRanked) {
    // UI Update
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    
    // Set Logic Flags
    currentMode = mode;
    canEarnTrophies = isRanked;
    
    const statusText = document.getElementById('statusText');
    statusText.innerText = isRanked ? "RANKED PROTOCOL READY" : `${mode.toUpperCase()} MODE ACTIVE`;
    statusText.style.color = isRanked ? "#fbbf24" : "#38bdf8";
}

function startBattle() {
    console.log(`Starting ${currentMode}. Trophies: ${canEarnTrophies}`);
    // Only proceed with trophy logic if canEarnTrophies is true
}