// 1. Remove splash screen after delay
setTimeout(() => {
    const intro = document.getElementById('intro');
    if (intro) intro.remove();
}, 2500);

// 2. Mobile Menu Toggle
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileMenu.classList.toggle('hidden');
    });
    window.addEventListener('click', () => mobileMenu.classList.add('hidden'));
}

// Store timers globally so we can cancel them if the user taps back early
let flipTimers = {};

function flipCard(id) {
    const card = document.getElementById(`inner-${id}`);
    
    if (!card.classList.contains('is-flipped')) {
        // --- FLIPPING TO THE BACK ---
        card.classList.add('is-flipped');

        // Start the 10-second auto-reset
        let timeLeft = 10;
        const timerDisplay = document.getElementById(`timer-${id}`);
        if(timerDisplay) timerDisplay.innerText = timeLeft;

        // Clear any existing timer for this specific card
        clearInterval(flipTimers[id]);

        flipTimers[id] = setInterval(() => {
            timeLeft--;
            if(timerDisplay) timerDisplay.innerText = timeLeft;

            if (timeLeft <= 0) {
                clearInterval(flipTimers[id]);
                card.classList.remove('is-flipped');
            }
        }, 1000);

    } else {
        // --- MANUAL TAP TO FLIP BACK TO FRONT ---
        card.classList.remove('is-flipped');
        
        // Kill the timer immediately since the card is already home
        clearInterval(flipTimers[id]);
    }
}
// 4. Persistent Gold Collection logic
let cooldown = false;
const mineBtn = document.getElementById('mineBtn');
const goldCountDisplay = document.getElementById('gold-count');
const btnText = document.getElementById('btnText');

// Check for existing cooldown when page loads/refreshes
window.addEventListener('DOMContentLoaded', () => {
    const savedEndTime = localStorage.getItem('miningCooldownEnd');
    if (savedEndTime) {
        const remaining = Math.ceil((parseInt(savedEndTime) - Date.now()) / 1000);
        if (remaining > 0) {
            startCooldownTimer(remaining);
        } else {
            localStorage.removeItem('miningCooldownEnd');
        }
    }
});

if (mineBtn) {
    mineBtn.addEventListener('click', function() {
        if (cooldown) return;

        cooldown = true;
        this.style.opacity = "0.5";
        this.disabled = true;

        fetch('/collect_gold', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(res => res.json())
        .then(data => {
            if (data.new_gold) {
                if (goldCountDisplay) goldCountDisplay.innerText = data.new_gold;
                
                // Set end time 60 seconds from now and save to storage
                const endTime = Date.now() + (60 * 1000);
                localStorage.setItem('miningCooldownEnd', endTime);
                startCooldownTimer(60);
            }
        })
        .catch(err => {
            console.error("Mining Error:", err);
            cooldown = false;
            this.disabled = false;
        });
    });
}

function startCooldownTimer(seconds) {
    cooldown = true;
    mineBtn.style.opacity = "0.5";
    mineBtn.disabled = true;
    let timeLeft = seconds;

    const cd = setInterval(() => {
        timeLeft--;
        if (btnText) btnText.innerText = `COOLDOWN [${timeLeft}S]`;
        
        if (timeLeft <= 0) {
            clearInterval(cd);
            cooldown = false;
            mineBtn.style.opacity = "1";
            mineBtn.disabled = false;
            if (btnText) btnText.innerText = "COLLECT GOLD";
            localStorage.removeItem('miningCooldownEnd');
        }
    }, 1000);
}

// 5. AJAX Upgrade (Prevents page reset)
function upgradeArtifact(id) {
    const overlay = document.getElementById('forgeOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');
    }

    fetch(`/upgrade/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(res => {
        // We reload to update levels/stats, but the timer will stay 
        // because we saved it in localStorage above!
        window.location.reload();
    })
    .catch(err => console.error("Upgrade Error:", err));
}

// 6. SUMMONING PROTOCOL
const forgeForm = document.querySelector('form[action="/forge"]');
const summoningOverlay = document.getElementById('summoningOverlay');
const summonTimer = document.getElementById('summonTimer');
const summonProgress = document.getElementById('summonProgress');

if (forgeForm) {
    forgeForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Stop immediate submission

        // 1. Show the overlay
        summoningOverlay.classList.remove('hidden');
        summoningOverlay.classList.add('flex');

        let timeLeft = 10;
        const totalDash = 251; // Circumference of the circle

        const summonCount = setInterval(() => {
            timeLeft--;
            summonTimer.innerText = timeLeft;
            
            // Update circular progress bar
            const offset = totalDash - (timeLeft / 10) * totalDash;
            summonProgress.style.strokeDashoffset = offset;

            // Optional: Visual impact flash every second
            summoningOverlay.classList.add('impact-flash');
            setTimeout(() => summoningOverlay.classList.remove('impact-flash'), 100);

            if (timeLeft <= 0) {
                clearInterval(summonCount);
                // 2. Finally submit the form to Flask
                forgeForm.submit();
            }
        }, 1000);
    });
}

function handleButtonClick() {
    const btn = document.getElementById('collectBtn');
    const text = document.getElementById('btnText');

    // 1. Enter "Cooldown" Visual State
    // Remove Yellow
    btn.classList.remove('bg-yellow-500', 'hover:bg-yellow-400', 'shadow-[0_0_15px_rgba(245,158,11,0.4)]');
    
    // Add Gray & Disabled Look
    btn.classList.add('bg-gray-700', 'text-gray-400', 'cursor-not-allowed', 'opacity-50');
    btn.disabled = true; 

    // 2. Your existing cooldown logic starts here...
    // (Wait for your timer to finish)
    
    // 3. When the timer finishes, call this to bring the UI back:
    // restoreButtonUI(btn, text);
}

function restoreButtonUI(btn, text) {
    // Remove Gray
    btn.classList.remove('bg-gray-700', 'text-gray-400', 'cursor-not-allowed', 'opacity-50');
    
    // Restore Yellow
    btn.classList.add('bg-yellow-500', 'hover:bg-yellow-400', 'shadow-[0_0_15px_rgba(245,158,11,0.4)]');
    btn.disabled = false;
    text.innerText = "COLLECT AU";
}
/**
 * ARTIFACT OS - Gold Collection Protocol
 * Handles animations and real-time database syncing
 */

async function handleGoldCollection() {
    const btn = document.getElementById('collectBtn');
    const miningArea = document.getElementById('miningArea');

    // Prevent double-clicking during transition
    btn.disabled = true;

    try {
        const response = await fetch('/collect_gold', { method: 'POST' });
        const data = await response.json();

        if (data.new_gold) {
            // 1. Trigger the "God Mode" Particle Effect
            createGoldBurst(miningArea, data.reward);

            // 2. Update the Global Gold Display (650 AU reference)
            const goldDisplay = document.getElementById('gold-display');
            if (goldDisplay) {
                goldDisplay.innerText = data.new_gold;
                goldDisplay.classList.add('pulse-effect');
                setTimeout(() => goldDisplay.classList.remove('pulse-effect'), 500);
            }

            // 3. Handle Cooldown Transition
            startCooldown(btn);
        } else {
            console.error("Collection Failed: Unauthorized or System Error");
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Network Error in Mining Protocol:", error);
        btn.disabled = false;
    }
}

function createGoldBurst(container, amount) {
    const burst = document.createElement('div');
    burst.className = 'gold-burst-animation';
    burst.innerHTML = `✨ +${amount} <i class="fas fa-coins"></i>`;
    
    container.appendChild(burst);

    // Remove element after animation finishes to save memory
    burst.addEventListener('animationend', () => {
        burst.remove();
    });
}

function startCooldown(button) {
    let timeLeft = 275; // Based on your current cooldown UI
    button.classList.add('btn-cooldown');
    
    const timer = setInterval(() => {
        button.innerText = `COOLDOWN [${timeLeft}S]`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timer);
            button.innerText = "COLLECT PROTOCOL";
            button.classList.remove('btn-cooldown');
            button.disabled = false;
        }
    }, 1000);
}

async function collectMiningGold() {
    const response = await fetch('/collect_gold', { method: 'POST' });
    const data = await response.json();
    
    if (data.new_gold) {
        // Update Gold Display
        document.getElementById('gold-count').innerText = data.new_gold;
        
        // Trigger God-Mode Animation
        spawnGoldText(data.reward);
    }
}

function spawnGoldText(amount) {
    const area = document.querySelector('.mining-container');
    const burst = document.createElement('div');
    burst.className = 'gold-burst';
    burst.innerText = `+${amount} AU`;
    area.appendChild(burst);
    setTimeout(() => burst.remove(), 800);
}

function triggerDismantle(id, name) {
    const modal = document.getElementById('dismantleModal');
    const nameSpan = document.getElementById('targetName');
    const form = document.getElementById('confirmDismantleForm');
    
    nameSpan.innerText = name;
    form.action = `/delete/${id}`;
    
    modal.classList.remove('hidden');
    // Sound: soft magical hum
    new Audio('/static/sounds/hum.mp3').play().catch(() => {}); 
}

function closeDismantle() {
    document.getElementById('dismantleModal').classList.add('hidden');
}

function executeDismantle() {
    const modalContent = document.querySelector('#dismantleModal > div:last-child');
    
    // Trigger Screen Shake & Particle Flash
    document.body.classList.add('animate-shake');
    modalContent.classList.add('animate__animated', 'animate__fadeOutDown');
    
    // Sound: Click Energy Sound
    new Audio('/static/sounds/energy_click.mp3').play().catch(() => {});

    setTimeout(() => {
        document.getElementById('confirmDismantleForm').submit();
    }, 600);
}

// --- Smooth Counter for Gold Ticker ---
function animateGold(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --- Card Flip with Haptic Feel ---
function flipCard(cardId) {
    const inner = document.getElementById(`inner-${cardId}`);
    if (inner) {
        inner.classList.toggle('is-flipped');
        // Reset 3D tilt on flip so it doesn't look glitchy
        inner.style.transform = inner.classList.contains('is-flipped') 
            ? 'rotateY(180deg)' 
            : 'rotateY(0deg)';
    }
}

// --- 3D Parallax Tilt Effect ---
document.querySelectorAll('.card-container').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const inner = card.querySelector('.card-inner');
        if (inner.classList.contains('is-flipped')) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Calculate rotation (max 15 degrees)
        const rotateX = (centerY - y) / 10;
        const rotateY = (x - centerX) / 10;
        
        inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    card.addEventListener('mouseleave', (e) => {
        const inner = card.querySelector('.card-inner');
        if (!inner.classList.contains('is-flipped')) {
            inner.style.transform = 'rotateX(0deg) rotateY(0deg)';
        }
    });
});

// --- Enhanced Collect Gold Feedback ---
function handleCollectGold() {
    const goldCount = document.getElementById('gold-count');
    const current = parseInt(goldCount.innerText);
    
    // Add "Pop" animation
    goldCount.classList.add('animate__animated', 'animate__bounceIn');
    
    // You'll need to update the end value based on your actual reward
    // This just simulates the visual ticker
    animateGold("gold-count", current, current + 500, 800);

    setTimeout(() => {
        goldCount.classList.remove('animate__bounceIn');
    }, 1000);
}

function triggerSuccessSequence(id, newPower, newLvl) {
    const flash = document.getElementById('flashEffect');
    const powerText = document.getElementById(`power-${id}`);
    const lvlText = document.getElementById(`lvl-${id}`);

    // Screen flash for impact
    gsap.to(flash, { opacity: 0.8, duration: 0.1, onComplete: () => gsap.to(flash, { opacity: 0, duration: 1 }) });

    // Smooth counter roll for Power
    let obj = { p: parseInt(powerText.innerText) };
    gsap.to(obj, {
        p: newPower,
        duration: 2.5,
        ease: "expo.out",
        onUpdate: () => {
            powerText.innerText = Math.floor(obj.p);
        }
    });

    // Level pop animation
    gsap.fromTo(lvlText, 
        { scale: 1.5, color: "#ffffff" }, 
        { scale: 1, color: "#6366f1", duration: 1, ease: "elastic.out(1, 0.3)" }
    );
}

let userTrophies = 0; // Each battle adds 3

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
    
    // Switch to searching state
    button.innerText = "SEARCHING...";
    container.innerHTML = `
        <div class="radar-scope"></div>
        <div class="searching-text">FINDING OPPONENT...</div>
    `;

    // Simulate finding an opponent after 3 seconds
    setTimeout(() => {
        userTrophies += 3;
        const currentRank = getRank(userTrophies);
        
        // Update UI
        document.getElementById('rankName').innerText = currentRank;
        document.getElementById('trophyValue').innerText = userTrophies + " TROPHIES";
        
        button.innerText = "ENTER ARENA";
        container.innerHTML = `<div class="searching-text" style="color:#fff">OPPONENT DEFEATED! +3 TROPHIES</div>`;
    }, 3000);
}

document.getElementById('forgeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    startForging();
});

function startForging() {
    const name = document.getElementById('inputName').value;
    const overlay = document.getElementById('summoningOverlay');
    const hammerSound = document.getElementById('hammerSound');
    const timerText = document.getElementById('summonTimer');
    const progressCircle = document.getElementById('summonProgress');
    
    overlay.classList.remove('hidden');
    let timeLeft = 5;
    let dashOffset = 314;

    // Trigger Hammer Sound in sync with animation
    const hammerInterval = setInterval(() => {
        hammerSound.currentTime = 0;
        hammerSound.play();
    }, 800); // Matches CSS animation duration

    const countdown = setInterval(() => {
        timeLeft--;
        timerText.innerText = timeLeft;
        
        // Progress circle calculation
        dashOffset -= (314 / 5);
        progressCircle.style.strokeDashoffset = dashOffset;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            clearInterval(hammerInterval);
            overlay.classList.add('hidden');
            showCongratulations(name);
        }
    }, 1000);
}

function showCongratulations(name) {
    const modal = document.getElementById('revealModal');
    const nameDisplay = document.getElementById('artifactNameReveal');
    const revealSound = document.getElementById('revealSound');
    
    // Set Name and Play Sound
    nameDisplay.innerText = name.toUpperCase();
    revealSound.play();
    
    // Simulate Rarity Randomly for Visuals
    const rarities = ['Common', 'Rare', 'Epic', 'Legendary'];
    const chosen = rarities[Math.floor(Math.random() * rarities.length)];
    const badge = document.getElementById('rarityBadge');
    const card = document.getElementById('visualCard');
    
    badge.innerText = chosen + " Artifact";
    badge.className = `px-6 py-2 rounded-full border border-white/20 bg-white/5 text-[10px] font-black uppercase tracking-[0.4em] mb-4 ${chosen.toLowerCase()}-text`;
    
    // Update Card Border color based on rarity
    const colors = { Common: '#9ca3af', Rare: '#6366f1', Epic: '#a855f7', Legendary: '#f59e0b' };
    card.style.borderColor = colors[chosen];

    modal.classList.remove('hidden');
}

function closeReveal() {
    // Reload to show new item in grid
    location.reload(); 
}

/**
 * LIBRARY ARTIFACT SYSTEM - CORE LOGIC
 */

// 1. FORGE PROTOCOL WITH LIMIT CHECK
function handleForgeSubmit(e) {
    e.preventDefault();
    
    const form = e.currentTarget;
    // We grab the numbers from the HTML data-attributes we set up
    const currentCount = parseInt(form.dataset.currentCount);
    const maxLimit = parseInt(form.dataset.maxLimit);

    // Check if slots are full
    if (currentCount >= maxLimit) {
        const limitModal = document.getElementById('limitModal');
        if (limitModal) {
            limitModal.classList.remove('hidden');
        }
        return;
    }

    // If slots are available, start the forging sequence
    const overlay = document.getElementById('summoningOverlay');
    const hammerSound = document.getElementById('hammerSound');
    const timerDisplay = document.getElementById('summonTimer');

    if (overlay) overlay.classList.remove('hidden');
    
    let timeLeft = 10;

    // Trigger Hammer Sound Loop
    const soundInterval = setInterval(() => {
        if (hammerSound) {
            hammerSound.currentTime = 0;
            hammerSound.play();
        }
    }, 800);

    // Countdown and Final Submission
    const timer = setInterval(() => {
        timeLeft--;
        if (timerDisplay) timerDisplay.innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timer);
            clearInterval(soundInterval);
            form.submit(); // Send data to Flask
        }
    }, 1000);
}

// 2. STABILIZED CARD FLIP LOGIC
function flipCard(id) {
    const inner = document.getElementById('inner-' + id);
    if (inner) {
        inner.classList.toggle('is-flipped');
    }
}

// 3. GOLD COLLECTION (If you use this function name)
function handleCollectGold() {
    window.location.href = '/collect_gold';
}

// 4. DISMANTLE CONFIRMATION
function triggerDismantle(id) {
    if (confirm("Are you sure you want to dismantle this artifact? This cannot be undone.")) {
        window.location.href = `/dismantle/${id}`;
    }
}