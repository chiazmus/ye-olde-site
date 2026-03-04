import { Chess } from 'https://cdn.jsdelivr.net/npm/chess.js@1.4.0/+esm';

const game = new Chess();

const chessBoard = document.getElementById('board');

const pawnTable = [ 0,  0,  0,  0,  0,  0,  0,  0,
50, 50, 50, 50, 50, 50, 50, 50,
10, 10, 20, 30, 30, 20, 10, 10,
 5,  5, 10, 25, 25, 10,  5,  5,
 0,  0,  0, 20, 20,  0,  0,  0,
 5, -5,-10,  0,  0,-10, -5,  5,
 5, 10, 10,-20,-20, 10, 10,  5,
 0,  0,  0,  0,  0,  0,  0,  0];
const knightTable = [-50,-40,-30,-30,-30,-30,-40,-50,
-40,-20,  0,  0,  0,  0,-20,-40,
-30,  0, 10, 15, 15, 10,  0,-30,
-30,  5, 15, 20, 20, 15,  5,-30,
-30,  0, 15, 20, 20, 15,  0,-30,
-30,  5, 10, 15, 15, 10,  5,-30,
-40,-20,  0,  5,  5,  0,-20,-40,
-50,-40,-30,-30,-30,-30,-40,-50]
const bishopTable = [-20,-10,-10,-10,-10,-10,-10,-20,
-10,  0,  0,  0,  0,  0,  0,-10,
-10,  0,  5, 10, 10,  5,  0,-10,
-10,  5,  5, 10, 10,  5,  5,-10,
-10,  0, 10, 10, 10, 10,  0,-10,
-10, 10, 10, 10, 10, 10, 10,-10,
-10,  5,  0,  0,  0,  0,  5,-10,
-20,-10,-10,-10,-10,-10,-10,-20];
const rookTable = [0,  0,  0,  0,  0,  0,  0,  0,
  5, 10, 10, 10, 10, 10, 10,  5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
 -5,  0,  0,  0,  0,  0,  0, -5,
  0,  0,  0,  5,  5,  0,  0,  0];
const queenTable = [-20,-10,-10, -5, -5,-10,-10,-20,
-10,  0,  0,  0,  0,  0,  0,-10,
-10,  0,  5,  5,  5,  5,  0,-10,
 -5,  0,  5,  5,  5,  5,  0, -5,
  0,  0,  5,  5,  5,  5,  0, -5,
-10,  5,  5,  5,  5,  5,  0,-10,
-10,  0,  5,  0,  0,  0,  0,-10,
-20,-10,-10, -5, -5,-10,-10,-20]
const kingMiddleTable = [-30,-40,-40,-50,-50,-40,-40,-30,
-30,-40,-40,-50,-50,-40,-40,-30,
-30,-40,-40,-50,-50,-40,-40,-30,
-30,-40,-40,-50,-50,-40,-40,-30,
-20,-30,-30,-40,-40,-30,-30,-20,
-10,-20,-20,-20,-20,-20,-20,-10,
 20, 20,  0,  0,  0,  0, 20, 20,
 20, 30, 10,  0,  0, 10, 30, 20]
const kingEndTable = [-50,-40,-30,-20,-20,-30,-40,-50,
-30,-20,-10,  0,  0,-10,-20,-30,
-30,-10, 20, 30, 30, 20,-10,-30,
-30,-10, 30, 40, 40, 30,-10,-30,
-30,-10, 30, 40, 40, 30,-10,-30,
-30,-10, 20, 30, 30, 20,-10,-30,
-30,-30,  0,  0,  0,  0,-30,-30,
-50,-30,-30,-30,-30,-30,-30,-50]

const pieceValue = {'p': 100, 'n': 300, 'b': 350, 'r': 500, 'q': 900, 'k': 10000};
const pieceSquares = {'p': pawnTable, 'n': knightTable, 'b': bishopTable, 'r': rookTable, 'q': queenTable, 'k': kingMiddleTable};

const toBlackIndex = (whiteIndex) => {
    return whiteIndex ^ 56;
};

const indexToSquare = (i) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    return files[i % 8] + ranks[Math.floor(i / 8)];
};

const squareToIndex = (square) => {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square.charAt(1));     
    
    return rank * 8 + file;
};

let pieceSelected;
let pieceSquare;

function expandFEN(fen) {
    // 1. Only take the piece placement part (before the first space)
    // 2. Remove the '/' rank separators
    const piecePart = fen.split(' ')[0].replace(/\//g, '');
    
    // 3. Replace numbers with the corresponding number of dots
    return piecePart.replace(/\d/g, (number) => {
        return '.'.repeat(parseInt(number));
    });
}

function getSEE(square) {
    const piece = game.get(square);
    if (!piece) return 0;

    // Build attacker queues sorted cheapest-first
    let attackers = {
        w: game.attackers(square, 'w')
               .map(sq => pieceValue[game.get(sq).type])
               .sort((a, b) => a - b),  // ascending = cheapest first
        b: game.attackers(square, 'b')
               .map(sq => pieceValue[game.get(sq).type])
               .sort((a, b) => a - b)
    };

    // idx 0 = front of queue (cheapest), use shift() not pop()
    let gains = [];
    let currentVictimValue = pieceValue[piece.type];
    let turn = piece.color === 'w' ? 'b' : 'w';

    while (attackers[turn].length > 0) {
        const attackerValue = attackers[turn].shift(); // cheapest attacker
        gains.push(currentVictimValue);
        currentVictimValue = attackerValue;
        turn = turn === 'w' ? 'b' : 'w';
    }

    // Negamax fold: each side only captures if it gains
    for (let i = gains.length - 2; i >= 0; i--) {
        gains[i] = Math.max(0, gains[i] - gains[i + 1]);
    }

    // Positive = opponent of piece owner gains = piece is hanging
    return gains[0] ?? 0;
}

function simpleEval(fen) {
    const expandedFen = expandFEN(fen);
    let boardValue = 0;
    const splitFen = expandedFen.split('');
    for (let i = 0; i < 64; i++) {
        const square = splitFen[i];
        if (square.toLowerCase() in pieceValue) {
            const isBlack = square.toLowerCase() === square
            const value = pieceValue[square.toLowerCase()];
            const peiceSquareValue = pieceSquares[square.toLowerCase()][isBlack ? toBlackIndex(i) : i];
            // const whiteAttackers = game.attackers(indexToSquare(i), 'w').length; 
            // const blackAttackers = game.attackers(indexToSquare(i), 'b').length; 
            // const safety = isBlack ? (blackAttackers - whiteAttackers) : (whiteAttackers - blackAttackers);
            // const attackedVal = safety < 0 ? safety * (value) : 0;
            const safetyScore = getSEE(indexToSquare(i));
            if (isBlack && safetyScore > 0) boardValue += safetyScore;
            if (!isBlack && safetyScore < 0) boardValue += safetyScore;
            if (game.isCheckmate()) boardValue += 20000 * (game.turn() === 'b' ? 1 : -1);
            if (game.isStalemate() || game.isDraw() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) boardValue -= 20000 * (game.turn === 'b' ? 1 : -1);
            boardValue += ((value + peiceSquareValue) * (isBlack ? -1 : 1));
        }
    }
    return boardValue + Math.random();
}

function simpleEngineMove() {

    let moves = game.moves();

    const futureBoards = moves.map(move => {
        game.move(move);              // 1. Make the move
        const boardState = simpleEval(game.fen()); // 2. Capture the state (FEN is most lightweight)
        // OR use chess.board() if you need the full array
        game.undo();                  // 3. Revert to original position
        return { move, boardState };
    });
    
    futureBoards.sort((a, b) => a.boardState - b.boardState);

    game.move(futureBoards[0].move);
    if (game.isGameOver()) game.reset();
}

function drawBoard(fen) {

    while (chessBoard.children.length > 0) {
        chessBoard.removeChild(chessBoard.childNodes[0]);
    }

    const expanded = expandFEN(fen);
    const pieces = {
        'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
        'p': '♙', 'n': '♘', 'b': '♗', 'r': '♖', 'q': '♕', 'k': '♔'
    };

    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        const row = Math.floor(i / 8);
        const column = i % 8
        square.classList.add((row + column) % 2 === 0 ? 'light' : 'dark');
        const char = expanded[i];

        if (char !== '.') {
            const pieceSymbol = pieces[char];
            const piece = document.createElement('div');
            piece.textContent = pieceSymbol;
            if (char.toUpperCase() === char) {
                piece.onclick = () => {
                    const currentSquare = indexToSquare(i);
                    const moves = game.moves({square: currentSquare, verbose: true});
                    
                    for(let j = 0; j < 64; j++) {
                        const child = chessBoard.children[j];
                        if (child.classList.contains('legalMove')) child.classList.remove('legalMove');
                    }

                    moves.forEach(move => {
                        chessBoard.children[squareToIndex(move.to)].classList.add('legalMove');
                    });

                    pieceSelected = piece;
                    pieceSquare = currentSquare;
                };
            }
            
            const color = char === char.toUpperCase() ? 'white-piece' : 'black-piece';
            piece.classList.add(color);
            square.appendChild(piece);

        }

        square.onclick = () => {
            if (square.classList.contains('legalMove')) {
                const currentSquare = indexToSquare(i);
                if (pieceSelected.textContent == '♙' && currentSquare.slice(-1) == '8') game.move(`${pieceSquare}${currentSquare}q`);
                else game.move({from: pieceSquare, to: currentSquare});
                if (game.isGameOver()) game.reset();
                else simpleEngineMove();
                drawBoard(game.fen());
            }
        };  
        chessBoard.appendChild(square);
    }
}

drawBoard(game.fen());