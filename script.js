let questions = [];
let pool = [];
let currentQ = null;
let mode = 'kimariji'; // 'kimariji' | 'normal' | 'review'
let timer = null;
let charIndex = 0;
let state = 'idle'; // 'idle', 'buzz', 'answer', 'result'
let wrongList = new Set();

const dom = {
    navKimariji: document.getElementById('nav-kimariji'),
    navNormal: document.getElementById('nav-normal'),
    navReview: document.getElementById('nav-review'),
    reviewCount: document.getElementById('review-count'),
    status: document.getElementById('status'),
    
    qText: document.getElementById('question-text'),
    
    phaseBuzz: document.getElementById('phase-buzz'),
    buzzBtn: document.getElementById('buzz-btn'),
    
    phaseAnswer: document.getElementById('phase-answer'),
    input: document.getElementById('user-input'),
    submitBtn: document.getElementById('submit-btn'),
    
    phaseResult: document.getElementById('phase-result'),
    resultLabel: document.getElementById('result-label'),
    correctInfo: document.getElementById('correct-info'),
    nextBtn: document.getElementById('next-btn'),
    delReviewBtn: document.getElementById('del-review-btn'),
    
    reviewArea: document.getElementById('review-list-area'),
    wrongList: document.getElementById('wrong-list')
};

// 初期化
window.onload = () => {
    const saved = localStorage.getItem('quiz_wrong_list');
    if (saved) wrongList = new Set(JSON.parse(saved));
    updateReviewCount();

    Papa.parse("questions.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (res) => {
            questions = res.data.filter(q => q.question && q.answer);
            dom.status.textContent = `${questions.length} Questions Loaded`;
            initPool();
            nextQuestion();
        }
    });
};

function initPool() {
    if (mode === 'review') {
        pool = questions.filter(q => wrongList.has(q.question));
        if (pool.length === 0) {
            alert("復習リストは空です");
            setMode('kimariji');
            return;
        }
    } else {
        pool = [...questions];
    }
}

// モード切替
window.setMode = (newMode) => {
    mode = newMode;
    dom.navKimariji.className = mode === 'kimariji' ? 'active' : '';
    dom.navNormal.className = mode === 'normal' ? 'active' : '';
    dom.navReview.className = '';
    
    dom.reviewArea.classList.add('hidden'); // リスト表示は閉じる
    initPool();
    nextQuestion();
};

window.toggleReviewMode = () => {
    // 復習モードへの切り替えではなく、リスト表示のトグル
    if (dom.reviewArea.classList.contains('hidden')) {
        renderWrongList();
        dom.reviewArea.classList.remove('hidden');
    } else {
        dom.reviewArea.classList.add('hidden');
    }
};

// 問題進行
function nextQuestion() {
    if (pool.length === 0) initPool(); // ループさせるか終了させるかは好みで

    clearInterval(timer);
    state = 'buzz';
    
    // UIリセット
    dom.phaseBuzz.classList.remove('hidden');
    dom.phaseAnswer.classList.add('hidden');
    dom.phaseResult.classList.add('hidden');
    dom.buzzBtn.disabled = false;
    dom.input.value = "";
    dom.qText.innerHTML = "";

    // 問題選択
    const randIdx = Math.floor(Math.random() * pool.length);
    currentQ = pool[randIdx];

    const kLen = currentQ.kimariji_len || 5;

    if (mode === 'kimariji') {
        // 決まり字モード：即入力待機（見た目はbuzzフェーズをスキップしているように見せる）
        state = 'answer';
        dom.phaseBuzz.classList.add('hidden');
        dom.phaseAnswer.classList.remove('hidden');
        
        const part = currentQ.question.substring(0, kLen);
        dom.qText.innerHTML = `<span class="highlight">${part}</span>`;
        dom.input.focus();

    } else {
        // 早押しモード / 復習モード（再生）
        dom.qText.style.textAlign = 'left';
        charIndex = 0;
        timer = setInterval(() => {
            if (charIndex < currentQ.question.length) {
                const char = currentQ.question.charAt(charIndex);
                if (charIndex === kLen - 1) {
                    dom.qText.innerHTML += `<span class="highlight">${char}</span>`;
                } else {
                    dom.qText.innerHTML += char;
                }
                charIndex++;
            } else {
                clearInterval(timer);
            }
        }, 70);
    }
}

// 早押しアクション
function buzz() {
    if (state !== 'buzz') return;
    state = 'answer';
    clearInterval(timer);
    
    dom.phaseBuzz.classList.add('hidden');
    dom.phaseAnswer.classList.remove('hidden');
    dom.input.focus();
}

// 回答チェック
function checkAnswer() {
    const val = dom.input.value.trim();
    if (!val) return;

    state = 'result';
    const isCorrect = (val === currentQ.answer || val === currentQ.kana);
    
    dom.phaseAnswer.classList.add('hidden');
    dom.phaseResult.classList.remove('hidden');

    if (isCorrect) {
        dom.resultLabel.textContent = "Correct";
        dom.resultLabel.className = "correct";
        dom.qText.textContent = currentQ.question; // 全文表示
        
        // リストにあれば削除
        if (wrongList.has(currentQ.question)) {
            wrongList.delete(currentQ.question);
            saveList();
        }
    } else {
        dom.resultLabel.textContent = "Wrong";
        dom.resultLabel.className = "wrong";
        dom.qText.innerHTML += ` <span class="faded">(...${currentQ.question.substring(charIndex)})</span>`;
        
        // リストになければ追加
        if (!wrongList.has(currentQ.question)) {
            wrongList.add(currentQ.question);
            saveList();
        }
    }
    
    // 正解情報表示
    dom.correctInfo.textContent = `${currentQ.answer} (${currentQ.kana})`;
    
    // 削除ボタンのラベル制御
    updateDelBtn();
    
    dom.nextBtn.focus();
}

// リスト操作
function saveList() {
    localStorage.setItem('quiz_wrong_list', JSON.stringify([...wrongList]));
    updateReviewCount();
}
function updateReviewCount() {
    dom.reviewCount.textContent = wrongList.size;
}

function updateDelBtn() {
    if (wrongList.has(currentQ.question)) {
        dom.delReviewBtn.textContent = "リストから削除";
        dom.delReviewBtn.style.display = 'inline-block';
    } else {
        dom.delReviewBtn.style.display = 'none';
    }
}

// イベントリスナー
dom.buzzBtn.addEventListener('click', buzz);
dom.submitBtn.addEventListener('click', checkAnswer);
dom.nextBtn.addEventListener('click', nextQuestion);

dom.delReviewBtn.addEventListener('click', () => {
    wrongList.delete(currentQ.question);
    saveList();
    updateDelBtn();
});

// リスト描画
window.renderWrongList = () => {
    dom.wrongList.innerHTML = "";
    if (wrongList.size === 0) {
        dom.wrongList.innerHTML = "<li>Empty</li>";
        return;
    }
    const list = questions.filter(q => wrongList.has(q.question));
    list.forEach(q => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${q.answer} - ${q.question.substring(0, 15)}...</span>
            <button onclick="removeFromList('${q.question.replace(/'/g, "\\'")}')">×</button>
        `;
        dom.wrongList.appendChild(li);
    });
};

window.removeFromList = (qStr) => {
    wrongList.delete(qStr);
    saveList();
    renderWrongList();
};

window.clearReviewList = () => {
    if(confirm("Clear all?")) {
        wrongList.clear();
        saveList();
        renderWrongList();
    }
};

// キーボード制御
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (state === 'buzz' && document.activeElement !== dom.input) {
            e.preventDefault();
            buzz();
        }
    }
    if (e.code === 'Enter') {
        if (state === 'answer') checkAnswer();
        else if (state === 'result') nextQuestion();
    }
});
