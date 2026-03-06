(function () {
    'use strict';

    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    const NEXT_SIZE = 24;

    const SHAPES = [
        [[1, 1, 1, 1]], // I
        [[1, 1], [1, 1]], // O
        [[0, 1, 0], [1, 1, 1]], // T
        [[0, 1, 1], [1, 1, 0]], // S
        [[1, 1, 0], [0, 1, 1]], // Z
        [[1, 0, 0], [1, 1, 1]], // J
        [[0, 0, 1], [1, 1, 1]]  // L
    ];

    const COLORS = [
        '#00f0f0', // I - cyan
        '#f0f000', // O - yellow
        '#a000f0', // T - purple
        '#00f000', // S - green
        '#f00000', // Z - red
        '#0000f0', // J - blue
        '#f0a000'  // L - orange
    ];

    let canvas, ctx, nextCanvas, nextCtx;
    let board = [];
    let currentPiece = null;
    let nextPiece = null;
    let score = 0;
    let level = 1;
    let lines = 0;
    let gameOver = false;
    let paused = false;
    let animationId = null;
    let lastDrop = 0;
    let dropInterval = 1000;

    const scoreEl = document.getElementById('score');
    const levelEl = document.getElementById('level');
    const linesEl = document.getElementById('lines');
    const startBtn = document.getElementById('start-btn');
    const restartBtn = document.getElementById('restart-btn');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const pauseOverlay = document.getElementById('pause-overlay');
    const finalScoreEl = document.getElementById('final-score');

    function createPiece(shapeIndex) {
        const shape = SHAPES[shapeIndex].map(row => [...row]);
        return {
            shape,
            color: COLORS[shapeIndex],
            shapeIndex,
            x: Math.floor((COLS - shape[0].length) / 2),
            y: 0
        };
    }

    function initBoard() {
        board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    }

    function drawBlock(ctx, x, y, color, size = BLOCK_SIZE) {
        const pad = size * 0.08;
        ctx.fillStyle = color;
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x * size + 1, y * size + 1, size - 2, pad);
        ctx.fillRect(x * size + 1, y * size + 1, pad, size - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(x * size + size - pad - 1, y * size + 1, pad, size - 2);
        ctx.fillRect(x * size + 1, y * size + size - pad - 1, size - 2, pad);
    }

    function drawBoard() {
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (board[row][col]) {
                    drawBlock(ctx, col, row, board[row][col]);
                }
            }
        }
    }

    function drawPiece(piece, ctx, size = BLOCK_SIZE) {
        if (!piece) return;
        const { shape, color, x, y } = piece;
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    drawBlock(ctx, x + col, y + row, color, size);
                }
            }
        }
    }

    function drawNext() {
        nextCtx.fillStyle = 'rgba(0,0,0,0.3)';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (nextPiece) {
            const w = nextPiece.shape[0].length;
            const h = nextPiece.shape.length;
            const offsetX = (nextCanvas.width / NEXT_SIZE - w) / 2;
            const offsetY = (nextCanvas.height / NEXT_SIZE - h) / 2;
            nextCtx.save();
            nextCtx.translate(offsetX * NEXT_SIZE, offsetY * NEXT_SIZE);
            drawPiece(
                { ...nextPiece, x: 0, y: 0 },
                nextCtx,
                NEXT_SIZE
            );
            nextCtx.restore();
        }
    }

    function collision(piece, dx = 0, dy = 0) {
        const { shape, x, y } = piece;
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (!shape[row][col]) continue;
                const nx = x + col + dx;
                const ny = y + row + dy;
                if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
                if (ny >= 0 && board[ny][nx]) return true;
            }
        }
        return false;
    }

    function mergePiece() {
        const { shape, color, x, y } = currentPiece;
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    const ny = y + row;
                    const nx = x + col;
                    if (ny >= 0) board[ny][nx] = color;
                }
            }
        }
    }

    function clearLines() {
        let cleared = 0;
        let newBoard = board.filter(row => {
            const full = row.every(cell => cell !== 0);
            if (full) cleared++;
            return !full;
        });
        while (newBoard.length < ROWS) {
            newBoard.unshift(Array(COLS).fill(0));
        }
        board = newBoard;
        if (cleared > 0) {
            const points = [0, 100, 300, 500, 800];
            score += (points[cleared] || 800) * level;
            lines += cleared;
            level = Math.floor(lines / 10) + 1;
            dropInterval = Math.max(100, 1000 - (level - 1) * 80);
            updateUI();
        }
    }

    function spawnPiece() {
        const idx = nextPiece !== null ? nextPiece.shapeIndex : Math.floor(Math.random() * SHAPES.length);
        const nextIdx = Math.floor(Math.random() * SHAPES.length);
        currentPiece = createPiece(idx);
        nextPiece = createPiece(nextIdx);
        if (collision(currentPiece)) {
            gameOver = true;
            finalScoreEl.textContent = score;
            gameOverOverlay.classList.remove('hidden');
            cancelAnimationFrame(animationId);
        }
        drawNext();
    }

    function moveDown() {
        if (gameOver || paused || !currentPiece) return;
        if (collision(currentPiece, 0, 1)) {
            mergePiece();
            clearLines();
            spawnPiece();
        } else {
            currentPiece.y++;
        }
    }

    function moveLeft() {
        if (gameOver || paused || !currentPiece) return;
        if (!collision(currentPiece, -1, 0)) currentPiece.x--;
    }

    function moveRight() {
        if (gameOver || paused || !currentPiece) return;
        if (!collision(currentPiece, 1, 0)) currentPiece.x++;
    }

    function rotate() {
        if (gameOver || paused || !currentPiece) return;
        const rotated = currentPiece.shape[0].map((_, i) =>
            currentPiece.shape.map(row => row[i]).reverse()
        );
        const prev = currentPiece.shape;
        currentPiece.shape = rotated;
        if (collision(currentPiece)) currentPiece.shape = prev;
    }

    function hardDrop() {
        if (gameOver || paused || !currentPiece) return;
        while (!collision(currentPiece, 0, 1)) {
            currentPiece.y++;
            score += 2;
        }
        mergePiece();
        clearLines();
        spawnPiece();
        updateUI();
    }

    function updateUI() {
        scoreEl.textContent = score;
        levelEl.textContent = level;
        linesEl.textContent = lines;
    }

    function gameLoop(timestamp) {
        if (gameOver) return;
        if (!paused && timestamp - lastDrop > dropInterval) {
            moveDown();
            lastDrop = timestamp;
        }
        drawBoard();
        drawPiece(currentPiece, ctx);
        animationId = requestAnimationFrame(gameLoop);
    }

    function startGame() {
        initBoard();
        score = 0;
        level = 1;
        lines = 0;
        dropInterval = 1000;
        gameOver = false;
        paused = false;
        lastDrop = 0;
        updateUI();
        gameOverOverlay.classList.add('hidden');
        pauseOverlay.classList.add('hidden');
        nextPiece = null;
        spawnPiece();
        startBtn.textContent = 'Старт';
        animationId = requestAnimationFrame(gameLoop);
    }

    function togglePause() {
        if (gameOver || !currentPiece) return;
        paused = !paused;
        pauseOverlay.classList.toggle('hidden', !paused);
        if (!paused) lastDrop = performance.now();
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') e.preventDefault();
        if (gameOver && e.code !== 'Enter') return;
        switch (e.code) {
            case 'ArrowLeft': moveLeft(); break;
            case 'ArrowRight': moveRight(); break;
            case 'ArrowDown': moveDown(); score++; updateUI(); break;
            case 'ArrowUp': rotate(); break;
            case 'Space': hardDrop(); break;
            case 'KeyP': togglePause(); break;
        }
    });

    startBtn.addEventListener('click', () => {
        if (animationId) {
            startGame();
        } else {
            startGame();
        }
    });

    restartBtn.addEventListener('click', startGame);

    function init() {
        canvas = document.getElementById('game-canvas');
        ctx = canvas.getContext('2d');
        nextCanvas = document.getElementById('next-canvas');
        nextCtx = nextCanvas.getContext('2d');
        initBoard();
        drawBoard();
        drawNext();
    }

    init();
})();
