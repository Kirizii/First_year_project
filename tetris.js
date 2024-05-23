"use strict";

const PIECES = 'TJLOSZI';
const COLORS = {
    T: 'purple',
    O: 'yellow',
    L: 'orange',
    J: 'blue',
    I: 'cyan',
    S: 'green',
    Z: 'red'
};
const SCORE_VALUES = {
    SINGLE_ROW: 10,
    MULTIPLIER: 2
};
const CANVAS_SCALE = 1;
const BLOCK_SIZE = 30;
const INITIAL_DROP_INTERVAL = 1000;
const SPEED_INCREASE = 0.9;
const KEY_BINDINGS = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowDown: 'drop',
    ArrowUp: 'rotate'
};

class Piece {
    constructor(context) {
        this.context = context;
        this.spawn();
    }

    spawn() {
        this.type = PIECES[Math.floor(Math.random() * PIECES.length)];
        this.matrix = this.createPiece(this.type);
        this.pos = { x: Math.floor(10 / 2) - Math.floor(this.matrix[0].length / 2), y: 0 };
        this.color = COLORS[this.type];
    }

    createPiece(type) {
        switch (type) {
            case 'T':
                return [
                    [0, 0, 0],
                    [1, 1, 1],
                    [0, 1, 0],
                ];
            case 'O':
                return [
                    [1, 1],
                    [1, 1],
                ];
            case 'L':
                return [
                    [0, 0, 1],
                    [1, 1, 1],
                    [0, 0, 0],
                ];
            case 'J':
                return [
                    [1, 0, 0],
                    [1, 1, 1],
                    [0, 0, 0],
                ];
            case 'I':
                return [
                    [0, 1, 0, 0],
                    [0, 1, 0, 0],
                    [0, 1, 0, 0],
                    [0, 1, 0, 0],
                ];
            case 'S':
                return [
                    [0, 1, 1],
                    [1, 1, 0],
                    [0, 0, 0],
                ];
            case 'Z':
                return [
                    [1, 1, 0],
                    [0, 1, 1],
                    [0, 0, 0],
                ];
        }
    }

    draw() {
        this.context.fillStyle = this.color;
        for (let y = 0; y < this.matrix.length; y++) {
            for (let x = 0; x < this.matrix[y].length; x++) {
                if (this.matrix[y][x] !== 0) {
                    this.context.fillRect((this.pos.x + x) * BLOCK_SIZE, (this.pos.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    this.context.strokeRect((this.pos.x + x) * BLOCK_SIZE, (this.pos.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }

    move(dir) {
        this.pos.x += dir;
    }

    drop() {
        this.pos.y++;
    }

    rotate() {
        const N = this.matrix.length;
        const result = Array.from({ length: N }, () => Array(N).fill(0));
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                result[x][N - 1 - y] = this.matrix[y][x];
            }
        }
        this.matrix = result;
    }

    rotatePiece(arena) {
        const pos = this.pos.x;
        let offset = 1;
        this.rotate();
        while (arena.collide(this)) {
            this.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > this.matrix[0].length) {
                this.rotate();
                this.rotate();
                this.rotate();
                this.pos.x = pos;
                return;
            }
        }
    }
}

class Arena {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.matrix = this.createMatrix(width, height);
    }

    createMatrix(width, height) {
        return Array.from({ length: height }, () => Array(width).fill(0));
    }

    merge(piece) {
        for (let y = 0; y < piece.matrix.length; y++) {
            for (let x = 0; x < piece.matrix[y].length; x++) {
                if (piece.matrix[y][x] !== 0) {
                    this.matrix[y + piece.pos.y][x + piece.pos.x] = piece.color;
                }
            }
        }
    }

    sweep() {
        let rowCount = 1;
        let score = 0;
        let rowsCleared = 0;
        outer: for (let y = this.matrix.length - 1; y > 0; --y) {
            for (let x = 0; x < this.matrix[y].length; ++x) {
                if (this.matrix[y][x] === 0) {
                    continue outer;
                }
            }
            const row = this.matrix.splice(y, 1)[0].fill(0);
            this.matrix.unshift(row);
            ++y;
            score += rowCount * SCORE_VALUES.SINGLE_ROW;
            rowCount *= SCORE_VALUES.MULTIPLIER;
            rowsCleared++;
        }
        return { score, rowsCleared };
    }

    collide(piece) {
        const [m, o] = [piece.matrix, piece.pos];
        for (let y = 0; y < m.length; y++) {
            for (let x = 0; x < m[y].length; x++) {
                if (m[y][x] !== 0 &&
                    (this.matrix[y + o.y] &&
                        this.matrix[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    draw(context) {
        context.fillStyle = 'black';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
        for (let y = 0; y < this.matrix.length; y++) {
            for (let x = 0; x < this.matrix[y].length; x++) {
                if (this.matrix[y][x] !== 0) {
                    context.fillStyle = this.matrix[y][x];
                    context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    context.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }
}

class Tetris {
    constructor(canvas) {
        this.context = canvas.getContext('2d');
        this.context.scale(CANVAS_SCALE, CANVAS_SCALE);

        this.canvas = canvas;
        this.scoreDisplay = document.getElementById('score');
        this.highScoreDisplay = document.getElementById('highScore');
        this.gameOverDisplay = document.getElementById('gameOver');

        this.startButton = document.getElementById('startButton');
        this.startButton.addEventListener('click', () => this.start());

        this.arena = new Arena(10, 20);
        this.player = new Piece(this.context);
        this.score = 0;
        this.highScore = 0;

        this.dropCounter = 0;
        this.dropInterval = INITIAL_DROP_INTERVAL;
        this.lastTime = 0;

        this.isGameOver = true;

        this.backgroundMusic = document.getElementById('background-music');
        this.gameOverSound = document.getElementById('game-over-sound');
        this.rotateSound = document.getElementById('rotate-sound');
        this.rowSound = document.getElementById('row-sound');
        this.stackSound = document.getElementById('stack-sound');

        this._update = this.update.bind(this);
        this.updateScore();
    }

    update(time = 0) {
        if (this.isGameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > this.dropInterval) {
            this.playerDrop();
        }

        this.draw();
        requestAnimationFrame(this._update);
    }

    draw() {
        this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
        this.arena.draw(this.context);
        this.player.draw();
    }

    playerDrop() {
        this.player.drop();
        if (this.arena.collide(this.player)) {
            this.player.pos.y--;
            this.arena.merge(this.player);
            this.stackSound.play();
            const { score, rowsCleared } = this.arena.sweep();
            if (rowsCleared > 0) {
                this.rowSound.play();
            }
            this.score += score;
            this.updateScore();
            this.player.spawn();
            this.increaseSpeed();
            if (this.arena.collide(this.player)) {
                this.highScore = Math.max(this.score, this.highScore);
                this.isGameOver = true;
                this.gameOverDisplay.style.display = 'block';
                this.backgroundMusic.pause();
                this.gameOverSound.play();
                this.updateScore();
                return;
            }
        }
        this.dropCounter = 0;
    }

    playerMove(dir) {
        this.player.move(dir);
        if (this.arena.collide(this.player)) {
            this.player.move(-dir);
        }
    }

    playerRotate() {
        this.player.rotatePiece(this.arena);
        this.rotateSound.play();
    }

    updateScore() {
        this.scoreDisplay.innerText = this.score;
        this.highScoreDisplay.innerText = this.highScore;
    }

    increaseSpeed() {
        if (this.dropInterval > 300){
        this.dropInterval *= SPEED_INCREASE;
        }
    }

    start() {
        if (!this.isGameOver) {
            this.highScore = Math.max(this.score, this.highScore);
        }
        this.arena = new Arena(10, 20);
        this.score = 0;
        this.gameOverDisplay.style.display = 'none';
        this.isGameOver = false;
        this.dropInterval = INITIAL_DROP_INTERVAL;  // Скидаємо швидкість на початкову
        this.player.spawn();
        if (this.arena.collide(this.player)) {
            this.highScore = Math.max(this.score, this.highScore);
            this.isGameOver = true;
            this.gameOverDisplay.style.display = 'block';
            this.updateScore();
        } else {
            this.updateScore();
            this.lastTime = 0;
            this.dropCounter = 0;
            this.backgroundMusic.play();
            this.update();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris');
    const tetris = new Tetris(canvas);

    document.addEventListener('keydown', (event) => {
        if (!tetris.isGameOver) {
            const action = KEY_BINDINGS[event.key];
            if (action === 'drop') {
                tetris.playerDrop();
            } else if (action === 'rotate') {
                tetris.playerRotate();
            } else if (typeof action === 'number') {
                tetris.playerMove(action);
            }
        }
    });
});
