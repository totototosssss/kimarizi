// === 変数定義 ===
let allQuestions = [];
let currentPool = [];
let currentQ = null;
let mode = 'kimariji'; // 'kimariji' | 'normal'
let timer = null;
let charIndex = 0;
let wrongList = new Set();
let isBuzzing = false;

// DOM要素
const dom = {
    // Nav
    btnKimariji: document.getElementById('mode-kimariji'),
    btnNormal: document.getElementById('mode-normal'),
    badgeReview: document.getElementById('review-badge'),
    
    // Main
    statusBar: document.getElementById('status-bar'),
    qBox: document.querySelector('.question-box'), // クラスで取得
    qText: document.getElementById('question-text'),
    
    // Views
    viewBuzz: document.getElementById('view-buzz'),
    buzzBtn: document.getElementById('buzz-btn'),
    
    viewAnswer: document.getElementById('view-answer'),
    input: document.getElementById('answer-input'),
    submitBtn: document.getElementById('answer-submit'),
    
    viewResult: document.getElementById('view-result'),
    resMsg: document.getElementById('result-message'),
    resCorrect: document.getElementById('correct-text'),
    nextBtn: document.getElementById('next-btn'),
    reviewToggleBtn: document.getElementById('review-toggle-btn'),
    
    // Review Panel
    reviewPanel: document.getElementById('review-panel'),
    reviewList: document.getElementById('review-list')
};

// === 初期化 ===
window.onload = () => {
    // ローカルストレージ読み込み
    const saved = localStorage.getItem('quiz_wrong_list');
    if (saved) {
        try {
            wrongList = new Set(JSON.parse(saved));
        } catch(e) { console.error("Save data corrupted"); }
    }
    updateReviewBadge();

    // CSV読み込み
    Papa.parse("questions.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (res) => {
            allQuestions = res.data.filter(q => q.question && q.answer);
            dom.statusBar.textContent = `Loaded: ${allQuestions.length} questions`;
            initGame();
        },
        error: () => {
            dom.questionText.textContent = "CSV読み込みエラー。ファイルを確認してください。";
        }
    });
};

// ゲーム開始準備
function initGame() {
    currentPool = [...allQuestions];
    changeMode('kimariji'); // デフォルトモード
}

// モード変更
window.changeMode = (newMode) => {
    mode = newMode;
    
    // ボタンの見た目更新
    dom.btnKimariji.classList.toggle('active', mode === 'kimariji');
    dom.btnNormal.classList.toggle('active', mode === 'normal');
    
    // 早押しなら左寄せ、決まり字なら中央寄せ
    if (mode === 'normal') {
        dom.qBox.classList.add('text-left');
        dom.qBox.classList.remove('text-center');
    } else {
        dom.qBox.classList.add('text-center');
        dom.qBox.classList.remove('text-left');
    }

    nextQuestion();
};

// === クイズ進行ロジック ===
function nextQuestion() {
    // リセット
    clearInterval(timer);
    isBuzzing = false;
    dom.input.value = "";
    
    // 画面切り替え
    dom.viewBuzz.classList.remove('hidden');
    dom.viewAnswer.classList.add('hidden');
    dom.viewResult.classList.add('hidden');
    dom.buzzBtn.disabled = false;

    // 問題抽選
    if (currentPool.length === 0) currentPool = [...allQuestions];
    const randIdx = Math.floor(Math.random() * currentPool.length);
    currentQ = currentPool[randIdx];

    const kLen = currentQ.kimariji_len || 5;

    // 表示処理
    dom.qText.innerHTML = "";
    
    if (mode === 'kimariji') {
        // 決まり字モード：即入力画面へ
        dom.viewBuzz.classList.add('hidden');
        dom.viewAnswer.classList.remove('hidden');
        
        const part = currentQ.question.substring(0, kLen);
        dom.qText.innerHTML = `<span class="highlight">${part}</span>`;
        dom.input.focus();
        
    } else {
        // 早押しモード：文字送り
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
        }, 70); // 速度
    }
}

// 早押しボタン
function buzz() {
    if (isBuzzing) return;
    isBuzzing = true;
    clearInterval(timer);
    
    dom.viewBuzz.classList.add('hidden');
    dom.viewAnswer.classList.remove('hidden');
    dom.input.focus();
}

// 回答チェック
function checkAnswer() {
    const val = dom.input.value.trim();
    if (!val) return;

    // 画面切り替え
    dom.viewAnswer.classList.add('hidden');
    dom.viewResult.classList.remove('hidden');

    // 判定
    const isCorrect = (val === currentQ.answer || val === currentQ.kana);

    if (isCorrect) {
        dom.resMsg.textContent = "正解！";
        dom.resMsg.className = "correct";
        dom.qText.textContent = currentQ.question; // 全文表示
        
        // 正解したらリストから削除
        if (wrongList.has(currentQ.question)) {
            wrongList.delete(currentQ.question);
            saveList();
        }
    } else {
        dom.resMsg.textContent = "不正解...";
        dom.resMsg.className = "wrong";
        // 残り文字を表示
        const rest = currentQ.question.substring(charIndex || currentQ.kimariji_len || 0);
        dom.qText.innerHTML += `<span style="color:#aaa">${rest}</span>`;
        
        // 間違えたらリストに追加
        if (!wrongList.has(currentQ.question)) {
            wrongList.add(currentQ.question);
            saveList();
        }
    }

    dom.resCorrect.textContent = `A. ${currentQ.answer} (${currentQ.kana})`;
    updateReviewBtnState();
    dom.nextBtn.focus();
}

// === 復習リスト関連 ===
function updateReviewBadge() {
    dom.badgeReview.textContent = wrongList.size;
}

function saveList() {
    localStorage.setItem('quiz_wrong_list', JSON.stringify([...wrongList]));
    updateReviewBadge();
}

function updateReviewBtnState() {
    if (wrongList.has(currentQ.question)) {
        dom.reviewToggleBtn.textContent = "リストから削除";
        dom.reviewToggleBtn.classList.add('wrong'); // 赤っぽく
    } else {
        dom.reviewToggleBtn.textContent = "リストに追加";
        dom.reviewToggleBtn.classList.remove('wrong');
    }
}

// トグルボタン（結果画面）
dom.reviewToggleBtn.onclick = () => {
    if (wrongList.has(currentQ.question)) {
        wrongList.delete(currentQ.question);
    } else {
        wrongList.add(currentQ.question);
    }
    saveList();
    updateReviewBtnState();
};

// 復習パネル開閉
window.toggleReview = () => {
    if (dom.reviewPanel.classList.contains('hidden')) {
        renderReviewList();
        dom.reviewPanel.classList.remove('hidden');
    } else {
        dom.reviewPanel.classList.add('hidden');
    }
};

function renderReviewList() {
    dom.reviewList.innerHTML = "";
    if (wrongList.size === 0) {
        dom.reviewList.innerHTML = "<li>リストは空です</li>";
        return;
    }

    // 文字列(Set)だけだと詳細が出せないので、allQuestionsから検索
    const list = allQuestions.filter(q => wrongList.has(q.question));
    
    list.forEach(q => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <strong>${q.answer}</strong><br>
                <small>${q.question.substring(0, 20)}...</small>
            </div>
            <button class="del-btn">削除</button>
        `;
        // 削除ボタンのイベント
        li.querySelector('.del-btn').onclick = () => {
            wrongList.delete(q.question);
            saveList();
            renderReviewList(); // 再描画
        };
        dom.reviewList.appendChild(li);
    });
}

window.clearReviewList = () => {
    if (confirm("リストを空にしますか？")) {
        wrongList.clear();
        saveList();
        renderReviewList();
    }
};

// === イベントリスナー ===
dom.buzzBtn.onclick = buzz;
dom.submitBtn.onclick = checkAnswer;
dom.nextBtn.onclick = nextQuestion;

// キーボード
document.addEventListener('keydown', (e) => {
    // Enter
    if (e.code === 'Enter') {
        if (!dom.viewAnswer.classList.contains('hidden')) {
            checkAnswer();
        } else if (!dom.viewResult.classList.contains('hidden')) {
            nextQuestion();
        }
    }
    // Space (Buzz)
    if (e.code === 'Space') {
        if (!dom.viewBuzz.classList.contains('hidden') && mode === 'normal') {
            e.preventDefault(); // スクロール防止
            buzz();
        }
    }
});
