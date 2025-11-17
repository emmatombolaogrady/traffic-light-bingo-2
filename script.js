// Mobile Bingo Prototype (Ticket 5x3: 3 across x 5 down) - Universe grid removed
// Author: Prototype generated

const UNIVERSE_SIZE = 45; // total numbers
const ROWS = 5; // down
const COLS = 3; // across

// State
let drawPool = []; // remaining numbers
let ticketNumbers = []; // Ticket 1 numbers [row][col]
let ticketNumbers2 = [];
let ticketNumbers3 = [];
let drawnNumbers = new Set();
let lastDraw = null;
let firstWinnerFound = false;
let secondWinnerFound = false;
let fullHouseWinnerFound = false;
let firstPrizeColumnRef = null; // track first-prize column for delayed clearing
let secondPrizeColumnsRef = null; // track second prize columns for delayed clearing
let secondPrizeTicketIndex = null; // ticket index of second prize winner
// Timers for full house / leaderboard sequencing
let fullHouseWinTimer = null;
let leaderboardDelayTimer = null;
let championPanelTimer = null; // delay before showing leaderboard winner modal
let gameStarted = false;
let selectedAvatar = null;
let focusedTicketId = 'ticket';
let selectedBuyIn = null;
let preGameLobbyRemoved = false;
// Simulation (hidden opponent players)
let simulatedPlayersCount = 0; // number of opponent players (each has 3 tickets)
let hiddenPlayers = []; // Array<{ username:string, tickets:[grid,grid,grid], ticketSets:[Set,Set,Set] }>
// Sequential streak tracking structure added earlier
// Auto-call state
let autoCallActive = false;
let autoCallTimer = null;
let AUTO_CALL_INTERVAL = 2000; // was const, now let so we can change speed

// Element references (query after DOM parse via defer)
const ticketEl = document.getElementById('ticket');
const ticketEl2 = document.getElementById('ticket2');
const ticketEl3 = document.getElementById('ticket3');
const leaderboardEl = document.getElementById('leaderboard');
const drawBtn = document.getElementById('drawBtn');
const autoCallBtn = document.getElementById('autoCallBtn');
const newTicketBtn = document.getElementById('newTicketBtn');
const newTicketBtn2 = document.getElementById('newTicketBtn2');
const newTicketBtn3 = document.getElementById('newTicketBtn3');
const resetBtn = document.getElementById('resetBtn');
const lastDrawGraphicEl = document.getElementById('lastDrawGraphic');
const statusEl = document.getElementById('status');
const footerYearEl = document.getElementById('footerYear');
const trafficLightEl = document.querySelector('.traffic-light');
let trafficLightIndex = 0; // 0 red, 1 amber, 2 green

// Winner modals
const winnerModal = document.getElementById('winnerModal');
const winnerStage1 = document.getElementById('winnerStage1');
const winnerStage2 = document.getElementById('winnerStage2');
const winnerModal2 = document.getElementById('winnerModal2');
const winner2Stage1 = document.getElementById('winner2Stage1');
const winner2Stage2 = document.getElementById('winner2Stage2');
const winnerModal3 = document.getElementById('winnerModal3');
const winner3Stage1 = document.getElementById('winner3Stage1');
const winner3Stage2 = document.getElementById('winner3Stage2');
// Champion (leaderboard) modal elements
const leaderboardWinnerModal = document.getElementById('leaderboardWinnerModal');
const useFreePlayBtn = document.getElementById('useFreePlayBtn');
const keepFreePlayBtn = document.getElementById('keepFreePlayBtn');
// Lobby elements
const preGameLobby = document.getElementById('preGameLobby');
const startGameBtn = document.getElementById('startGameBtn');
// Leaderboard base players (starting sequential streak max = 0)
const BASE_PLAYERS = ['Alice1987','Benwinner1','Chloe432','Dylan111','Eve2win'];
let currentLeaderboard = BASE_PLAYERS.map(name => ({ name, max:0 }));
const avatarButtons = document.querySelectorAll('.avatar-btn');

// Prize traffic light labels
const redPrizeLabel = document.querySelector('.prize-label.red-prize');
const amberPrizeLabel = document.querySelector('.prize-label.amber-prize');
const greenPrizeLabel = document.querySelector('.prize-label.green-prize');

// Player mapping
const TICKET_PLAYERS = ['Ticket 1','Benwinner1','Chloe432']; // visible ticket usernames

// Pools for random simulated opponent usernames
const USERNAME_ADJECTIVES = ['Swift','Lucky','Bold','Rapid','Silent','Neon','Crimson','Azure','Iron','Frost','Shadow','Blaze'];
const USERNAME_NOUNS = ['Tiger','Falcon','Wizard','Rider','Ninja','Pirate','Comet','Vertex','Knight','Pixel','Echo','Nova'];

function generateRandomUsername(existingSet) {
  let name = '';
  let attempts = 0;
  do {
    const adj = USERNAME_ADJECTIVES[Math.floor(Math.random()*USERNAME_ADJECTIVES.length)];
    const noun = USERNAME_NOUNS[Math.floor(Math.random()*USERNAME_NOUNS.length)];
    const num = Math.floor(Math.random()*900)+100; // 100-999
    name = adj + noun + num;
    attempts++;
  } while(existingSet.has(name) && attempts < 50);
  return name;
}

// Sequential streak leaderboard (single ticket continuity)
function renderLeaderboard() {
  if (!leaderboardEl) return;
  leaderboardEl.innerHTML = '';
  currentLeaderboard.forEach(entry => {
    const { name, max } = entry;
    const shape = shapeForStreak(max);
    const li = document.createElement('li');
    li.className = 'lb-item';
    li.innerHTML = `
      <span class="rank ${shape.cls}" role="img" aria-label="${name} ${shape.aria}" data-shape="${shape.aria}"></span>
      <span class="name">${name}</span>
      <span class="score" data-score aria-label="Sequential streak ${max}">${max}</span>
    `;
    leaderboardEl.appendChild(li);
  });
}

function shapeForStreak(len) {
  if (len >= 9) return { cls: 'shape-burst', aria: 'burst shape' };
  if (len >= 7) return { cls: 'shape-hexagon', aria: 'hexagon shape' };
  if (len === 6) return { cls: 'shape-star', aria: 'star shape' };
  if (len === 5) return { cls: 'shape-diamond', aria: 'diamond shape' };
  if (len === 4) return { cls: 'shape-triangle', aria: 'triangle shape' };
  if (len === 3) return { cls: 'shape-square', aria: 'square shape' };
  return { cls: 'shape-circle', aria: 'circle shape' };
}

function initStreakTracking() {
  playerStreaks = {};
  // Visible tickets (one ticket per visible player)
  TICKET_PLAYERS.forEach((name, idx) => {
    playerStreaks[name] = { activeTicketIndex:0, current:0, max:0 };
  });
  // Hidden players (each has 3 tickets)
  hiddenPlayers.forEach(p => {
    playerStreaks[p.username] = { activeTicketIndex:-1, current:0, max:0 };
  });
}

function updateSequentialStreaks(drawnNumber) {
  // Visible players
  [ticketNumbers, ticketNumbers2, ticketNumbers3].forEach((grid, idx) => {
    const name = TICKET_PLAYERS[idx];
    const ps = playerStreaks[name];
    if (!ps || !visibleTicketSets[idx]) return;
    if (visibleTicketSets[idx].has(drawnNumber)) {
      // Always same ticket (only one) so just increment
      ps.current++;
      if (ps.current > ps.max) ps.max = ps.current;
    } else {
      ps.current = 0; // reset if miss
    }
  });
  // Hidden players
  hiddenPlayers.forEach(p => {
    const ps = playerStreaks[p.username];
    if (!ps) return;
    // Determine which tickets (if any) contain the drawn number
    const matches = [];
    p.ticketSets.forEach((set, idx) => { if (set.has(drawnNumber)) matches.push(idx); });
    if (matches.length === 0) {
      // No hit – streak ends
      ps.current = 0;
      ps.activeTicketIndex = -1;
      return;
    }
    if (ps.activeTicketIndex !== -1 && matches.includes(ps.activeTicketIndex)) {
      // Continue on same ticket
      ps.current++;
    } else {
      // Switch to first matching ticket; previous streak ends; new streak starts at 1
      ps.activeTicketIndex = matches[0];
      ps.current = 1;
    }
    if (ps.current > ps.max) ps.max = ps.current;
  });
}

function computeAndRenderSequentialLeaderboard() {
  const entries = Object.keys(playerStreaks).map(name => ({ name, max: playerStreaks[name].max }));
  // Ensure we always show 5 players: add baseline players with max 0 if missing
  BASE_PLAYERS.forEach(bp => {
    if (!entries.find(e => e.name === bp)) {
      entries.push({ name: bp, max: 0 });
    }
  });
  entries.sort((a,b) => b.max - a.max || a.name.localeCompare(b.name));
  currentLeaderboard = entries.slice(0,5).map(e => ({ name:e.name, max:e.max }));
  renderLeaderboard();
}

footerYearEl.textContent = new Date().getFullYear();

function init() {
  // Show lobby first; defer ticket generation until user starts game
  attachEvents();
  // Leaderboard will populate after first ticket generation / draw
  if (preGameLobby) {
    preGameLobby.hidden = false;
  }
  drawBtn.disabled = true;
  autoCallBtn.disabled = true;
  updateStatus('Select an avatar and a buy-in to begin.');
}

function generateTicket() {
  // Generate three tickets with NO overlapping numbers (partition full 1..45 across 3 tickets)
  drawnNumbers.clear();
  lastDraw = null;
  stopAutoCall(); // Stop auto-call when generating new tickets
  // Clear any pending timers from previous game
  if (fullHouseWinTimer) { clearTimeout(fullHouseWinTimer); fullHouseWinTimer = null; }
  if (leaderboardDelayTimer) { clearTimeout(leaderboardDelayTimer); leaderboardDelayTimer = null; }
  if (championPanelTimer) { clearTimeout(championPanelTimer); championPanelTimer = null; }
  // Clear leaderboard champion highlight if present
  clearLeaderboardChampion();
  if (lastDrawGraphicEl) {
    lastDrawGraphicEl.dataset.empty = 'true';
    lastDrawGraphicEl.textContent = '–';
    lastDrawGraphicEl.classList.remove('animate');
  }
  statusEl.className = 'status';

  const allNums = Array.from({ length: UNIVERSE_SIZE }, (_, i) => i + 1);
  shuffle(allNums);
  const sizePerTicket = ROWS * COLS; // 15
  const slice1 = allNums.slice(0, sizePerTicket).sort((a,b)=>a-b);
  const slice2 = allNums.slice(sizePerTicket, sizePerTicket*2).sort((a,b)=>a-b);
  const slice3 = allNums.slice(sizePerTicket*2, sizePerTicket*3).sort((a,b)=>a-b);

  ticketNumbers = reshapeTicket(slice1);
  ticketNumbers2 = reshapeTicket(slice2);
  ticketNumbers3 = reshapeTicket(slice3);

  renderTicket();
  renderTicket2();
  renderTicket3();
  updateOneToGoColumns();

  // Fresh draw pool (all numbers) since we regenerated all tickets
  drawPool = Array.from({ length: UNIVERSE_SIZE }, (_, i) => i + 1);
  shuffle(drawPool);
  drawBtn.disabled = false;
  firstWinnerFound = false;
  secondWinnerFound = false;
  fullHouseWinnerFound = false;
  if (winnerModal) winnerModal.hidden = true;
  if (winnerModal2) winnerModal2.hidden = true;
  if (winnerModal3) winnerModal3.hidden = true;

  // Regenerate simulated opponent tickets if active
  if (simulatedPlayersCount > 0) {
    generateSimulatedPlayers(simulatedPlayersCount);
  }
  // Precompute ticket Sets for visible tickets
  visibleTicketSets = [new Set(slice1), new Set(slice2), new Set(slice3)];
  // Hidden players will have their ticketSets built in generateSimulatedPlayers()
  initStreakTracking();
  computeAndRenderSequentialLeaderboard();
}

function reshapeTicket(flatArr) {
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = flatArr[r * COLS + c];
    }
  }
  return grid;
}

// Render first ticket (Ticket 1)
function renderTicket() {
  if (!ticketEl) return;
  ticketEl.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const num = ticketNumbers[r][c];
      const cell = document.createElement('div');
      cell.className = 'ticket-cell';
      cell.textContent = num;
      cell.dataset.num = num;
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.setAttribute('role', 'cell');
      ticketEl.appendChild(cell);
    }
  }
}

// second prize modal elements already captured above
function renderTicket2() {
  if (!ticketEl2) return;
  ticketEl2.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const num = ticketNumbers2[r][c];
      const cell = document.createElement('div');
      cell.className = 'ticket-cell';
      cell.textContent = num;
      cell.dataset.num = num;
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.setAttribute('role', 'cell');
      ticketEl2.appendChild(cell);
    }
  }
}

function renderTicket3() {
  if (!ticketEl3) return;
  ticketEl3.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const num = ticketNumbers3[r][c];
      const cell = document.createElement('div');
      cell.className = 'ticket-cell';
      cell.textContent = num;
      cell.dataset.num = num;
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.setAttribute('role', 'cell');
      ticketEl3.appendChild(cell);
    }
  }
}

function attachEvents() {
  drawBtn.addEventListener('click', onDraw);
  autoCallBtn.addEventListener('click', toggleAutoCall);
  newTicketBtn?.addEventListener('click', () => {
    generateTicket();
    updateStatus('All tickets regenerated (unique sets).');
    vibrate(12);
  });
  newTicketBtn2?.addEventListener('click', () => {
    generateTicket();
    updateStatus('All tickets regenerated (unique sets).');
    vibrate(12);
  });
  newTicketBtn3?.addEventListener('click', () => {
    generateTicket();
    updateStatus('All tickets regenerated (unique sets).');
    vibrate(12);
  });
  resetBtn?.addEventListener('click', () => {
    resetDraws();
    updateStatus('Draws reset.');
  });
  // Avatar selection handlers
  avatarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      avatarButtons.forEach(b => b.setAttribute('aria-pressed','false'));
      btn.setAttribute('aria-pressed','true');
      selectedAvatar = btn.dataset.avatar;
      updateStartGameEnable();
    });
  });
  // Start game button
  startGameBtn?.addEventListener('click', () => {
    if (gameStarted) return;
    if (!selectedAvatar || !selectedBuyIn) {
      updateStatus('Please select both an avatar and a buy-in option to start.');
      vibrate(40);
      return;
    }
    gameStarted = true;
    // Remove lobby completely
    if (preGameLobby && !preGameLobbyRemoved) {
      preGameLobbyRemoved = true;
      preGameLobby.parentNode?.removeChild(preGameLobby);
    }
    generateTicket();
    updateStatus(`Game started. Avatar: ${selectedAvatar} • Buy-in: ${selectedBuyIn} ticket${selectedBuyIn === '1' ? '' : 's'}. Good luck!`);
    drawBtn.disabled = false;
    autoCallBtn.disabled = false;
    // Capture simulation count from input and generate hidden tickets
    const simInput = document.getElementById('simPlayerCount');
    if (simInput) {
      const val = parseInt(simInput.value, 10);
      simulatedPlayersCount = isNaN(val) ? 0 : Math.max(0, Math.min(200, val));
      if (simulatedPlayersCount > 0) {
        generateSimulatedPlayers(simulatedPlayersCount);
        updateStatus(`Simulation active with ${simulatedPlayersCount} opponent player${simulatedPlayersCount===1?'':'s'} (each 3 tickets). Game started.`);
        console.log('[Simulation] Generated', simulatedPlayersCount, 'players with', simulatedPlayersCount*3, 'hidden tickets');
      }
      // Initialize sequential streak tracking now that tickets (and possibly opponents) exist
      initStreakTracking();
      computeAndRenderSequentialLeaderboard();
    }
  });
  // Dynamic simulation player count adjustment
  const simInputDyn = document.getElementById('simPlayerCount');
  if (simInputDyn) {
    simInputDyn.addEventListener('change', () => {
      const val = parseInt(simInputDyn.value, 10);
      simulatedPlayersCount = isNaN(val) ? 0 : Math.max(0, Math.min(200, val));
      if (gameStarted) {
        if (simulatedPlayersCount > 0) {
          generateSimulatedPlayers(simulatedPlayersCount);
          updateStatus(`Simulation updated: ${simulatedPlayersCount} opponent player${simulatedPlayersCount===1?'':'s'} (3 tickets each).`);
          console.log('[Simulation] Updated to', simulatedPlayersCount, 'players (', simulatedPlayersCount*3, 'tickets )');
        } else {
          hiddenPlayers = [];
          updateStatus('Simulation disabled. No opponent players.');
          console.log('[Simulation] Disabled');
        }
      }
    });
  }
  // Ticket tab interactions
  document.querySelectorAll('.ticket-subtitle[role="tab"]').forEach(tab => {
    tab.addEventListener('click', () => handleTicketTabActivate(tab));
    tab.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTicketTabActivate(tab);
      }
    });
  });
  // Buy-in option selection
  document.querySelectorAll('.buyin-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.buyin-option').forEach(o => o.setAttribute('aria-pressed','false'));
      opt.setAttribute('aria-pressed','true');
      selectedBuyIn = opt.dataset.tickets;
      updateStatus(`Selected buy-in: ${selectedBuyIn} ticket${selectedBuyIn === '1' ? '' : 's'}.`);
      updateStartGameEnable();
    });
  });
}

function handleTicketTabActivate(tabEl) {
  const ticketId = tabEl.dataset.ticket;
  if (!ticketId) return;
  focusedTicketId = ticketId;
  // Update aria-selected
  document.querySelectorAll('.ticket-subtitle[role="tab"]').forEach(t => t.setAttribute('aria-selected', t === tabEl ? 'true' : 'false'));
  // Highlight focused block
  document.querySelectorAll('.ticket-block').forEach(block => block.classList.remove('focused'));
  const block = tabEl.closest('.ticket-block');
  block?.classList.add('focused');
  // Optional scroll into view (mobile)
  block?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateStartGameEnable() {
  if (!startGameBtn) return;
  const ready = !!selectedAvatar && !!selectedBuyIn;
  startGameBtn.disabled = !ready;
  startGameBtn.setAttribute('aria-disabled', String(!ready));
}

function onDraw() {
  if (!drawPool.length) return;
  const num = drawPool.pop(); // after shuffle this is random
  lastDraw = num;
  drawnNumbers.add(num);
  // Speak the number with a female voice
  speakNumber(num);
  // Update sequential streaks BEFORE marking tickets (membership independent of .hit class)
  updateSequentialStreaks(num);
  markTicketIfHit(num);
// Speak the called number using a female voice
function speakNumber(num) {
  if (!('speechSynthesis' in window)) return;
  // User gesture required: try to resume audio context if suspended
  if (typeof window.AudioContext !== 'undefined') {
    try {
      const ctx = window._bingoAudioCtx || (window._bingoAudioCtx = new window.AudioContext());
      if (ctx.state === 'suspended') ctx.resume();
    } catch(e) {}
  }
  const speak = () => {
    const utter = new SpeechSynthesisUtterance(num.toString());
    // Try to select a happy, positive, female English (prefer UK) voice
    const voices = window.speechSynthesis.getVoices();
    let female = voices.find(v =>
      v.lang.toLowerCase().startsWith('en-gb') &&
      v.name.match(/female|woman|Samantha|Google UK English Female|Microsoft Hazel|Susan|Emma|Victoria|Fiona|Linda|Karen|Tessa|Zira/i)
    );
    if (!female) {
      // fallback: any English female voice
      female = voices.find(v => v.lang.toLowerCase().startsWith('en') && v.name.match(/female|woman|Samantha|Hazel|Susan|Emma|Victoria|Fiona|Linda|Karen|Tessa|Zira/i));
    }
    if (!female) {
      // fallback: any English voice
      female = voices.find(v => v.lang.toLowerCase().startsWith('en'));
    }
    if (female) utter.voice = female;
    // Happy/positive: slightly higher pitch, slightly faster rate
    utter.rate = 1.08;
    utter.pitch = 1.25;
    utter.volume = 1;
    window.speechSynthesis.cancel(); // stop any previous
    window.speechSynthesis.speak(utter);
  };
  // Some browsers require voices to be loaded asynchronously
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = function handler() {
      window.speechSynthesis.onvoiceschanged = null;
      speak();
    };
    // Trigger loading
    window.speechSynthesis.getVoices();
  } else {
    speak();
  }
}
  updateOneToGoColumns();
  updateLastDraw(num);
  // Removed traffic light cycling per request (keep static)
  checkColumnWin();
  if (firstWinnerFound && !secondWinnerFound) {
    checkSecondPrize();
  }
  if (!fullHouseWinnerFound) {
    checkFullHouse();
  }
  // Update sequential leaderboard every draw
  computeAndRenderSequentialLeaderboard();
  vibrate(30);
  if (!drawPool.length) {
    drawBtn.disabled = true;
    stopAutoCall();
    updateStatus('All numbers drawn.');
  }
}

function resetDraws() {
  drawnNumbers.clear();
  lastDraw = null;
  stopAutoCall(); // Stop auto-call when resetting
  if (fullHouseWinTimer) { clearTimeout(fullHouseWinTimer); fullHouseWinTimer = null; }
  if (leaderboardDelayTimer) { clearTimeout(leaderboardDelayTimer); leaderboardDelayTimer = null; }
  if (championPanelTimer) { clearTimeout(championPanelTimer); championPanelTimer = null; }
  clearLeaderboardChampion();
  if (lastDrawGraphicEl) {
    lastDrawGraphicEl.textContent = '–';
    lastDrawGraphicEl.dataset.empty = 'true';
    lastDrawGraphicEl.classList.remove('animate');
  }
  // Reset traffic light to red
  trafficLightIndex = 0;
  updateTrafficLightActive();
  statusEl.className = 'status';
  [ticketEl, ticketEl2, ticketEl3].forEach(el => {
    el?.querySelectorAll('.ticket-cell').forEach(cell => cell.classList.remove('hit', 'bingo-row', 'bingo-col', 'bingo-col-first', 'bingo-col-second', 'one-to-go', 'two-prize-one-to-go'));
  });
  drawPool = Array.from({ length: UNIVERSE_SIZE }, (_, i) => i + 1);
  shuffle(drawPool);
  drawBtn.disabled = false;
  firstWinnerFound = false;
  secondWinnerFound = false;
  fullHouseWinnerFound = false;
  firstPrizeColumnRef = null;
  secondPrizeColumnsRef = null;
  secondPrizeTicketIndex = null;
  // Confetti removed: no cleanup needed
  if (winnerModal) winnerModal.hidden = true;
  if (winnerModal2) winnerModal2.hidden = true;
  if (winnerModal3) winnerModal3.hidden = true;
  updateOneToGoColumns();
  // Clear hidden tickets (will regenerate on next generateTicket)
  hiddenPlayers = [];
}

function markTicketIfHit(num) {
  [ticketEl, ticketEl2, ticketEl3].forEach(el => {
    if (!el) return;
    const ticketCell = el.querySelector(`.ticket-cell[data-num='${num}']`);
    if (ticketCell) ticketCell.classList.add('hit');
  });
}

// Near-win highlighting logic
// Before first prize OR after second prize: show generic one-to-go.
// After first prize (and before second prize): only show amber two-prize-one-to-go for a ticket that has exactly one completed column and another column one away.
function updateOneToGoColumns() {
  // Clear previous markers
  [ticketEl, ticketEl2, ticketEl3].forEach(el => {
    if (!el) return;
    el.querySelectorAll('.ticket-cell.one-to-go').forEach(c => c.classList.remove('one-to-go'));
    el.querySelectorAll('.ticket-cell.two-prize-one-to-go').forEach(c => c.classList.remove('two-prize-one-to-go'));
    el.querySelectorAll('.ticket-cell.fullhouse-one-to-go').forEach(c => c.classList.remove('fullhouse-one-to-go'));
  });

  const ticketDefs = [
    { nums: ticketNumbers, el: ticketEl },
    { nums: ticketNumbers2, el: ticketEl2 },
    { nums: ticketNumbers3, el: ticketEl3 }
  ];

  ticketDefs.forEach(t => {
    if (!t.el || !t.nums.length) return;
    // Collect completed columns
    const completedColumns = [];
    for (let c = 0; c < COLS; c++) {
      let allHit = true;
      for (let r = 0; r < ROWS; r++) {
        if (!drawnNumbers.has(t.nums[r][c])) { allHit = false; break; }
      }
      if (allHit) completedColumns.push(c);
    }

  // After first prize but before second prize: show only two-prize-one-to-go
    if (firstWinnerFound && !secondWinnerFound) {
      if (completedColumns.length === 1) {
        for (let c = 0; c < COLS; c++) {
          if (completedColumns.includes(c)) continue;
          let drawnCount = 0;
          let remainingNum = null;
          for (let r = 0; r < ROWS; r++) {
            const val = t.nums[r][c];
            if (drawnNumbers.has(val)) drawnCount++; else remainingNum = val;
          }
          if (drawnCount === ROWS - 1 && remainingNum != null) {
            const cell = t.el.querySelector(`.ticket-cell[data-num='${remainingNum}']`);
            if (cell && !cell.classList.contains('bingo-col')) {
              cell.classList.add('two-prize-one-to-go');
            }
          }
        }
      }
      return; // suppress generic one-to-go in this phase
    }

  // After second prize but before full house: highlight only tickets one number away from full house
    if (secondWinnerFound && !fullHouseWinnerFound) {
      const ticketSetsFH = [ticketNumbers, ticketNumbers2, ticketNumbers3];
      const ticketElsFH = [ticketEl, ticketEl2, ticketEl3];
      ticketSetsFH.forEach((nums, tIdx) => {
        const container = ticketElsFH[tIdx];
        if (!nums.length || !container) return;
        let hitCount = 0;
        let remainingCellNum = null;
        for (let r = 0; r < ROWS; r++) {
          for (let c2 = 0; c2 < COLS; c2++) {
            const val = nums[r][c2];
            if (drawnNumbers.has(val)) hitCount++; else remainingCellNum = val;
          }
        }
        if (hitCount === ROWS * COLS - 1 && remainingCellNum != null) {
          const cell = container.querySelector(`.ticket-cell[data-num='${remainingCellNum}']`);
          if (cell && !cell.classList.contains('bingo-col-first') && !cell.classList.contains('bingo-col-second')) {
            cell.classList.add('fullhouse-one-to-go');
          }
        }
      });
      return; // suppress other near-win highlights during full house chase
    }

    // Generic one-to-go (prior to first prize OR after full house phase ended)
    for (let c = 0; c < COLS; c++) {
      if (completedColumns.includes(c)) continue; // skip completed columns
      let drawnCount = 0;
      let remainingNum = null;
      for (let r = 0; r < ROWS; r++) {
        const val = t.nums[r][c];
        if (drawnNumbers.has(val)) drawnCount++; else remainingNum = val;
      }
      if (drawnCount === ROWS - 1 && remainingNum != null) {
        const cell = t.el.querySelector(`.ticket-cell[data-num='${remainingNum}']`);
        if (cell && !cell.classList.contains('bingo-col')) {
          cell.classList.add('one-to-go');
        }
      }
    }
  });
}

function updateLastDraw(num) {
  if (lastDrawGraphicEl) {
    lastDrawGraphicEl.dataset.empty = 'false';
    lastDrawGraphicEl.textContent = num;
    // restart animation
    lastDrawGraphicEl.classList.remove('animate');
    // force reflow to allow animation retrigger
    void lastDrawGraphicEl.offsetWidth;
    lastDrawGraphicEl.classList.add('animate');
  }
}

function checkColumnWin() {
  if (firstWinnerFound) return; // already have first prize
  const tickets = [
    { nums: ticketNumbers, el: ticketEl, username: TICKET_PLAYERS[0], hidden:false },
    { nums: ticketNumbers2, el: ticketEl2, username: TICKET_PLAYERS[1] || 'Player 2', hidden:false },
    { nums: ticketNumbers3, el: ticketEl3, username: TICKET_PLAYERS[2] || 'Player 3', hidden:false }
  ];
  hiddenPlayers.forEach(p => {
    p.tickets.forEach(grid => tickets.push({ nums: grid, el: null, username: p.username, hidden:true }));
  });
  for (let tIndex = 0; tIndex < tickets.length; tIndex++) {
    const t = tickets[tIndex];
    if (!t.nums.length) continue;
    for (let c = 0; c < COLS; c++) {
      let colComplete = true;
      for (let r = 0; r < ROWS; r++) {
        if (!drawnNumbers.has(t.nums[r][c])) { colComplete = false; break; }
      }
      if (colComplete) {
        declareFirstWinner(t.username, t.hidden, tIndex, c);
        return; // stop after first detected column
      }
    }
    // second prize handled after first prize awarded
  }
  const remaining = drawPool.length;
  updateStatus(`${remaining} number${remaining === 1 ? '' : 's'} remaining.`);
}

function declareFirstWinner(playerName, isHidden, ticketIndex, colIndex) {
  firstWinnerFound = true;
  drawBtn.disabled = true;
  stopAutoCall(); // Stop auto-call when first winner found
  updateStatus(`STOP! First winner: ${playerName}!`);
  statusEl.classList.add('celebrate');
  // Update red prize traffic light label with winner name (only first time)
  if (redPrizeLabel && !redPrizeLabel.dataset.winnerApplied) {
    const base = '1 column prize £10';
    redPrizeLabel.textContent = `${base} – ${playerName}`;
    redPrizeLabel.setAttribute('aria-label', `${base} won by ${playerName}`);
    redPrizeLabel.dataset.winnerApplied = 'true';
  }
  // Also personalize modal stage 2 title/detail if desired
  if (winnerStage2) {
    const modalTitle = winnerStage2.querySelector('.stage-title');
    const detail = winnerStage2.querySelector('.winner-detail');
    if (modalTitle) modalTitle.textContent = `Congratulations ${playerName}!`;
    if (detail) detail.textContent = 'You have won the 1 column prize!';
  }
  if (!isHidden) {
    applyFirstPrizeHighlight(ticketIndex, colIndex);
    clearTransientHighlights();
  }
  vibrate([60, 40, 120]);
  if (winnerModal) {
    winnerModal.hidden = false;
    runWinnerStages();
  }
  console.log('[Win] First prize winner:', playerName, 'hidden:', isHidden);
}

// Add red highlight class to the winning column; store reference for later removal
function applyFirstPrizeHighlight(ticketIndex, colIndex) {
  const ticketSets = [ticketNumbers, ticketNumbers2, ticketNumbers3];
  const ticketEls = [ticketEl, ticketEl2, ticketEl3];
  const nums = ticketSets[ticketIndex];
  const container = ticketEls[ticketIndex];
  if (!nums || !container) return;
  // Remove any existing first prize highlight (shouldn't normally exist)
  [ticketEl, ticketEl2, ticketEl3].forEach(el => {
    el?.querySelectorAll('.ticket-cell.bingo-col-first').forEach(c => c.classList.remove('bingo-col-first'));
  });
  for (let r = 0; r < ROWS; r++) {
    const num = nums[r][colIndex];
    const cell = container.querySelector(`.ticket-cell[data-num='${num}']`);
    if (cell) {
      cell.classList.remove('bingo-col', 'one-to-go');
      cell.classList.add('bingo-col-first');
    }
  }
  firstPrizeColumnRef = { ticketIndex, colIndex };
}

// Remove the red highlight after the modal sequence completes
function clearFirstPrizeHighlight() {
  if (!firstPrizeColumnRef) return;
  const { ticketIndex, colIndex } = firstPrizeColumnRef;
  const ticketSets = [ticketNumbers, ticketNumbers2, ticketNumbers3];
  const ticketEls = [ticketEl, ticketEl2, ticketEl3];
  const nums = ticketSets[ticketIndex];
  const container = ticketEls[ticketIndex];
  if (!nums || !container) return;
  for (let r = 0; r < ROWS; r++) {
    const num = nums[r][colIndex];
    const cell = container.querySelector(`.ticket-cell[data-num='${num}']`);
    if (cell) cell.classList.remove('bingo-col-first');
  }
  firstPrizeColumnRef = null;
}

function runWinnerStages() {
  if (!winnerStage1 || !winnerStage2) return;
  // Show stage 1
  winnerStage1.classList.remove('stage-hidden');
  winnerStage2.classList.add('stage-hidden');
  // After 3 seconds switch to stage 2
  setTimeout(() => {
    winnerStage1.classList.add('stage-hidden');
    winnerStage2.classList.remove('stage-hidden');
    updateStatus('Congratulations winner 123! Column prize awarded.');
    // Close after 2 more seconds
    setTimeout(() => {
      if (winnerModal) winnerModal.hidden = true;
      // Remove the first prize red highlight now that modal sequence ended
      clearFirstPrizeHighlight();
      drawBtn.disabled = false; // allow drawing toward second prize
      updateStatus('First prize awarded. Continue drawing for second prize.');
      // Increase auto-call speed to 1.5 seconds after 1 column prize panel is revealed and closed
      AUTO_CALL_INTERVAL = 1500;
    }, 2000);
  }, 3000);
}

// Second prize detection: two completed columns on a single ticket
function checkSecondPrize() {
  if (secondWinnerFound) return;
  const tickets = [
    { nums: ticketNumbers, el: ticketEl, username:TICKET_PLAYERS[0], hidden:false },
    { nums: ticketNumbers2, el: ticketEl2, username:TICKET_PLAYERS[1] || 'Player 2', hidden:false },
    { nums: ticketNumbers3, el: ticketEl3, username:TICKET_PLAYERS[2] || 'Player 3', hidden:false }
  ];
  hiddenPlayers.forEach(p => p.tickets.forEach(grid => tickets.push({ nums:grid, el:null, username:p.username, hidden:true })));
  for (let tIndex = 0; tIndex < tickets.length; tIndex++) {
    const t = tickets[tIndex];
    if (!t.nums.length) continue;
    const completedCols = [];
    for (let c = 0; c < COLS; c++) {
      let colComplete = true;
      for (let r = 0; r < ROWS; r++) {
        if (!drawnNumbers.has(t.nums[r][c])) { colComplete = false; break; }
      }
      if (colComplete) completedCols.push(c);
    }
    if (completedCols.length >= 2) {
      declareSecondPrize(t.username, t.hidden, tIndex, completedCols);
      return;
    }
  }
}

function declareSecondPrize(playerName, isHidden, ticketIndex, cols) {
  // Pause auto-call when the 2 column winner popup appears
  stopAutoCall();
  secondWinnerFound = true;
  secondPrizeTicketIndex = ticketIndex;
  // Highlight all completed columns
  const ticketSets = [ticketNumbers, ticketNumbers2, ticketNumbers3];
  const ticketEls = [ticketEl, ticketEl2, ticketEl3];
  if (!isHidden) {
    clearSecondPrizeHighlights();
    applySecondPrizeHighlights(ticketIndex, cols);
  }
  updateStatus(`WAIT! Second prize winner: ${playerName}!`);
  // Update amber prize traffic light label with second winner name
  if (amberPrizeLabel && !amberPrizeLabel.dataset.winnerApplied) {
    const base = '2 column prize £20';
    amberPrizeLabel.textContent = `${base} – ${playerName}`;
    amberPrizeLabel.setAttribute('aria-label', `${base} won by ${playerName}`);
    amberPrizeLabel.dataset.winnerApplied = 'true';
  }
  // Personalize modal stage 2 text
  if (winner2Stage2) {
    const modalTitle = winner2Stage2.querySelector('.stage-title');
    const detail = winner2Stage2.querySelector('.winner-detail');
    if (modalTitle) modalTitle.textContent = `Congratulations ${playerName}!`;
    if (detail) detail.textContent = 'You have won the 2 column prize!';
  }
  vibrate([80,50,140]);
  if (winnerModal2) {
    winnerModal2.hidden = false;
    runSecondPrizeStages();
  }
  // Keep draws enabled so user can continue immediately after (or during) display
  drawBtn.disabled = false;
  console.log('[Win] Second prize winner:', playerName, 'hidden:', isHidden);
}

// Remove transient highlights after second prize win (does NOT remove .hit)
function clearSecondPrizeHighlights() {
  [ticketEl, ticketEl2, ticketEl3].forEach(el => {
    if (!el) return;
    el.querySelectorAll('.ticket-cell.two-prize-one-to-go').forEach(c => c.classList.remove('two-prize-one-to-go'));
    el.querySelectorAll('.ticket-cell.one-to-go').forEach(c => c.classList.remove('one-to-go'));
    el.querySelectorAll('.ticket-cell.bingo-col').forEach(c => c.classList.remove('bingo-col'));
    el.querySelectorAll('.ticket-cell.fullhouse-one-to-go').forEach(c => c.classList.remove('fullhouse-one-to-go'));
  });
}

// Apply amber highlight to second prize columns and store reference
function applySecondPrizeHighlights(ticketIndex, cols) {
  const ticketSets = [ticketNumbers, ticketNumbers2, ticketNumbers3];
  const ticketEls = [ticketEl, ticketEl2, ticketEl3];
  const nums = ticketSets[ticketIndex];
  const container = ticketEls[ticketIndex];
  if (!nums || !container) return;
  secondPrizeColumnsRef = { ticketIndex, cols: [...cols] };
  cols.forEach(colIndex => {
    for (let r = 0; r < ROWS; r++) {
      const num = nums[r][colIndex];
      const cell = container.querySelector(`.ticket-cell[data-num='${num}']`);
      if (cell) {
        cell.classList.remove('bingo-col'); // remove any green
        cell.classList.add('bingo-col-second');
      }
    }
  });
}

// Clear amber second prize column highlight after modal sequence completes
function clearSecondPrizeColumnHighlights() {
  if (!secondPrizeColumnsRef) return;
  const { ticketIndex, cols } = secondPrizeColumnsRef;
  const ticketSets = [ticketNumbers, ticketNumbers2, ticketNumbers3];
  const ticketEls = [ticketEl, ticketEl2, ticketEl3];
  const nums = ticketSets[ticketIndex];
  const container = ticketEls[ticketIndex];
  if (!nums || !container) return;
  cols.forEach(colIndex => {
    for (let r = 0; r < ROWS; r++) {
      const num = nums[r][colIndex];
      const cell = container.querySelector(`.ticket-cell[data-num='${num}']`);
      if (cell) cell.classList.remove('bingo-col-second');
    }
  });
  secondPrizeColumnsRef = null;
}

function runSecondPrizeStages() {
  if (!winner2Stage1 || !winner2Stage2) return;
  winner2Stage1.classList.remove('stage-hidden');
  winner2Stage2.classList.add('stage-hidden');
  setTimeout(() => {
    winner2Stage1.classList.add('stage-hidden');
    winner2Stage2.classList.remove('stage-hidden');
    updateStatus('Congratulations winner 888! Two column prize awarded. Continue drawing.');
    setTimeout(() => {
      if (winnerModal2) winnerModal2.hidden = true;
      clearSecondPrizeColumnHighlights();
      updateStatus('Second prize awarded. Keep going!');
      // Increase auto-call speed to 1 second after 2 column prize panel is revealed and closed
      AUTO_CALL_INTERVAL = 1000;
    }, 2000);
  }, 3000);
}

// Full House: all numbers on a single ticket marked
function checkFullHouse() {
  if (fullHouseWinnerFound) return;
  const tickets = [
    { nums: ticketNumbers, el: ticketEl, username:TICKET_PLAYERS[0], hidden:false },
    { nums: ticketNumbers2, el: ticketEl2, username:TICKET_PLAYERS[1] || 'Player 2', hidden:false },
    { nums: ticketNumbers3, el: ticketEl3, username:TICKET_PLAYERS[2] || 'Player 3', hidden:false }
  ];
  hiddenPlayers.forEach(p => p.tickets.forEach(grid => tickets.push({ nums:grid, el:null, username:p.username, hidden:true })));
  for (let tIndex = 0; tIndex < tickets.length; tIndex++) {
    const t = tickets[tIndex];
    if (!t.nums.length) continue;
    let allHit = true;
    outer: for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!drawnNumbers.has(t.nums[r][c])) { allHit = false; break outer; }
      }
    }
    if (allHit) {
      declareFullHouse(t.username, t.hidden, tIndex);
      return;
    }
  }
}

function declareFullHouse(playerName, isHidden, ticketIndex) {
  fullHouseWinnerFound = true;
  const ticketContainers = [ticketEl, ticketEl2, ticketEl3];
  const container = ticketContainers[ticketIndex];
  if (!isHidden) {
    container?.classList.add('fullhouse-win'); // Start animation immediately
  }
  // Force leaderboard to show Alice1987 with score 5 at end of game
  const aliceEntry = currentLeaderboard.find(p => p.name === 'Alice1987');
  if (aliceEntry) {
    aliceEntry.score = 5;
    renderLeaderboard();
  }
  // Schedule removal of fullhouse animation after 3s, then leaderboard highlight 1s later
  if (fullHouseWinTimer) clearTimeout(fullHouseWinTimer);
  if (leaderboardDelayTimer) clearTimeout(leaderboardDelayTimer);
  fullHouseWinTimer = setTimeout(() => {
    container?.classList.remove('fullhouse-win');
    fullHouseWinTimer = null;
    leaderboardDelayTimer = setTimeout(() => {
      highlightTopLeaderboardWinner();
      leaderboardDelayTimer = null;
    }, 1000); // 1s after animation stops
  }, 3000);
  // Remove any remaining fullhouse-one-to-go highlights
  [ticketEl, ticketEl2, ticketEl3].forEach(el => el?.querySelectorAll('.ticket-cell.fullhouse-one-to-go').forEach(c => c.classList.remove('fullhouse-one-to-go')));
  updateStatus(`bin-GO! Full house winner: ${playerName}!`);
  // Update green prize traffic light label with full house winner name
  if (greenPrizeLabel && !greenPrizeLabel.dataset.winnerApplied) {
    const base = 'Full house prize £40';
    greenPrizeLabel.textContent = `${base} – ${playerName}`;
    greenPrizeLabel.setAttribute('aria-label', `${base} won by ${playerName}`);
    greenPrizeLabel.dataset.winnerApplied = 'true';
  }
  // Personalize modal stage 2
  if (winner3Stage2) {
    const modalTitle = winner3Stage2.querySelector('.stage-title');
    const detail = winner3Stage2.querySelector('.winner-detail');
    if (modalTitle) modalTitle.textContent = `Congratulations ${playerName}!`;
    if (detail) detail.textContent = 'You have won the full house prize!';
  }
  vibrate([120,40,180]);
  drawBtn.disabled = true; // end game after full house
  stopAutoCall(); // Stop auto-call when game ends
  if (winnerModal3) {
    winnerModal3.hidden = false;
    runFullHouseStages();
  }
  console.log('[Win] Full house winner:', playerName, 'hidden:', isHidden);
}

// Generate simulated opponent tickets
function generateSimulatedPlayers(count) {
  hiddenPlayers = [];
  const existing = new Set(TICKET_PLAYERS);
  for (let i = 0; i < count; i++) {
    const username = generateRandomUsername(existing);
    existing.add(username);
    const playerTickets = [];
    const ticketSets = [];
    for (let t = 0; t < 3; t++) {
      const pool = Array.from({ length: UNIVERSE_SIZE }, (_, idx) => idx + 1);
      shuffle(pool);
      const flat = pool.slice(0, ROWS*COLS).sort((a,b)=>a-b);
      playerTickets.push(reshapeTicket(flat));
      ticketSets.push(new Set(flat));
    }
    hiddenPlayers.push({ username, tickets: playerTickets, ticketSets });
  }
}

function runFullHouseStages() {
  if (!winner3Stage1 || !winner3Stage2) return;
  winner3Stage1.classList.remove('stage-hidden');
  winner3Stage2.classList.add('stage-hidden');
  setTimeout(() => {
    winner3Stage1.classList.add('stage-hidden');
    winner3Stage2.classList.remove('stage-hidden');
    updateStatus('Congratulations winner 001! Full house prize!');
    setTimeout(() => {
      if (winnerModal3) winnerModal3.hidden = true;
      updateStatus('Full house awarded. Game complete.');
    }, 2000);
  }, 3000);
}

// Confetti helper functions removed

function highlightColumnMulti(nums, container, colIdx, on) {
  if (!container) return;
  for (let r = 0; r < ROWS; r++) {
    const num = nums[r][colIdx];
    const cell = container.querySelector(`.ticket-cell[data-num='${num}']`);
    if (!cell) continue;
    cell.classList.toggle('bingo-col', !!on);
  }
}

function highlightRowMulti(nums, container, rowIdx, on) {
  if (!container || !nums[rowIdx]) return;
  for (let c = 0; c < COLS; c++) {
    const num = nums[rowIdx][c];
    const cell = container.querySelector(`.ticket-cell[data-num='${num}']`);
    if (!cell) continue;
    cell.classList.toggle('bingo-row', !!on);
  }
}

// Remove column highlight (.bingo-col) and pending one-to-go flashes after first prize
function clearTransientHighlights() {
  [ticketEl, ticketEl2, ticketEl3].forEach(el => {
    if (!el) return;
    el.querySelectorAll('.ticket-cell.bingo-col').forEach(c => c.classList.remove('bingo-col'));
    el.querySelectorAll('.ticket-cell.one-to-go').forEach(c => c.classList.remove('one-to-go'));
  });
}

function updateStatus(msg) {
  statusEl.textContent = msg;
}

// Traffic light cycling: just rotate active light each draw.
function cycleTrafficLight() {
  if (!trafficLightEl) return;
  trafficLightIndex = (trafficLightIndex + 1) % 3;
  updateTrafficLightActive();
}

function updateTrafficLightActive() {
  if (!trafficLightEl) return;
  const lights = trafficLightEl.querySelectorAll('.light');
  lights.forEach((l,i) => {
    l.classList.toggle('active', i === trafficLightIndex);
  });
}

// Utility: Fisher-Yates shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Champion highlight: find highest score player (first in list with max) and decorate name
function highlightTopLeaderboardWinner() {
  if (!currentLeaderboard.length) return;
  const maxVal = Math.max(...currentLeaderboard.map(p => p.max));
  const winner = currentLeaderboard.find(p => p.max === maxVal);
  if (!winner) return;
  // Find corresponding lb-item
  const items = leaderboardEl?.querySelectorAll('.lb-item');
  if (!items) return;
  items.forEach(item => {
    const nameEl = item.querySelector('.name');
    if (!nameEl) return;
    if (nameEl.textContent === winner.name) {
      nameEl.classList.add('leaderboard-champion');
      item.classList.add('leaderboard-champion-item');
      triggerLeaderboardFireworks(item);
    }
  });
  updateStatus(`${winner.name} leads with sequential streak ${winner.max}!`);
  // Schedule champion modal 5s after highlight
  if (championPanelTimer) clearTimeout(championPanelTimer);
  championPanelTimer = setTimeout(() => {
    showChampionPanel(winner.name);
    championPanelTimer = null;
  }, 5000);
}

function clearLeaderboardChampion() {
  leaderboardEl?.querySelectorAll('.leaderboard-champion').forEach(el => el.classList.remove('leaderboard-champion'));
  leaderboardEl?.querySelectorAll('.leaderboard-champion-item').forEach(el => el.classList.remove('leaderboard-champion-item'));
  leaderboardEl?.querySelectorAll('.fw-burst').forEach(el => el.remove());
  if (leaderboardWinnerModal) leaderboardWinnerModal.hidden = true;
}

// Fireworks effect around champion list item
function triggerLeaderboardFireworks(container) {
  if (!container) return;
  // Avoid duplicate bursts
  if (container.querySelector('.fw-burst')) return;
  const burst = document.createElement('div');
  burst.className = 'fw-burst';
  burst.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 14; i++) {
    const spark = document.createElement('span');
    spark.className = 'fw-spark';
    spark.style.setProperty('--spark-idx', i);
    burst.appendChild(spark);
  }
  container.appendChild(burst);
  // Remove after 4.5s
  setTimeout(() => {
    burst.remove();
  }, 4500);
}

function showChampionPanel(winnerName) {
  if (!leaderboardWinnerModal) return;
  const titleEl = leaderboardWinnerModal.querySelector('#leaderboardWinnerTitle');
  const detailEl = leaderboardWinnerModal.querySelector('.champion-detail');
  if (titleEl) titleEl.textContent = `Congratulations ${winnerName}!`;
  if (detailEl) detailEl.textContent = `Check it out! You had the game's longest win streak!\nYou have won 3 free plays to use on any GiG product!   `;
  leaderboardWinnerModal.hidden = false;
  // Confetti burst from leaderboard UI
  if (leaderboardEl) {
    const rect = leaderboardEl.getBoundingClientRect();
    const confetti = document.createElement('div');
    confetti.className = 'confetti-burst';
    confetti.style.position = 'fixed';
    confetti.style.left = rect.left + rect.width/2 + 'px';
    confetti.style.top = rect.top + rect.height/2 + 'px';
    confetti.style.pointerEvents = 'none';
    confetti.style.zIndex = 9999;
    for (let i = 0; i < 42; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      const angle = (i/42)*2*Math.PI;
      const dist = 80 + Math.random()*60;
      const color = ['#ff4d61','#6ab7ff','#ffe066','#fff','#9fd2ff','#ffbe55','#c7e6ff'][i%7];
      piece.style.background = color;
      piece.style.position = 'absolute';
      piece.style.width = '10px';
      piece.style.height = '16px';
      piece.style.borderRadius = '3px';
      piece.style.transform = `rotate(${angle}rad)`;
      piece.style.opacity = 0.85;
      piece.style.left = '0px';
      piece.style.top = '0px';
      piece.animate([
        { transform: `translate(0,0) rotate(${angle}rad) scale(1)`, opacity: 0.85 },
        { transform: `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) rotate(${angle+Math.PI/2}rad) scale(0.7)`, opacity: 0.7 },
        { transform: `translate(${Math.cos(angle)*dist*1.2}px,${Math.sin(angle)*dist*1.2}px) rotate(${angle+Math.PI}rad) scale(0.5)`, opacity: 0 }
      ], {
        duration: 1200 + Math.random()*400,
        easing: 'cubic-bezier(.55,.08,.42,.98)',
        fill: 'forwards'
      });
      confetti.appendChild(piece);
    }
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 1800);
  }
  useFreePlayBtn?.addEventListener('click', () => {
    leaderboardWinnerModal.hidden = true;
    updateStatus(`${winnerName} activated the free play!`);
  }, { once: true });
  keepFreePlayBtn?.addEventListener('click', () => {
    leaderboardWinnerModal.hidden = true;
    updateStatus(`${winnerName} saved the free play for later.`);
  }, { once: true });
}

// Light haptic (if supported)
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// Auto-call functionality
function toggleAutoCall() {
  if (autoCallActive) {
    stopAutoCall();
  } else {
    startAutoCall();
  }
}

function startAutoCall() {
  if (drawPool.length === 0 || drawBtn.disabled) return;
  autoCallActive = true;
  autoCallBtn.setAttribute('aria-pressed', 'true');
  autoCallBtn.textContent = 'Stop Auto';
  // Always clear any previous timer before starting
  if (autoCallTimer) {
    clearInterval(autoCallTimer);
    autoCallTimer = null;
  }
  autoCallTimer = setInterval(() => {
    if (drawPool.length === 0 || drawBtn.disabled) {
      stopAutoCall();
      return;
    }
    onDraw();
  }, AUTO_CALL_INTERVAL);
}

function stopAutoCall() {
  autoCallActive = false;
  autoCallBtn.setAttribute('aria-pressed', 'false');
  autoCallBtn.textContent = 'Auto Call';
  
  if (autoCallTimer) {
    clearInterval(autoCallTimer);
    autoCallTimer = null;
  }
}

// Initialize after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Leaderboard dynamic updates removed; static HTML retained in index.html.
