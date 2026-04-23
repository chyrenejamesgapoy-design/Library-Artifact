
const bgMusic = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/descent/background%20music.mp3');
const loginClick = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/GravityStar/onyx.mp3');
const loadingHum = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/descent/got_item.mp3');

bgMusic.loop = true;
bgMusic.volume = 0.5;


function initAudio() {

    bgMusic.play().then(() => {
        console.log("Audio Unlocked");
    }).catch(error => {
        console.log("Waiting for user click to start music...");
    });
}

function playLoginSequence() {
    loginClick.play();
    loadingHum.play();
}


window.addEventListener('click', () => {
    initAudio();
}, { once: true });

form.addEventListener('submit', function(e) {
    e.preventDefault();


    if (typeof playLoginSequence === "function") {
        playLoginSequence();
    }
    
    loader.classList.remove('hidden');
    setTimeout(() => bar.style.width = '100%', 50);

    let step = 0;
    const textTimer = setInterval(() => {
        if (step < statusSteps.length) text.innerText = statusSteps[step++];
    }, 1200);

    setTimeout(() => {
        clearInterval(textTimer);
        form.submit();
    }, 6000);
});

