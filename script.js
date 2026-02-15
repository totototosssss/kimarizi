// === 変数定義 ===
let allQuestions = [];
let currentPool = [];
let currentQ = null;
let mode = 'kimariji'; // 'kimariji' | 'normal'
let timer = null;
let charIndex = 0;
let wrongList = new Set();
let isBuzzing = false;

// DOM要素の取得
const dom = {
    // Nav
    btnKimariji: document.getElementById('mode-kimariji'),
    btnNormal: document.getElementById('mode-normal'),
    badgeReview: document.getElementById('review-badge'),
    
    // Main
    statusBar: document.getElementById('status-bar'),
    qBox: document.querySelector('.question-box'),
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

// === 初期化処理 ===
window.onload = () => {
    console.log("初期化開始...");
    
    // 1. ローカルストレージ読み込み
    const saved = localStorage.getItem('quiz_wrong_list');
    if (saved) {
        try {
            wrongList = new Set(JSON.parse(saved));
        } catch(e) {
            console.error("セーブデータ破損:", e);
        }
    }
    updateReviewBadge();

    // 2. CSV読み込み
    dom.qText.textContent = "データを読み込んでいます...";
    
    Papa.parse("questions.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
            console.log("CSV読み込み完了:", res);
            
            // データの抽出（questionとanswerがある行のみ）
            if (res.data && res.data.length > 0) {
                allQuestions = res.data.filter(q => q.question && q.answer);
            }

            // データチェック
            if (allQuestions.length === 0) {
                dom.qText.innerHTML = "<span style='color:red'>エラー: 問題データが見つかりません。<br>CSVの中身やファイル名(questions.csv)を確認してください。</span>";
                return;
            }

            // 成功時
            dom.statusBar.textContent = `収録問題数: ${allQuestions.length}問`;
            initGame();
        },
        error: (err) => {
            console.error("CSVエラー:", err);
            dom.qText.innerHTML = `<span style='color:red'>読み込みエラーが発生しました。<br>${err.message}</span>`;
        }
    });
};

// ゲーム開始準備
function initGame() {
    currentPool = [...allQuestions];
    changeMode('kimariji'); 
}

// モード変更
window.changeMode = (newMode) => {
    mode = newMode;
    
    // ボタンの見た目更新
    if(dom.btnKimariji) dom.btnKimariji.classList.toggle('active', mode === 'kimariji');
    if(dom.btnNormal) dom.btnNormal.classList.toggle('active', mode === 'normal');
    
    // クラスの付け替え
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
    // 安全策: データがない場合は中断
    if (!allQuestions || allQuestions.length === 0) return;

    // リセット
    clearInterval(timer);
    isBuzzing = false;
    dom.input.value = "";
    
    // 画面切り替え
    dom.viewBuzz.classList.remove('hidden');
    dom.viewAnswer.classList.add('hidden');
    dom.viewResult.classList.add('hidden');
    dom.buzzBtn.disabled = false;

    // 問題プールが空になったら補充
    if (currentPool.length === 0) {
        currentPool = [...allQuestions];
    }

    // ランダム出題
    const randIdx = Math.floor(Math.random() * currentPool.length);
    currentQ = currentPool[randIdx];

    // currentQがundefinedにならないようチェック
    if (!currentQ) {
        dom.qText.textContent = "問題データの取得に失敗しました。";
        return;
    }

    // 決まり字の長さ（データになければ5文字とする）
    const kLen = currentQ.kimariji_len ? parseInt(currentQ.kimariji_len) : 5;

    // 表示処理
    dom.qText.innerHTML = "";
    
    if (mode === 'kimariji') {
        // 決まり字モード
        dom.viewBuzz.classList.add('hidden');
        dom.viewAnswer.classList.remove('hidden');
        
        const part = currentQ.question.substring(0, kLen);
        dom.qText.innerHTML = `<span class="highlight">${part}</span>`;
        dom.input.focus();
        
    } else {
        // 早押しモード：文字送り
        charIndex = 0;
        dom.qText.innerHTML = ""; // クリア
        
        timer = setInterval(() => {
            // 文字送り処理
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

    // 判定（答え か 読み仮名 に一致すれば正解）
    const isCorrect = (val === currentQ.answer || val === currentQ.kana);

    if (isCorrect) {
        dom.resMsg.textContent = "正解！";
        dom.resMsg.className = "correct";
        dom.qText.textContent = currentQ.question; // 全文表示
        
        // リストから削除
        if (wrongList.has(currentQ.question)) {
            wrongList.delete(currentQ.question);
            saveList();
        }
    } else {
        dom.resMsg.textContent = "不正解...";
        dom.resMsg.className = "wrong";
        
        // 残りの文字を表示（早押しモードなどで途中だった場合）
        const fullText = currentQ.question;
        const currentLen = dom.qText.textContent.length; // 今表示されている文字数
        
        // 既に表示されているHTMLはそのままに、残りを薄く追加
        // ※単純化のため、全文書き直しつつ、後半を薄くする
        // 決まり字モードなら全部再描画でOK
        dom.qText.innerHTML = fullText; 
        
        // リストに追加
        if (!wrongList.has(currentQ.question)) {
            wrongList.add(currentQ.question);
            saveList();
        }
    }

    dom.resCorrect.textContent = `A. ${currentQ.answer} (${currentQ.kana})`;
    updateReviewBtnState();
    
    // 次へボタンにフォーカス（エンター連打で進めるように）
    setTimeout(() => dom.nextBtn.focus(), 50);
}

// === 復習リスト関連 ===
function updateReviewBadge() {
    if(dom.badgeReview) dom.badgeReview.textContent = wrongList.size;
}

function saveList() {
    localStorage.setItem('quiz_wrong_list', JSON.stringify([...wrongList]));
    updateReviewBadge();
}

function updateReviewBtnState() {
    if (wrongList.has(currentQ.question)) {
        dom.reviewToggleBtn.textContent = "リストから削除";
        dom.reviewToggleBtn.className = "action-btn wrong"; // 赤く
    } else {
        dom.reviewToggleBtn.textContent = "リストに追加";
        dom.reviewToggleBtn.className = "action-btn secondary"; // 通常
    }
}

// トグルボタン
if(dom.reviewToggleBtn) {
    dom.reviewToggleBtn.onclick = () => {
        if (wrongList.has(currentQ.question)) {
            wrongList.delete(currentQ.question);
        } else {
            wrongList.add(currentQ.question);
        }
        saveList();
        updateReviewBtnState();
    };
}

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
        li.querySelector('.del-btn').onclick = () => {
            wrongList.delete(q.question);
            saveList();
            renderReviewList();
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
if(dom.buzzBtn) dom.buzzBtn.onclick = buzz;
if(dom.submitBtn) dom.submitBtn.onclick = checkAnswer;
if(dom.nextBtn) dom.nextBtn.onclick = nextQuestion;

// キーボード操作
document.addEventListener('keydown', (e) => {
    // Enterキー
    if (e.code === 'Enter') {
        if (!dom.viewAnswer.classList.contains('hidden')) {
            checkAnswer();
        } else if (!dom.viewResult.classList.contains('hidden')) {
            nextQuestion();
        }
    }
    // Spaceキー
    if (e.code === 'Space') {
        if (!dom.viewBuzz.classList.contains('hidden') && mode === 'normal') {
            e.preventDefault(); 
            buzz();
        }
    }
});
