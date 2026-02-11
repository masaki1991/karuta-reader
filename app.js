// グローバル変数
let allCards = []; // 全札データ
let selectedRange = { start: 1, end: 100 }; // 選択範囲
let settings = { interval: 2, repeat: 2, speechRate: 1.2 }; // 読み上げ設定
let unplayedCards = []; // 未出札リスト
let currentCard = null; // 現在の札
let isSpeaking = false; // 読み上げ中フラグ
let repeatCount = 0; // 現在の読み上げ回数
let pendingConfirmAction = null; // 確認モーダルのコールバッグ

// DOM要素
const setupScreen = document.getElementById('setupScreen');
const playScreen = document.getElementById('playScreen');
const resultScreen = document.getElementById('resultScreen');

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    await loadCards();
    setupEventListeners();
});

// カードデータ読み込み
async function loadCards() {
    try {
        const response = await fetch('public/cards.json');
        allCards = await response.json();
        console.log(`カードデータ読み込み完了: ${allCards.length}件`);
    } catch (error) {
        console.error('カードデータの読み込みに失敗:', error);
        alert('カードデータの読み込みに失敗しました。');
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // プリセットボタン
    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 全プリセットボタンのactiveを解除
            document.querySelectorAll('.btn-preset').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            const start = parseInt(e.target.dataset.start);
            const end = parseInt(e.target.dataset.end);
            document.getElementById('startNum').value = start;
            document.getElementById('endNum').value = end;
            clearError();
        });
    });

    // カスタム入力変更時
    document.getElementById('startNum').addEventListener('input', clearError);
    document.getElementById('endNum').addEventListener('input', clearError);

    // 速度スライドバー（設定画面）
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    speedSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        speedValue.textContent = value.toFixed(1);
        settings.speechRate = value;
    });

    // 速度スライドバー（プレイ画面）
    const playSpeedSlider = document.getElementById('playSpeedSlider');
    const playSpeedValue = document.getElementById('playSpeedValue');
    playSpeedSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        playSpeedValue.textContent = value.toFixed(1);
        settings.speechRate = value;
    });

    // 開始ボタン
    document.getElementById('startBtn').addEventListener('click', startGame);

    // プレイ画面ボタン
    // プレイ画面ボタン
    document.getElementById('nextBtn').addEventListener('click', nextCard);
    document.getElementById('replayBtn').addEventListener('click', replayCard);
    document.getElementById('endBtn').addEventListener('click', () => {
        showConfirmModal('本当に終了しますか？', endGame, '終了');
    });

    // 確認モーダルボタン
    document.getElementById('confirmOkBtn').addEventListener('click', () => {
        if (pendingConfirmAction) pendingConfirmAction();
        hideConfirmModal();
    });
    document.getElementById('confirmCancelBtn').addEventListener('click', hideConfirmModal);

    // リセットボタン
    document.getElementById('resetSameRangeBtn').addEventListener('click', () => {
        showConfirmModal('本当にリセットしますか？', () => {
            // 未出札リストのみリセット
            unplayedCards = [];
            for (let i = selectedRange.start; i <= selectedRange.end; i++) {
                unplayedCards.push(i);
            }
            shuffleArray(unplayedCards);

            // プレイ画面に戻る
            switchScreen('play');
            showNextCard();
        }, 'リセット');
    });

    document.getElementById('resetAllBtn').addEventListener('click', () => {
        showConfirmModal('本当に戻りますか？', () => {
            // 全てリセット
            stopSpeaking();
            unplayedCards = [];
            currentCard = null;

            // セット選択画面に戻る
            switchScreen('setup');
        }, 'はい', 'いいえ');
    });
}

// エラーメッセージクリア
function clearError() {
    document.getElementById('rangeError').textContent = '';
}

// エラーメッセージ表示
function showError(message) {
    document.getElementById('rangeError').textContent = message;
}

// バリデーション
function validateRange(start, end) {
    if (!start || !end) {
        return '開始番号と終了番号を入力してください。';
    }
    if (start < 1 || start > 100) {
        return '開始番号は1〜100の範囲で入力してください。';
    }
    if (end < 1 || end > 100) {
        return '終了番号は1〜100の範囲で入力してください。';
    }
    if (start > end) {
        return '開始番号は終了番号以下にしてください。';
    }
    return null;
}

// ゲーム開始
function startGame() {
    const start = parseInt(document.getElementById('startNum').value) || 0;
    const end = parseInt(document.getElementById('endNum').value) || 0;

    // バリデーション
    const error = validateRange(start, end);
    if (error) {
        showError(error);
        return;
    }

    // 設定取得
    selectedRange = { start, end };
    settings.interval = parseInt(document.querySelector('input[name="interval"]:checked').value);
    settings.repeat = parseInt(document.querySelector('input[name="repeat"]:checked').value);
    settings.speechRate = parseFloat(document.getElementById('speedSlider').value);

    // プレイ画面のスライドバーも同期
    document.getElementById('playSpeedSlider').value = settings.speechRate;
    document.getElementById('playSpeedValue').textContent = settings.speechRate.toFixed(1);

    // 未出札リスト初期化（範囲内のIDをシャッフル）
    unplayedCards = [];
    for (let i = start; i <= end; i++) {
        unplayedCards.push(i);
    }
    shuffleArray(unplayedCards);

    console.log(`ゲーム開始: 範囲${start}-${end}, 間隔${settings.interval}秒, 回数${settings.repeat}回`);

    // 画面遷移
    switchScreen('play');

    // 最初の札を表示
    showNextCard();
}

// 配列シャッフル（Fisher-Yates）
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 画面切り替え
function switchScreen(screenName) {
    setupScreen.classList.remove('active');
    playScreen.classList.remove('active');
    resultScreen.classList.remove('active');

    if (screenName === 'setup') setupScreen.classList.add('active');
    else if (screenName === 'play') playScreen.classList.add('active');
    else if (screenName === 'result') resultScreen.classList.add('active');
}

// 次の札を表示
function showNextCard() {
    // 全札消化チェック
    if (unplayedCards.length === 0) {
        endGame();
        return;
    }

    // 未出札から1枚取り出し
    const cardId = unplayedCards.shift();
    currentCard = allCards.find(c => c.id === cardId);

    // 画面更新
    document.getElementById('cardInitial').textContent = currentCard.initial;
    document.getElementById('cardContent').textContent = currentCard.content;
    document.getElementById('cardLevel').textContent = `大ピンチレベル ${currentCard.level}`;
    document.getElementById('remaining').textContent = `残り: ${unplayedCards.length}枚`;

    // 読み上げ開始
    repeatCount = 0;
    speakCard(settings.repeat);
}

// 札を読み上げ
function speakCard(times) {
    if (repeatCount >= times) {
        isSpeaking = false;
        return;
    }

    isSpeaking = true;
    repeatCount++;

    // 読み上げテキスト作成（スペース除去）
    const contentText = currentCard.content.replace(/\s+/g, '');
    const levelText = `大ピンチレベル${currentCard.level}`;
    const text = `${contentText}。${levelText}`;

    // SpeechSynthesis で読み上げ
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = settings.speechRate; // 設定された速度を使用

    utterance.onend = () => {
        // 設定回数分繰り返す
        if (repeatCount < times) {
            setTimeout(() => {
                speakCard(times);
            }, settings.interval * 1000);
        } else {
            isSpeaking = false;
        }
    };

    utterance.onerror = (e) => {
        console.error('読み上げエラー:', e);
        isSpeaking = false;
    };

    speechSynthesis.speak(utterance);
}

// 読み上げ停止
function stopSpeaking() {
    speechSynthesis.cancel();
    isSpeaking = false;
}

// 次へボタン
function nextCard() {
    stopSpeaking();
    showNextCard();
}

// もう一回ボタン
function replayCard() {
    stopSpeaking();
    repeatCount = 0;
    speakCard(1); // 常に1回だけ読む
}

// 確認モーダル表示
// 確認モーダル表示
function showConfirmModal(message, onConfirm, okLabel = 'OK', cancelLabel = 'キャンセル') {
    stopSpeaking(); // 読み上げ停止
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmOkBtn').textContent = okLabel;
    document.getElementById('confirmCancelBtn').textContent = cancelLabel;

    pendingConfirmAction = onConfirm;
    document.getElementById('confirmModal').classList.add('active');
}

// 確認モーダル非表示
function hideConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    pendingConfirmAction = null;
}

// 終了ボタン
function endGame() {
    stopSpeaking();

    // 結果画面データ設定
    const total = selectedRange.end - selectedRange.start + 1;
    const remaining = unplayedCards.length;
    const completed = total - remaining;

    document.getElementById('resultRemaining').textContent = `${remaining}枚`;
    document.getElementById('resultCompleted').textContent = `${completed}枚`;
    document.getElementById('resultTotal').textContent = `${total}枚`;

    // 画面遷移
    switchScreen('result');
}


