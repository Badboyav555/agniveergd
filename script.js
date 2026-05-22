(function() {
  // Test files configuration - bas yahan file name add karo!
  const testFiles = [
    'test1.json',
    'test2.json',
    'test3.json',
    'test4.json',
    'test5.json'
  ];

  let allTests = [];
  let currentTest = null;
  let currentQuestions = [];
  let userAnswers = {};
  let currentIndex = 0;
  let timerInterval = null;
  let timeLeft = 0;
  let testActive = false;
  let testSubmitted = false;

  const screens = {
    loading: document.getElementById('loadingScreen'),
    home: document.getElementById('homeScreen'),
    test: document.getElementById('testScreen'),
    result: document.getElementById('resultScreen'),
    review: document.getElementById('reviewScreen')
  };

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function showScreen(id) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    if (screens[id]) screens[id].classList.add('active');
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  }

  function playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 600; g.gain.value = 0.08;
      o.start(); o.stop(ctx.currentTime + 0.05);
    } catch(e) {}
  }

  async function loadAllTests() {
    showScreen('loading');
    const list = document.getElementById('testList');
    list.innerHTML = '';
    allTests = [];

    for (const file of testFiles) {
      try {
        const res = await fetch(file);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        data.fileName = file;
        allTests.push(data);
        
        // Card banao
        const card = document.createElement('div');
        card.className = 'test-card';
        card.innerHTML = `
          <div class="test-header">
            <h3>📝 ${data.testName}</h3>
            <span class="test-badge">Start ▶</span>
          </div>
          <p style="font-size:0.85rem; color:#64748b;">${data.description}</p>
          <div class="subject-tags">
            ${Object.entries(data.subjects).map(([s, c]) => `<span class="subject-tag">${s}: ${c}Q</span>`).join('')}
          </div>
          <p class="test-info">📊 ${data.totalQuestions} Questions • ⏱️ ${data.timeMinutes} Min • 🎯 ${data.totalMarks} Marks</p>
          <p class="test-info">✅ +${data.markingScheme.correct} | ❌ ${data.markingScheme.wrong} | ⬜ ${data.markingScheme.unattempted}</p>
        `;
        card.addEventListener('click', () => startTest(data));
        list.appendChild(card);
      } catch(e) {
        console.warn(`⚠️ ${file} load nahi hua:`, e.message);
      }
    }

    if (allTests.length === 0) {
      list.innerHTML = '<p style="text-align:center; color:#ef4444;">⚠️ No test files found! Add test1.json, test2.json etc.</p>';
    }
    showScreen('home');
  }

  function startTest(testData) {
    currentTest = testData;
    const gkQ = shuffleArray(testData.questions.filter(q => q.subject === 'GK')).slice(0, testData.subjects.GK || 0);
    const sciQ = shuffleArray(testData.questions.filter(q => q.subject === 'Science')).slice(0, testData.subjects.Science || 0);
    const mathQ = shuffleArray(testData.questions.filter(q => q.subject === 'Maths')).slice(0, testData.subjects.Maths || 0);

    currentQuestions = shuffleArray([...gkQ, ...sciQ, ...mathQ]).map(q => ({
      ...q,
      options: shuffleArray([...q.options])
    }));

    userAnswers = {};
    currentIndex = 0;
    timeLeft = (testData.timeMinutes || 60) * 60;
    testActive = true;
    testSubmitted = false;

    stopTimer();
    updateTimer();
    renderQuestion();
    showScreen('test');
    startTimer();
    window.onbeforeunload = () => testActive ? '⚠️ Test in progress! Leave?' : null;
  }

  function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
      if (!testActive) return;
      timeLeft--;
      updateTimer();
      const t = document.getElementById('countdownTimer');
      if (timeLeft < 300 && timeLeft > 0) t.classList.add('warning');
      else t.classList.remove('warning');
      if (timeLeft <= 0) {
        timeLeft = 0; stopTimer();
        t.classList.remove('warning');
        alert('⏰ Time up! Auto-submitted.');
        submitTest();
      }
    }, 1000);
  }

  function updateTimer() {
    document.getElementById('countdownTimer').textContent = formatTime(timeLeft);
  }

  function renderQuestion() {
    if (!currentQuestions.length || currentIndex >= currentQuestions.length) return;
    const q = currentQuestions[currentIndex];
    document.getElementById('questionText').textContent = `Q${currentIndex+1}. ${q.question}`;
    document.getElementById('questionIndicator').textContent = `Q ${currentIndex+1}/${currentQuestions.length}`;
    document.getElementById('progressFill').style.width = `${((currentIndex+1)/currentQuestions.length)*100}%`;
    document.getElementById('currentSubject').textContent = q.subject;

    const optDiv = document.getElementById('optionsContainer');
    optDiv.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      if (userAnswers[currentIndex] === opt) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        if (!testActive || testSubmitted) return;
        userAnswers[currentIndex] = opt;
        playSound();
        renderQuestion();
        renderPalette();
      });
      optDiv.appendChild(btn);
    });
    renderPalette();
  }

  function renderPalette() {
    const p = document.getElementById('questionPalette');
    p.innerHTML = '';
    for (let i = 0; i < currentQuestions.length; i++) {
      const d = document.createElement('div');
      d.className = 'palette-dot';
      d.textContent = i + 1;
      if (userAnswers[i] !== undefined) d.classList.add('attempted');
      if (i === currentIndex) d.classList.add('active-dot');
      d.addEventListener('click', () => { currentIndex = i; renderQuestion(); });
      p.appendChild(d);
    }
  }

  function nextQ() { if (currentIndex < currentQuestions.length-1) { currentIndex++; renderQuestion(); } }
  function prevQ() { if (currentIndex > 0) { currentIndex--; renderQuestion(); } }

  function submitTest() {
    if (!testActive && testSubmitted) return;
    stopTimer(); testActive = false; testSubmitted = true;
    window.onbeforeunload = null;
    document.getElementById('countdownTimer').classList.remove('warning');
    showResult();
    showScreen('result');
  }

  function showResult() {
    let correct = 0, wrong = 0, unattempted = 0;
    const sub = {};
    currentQuestions.forEach((q, i) => {
      if (!sub[q.subject]) sub[q.subject] = { correct: 0, wrong: 0, total: 0 };
      sub[q.subject].total++;
      if (userAnswers[i] === undefined) unattempted++;
      else if (userAnswers[i] === q.answer) { correct++; sub[q.subject].correct++; }
      else { wrong++; sub[q.subject].wrong++; }
    });

    const scheme = currentTest.markingScheme;
    const marks = (correct * scheme.correct) + (wrong * scheme.wrong);
    const maxMarks = currentTest.totalMarks;
    const pct = Math.max(0, Math.round((marks / maxMarks) * 100));

    document.getElementById('scoreVisual').innerHTML = `
      <div class="score-circle" style="background:conic-gradient(#10b981 ${pct}%, #e2e8f0 0);">
        <div class="score-inner">${pct}%</div>
      </div>`;

    document.getElementById('resultStats').innerHTML = `
      <div class="stat-row">
        <div class="stat-item"><div class="stat-value" style="color:#10b981;">${correct}</div><div class="stat-label">Correct</div></div>
        <div class="stat-item"><div class="stat-value" style="color:#ef4444;">${wrong}</div><div class="stat-label">Wrong</div></div>
        <div class="stat-item"><div class="stat-value" style="color:#f59e0b;">${unattempted}</div><div class="stat-label">Unattempted</div></div>
      </div>
      <p style="font-size:1.3rem; font-weight:700;">📊 Score: <span style="color:#2563eb;">${marks} / ${maxMarks}</span></p>
      ${Object.entries(sub).map(([s, d]) => `<p style="font-size:0.85rem;">📂 ${s}: ${d.correct}/${d.total} (${Math.round(d.correct/d.total*100)}%)</p>`).join('')}`;

    let rank = '🎯 Beginner', rc = '#64748b';
    if (pct >= 85) { rank = '⭐ Elite'; rc = '#f59e0b'; }
    else if (pct >= 65) { rank = '⚔️ Warrior'; rc = '#8b5cf6'; }
    else if (pct >= 40) { rank = '🎖️ Soldier'; rc = '#3b82f6'; }
    document.getElementById('rankMessage').innerHTML = `<span style="color:${rc}; font-size:1.4rem;">${rank}</span>`;
    if (pct >= 80) launchConfetti();
  }

  function launchConfetti() {
    const e = ['🎉','🏆','⭐','💪','🔥','🎖️','🇮🇳'];
    for (let i=0; i<40; i++) setTimeout(() => {
      const c = document.createElement('div');
      c.textContent = e[Math.floor(Math.random()*e.length)];
      c.style.cssText = `position:fixed; left:${Math.random()*100}%; top:-30px; font-size:${20+Math.random()*30}px; z-index:9999; pointer-events:none; animation:confettiFall ${2+Math.random()*3}s linear forwards;`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 4000);
    }, i*30);
  }

  function reviewMode() {
    const list = document.getElementById('reviewList');
    list.innerHTML = '';
    currentQuestions.forEach((q, i) => {
      const ua = userAnswers[i];
      const div = document.createElement('div');
      div.className = 'question-card';
      div.innerHTML = `
        <strong>Q${i+1}. [${q.subject}] ${q.question}</strong>
        <p>Your: ${ua===undefined?'<span style="color:#f59e0b;">Not Attempted</span>':ua===q.answer?`<span style="color:#10b981;">${ua} ✅</span>`:`<span style="color:#ef4444;">${ua} ❌</span>`}</p>
        <p>Correct: <span style="color:#10b981;">${q.answer}</span></p>`;
      list.appendChild(div);
    });
    showScreen('review');
  }

  // Event bindings
  document.getElementById('prevBtn').addEventListener('click', prevQ);
  document.getElementById('nextBtn').addEventListener('click', nextQ);
  document.getElementById('submitTestBtn').addEventListener('click', () => {
    if (confirm(`Attempted ${Object.keys(userAnswers).length}/${currentQuestions.length}. Submit?`)) submitTest();
  });
  document.getElementById('backToHomeBtn').addEventListener('click', () => {
    if (testActive && !confirm('Leave test?')) return;
    stopTimer(); testActive = false; window.onbeforeunload = null;
    showScreen('home');
  });
  document.getElementById('restartBtn').addEventListener('click', () => { if(currentTest) startTest(currentTest); });
  document.getElementById('reviewBtn').addEventListener('click', reviewMode);
  document.getElementById('backToResultBtn').addEventListener('click', () => showScreen('result'));
  document.getElementById('backToPapersFromResult').addEventListener('click', () => {
    stopTimer(); testActive = false; window.onbeforeunload = null;
    showScreen('home');
  });
  document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', document.body.classList.contains('dark'));
  });
  if (localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark');
  document.getElementById('fullscreenBtn').addEventListener('click', () => {
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(()=>{});
  });
  document.addEventListener('keydown', e => {
    if (screens.test.classList.contains('active') && testActive) {
      if (e.key === 'ArrowRight') nextQ();
      if (e.key === 'ArrowLeft') prevQ();
    }
  });

  // Particles
  (function createParticles() {
    const bg = document.getElementById('particles-bg');
    for (let i=0; i<25; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.width = p.style.height = (Math.random()*6+3)+'px';
      p.style.left = Math.random()*100+'%';
      p.style.top = Math.random()*100+'%';
      p.style.animationDuration = (Math.random()*20+15)+'s';
      bg.appendChild(p);
    }
  })();

  loadAllTests();
})();
