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

    // Collect values RTL (rightmost → leftmost)
    let guess = '';
    letterInputs.forEach(inp => guess += inp.value.trim());

    if (guess.length !== 5) return;

    const row = board.children[currentRow].children;
    for (let i = 0; i < 5; i++) {
        row[i].textContent = guess[i];
        if (guess[i] === word[i]) {
            row[i].classList.add("correct");
        } else if (word.includes(guess[i])) {
            row[i].classList.add("present");
        } else {
            row[i].classList.add("absent");
        }
    }

    currentRow++;
    letterInputs.forEach(inp => inp.value = '');
    activeIndex = letterInputs.length - 1; // reset to rightmost
});
