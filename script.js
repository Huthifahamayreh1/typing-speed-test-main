
let textsData  = {};                                          
let config     = { level: 'hard', mode: 'timed' };
let state      = {};
let bestScore  = parseInt(localStorage.getItem('typingBest') || '0', 10);
let isFirstEver = bestScore === 0;

const $ = id => document.getElementById(id);

const pbVal        = $('pb-val');
const wpmEl        = $('wpm');
const accEl        = $('accuracy');
const timerEl      = $('timer');
const textDisplay  = $('text-display');
const startOverlay = $('start-overlay');
const typingInput  = $('typing-input');
const testArea     = $('test-area');
const resultsScr   = $('results-screen');
const footerEl     = $('footer-el');

pbVal.textContent = bestScore + ' WPM';

fetch('data.json')
  .then(res => {
    if (!res.ok) throw new Error('Failed to load data.json');
    return res.json();
  })
  .then(data => {
    textsData = data;
    setup();
  })
  .catch(err => {
    console.error(err);
    textsData = {
      easy:   [{ text: "The sun rises in the east and sets in the west. Birds sing in the morning and the breeze is fresh and cool." }],
      medium: [{ text: "The industrial revolution transformed society in ways that few could have predicted. Factories replaced cottage industries." }],
      hard:   [{ text: "The archaeological expedition unearthed artifacts that complicated prevailing theories about Bronze Age trade networks." }]
    };
    setup();
  });

function setup() {
  clearInterval(state.timer);

  const pool = textsData[config.level] || [];
  const entry = pool[Math.floor(Math.random() * pool.length)];
  const text  = entry ? entry.text : '';

  textDisplay.innerHTML = '';
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    if (i === 0) s.classList.add('cursor');
    textDisplay.appendChild(s);
  });

  state = {
    index:      0,
    mistakes:   0,
    typed:      0,
    timeLeft:   60,
    timePassed: 0,
    started:    false,
    finished:   false,
    timer:      null,
    text
  };

  typingInput.value      = '';
  wpmEl.textContent      = '0';    wpmEl.className    = '';
  accEl.textContent      = '100%'; accEl.className    = '';
  timerEl.textContent    = '0:60'; timerEl.className  = '';

  testArea.style.display           = '';
  resultsScr.classList.remove('visible');
  footerEl.style.display           = '';
  $('stats-row').style.display     = '';

  
  textDisplay.classList.add('blurred');
  startOverlay.style.display = 'flex';
}

function startTest() {
  if (state.started || state.finished) return;
  state.started = true;
  textDisplay.classList.remove('blurred');
  startOverlay.style.display = 'none';
  typingInput.focus();
  startTimer();
}

function startTimer() {
  if (config.mode === 'timed') {
    state.timer = setInterval(() => {
      state.timeLeft--;
      const m = Math.floor(state.timeLeft / 60);
      const s = state.timeLeft % 60;
      timerEl.textContent = m + ':' + String(s).padStart(2, '0');
      timerEl.className   = state.timeLeft <= 10 ? 'caution' : '';
      if (state.timeLeft <= 0) endGame();
    }, 1000);
  } else {
    timerEl.textContent = '0:00';
    state.timer = setInterval(() => {
      state.timePassed++;
      const m = Math.floor(state.timePassed / 60);
      const s = state.timePassed % 60;
      timerEl.textContent = m + ':' + String(s).padStart(2, '0');
    }, 1000);
  }
}

typingInput.addEventListener('input', () => {
  if (state.finished) return;
  if (!state.started) startTest();

  const val   = typingInput.value;
  const spans = textDisplay.querySelectorAll('span');
  const len   = spans.length;
  const tLen  = val.length;

  if (spans[state.index]) spans[state.index].classList.remove('cursor');

  if (tLen < state.index) {
    for (let i = state.index - 1; i >= tLen; i--) {
      spans[i].classList.remove('correct', 'wrong', 'cursor');
    }
    state.index = tLen;
    state.typed = tLen;
    state.mistakes = 0;
    for (let i = 0; i < state.index; i++) {
      if (spans[i].classList.contains('wrong')) state.mistakes++;
    }
  } else {
    const i = state.index;
    if (i < len) {
      if (val[i] === spans[i].textContent) {
        spans[i].classList.add('correct');
      } else {
        spans[i].classList.add('wrong');
        state.mistakes++;
      }
      state.index++;
      state.typed = state.index;
    }
  }

  if (spans[state.index]) spans[state.index].classList.add('cursor');

  updateStats();

  if (config.mode === 'passage' && state.index >= len) {
    endGame();
    return;
  }

  if (config.mode === 'timed' && state.index >= len) {
    loadNextPassage();
  }
});

function loadNextPassage() {
  const pool  = textsData[config.level] || [];
  const entry = pool[Math.floor(Math.random() * pool.length)];
  const text  = entry ? entry.text : '';

  textDisplay.innerHTML = '';
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    if (i === 0) s.classList.add('cursor');
    textDisplay.appendChild(s);
  });

  state.index = 0;
  typingInput.value = '';
}


function updateStats() {
  const mins = config.mode === 'timed'
    ? (60 - state.timeLeft) / 60
    : state.timePassed / 60;

  if (mins > 0) {
    wpmEl.textContent = Math.max(0, Math.round((state.typed / 5) / mins));
  }
  if (state.typed > 0) {
    const acc = Math.max(0, Math.round(((state.typed - state.mistakes) / state.typed) * 100));
    accEl.textContent = acc + '%';
    accEl.className   = acc < 95 ? 'warn' : '';
  }
}
function endGame() {
  if (state.finished) return;
  state.finished = true;
  clearInterval(state.timer);

  const mins = config.mode === 'timed'
    ? (60 - state.timeLeft) / 60 || (1 / 60)
    : state.timePassed / 60      || (1 / 60);

  const wpm     = Math.max(0, Math.round((state.typed / 5) / mins));
  const acc     = state.typed > 0
    ? Math.max(0, Math.round(((state.typed - state.mistakes) / state.typed) * 100))
    : 100;
  const correct = state.typed - state.mistakes;
  const wrong   = state.mistakes;

  const newBest  = wpm > bestScore;
  const wasFirst = isFirstEver;

  if (newBest || wasFirst) {
    bestScore   = wpm;
    isFirstEver = false;
    localStorage.setItem('typingBest', wpm);
    pbVal.textContent = wpm + ' WPM';
  }

  showResults(wpm, acc, correct, wrong, newBest, wasFirst);
  if (newBest && !wasFirst) launchConfetti();
  else clearConfetti();
}
function showResults(wpm, acc, correct, wrong, newBest, wasFirst) {
  testArea.style.display  = 'none';
  footerEl.style.display  = 'none';
  $('stats-row').style.display = 'none';

  const iconWrap = $('result-icon-wrap');
  if (newBest && !wasFirst) {
    iconWrap.innerHTML =
      `<img src="assets/images/icon-new-pb.svg" class="result-icon" alt="New personal best!">`;
  } else {
    iconWrap.innerHTML =
      `<img src="assets/images/icon-completed.svg" class="result-icon" alt="Test complete">`;
  }

  const titleEl = $('result-title');
  const subEl   = $('result-sub');
  const goLbl   = $('go-again-label');

  if (wasFirst) {
    titleEl.textContent = 'Baseline Established!';
    subEl.textContent   = "You've set the bar. Now the real challenge begins—time to beat it.";
    goLbl.textContent   = 'Beat This Score';
  } else if (newBest) {
    titleEl.textContent = 'High Score Smashed!';
    subEl.textContent   = "You're getting faster. That was incredible typing.";
    goLbl.textContent   = 'Go Again';
  } else {
    titleEl.textContent = 'Test Complete!';
    subEl.textContent   = 'Solid run. Keep pushing to beat your high score.';
    goLbl.textContent   = 'Go Again';
  }

  $('res-wpm').textContent = wpm;

  const resAcc = $('res-acc');
  resAcc.textContent = acc + '%';
  resAcc.className   = 'res-card-val ' + (acc >= 100 ? 'val-green' : acc < 95 ? 'val-red' : '');

  $('res-chars').innerHTML =
    `<span class="val-green">${correct}</span>/<span class="val-red">${wrong}</span>`;

  resultsScr.classList.remove('visible');
  resultsScr.offsetHeight; 
  resultsScr.classList.add('visible');
}

$('go-again-btn').addEventListener('click', () => {
  resultsScr.classList.remove('visible');
  clearConfetti();
  setup();
});
$('restart-btn').addEventListener('click', setup);
$('start-btn').addEventListener('click', startTest);
textDisplay.addEventListener('click', () => { if (!state.started) startTest(); });

$('diff-selector').addEventListener('click', e => {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;
  $('diff-selector').querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  config.level = btn.dataset.level;
  $('m-diff').value = config.level; 
  setup();
});

$('mode-selector').addEventListener('click', e => {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;
  $('mode-selector').querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  config.mode = btn.dataset.mode;
  $('m-mode').value = config.mode; 
  setup();
});

$('m-diff').addEventListener('change', e => {
  config.level = e.target.value;
  $('diff-selector').querySelectorAll('.nav-btn')
    .forEach(b => b.classList.toggle('active', b.dataset.level === config.level));
  setup();
});

$('m-mode').addEventListener('change', e => {
  config.mode = e.target.value;
  $('mode-selector').querySelectorAll('.nav-btn')
    .forEach(b => b.classList.toggle('active', b.dataset.mode === config.mode));
  setup();
});

document.addEventListener('keydown', e => {
  if (state.started && !state.finished && e.key !== 'Tab') {
    typingInput.focus();
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    resultsScr.classList.remove('visible');
    clearConfetti();
    setup();
  }
});

function clearConfetti() {
  const wrap   = document.querySelector('.confetti-wrap');
  const canvas = $('confetti-canvas');
  const ctx    = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  wrap.classList.remove('active');
}

function launchConfetti() {
  const wrap    = document.querySelector('.confetti-wrap');
  const canvas  = $('confetti-canvas');
  wrap.classList.add('active');
  const ctx     = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = 220;

  const COLS = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4'];

  const pieces = Array.from({ length: 200 }, () => ({
    x:     Math.random() * canvas.width,
    y:     Math.random() * canvas.height,
    w:     6 + Math.random() * 10,
    h:     8 + Math.random() * 10,
    color: COLS[Math.floor(Math.random() * COLS.length)],
    vx:    (Math.random() - 0.5) * 1.5,
    vy:    0.3 + Math.random() * 0.8,  
    rot:   Math.random() * Math.PI * 2,
    vr:    (Math.random() - 0.5) * 0.12,
    op:    0.85 + Math.random() * 0.15
  }));

  let f = 0;
  (function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.vr;
      if (p.y > canvas.height) p.y = -p.h;
      if (p.x < -p.w) p.x = canvas.width;
      if (p.x > canvas.width + p.w) p.x = 0;
      ctx.save();
      ctx.globalAlpha = p.op;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    f++;
    if (f < 480) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}