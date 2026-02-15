let questions = [];
let currentQuestion = null;

const dom = {
    status: document.getElementById('status'),
    quizArea: document.getElementById('quiz-area'),
    qText: document.getElementById('question-text'),
    input: document.getElementById('user-input'),
    submitBtn: document.getElementById('submit-btn'),
    resultArea: document.getElementById('result-area'),
    resultMsg: document.getElementById('result-msg'),
    correctInfo: document.getElementById('correct-answer'),
    nextBtn: document.getElementById('next-btn'),
    answerArea: document.getElementById('answer-area')
};

// 1. CSV読み込み
Papa.parse("questions.csv", {
    download: true,
    header: true,
    dynamicTyping: true, // kimariji_lenを数値として扱う
    complete: function(results) {
        // 空行を除外
        questions = results.data.filter(q => q.question && q.answer);
        dom.status.textContent = `全${questions.length}問 読込完了`;
        
        // 少し待ってから開始
        setTimeout(() => {
            dom.status.style.display = 'none';
            dom.quizArea.classList.remove('hidden');
            nextQuestion();
        }, 800);
    },
    error: function() {
        dom.status.textContent = "エラー: CSVの読み込みに失敗しました";
    }
});

// 2. 次の問題を表示（決まり字のみ表示）
function nextQuestion() {
    if (questions.length === 0) return;

    // UIリセット
    dom.resultArea.classList.add('hidden');
    dom.answerArea.style.display = 'flex'; // 回答欄を表示
    dom.input.value = "";
    dom.input.disabled = false;
    dom.submitBtn.disabled = false;
    dom.qText.innerHTML = "";
    dom.input.focus();

    // ランダム選択
    const randIndex = Math.floor(Math.random() * questions.length);
    currentQuestion = questions[randIndex];

    // ★ここがポイント：決まり字までの文字数を取得
    // データがない場合はとりあえず5文字、などの安全策
    const kLen = currentQuestion.kimariji_len || 5; 
    
    // 決まり字部分を切り出す
    const kimarijiPart = currentQuestion.question.substring(0, kLen);
    
    // 画面に表示（最初はこれだけ！）
    dom.qText.innerHTML = `<span class="kimariji-part">${kimarijiPart}</span>`;
}

// 3. 回答チェック＆全文表示
function checkAnswer() {
    const userAns = dom.input.value.trim();
    if (!userAns) return; // 空欄なら何もしない

    const correctAns = currentQuestion.answer;
    const correctKana = currentQuestion.kana;
    
    // 入力を無効化
    dom.input.disabled = true;
    dom.submitBtn.disabled = true;

    // 正誤判定
    if (userAns === correctAns || userAns === correctKana) {
        dom.resultMsg.textContent = "正解！";
        dom.resultMsg.className = "correct";
    } else {
        dom.resultMsg.textContent = "残念...";
        dom.resultMsg.className = "wrong";
    }

    // 正解データの表示
    dom.correctInfo.textContent = `正解: ${correctAns}（${correctKana}）`;

    // ★ここで残りの問題文を表示する
    const kLen = currentQuestion.kimariji_len || 0;
    const fullText = currentQuestion.question;
    const kimarijiPart = fullText.substring(0, kLen);
    const restPart = fullText.substring(kLen);

    // HTMLを書き換えて全文表示（後半は通常の太さで）
    dom.qText.innerHTML = `
        <span class="kimariji-part">${kimarijiPart}</span><span class="rest-part">${restPart}</span>
    `;

    // 結果エリアと「次へ」ボタンを表示
    dom.resultArea.classList.remove('hidden');
    dom.nextBtn.focus();
}

// イベントリスナー
dom.submitBtn.addEventListener('click', checkAnswer);
dom.nextBtn.addEventListener('click', nextQuestion);

// Enterキー対応
document.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
        // 回答エリアが表示されていて、まだ結果が出ていない時
        if (!dom.resultArea.classList.contains('hidden')) {
            // 結果表示中なら「次へ」
            nextQuestion();
        } else if (document.activeElement === dom.input) {
            // 入力中なら「回答」
            checkAnswer();
        }
    }
});
