let isProcessing = false; // 🚫 blocks multiple enter presses


const board = document.getElementById("board");


const WORD_LEN = 5;
const MAX_ROWS = 6;
const targetWord = (typeof word === "string" ? word : "").trim();

let currentRow = 0;
// RTL typing: start at the visual rightmost in your setup
let currentCell = WORD_LEN - 1;   // fill 4 → 0
let gameOver = false;

const rows = [];
const resultsGrid = [];

// Build board 6×5
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
        return await res.json(); // expect true/false
    } catch {
        return false;
    }
}

function showInvalidWordMessage(msg) {
    const alert = document.createElement("div");
    alert.textContent = msg;
    alert.classList.add("invalid-alert");

    // place it right above the board, not at bottom
    const container = document.querySelector(".game-container");
    container.style.position = "relative";
    container.appendChild(alert);

    setTimeout(() => alert.remove(), 2000);
}


// Build guess string from cells in DOM order (consistent with coloring)
function getCurrentGuess() {
    // DOM order is left→right, but Urdu typing is right→left visually.
    // So reverse the array before joining.
    const cells = rows[currentRow];
    return cells
        .slice()          // copy
        .reverse()        // rightmost first
        .map(c => (c.textContent || "").trim())
        .join("");
}

// ---------------- Input (RTL-aware) ----------------
function handleLetter(letter) {
    if (gameOver || isProcessing) return; // 🚫 block while processing
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
    if (gameOver || isProcessing) return; // 🚫 block while processing
    if (currentCell < WORD_LEN - 1) {
        currentCell++;
        const cell = rows[currentRow][currentCell];
        cell.textContent = "";
        cell.classList.remove("correct", "present", "absent");
    }
}


async function handleEnter() {
    // ✅ stop if already processing or game ended
    if (gameOver || isProcessing) return;

    // ✅ build guess based on actual letters in current row
    const guess = getCurrentGuess().trim();
    if (guess.length < WORD_LEN) return; // not full yet

    // ✅ lock further input
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

        // ✅ process and animate
        colorizeRow(guess);

        // ✅ check win
        if (guess === targetWord) {
            showResult(true);
            return;
        }

        // ✅ wait for animations to complete before allowing next row
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

// -------------------------------------------------------
// 🔹 Dim or re-enable the Enter key while processing
// -------------------------------------------------------
function toggleEnterButton(disabled) {
    const enterKey = document.querySelector('.key[data-action="enter"]');
    if (!enterKey) return;

    enterKey.disabled = disabled;
    enterKey.style.opacity = disabled ? "0.6" : "1";
    enterKey.style.pointerEvents = disabled ? "none" : "auto";
}



// ---------------- Keyboard ----------------
document.querySelectorAll(".key").forEach(k => {
    k.addEventListener("click", async () => {
        if (gameOver) return;
        const action = k.dataset.action;
        const letter = k.textContent.trim();

        if (action === "backspace") handleBackspace();
        else if (action === "enter") await handleEnter();
        else handleLetter(letter);
    });
});

// ---------------- Coloring & Results ----------------
function colorizeRow(guess) {
    const guessArr = Array.from(guess);
    const targetArr = Array.from(targetWord);
    const cells = rows[currentRow].slice().reverse(); // RTL
    const pattern = Array(WORD_LEN).fill("?");
    const absentLetters = new Set();

    // Step 1 — mark greens
    for (let i = 0; i < WORD_LEN; i++) {
        if (guessArr[i] === targetArr[i]) {
            targetArr[i] = null;
            pattern[i] = "🟩";
        }
    }

    // Step 2 — mark yellows / grays
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

    // Step 3 — flip animation
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

    // ✅ Step 4 — darken absent keys AFTER all flips actually finished
    const totalDelay = WORD_LEN * 300 + 400; // wait until all color classes applied
    setTimeout(() => {
        absentLetters.forEach(ch => {
            const key = Array.from(document.querySelectorAll(".key")).find(k => {
                const keyLetter = k.textContent.trim().normalize("NFC");
                const guessLetter = ch.trim().normalize("NFC");
                return keyLetter === guessLetter;
            });

            if (key) {
                // only darken if it never became green or yellow
                if (
                    !key.classList.contains("correct") &&
                    !key.classList.contains("present")
                ) {
                    key.classList.add("used");
                }
            }
        });
    }, totalDelay);

    resultsGrid.push(pattern.join(""));

    updateKeyboardKeys(guess, pattern);

}

// Simple tracker for keyboard usage
function updateKeyboardKeys(guess, pattern) {
    const allKeys = document.querySelectorAll(".key");

    // mark every letter typed in this guess as used
    Array.from(guess).forEach(ch => {
        const key = Array.from(allKeys).find(k => k.textContent.trim() === ch);
        if (key) key.classList.add("used");
    });

    // if any of them turned out to be correct or present, un-darken
    Array.from(guess).forEach((ch, i) => {
        const key = Array.from(allKeys).find(k => k.textContent.trim() === ch);
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



function showResult(won) {
    gameOver = true;

    const overlay = document.createElement("div");
    overlay.classList.add("result-overlay");

    const msg = won
        ? `🎉 آپ نے ${currentRow + 1} کوششوں میں درست لفظ کا اندازہ لگایا!`
        : `❌ کھیل ختم! درست لفظ تھا: "${targetWord}"`;

    const emojiGrid = resultsGrid.join('\n');

    const shareText = won
        ? `میں نے آج کا اردو ورڈل ${currentRow + 1} کوششوں میں حل کیا!\n\n${emojiGrid}\n\nکوشش کریں: https://urdle.azurewebsites.net`
        : `میں آج کا اردو ورڈل حل نہیں کر سکا 😔\n\n${emojiGrid}\n\nکوشش کریں: https://urdle.com`;

    overlay.innerHTML = `
    <div class="result-box ${won ? 'success' : 'fail'}">
      <p>${msg}</p>
      <button id="share-btn">📤 واٹس ایپ پر شیئر کریں</button>
      <button id="copy-btn" style="margin-top: 10px;">📋 کاپی کریں</button>
      <span id="copy-feedback" style="display:none; color: #4caf50; margin-top: 5px;">✓ کاپی ہو گیا!</span>
    </div>
  `;
    document.body.appendChild(overlay);

    // Try Web Share API first (works better on mobile)
    document.getElementById("share-btn").addEventListener("click", async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    text: shareText
                });
            } catch (err) {
                // If sharing fails or is cancelled, fall back to WhatsApp URL
                fallbackWhatsAppShare(shareText);
            }
        } else {
            fallbackWhatsAppShare(shareText);
        }
    });

    // Copy to clipboard option
    document.getElementById("copy-btn").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            const feedback = document.getElementById("copy-feedback");
            feedback.style.display = "inline";
            setTimeout(() => feedback.style.display = "none", 2000);
        } catch (err) {
            alert("کاپی نہیں ہو سکا");
        }
    });

    document.querySelectorAll(".key").forEach(k => (k.disabled = true));
}

function fallbackWhatsAppShare(text) {
    // Use WhatsApp URL scheme with encoded text
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encoded}`;
    window.open(whatsappUrl, "_blank");
}
