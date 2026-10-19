// Peças Emojis
const PIECES = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
};

// Valores para avaliação da IA
const PIECE_VALUES = {
    'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 1000,
    'P': -10, 'N': -30, 'B': -30, 'R': -50, 'Q': -90, 'K': -1000
};

// Tabela Posicional simples para IA
const pstPawn = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 5, 5, 5, 5, 5, 5, 5,
    1, 1, 2, 3, 3, 2, 1, 1,
    0, 0, 1, 2, 2, 1, 0, 0,
    0, 0, 0, 2, 2, 0, 0, 0,
    0, -1, -1, 0, 0, -1, -1, 0,
    0, 1, 1, -2, -2, 1, 1, 0,
    0, 0, 0, 0, 0, 0, 0, 0
];

let board = [];
let turn = 'w'; // 'w' ou 'b'
let selectedSq = null;
let possibleMoves = [];
let history = [];
let lastMove = null;
let gameMode = 'ai';
let aiLevel = 2;
let isGameOver = false;

const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

function initGame() {
    board = initialBoard.map(row => [...row]);
    turn = 'w';
    selectedSq = null;
    possibleMoves = [];
    history = [];
    lastMove = null;
    isGameOver = false;
    document.getElementById('overlay').classList.remove('active');
    document.getElementById('board').classList.remove('flipped');
    updateStatus();
    renderBoard();
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = document.createElement('div');
            const isLight = (r + c) % 2 === 0;
            sq.className = `square ${isLight ? 'light' : 'dark'}`;
            sq.dataset.row = r;
            sq.dataset.col = c;

            const piece = board[r][c];
            if (piece) {
                const pieceSpan = document.createElement('span');
                pieceSpan.textContent = PIECES[piece];
                pieceSpan.className = piece === piece.toUpperCase() ? 'piece-white' : 'piece-black';
                sq.appendChild(pieceSpan);
            }

            if (selectedSq && selectedSq.r === r && selectedSq.c === c) {
                sq.classList.add('selected');
            }

            if (lastMove && ((lastMove.from.r === r && lastMove.from.c === c) || (lastMove.to.r === r && lastMove.to.c === c))) {
                sq.classList.add('last-move');
            }

            const move = possibleMoves.find(m => m.to.r === r && m.to.c === c);
            if (move) {
                if (board[r][c]) {
                    sq.classList.add('possible-capture');
                } else {
                    sq.classList.add('possible-move');
                }
            }

            sq.addEventListener('click', () => handleSquareClick(r, c));
            boardEl.appendChild(sq);
        }
    }
    renderCaptured();
}

function handleSquareClick(r, c) {
    if (isGameOver) return;
    if (gameMode === 'ai' && turn === 'b') return;

    const piece = board[r][c];
    const isMyPiece = piece && ((turn === 'w' && piece === piece.toUpperCase()) || (turn === 'b' && piece === piece.toLowerCase()));

    if (selectedSq) {
        const move = possibleMoves.find(m => m.to.r === r && m.to.c === c);
        if (move) {
            executeMove(move);
            selectedSq = null;
            possibleMoves = [];
            renderBoard();
            checkTurnNext();
            return;
        }
    }

    if (isMyPiece) {
        selectedSq = { r, c };
        possibleMoves = getValidMovesForPiece(r, c, board, turn);
    } else {
        selectedSq = null;
        possibleMoves = [];
    }
    renderBoard();
}

function executeMove(move) {
    history.push({
        board: board.map(row => [...row]),
        turn,
        lastMove
    });

    const piece = board[move.from.r][move.from.c];
    board[move.to.r][move.to.c] = piece;
    board[move.from.r][move.from.c] = '';

    // Promoção simples de peão para Rainha
    if (piece === 'P' && move.to.r === 0) board[move.to.r][move.to.c] = 'Q';
    if (piece === 'p' && move.to.r === 7) board[move.to.r][move.to.c] = 'q';

    lastMove = move;
    turn = turn === 'w' ? 'b' : 'w';
}

function checkTurnNext() {
    updateStatus();

    const allMoves = getAllMoves(board, turn);
    if (allMoves.length === 0) {
        isGameOver = true;
        const inCheck = isKingInCheck(board, turn);
        const overlayText = document.getElementById('overlayText');
        if (inCheck) {
            overlayText.textContent = turn === 'w' ? 'Vitória das Pretas!' : 'Vitória das Brancas!';
        } else {
            overlayText.textContent = 'Empate por Afogamento!';
        }
        document.getElementById('overlay').classList.add('active');
        return;
    }

    if (gameMode === 'ai' && turn === 'b' && !isGameOver) {
        document.getElementById('thinkText').style.display = 'inline';
        setTimeout(makeAIMove, 100);
    }
}

function updateStatus() {
    document.getElementById('turnText').textContent = turn === 'w' ? 'Vez das Brancas' : 'Vez das Pretas';
    document.getElementById('thinkText').style.display = 'none';
}

function renderCaptured() {
    let capW = [], capB = [];
    const currentPieces = { 'p': 8, 'r': 2, 'n': 2, 'b': 2, 'q': 1, 'P': 8, 'R': 2, 'N': 2, 'B': 2, 'Q': 1 };

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.toLowerCase() !== 'k') {
                currentPieces[p]--;
            }
        }
    }

    for (const [p, count] of Object.entries(currentPieces)) {
        for (let i = 0; i < count; i++) {
            if (p === p.toUpperCase()) capW.push(PIECES[p]);
            else capB.push(PIECES[p]);
        }
    }

    document.getElementById('capturedWhite').textContent = capW.join(' ');
    document.getElementById('capturedBlack').textContent = capB.join(' ');
}

// --- REGRAS DE MOVIMENTAÇÃO SIMPLIFICADAS ---
function getValidMovesForPiece(r, c, bd, color) {
    const moves = getPseudoMoves(r, c, bd);
    return moves.filter(m => {
        const tempBd = bd.map(row => [...row]);
        tempBd[m.to.r][m.to.c] = tempBd[m.from.r][m.from.c];
        tempBd[m.from.r][m.from.c] = '';
        return !isKingInCheck(tempBd, color);
    });
}

function getPseudoMoves(r, c, bd) {
    const piece = bd[r][c];
    if (!piece) return [];
    const moves = [];
    const isWhite = piece === piece.toUpperCase();
    const dir = isWhite ? -1 : 1;

    switch (piece.toLowerCase()) {
        case 'p':
            if (r + dir >= 0 && r + dir < 8 && !bd[r + dir][c]) {
                moves.push({ from: { r, c }, to: { r: r + dir, c } });
                const startRow = isWhite ? 6 : 1;
                if (r === startRow && !bd[r + 2 * dir][c]) {
                    moves.push({ from: { r, c }, to: { r: r + 2 * dir, c } });
                }
            }
            for (let dc of [-1, 1]) {
                if (c + dc >= 0 && c + dc < 8 && r + dir >= 0 && r + dir < 8) {
                    const target = bd[r + dir][c + dc];
                    if (target && (isWhite ? target === target.toLowerCase() : target === target.toUpperCase())) {
                        moves.push({ from: { r, c }, to: { r: r + dir, c: c + dc } });
                    }
                }
            }
            break;

        case 'n':
            const nOffsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
            for (let [dr, dc] of nOffsets) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                    const target = bd[nr][nc];
                    if (!target || (isWhite ? target === target.toLowerCase() : target === target.toUpperCase())) {
                        moves.push({ from: { r, c }, to: { r: nr, c: nc } });
                    }
                }
            }
            break;

        case 'r':
            addRayMoves(r, c, [[1, 0], [-1, 0], [0, 1], [0, -1]], bd, isWhite, moves);
            break;
        case 'b':
            addRayMoves(r, c, [[1, 1], [1, -1], [-1, 1], [-1, -1]], bd, isWhite, moves);
            break;
        case 'q':
            addRayMoves(r, c, [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], bd, isWhite, moves);
            break;

        case 'k':
            for (let dr of [-1, 0, 1]) {
                for (let dc of [-1, 0, 1]) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                        const target = bd[nr][nc];
                        if (!target || (isWhite ? target === target.toLowerCase() : target === target.toUpperCase())) {
                            moves.push({ from: { r, c }, to: { r: nr, c: nc } });
                        }
                    }
                }
            }
            break;
    }
    return moves;
}

function addRayMoves(r, c, dirs, bd, isWhite, moves) {
    for (let [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            const target = bd[nr][nc];
            if (!target) {
                moves.push({ from: { r, c }, to: { r: nr, c: nc } });
            } else {
                if (isWhite ? target === target.toLowerCase() : target === target.toUpperCase()) {
                    moves.push({ from: { r, c }, to: { r: nr, c: nc } });
                }
                break;
            }
            nr += dr; nc += dc;
        }
    }
}

function isKingInCheck(bd, color) {
    let kingPos = null;
    const kingPiece = color === 'w' ? 'K' : 'k';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (bd[r][c] === kingPiece) {
                kingPos = { r, c };
                break;
            }
        }
    }
    if (!kingPos) return true;

    const oppColor = color === 'w' ? 'b' : 'w';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = bd[r][c];
            if (p && (oppColor === 'w' ? p === p.toUpperCase() : p === p.toLowerCase())) {
                const moves = getPseudoMoves(r, c, bd);
                if (moves.some(m => m.to.r === kingPos.r && m.to.c === kingPos.c)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function getAllMoves(bd, color) {
    let moves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = bd[r][c];
            if (p && (color === 'w' ? p === p.toUpperCase() : p === p.toLowerCase())) {
                moves.push(...getValidMovesForPiece(r, c, bd, color));
            }
        }
    }
    return moves;
}

// --- INTELIGÊNCIA ARTIFICIAL (4 NÍVEIS) ---
function evaluateBoard(bd) {
    let total = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = bd[r][c];
            if (p) {
                total += PIECE_VALUES[p];
                if (p === 'p') total += pstPawn[r * 8 + c];
                if (p === 'P') total -= pstPawn[(7 - r) * 8 + c];
            }
        }
    }
    return total;
}

function makeAIMove() {
    const moves = getAllMoves(board, 'b');
    if (moves.length === 0) return;

    let bestMove = null;

    if (aiLevel === 1) {
        // Iniciante: Aleatório com leve preferência a captura
        const captures = moves.filter(m => board[m.to.r][m.to.c] !== '');
        if (captures.length > 0 && Math.random() > 0.4) {
            bestMove = captures[Math.floor(Math.random() * captures.length)];
        } else {
            bestMove = moves[Math.floor(Math.random() * moves.length)];
        }
    }
    else if (aiLevel === 2) {
        // Intermediário: Guloso de 1 nível
        let bestVal = -Infinity;
        moves.sort(() => Math.random() - 0.5);
        for (let m of moves) {
            const tempBd = board.map(row => [...row]);
            tempBd[m.to.r][m.to.c] = tempBd[m.from.r][m.from.c];
            tempBd[m.from.r][m.from.c] = '';
            const val = evaluateBoard(tempBd);
            if (val > bestVal) {
                bestVal = val;
                bestMove = m;
            }
        }
    }
    else if (aiLevel === 3 || aiLevel === 4) {
        // Avançado (Depth 2) / Expert (Depth 3 com Minimax)
        const depth = aiLevel === 3 ? 2 : 3;
        let bestVal = -Infinity;
        moves.sort(() => Math.random() - 0.5);

        for (let m of moves) {
            const tempBd = board.map(row => [...row]);
            tempBd[m.to.r][m.to.c] = tempBd[m.from.r][m.from.c];
            tempBd[m.from.r][m.from.c] = '';

            let val = minimax(tempBd, depth - 1, -Infinity, Infinity, false);
            if (val > bestVal) {
                bestVal = val;
                bestMove = m;
            }
        }
    }

    if (bestMove) {
        executeMove(bestMove);
        renderBoard();
        checkTurnNext();
    }
}

function minimax(bd, depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard(bd);

    const color = isMaximizing ? 'b' : 'w';
    const moves = getAllMoves(bd, color);

    if (moves.length === 0) {
        if (isKingInCheck(bd, color)) return isMaximizing ? -9999 : 9999;
        return 0;
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (let m of moves) {
            const tempBd = bd.map(row => [...row]);
            tempBd[m.to.r][m.to.c] = tempBd[m.from.r][m.from.c];
            tempBd[m.from.r][m.from.c] = '';
            let evalVal = minimax(tempBd, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, evalVal);
            alpha = Math.max(alpha, evalVal);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let m of moves) {
            const tempBd = bd.map(row => [...row]);
            tempBd[m.to.r][m.to.c] = tempBd[m.from.r][m.from.c];
            tempBd[m.from.r][m.from.c] = '';
            let evalVal = minimax(tempBd, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, evalVal);
            beta = Math.min(beta, evalVal);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Eventos de Interface
document.getElementById('modeSelect').addEventListener('change', (e) => {
    gameMode = e.target.value;
    document.getElementById('levelSelect').style.display = gameMode === 'ai' ? 'inline-block' : 'none';
    initGame();
});

document.getElementById('levelSelect').addEventListener('change', (e) => {
    aiLevel = parseInt(e.target.value);
});

document.getElementById('restartBtn').addEventListener('click', initGame);

document.getElementById('undoBtn').addEventListener('click', () => {
    if (history.length === 0 || isGameOver) return;
    const lastState = gameMode === 'ai' && history.length >= 2
        ? history[history.length - 2]
        : history[history.length - 1];

    board = lastState.board;
    turn = lastState.turn;
    lastMove = lastState.lastMove;
    history.pop();
    if (gameMode === 'ai') history.pop();

    selectedSq = null;
    possibleMoves = [];
    updateStatus();
    renderBoard();
});

initGame();