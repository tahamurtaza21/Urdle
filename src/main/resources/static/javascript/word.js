// Word from backend (via Thymeleaf)
const word = /*[[${word}]]*/ "آبادی";
const board = document.getElementById("board");

// Build 6 rows × 5 cells
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

// Disable manual typing
letterInputs.forEach(input => {
    input.addEventListener('keydown', e => e.preventDefault());
    input.addEventListener('input', e => e.preventDefault());
});

// Handle on-screen keyboard
const keys = document.querySelectorAll('.key');
keys.forEach(key => {
    key.addEventListener('click', () => {
        const action = key.dataset.action;

        if (action === "backspace") {
            if (letterInputs[activeIndex].value === '' && activeIndex < letterInputs.length - 1) {
                activeIndex++;
            }
            letterInputs[activeIndex].value = '';
        } else if (action === "enter") {
            document.getElementById("guess-form").dispatchEvent(new Event('submit'));
        } else {
            // Insert Urdu letter
            letterInputs[activeIndex].value = key.textContent;
            if (activeIndex > 0) activeIndex--; // move left
        }
    });
});

// Handle guess submission
document.getElementById("guess-form").addEventListener("submit", (e) => {
    e.preventDefault();

    // ✅ Build the guess correctly from rightmost → leftmost
    let guess = '';
    for (let i = letterInputs.length - 1; i >= 0; i--) {
        guess += letterInputs[i].value.trim();
    }

    if (guess.length !== 5) return;

    const row = board.children[currentRow].children;

    // ✅ Now compare and fill the board also right-to-left
    for (let i = 0; i < 5; i++) {
        const letter = guess[i];
        const cellIndex = 4 - i; // rightmost first visually
        row[cellIndex].textContent = letter;

        if (letter === word[i]) {
            row[cellIndex].classList.add("correct");
        } else if (word.includes(letter)) {
            row[cellIndex].classList.add("present");
        } else {
            row[cellIndex].classList.add("absent");
        }
    }

    currentRow++;
    letterInputs.forEach(inp => inp.value = '');
    activeIndex = letterInputs.length - 1; // reset to rightmost
});
