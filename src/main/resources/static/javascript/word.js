const board = document.getElementById("board");

// --- Build 6 rows × 5 cells dynamically ---
for (let i = 0; i < 6; i++) {
    const row = document.createElement("div");
    row.classList.add("row");
    for (let j = 0; j < 5; j++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        row.appendChild(cell);
    }
    board.appendChild(row);
}

let currentRow = 0;
const letterInputs = document.querySelectorAll('.letter-input');
let activeIndex = letterInputs.length - 1; // start at rightmost
let gameOver = false;
const resultsGrid = []; // store result pattern (🟩🟨⬜)

// --- Disable manual typing ---
letterInputs.forEach(input => {
    input.addEventListener('keydown', e => e.preventDefault());
    input.addEventListener('input', e => e.preventDefault());
});

// --- Handle on-screen keyboard ---
const keys = document.querySelectorAll('.key');
keys.forEach(key => {
    key.addEventListener('click', () => {
        if (gameOver) return;
        const action = key.dataset.action;

        if (action === "backspace") {
            if (letterInputs[activeIndex].value === '' && activeIndex < letterInputs.length - 1) {
                activeIndex++;
            }
            letterInputs[activeIndex].value = '';
        } else if (action === "enter") {
            document.getElementById("guess-form").dispatchEvent(new Event('submit'));
        } else {
            letterInputs[activeIndex].value = key.textContent;
            if (activeIndex > 0) activeIndex--;
        }
    });
});

async function validateWord(guess) {
    try {
        const res = await fetch(`/api/check-word?guess=${encodeURIComponent(guess)}`);
        return await res.json();
    } catch (err) {
        console.error("Validation error:", err);
        return false;
    }
}

function showInvalidWordMessage(msg) {
    const alert = document.createElement("div");
    alert.textContent = msg;
    alert.classList.add("invalid-alert");
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 2000);
}


// --- Handle guess submission ---
document.getElementById("guess-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (gameOver) return;

    // Build guess right-to-left
    let guess = '';
    for (let i = letterInputs.length - 1; i >= 0; i--) {
        guess += letterInputs[i].value.trim();
    }

    if (guess.length !== 5) return;

    const valid = await validateWord(guess);
    if (!valid) {
        showInvalidWordMessage("یہ درست لفظ نہیں ہے");
        return;
    }

    const row = board.children[currentRow].children;

    // Compare and colorize
    // --- Proper Wordle duplicate-safe comparison ---
    const rowLetters = [];
    const remaining = word.split(''); // copy of target letters
    let rowPattern = '';

// Step 1: Mark greens first
    for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const cellIndex = 4 - i; // rightmost first visually
        row[cellIndex].textContent = letter;

        if (letter === word[i]) {
            row[cellIndex].classList.add("correct");
            rowPattern += '🟩';
            remaining[i] = null; // remove used letter
        } else {
            rowPattern += '?'; // temporary placeholder
            rowLetters.push({letter, cellIndex, index: i});
        }
    }

// Step 2: Mark yellows / grays for the rest
    for (const {letter, cellIndex, index} of rowLetters) {
        if (remaining.includes(letter)) {
            row[cellIndex].classList.add("present");
            rowPattern = replaceAt(rowPattern, index, '🟨');
            remaining[remaining.indexOf(letter)] = null; // remove once
        } else {
            row[cellIndex].classList.add("absent");
            rowPattern = replaceAt(rowPattern, index, '⬜');
        }
    }

// Helper to replace char at specific index
    function replaceAt(str, index, replacement) {
        return str.substring(0, index) + replacement + str.substring(index + 1);
    }


    resultsGrid.push(rowPattern);

    if (guess === word) {
        showResult(true);
        return;
    }

    currentRow++;
    if (currentRow >= 6) {
        showResult(false);
        return;
    }

    // Reset inputs for next guess
    letterInputs.forEach(inp => inp.value = '');
    activeIndex = letterInputs.length - 1;
});

// --- Show final result with WhatsApp share ---
function showResult(won) {
    gameOver = true;

    const overlay = document.createElement("div");
    overlay.classList.add("result-overlay");

    const message = won
        ? `🎉 آپ نے ${currentRow + 1} کوششوں میں اندازہ لگایا!`
        : `❌ کھیل ختم! لفظ تھا: ${word}`;

    // Build share text (with guess grid)
    const shareText = won
        ? `میں نے آج کا اردو ورڈل ${currentRow + 1} کوششوں میں حل کیا! 🟩🟨⬜\n\n${resultsGrid.join('\n')}\n\nکوشش کریں: https://urdle.com`
        : `میں آج کا اردو ورڈل حل نہیں کر سکا 😔\nلفظ تھا: ${word}\n\n${resultsGrid.join('\n')}\n\nکوشش کریں: https://urdle.com`;

    overlay.innerHTML = `
        <div class="result-box ${won ? 'success' : 'fail'}">
            <p>${message}</p>
            <button id="share-btn">📤 واٹس ایپ پر شیئر کریں</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Handle WhatsApp share
    document.getElementById("share-btn").addEventListener("click", () => {
        const encoded = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${encoded}`, "_blank");
    });

    // Disable further input
    document.querySelectorAll(".key").forEach(k => (k.disabled = true));
}
