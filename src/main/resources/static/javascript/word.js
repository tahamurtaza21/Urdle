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
    document.body.appendChild(alert);
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
    if (gameOver) return;
    if (currentCell >= 0) {
        const cell = rows[currentRow][currentCell];
        if (!cell.textContent) {
            cell.textContent = letter;
            currentCell--; // move leftwards (4→0)
        }
    }
}

function handleBackspace() {
    if (gameOver) return;
    if (currentCell < WORD_LEN - 1) {
        currentCell++; // move rightwards (undo last)
        const cell = rows[currentRow][currentCell];
        cell.textContent = "";
        cell.classList.remove("correct", "present", "absent");
    }
}

async function handleEnter() {
    if (gameOver) return;

    // ✅ Row is full only when we've filled all 5 letters (cursor = -1)
    if (currentCell !== -1) return;

    const guess = getCurrentGuess();

    const valid = await validateWord(guess);
    if (!valid) {
        showInvalidWordMessage("یہ درست لفظ نہیں ہے");
        return;
    }

    colorizeRow(guess);

    if (guess === targetWord) {
        showResult(true);
        return;
    }

    currentRow++;
    currentCell = WORD_LEN - 1;

    if (currentRow >= MAX_ROWS) {
        showResult(false);
    }
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
    const cells = rows[currentRow].slice().reverse(); // right→left
    const pattern = Array(WORD_LEN).fill("?");

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
        }
    }

    // Step 3 — animate reveal (right→left)
    cells.forEach((cell, i) => {
        setTimeout(() => {
            cell.classList.add("flip");

            // wait mid-flip (≈ 250 ms) before colouring
            setTimeout(() => {
                if (pattern[i] === "🟩") cell.classList.add("correct");
                else if (pattern[i] === "🟨") cell.classList.add("present");
                else cell.classList.add("absent");
            }, 250);
        }, i * 300); // flip one by one right→left
    });

    resultsGrid.push(pattern.join(""));

    /* 🟢 Helper to darken keyboard keys for absent letters */
    function darkenKey(letter) {
        const key = Array.from(document.querySelectorAll(".key"))
            .find(k => k.textContent.trim() === letter);
        if (key && !key.classList.contains("correct") && !key.classList.contains("present")) {
            key.classList.add("used");
        }
    }
}


function showResult(won) {
    gameOver = true;

    const overlay = document.createElement("div");
    overlay.classList.add("result-overlay");

    const msg = won
        ? `🎉 آپ نے ${currentRow + 1} کوششوں میں درست لفظ کا اندازہ لگایا!`
        : `❌ کھیل ختم! درست لفظ تھا: "${targetWord}"`;

    const shareText = won
        ? `میں نے آج کا اردو ورڈل ${currentRow + 1} کوششوں میں حل کیا! 🟩🟨⬜\n\n${resultsGrid.join('\n')}\n\nکوشش کریں: https://urdle.com`
        : `میں آج کا اردو ورڈل حل نہیں کر سکا 😔\nدرست لفظ تھا: "${targetWord}"\n\n${resultsGrid.join('\n')}\n\nکوشش کریں: https://urdle.com`;

    overlay.innerHTML = `
    <div class="result-box ${won ? 'success' : 'fail'}">
      <p>${msg}</p>
      <button id="share-btn">📤 واٹس ایپ پر شیئر کریں</button>
    </div>
  `;
    document.body.appendChild(overlay);

    document.getElementById("share-btn").addEventListener("click", () => {
        const encoded = encodeURIComponent(shareText);
        window.open(`https://wa.me/?text=${encoded}`, "_blank");
    });

    document.querySelectorAll(".key").forEach(k => (k.disabled = true));
}
