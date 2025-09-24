// Injected from Spring Boot
const word = /*[[${word}]]*/ "کتاب";
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

// Start focus on rightmost input
letterInputs[letterInputs.length - 1].focus();

// RTL navigation
letterInputs.forEach((input, i) => {
    input.addEventListener('input', () => {
        if (input.value.length === 1 && i > 0) {
            letterInputs[i - 1].focus(); // go left
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
            if (input.value === '' && i < letterInputs.length - 1) {
                letterInputs[i + 1].focus(); // go right on backspace
            }
        }
    });
});

// Handle submit
document.getElementById("guess-form").addEventListener("submit", (e) => {
    e.preventDefault();

    // Collect inputs right→left
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
    letterInputs[letterInputs.length - 1].focus(); // restart at rightmost
});
