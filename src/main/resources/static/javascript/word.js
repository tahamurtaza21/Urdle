let isProcessing = false;

const board = document.getElementById("board");

const WORD_LEN = 5;
const MAX_ROWS = 6;
const targetWord = (typeof word === "string" ? word : "").trim();

let currentRow = 0;
let currentCell = WORD_LEN - 1;
let gameOver = false;

const rows = [];
const resultsGrid = [];

// ---------------- Build Board ----------------
for (let i = 0; i < MAX_ROWS; i++) {
    const row = document.createElement("div");
    row.classList.add("row");
    const cells = [];
    for (let j = 0; j < WORD_LEN; j++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        row.appendChild(cell);
        cells.push(cell);
    }
    board.appendChild(row);
    rows.push(cells);
}

// ---------------- Helpers ----------------
async function validateWord(guess) {
    try {
        const res = await fetch(`/api/check-word?guess=${encodeURIComponent(guess)}`);
        return await res.json();
    } catch {
        return false;
    }
}

function showInvalidWordMessage(msg) {
    const alert = document.createElement("div");
    alert.textContent = msg;
    alert.classList.add("invalid-alert");
    const container = document.querySelector(".game-container");
    container.style.position = "relative";
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 2000);
}

function getCurrentGuess() {
    const cells = rows[currentRow];
    return cells
        .slice()
        .reverse()
        .map((c) => (c.textContent || "").trim())
        .join("");
}

// ---------------- Input ----------------
function handleLetter(letter) {
    if (gameOver || isProcessing) return;
    if (currentCell >= 0) {
        const cell = rows[currentRow][currentCell];
        if (!cell.textContent) {
            cell.textContent = letter;
            cell.classList.add("pop");
            setTimeout(() => cell.classList.remove("pop"), 150);
            currentCell--;
        }
    }
}

function handleBackspace() {
    if (gameOver || isProcessing) return;
    if (currentCell < WORD_LEN - 1) {
        currentCell++;
        const cell = rows[currentRow][currentCell];
        cell.textContent = "";
        cell.classList.remove("correct", "present", "absent");
    }
}

async function handleEnter() {
    if (gameOver || isProcessing) return;

    const guess = getCurrentGuess().trim();
    if (guess.length < WORD_LEN) return;

    isProcessing = true;
    toggleEnterButton(true);

    try {
        const valid = await validateWord(guess);
        if (!valid) {
            showInvalidWordMessage("یہ درست لفظ نہیں ہے");
            isProcessing = false;
            toggleEnterButton(false);
            return;
        }

        colorizeRow(guess);
        saveProgress();

        if (guess === targetWord) {
            showResult(true);
            return;
        }

        const totalDelay = WORD_LEN * 300 + 600;
        setTimeout(() => {
            currentRow++;
            currentCell = WORD_LEN - 1;
            isProcessing = false;
            toggleEnterButton(false);
            if (currentRow >= MAX_ROWS) showResult(false);
        }, totalDelay);
    } catch (err) {
        console.error("Error validating word:", err);
        showInvalidWordMessage("لفظ چیک کرنے میں مسئلہ ہے");
        isProcessing = false;
        toggleEnterButton(false);
    }
}

function toggleEnterButton(disabled) {
    const enterKey = document.querySelector('.key[data-action="enter"]');
    if (!enterKey) return;
    enterKey.disabled = disabled;
    enterKey.style.opacity = disabled ? "0.6" : "1";
    enterKey.style.pointerEvents = disabled ? "none" : "auto";
}

// ---------------- Keyboard ----------------
document.querySelectorAll(".key").forEach((k) => {
    k.addEventListener("click", async () => {
        if (gameOver) return;
        const action = k.dataset.action;
        const letter = k.textContent.trim();

        if (action === "backspace") handleBackspace();
        else if (action === "enter") await handleEnter();
        else handleLetter(letter);
    });
});

// ---------------- Coloring ----------------
function colorizeRow(guess) {
    const guessArr = Array.from(guess);
    const targetArr = Array.from(targetWord);
    const cells = rows[currentRow].slice().reverse();
    const pattern = Array(WORD_LEN).fill("?");
    const absentLetters = new Set();

    // greens
    for (let i = 0; i < WORD_LEN; i++) {
        if (guessArr[i] === targetArr[i]) {
            targetArr[i] = null;
            pattern[i] = "🟩";
        }
    }

    // yellows / grays
    for (let i = 0; i < WORD_LEN; i++) {
        if (pattern[i] !== "?") continue;
        const ch = guessArr[i];
        const idx = targetArr.indexOf(ch);
        if (idx !== -1) {
            targetArr[idx] = null;
            pattern[i] = "🟨";
        } else {
            pattern[i] = "⬜";
            absentLetters.add(ch);
        }
    }

    cells.forEach((cell, i) => {
        setTimeout(() => {
            cell.classList.add("flip");
            setTimeout(() => {
                if (pattern[i] === "🟩") cell.classList.add("correct");
                else if (pattern[i] === "🟨") cell.classList.add("present");
                else cell.classList.add("absent");
            }, 250);
        }, i * 300);
    });

    const totalDelay = WORD_LEN * 300 + 400;
    setTimeout(() => {
        absentLetters.forEach((ch) => {
            const key = Array.from(document.querySelectorAll(".key")).find((k) => {
                const keyLetter = k.textContent.trim().normalize("NFC");
                const guessLetter = ch.trim().normalize("NFC");
                return keyLetter === guessLetter;
            });
            if (key && !key.classList.contains("correct") && !key.classList.contains("present")) {
                key.classList.add("used");
            }
        });
    }, totalDelay);

    resultsGrid.push(pattern.join(""));
    updateKeyboardKeys(guess, pattern);
}

function updateKeyboardKeys(guess, pattern) {
    const allKeys = document.querySelectorAll(".key");

    Array.from(guess).forEach((ch) => {
        const key = Array.from(allKeys).find((k) => k.textContent.trim() === ch);
        if (key) key.classList.add("used");
    });

    Array.from(guess).forEach((ch, i) => {
        const key = Array.from(allKeys).find((k) => k.textContent.trim() === ch);
        if (!key) return;
        if (pattern[i] === "🟩") {
            key.classList.remove("used");
            key.classList.add("correct");
        } else if (pattern[i] === "🟨") {
            key.classList.remove("used");
            key.classList.add("present");
        }
    });
}

// ---------------- Local Storage (Daily Progress) ----------------
function getTodayKey() {
    const today = new Date();
    return today.toISOString().split("T")[0];
}

function getStorageKey() {
    return `urdle-progress-${getTodayKey()}`;
}

function saveProgress() {
    const keyboardState = {};
    document.querySelectorAll(".key").forEach((k) => {
        const letter = k.textContent.trim();
        keyboardState[letter] = {
            correct: k.classList.contains("correct"),
            present: k.classList.contains("present"),
            used: k.classList.contains("used"),
        };
    });

    const boardState = rows.map((r) => r.map((c) => c.textContent || ""));
    const state = {
        date: getTodayKey(),
        word: targetWord,
        currentRow,
        gameOver,
        resultsGrid,
        board: boardState,
        keyboard: keyboardState,
        completedRows: resultsGrid.length
    };
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
}

function loadProgress() {
    const saved = JSON.parse(localStorage.getItem(getStorageKey()) || "null");
    if (!saved || saved.word !== targetWord) {
        clearOldProgress();
        return;
    }

    currentRow = saved.currentRow;
    gameOver = saved.gameOver;
    resultsGrid.push(...saved.resultsGrid);

    saved.board.forEach((rowData, rIdx) => {
        rowData.forEach((letter, cIdx) => {
            rows[rIdx][cIdx].textContent = letter;
        });
    });

    // ✅ Only recolor completed rows
    for (let rIdx = 0; rIdx < (saved.completedRows || 0); rIdx++) {
        const pattern = saved.resultsGrid[rIdx];
        const cells = rows[rIdx].slice().reverse();
        [...pattern].forEach((p, i) => {
            if (p === "🟩") cells[i].classList.add("correct");
            else if (p === "🟨") cells[i].classList.add("present");
            else if (p === "⬜") cells[i].classList.add("absent");
        });
    }

    // ✅ Restore keyboard colors
    if (saved.keyboard) {
        Object.entries(saved.keyboard).forEach(([letter, state]) => {
            const key = Array.from(document.querySelectorAll(".key")).find(
                (k) => k.textContent.trim() === letter
            );
            if (!key) return;
            if (state.correct) key.classList.add("correct");
            else if (state.present) key.classList.add("present");
            else if (state.used) key.classList.add("used");
        });
    }

    // ✅ Cursor recalculation / handle finished state
    if (!saved.gameOver) {
        if (saved.completedRows >= MAX_ROWS) {
            gameOver = true;
            showResult(resultsGrid.at(-1).includes("🟩"));
        } else {
            currentRow = saved.completedRows;
            const nextRowCells = rows[currentRow];
            const filledCount = nextRowCells.filter(
                (c) => c.textContent && c.textContent.trim() !== ""
            ).length;
            currentCell = WORD_LEN - filledCount - 1; // ✅ RTL-safe
            if (currentCell < 0) currentCell = 0;
        }
    } else {
        gameOver = true;
        showResult(resultsGrid.at(-1).includes("🟩"));
    }
}

function clearOldProgress() {
    Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("urdle-progress-") && k !== getStorageKey()) {
            localStorage.removeItem(k);
        }
    });
}

// ---------------- Results ----------------
function showResult(won) {
    gameOver = true;
    saveProgress();

    const overlay = document.createElement("div");
    overlay.classList.add("result-overlay");

    const msg = won
        ? `🎉 آپ نے ${currentRow + 1} کوششوں میں درست لفظ کا اندازہ لگایا!`
        : `❌ کھیل ختم! درست لفظ تھا: "${targetWord}"`;

    // ✅ Reverse each row at emoji (grapheme) level so they don't break
    const emojiGrid = resultsGrid
        .map(row => Array.from(row).reverse().join(""))
        .join("\n");


    const shareText = won
        ? `میں نے آج کا اردو ورڈل ${currentRow + 1} کوششوں میں حل کیا!\n\n${emojiGrid}\n\nکوشش کریں: https://urdle.azurewebsites.net`
        : `میں آج کا اردو ورڈل حل نہیں کر سکا 😔\n\n${emojiGrid}\n\nکوشش کریں: https://urdle.azurewebsites.net`;

    overlay.innerHTML = `
    <div class="result-box ${won ? "success" : "fail"}">
      <p>${msg}</p>
      <button id="share-btn">📤 واٹس ایپ پر شیئر کریں</button>
      <button id="copy-btn" style="margin-top: 10px;">📋 کاپی کریں</button>
      <span id="copy-feedback" style="display:none; color: #4caf50; margin-top: 5px;">✓ کاپی ہو گیا!</span>
    </div>
  `;
    document.body.appendChild(overlay);

    document.getElementById("share-btn").addEventListener("click", async () => {
        if (navigator.share) {
            try {
                await navigator.share({ text: shareText });
            } catch {
                fallbackWhatsAppShare(shareText);
            }
        } else {
            fallbackWhatsAppShare(shareText);
        }
    });

    document.getElementById("copy-btn").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            const feedback = document.getElementById("copy-feedback");
            feedback.style.display = "inline";
            setTimeout(() => (feedback.style.display = "none"), 2000);
        } catch {
            alert("کاپی نہیں ہو سکا");
        }
    });

    document.querySelectorAll(".key").forEach((k) => (k.disabled = true));
}

function fallbackWhatsAppShare(text) {
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encoded}`;
    window.open(whatsappUrl, "_blank");
}

// ---------------- Init ----------------
window.addEventListener("DOMContentLoaded", loadProgress);
