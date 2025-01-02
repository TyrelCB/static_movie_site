const PIECE_SETS = {
    unicode: {
        WHITE: {
            KING: '♔', QUEEN: '♕', ROOK: '♖',
            BISHOP: '♗', KNIGHT: '♘', PAWN: '♙'
        },
        BLACK: {
            KING: '♚', QUEEN: '♛', ROOK: '♜',
            BISHOP: '♝', KNIGHT: '♞', PAWN: '♟'
        }
    },
    text: {
        WHITE: {
            KING: 'K', QUEEN: 'Q', ROOK: 'R',
            BISHOP: 'B', KNIGHT: 'N', PAWN: 'P'
        },
        BLACK: {
            KING: 'k', QUEEN: 'q', ROOK: 'r',
            BISHOP: 'b', KNIGHT: 'n', PAWN: 'p'
        }
    },
    fancy: {
        WHITE: {
            KING: '♔', QUEEN: '♕', ROOK: '♖',
            BISHOP: '♗', KNIGHT: '♘', PAWN: '♙'
        },
        BLACK: {
            KING: '♔', QUEEN: '♕', ROOK: '♖',
            BISHOP: '♗', KNIGHT: '♘', PAWN: '♙'
        }
    }
};

// Remove the PIECES constant, we'll use PIECE_SETS directly

// Add the fetchCloudEval function before the Chess class
async function fetchCloudEval(fen) {
    /**
     * Fetches cloud evaluation data for the given FEN string from Lichess API.
     * 
     * @param {string} fen - FEN string representing the chess position.
     * @returns {Object} - Parsed JSON response from the API or error message.
     */
    // Define Lichess Cloud Evaluation API endpoint
    const API_URL = "https://lichess.org/api/cloud-eval";
    try {
        // Perform GET request to Lichess API
        const response = await fetch(`${API_URL}?fen=${encodeURIComponent(fen)}&multiPv=1`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        // Parse JSON response
        const data = await response.json();
        const suggestedMove = data.pvs[0]?.moves?.split(" ")[0];
        console.log(`Suggested Move (UCI): ${suggestedMove || "N/A"}`);
        return suggestedMove;
    } catch (error) {
        return { error: error.message };
    }
}

class Chess {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.selectedPiece = null;
        this.currentPlayer = 'WHITE';
        this.validMoves = [];
        this.lastPawnDoubleMove = null; // Add this line
        this.setupBoard();
        this.renderBoard();
        this.gameOver = false; // Add this line
        this.moveHistory = [];
        this.initializeLogging();
        this.validMovesCache = new Map(); // Add cache for valid moves
        this.computeAllValidMoves(); // Initial computation
        this.isAIEnabled = true; // Add this line
        this.searchDepth = 3; // Add default search depth
        this.initializeControls(); // Add this line
        this.moveCounter = 1; // Full moves (each player's turn = 1 move)
        this.halfMoveCounter = 1; // Individual turns
        this.positionHistory = new Map(); // Add position history tracking
        this.moveNotation = [];
        this.moveStack = []; // Add this line to store move history
        this.previousAIScore = 0;  // Add this line
        this.initializeCanvas();
        this.pieceSet = localStorage.getItem('chessPieceSet') || 'unicode';  // Load saved piece set or use default
        this.initializeSettings();
    }

    initializeLogging() {
        this.log('Game started');
    }

    log(message, moveNotation = null) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';

        if (moveNotation) {
            const moveNumber = Math.ceil(this.halfMoveCounter / 2);
            const isWhiteMove = this.halfMoveCounter % 2 === 1;

            const moveNumberSpan = document.createElement('span');
            moveNumberSpan.className = 'move-number';
            moveNumberSpan.textContent = `${moveNumber}.${isWhiteMove ? ' White' : '.. Black'}`;

            const moveTextSpan = document.createElement('span');
            moveTextSpan.className = 'move-text';
            moveTextSpan.textContent = moveNotation;

            // Add FEN after the move notation
            const fenSpan = document.createElement('span');
            fenSpan.className = 'fen-text';
            fenSpan.textContent = ` (${this.generateFEN()})`;

            logEntry.appendChild(moveNumberSpan);
            logEntry.appendChild(moveTextSpan);
            logEntry.appendChild(fenSpan);

            this.moveNotation.push(moveNotation);
        } else {
            logEntry.textContent = message;
        }

        const gameLog = document.getElementById('game-log');
        gameLog.appendChild(logEntry);
        gameLog.scrollTop = gameLog.scrollHeight;
    }

    generateFEN() {
        let fen = '';
        let emptySquares = 0;

        // Board position
        for (let row = 0; row < 8; row++) {
            if (row > 0) fen += '/';
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece === null) {
                    emptySquares++;
                } else {
                    if (emptySquares > 0) {
                        fen += emptySquares;
                        emptySquares = 0;
                    }
                    const pieceSymbol = this.getFENPieceSymbol(piece);
                    fen += pieceSymbol;
                }
            }
            if (emptySquares > 0) {
                fen += emptySquares;
                emptySquares = 0;
            }
        }

        // Active color
        fen += ` ${this.currentPlayer[0].toLowerCase()}`;

        // Castling availability
        let castling = '';
        if (this.hasCastlingRights('WHITE', 'kingside')) castling += 'K';
        if (this.hasCastlingRights('WHITE', 'queenside')) castling += 'Q';
        if (this.hasCastlingRights('BLACK', 'kingside')) castling += 'k';
        if (this.hasCastlingRights('BLACK', 'queenside')) castling += 'q';
        fen += ` ${castling || '-'}`;

        // En passant target square
        const enPassant = this.lastPawnDoubleMove ? 
            this.getSquareNotation(this.lastPawnDoubleMove.row, this.lastPawnDoubleMove.col) : 
            '-';
        fen += ` ${enPassant}`;

        // Halfmove clock (not implemented, always 0)
        fen += ' 0';

        // Fullmove number
        fen += ` ${this.moveCounter}`;

        return fen;
    }

    getFENPieceSymbol(piece) {
        const symbols = {
            'KING': 'k',
            'QUEEN': 'q',
            'ROOK': 'r',
            'BISHOP': 'b',
            'KNIGHT': 'n',
            'PAWN': 'p'
        };
        return piece.color === 'WHITE' ? 
            symbols[piece.type].toUpperCase() : 
            symbols[piece.type];
    }

    hasCastlingRights(color, side) {
        const row = color === 'WHITE' ? 7 : 0;
        const kingCol = 4;
        const rookCol = side === 'kingside' ? 7 : 0;

        const king = this.board[row][kingCol];
        const rook = this.board[row][rookCol];

        return king && king.type === 'KING' && !king.hasMoved &&
               rook && rook.type === 'ROOK' && !rook.hasMoved;
    }

    setupBoard() {
        // Setup pawns
        for (let i = 0; i < 8; i++) {
            this.board[1][i] = { type: 'PAWN', color: 'BLACK', hasMoved: false };
            this.board[6][i] = { type: 'PAWN', color: 'WHITE', hasMoved: false };
        }

        // Setup other pieces
        const backrow = ['ROOK', 'KNIGHT', 'BISHOP', 'QUEEN', 'KING', 'BISHOP', 'KNIGHT', 'ROOK'];
        backrow.forEach((piece, i) => {
            this.board[0][i] = { type: piece, color: 'BLACK', hasMoved: false };
            this.board[7][i] = { type: piece, color: 'WHITE', hasMoved: false };
        });
    }

    isValidMove(startRow, startCol, endRow, endCol) {
        // Add boundary checks
        if (!this.isValidPosition(startRow, startCol) || !this.isValidPosition(endRow, endCol)) {
            return false;
        }
        
        const piece = this.board[startRow][startCol];
        if (!piece || piece.color !== this.currentPlayer) return false;

        switch (piece.type) {
            case 'PAWN':
                return this.isValidPawnMove(startRow, startCol, endRow, endCol);
            case 'ROOK':
                return this.isValidRookMove(startRow, startCol, endRow, endCol);
            case 'KNIGHT':
                return this.isValidKnightMove(startRow, startCol, endRow, endCol);
            case 'BISHOP':
                return this.isValidBishopMove(startRow, startCol, endRow, endCol);
            case 'QUEEN':
                return this.isValidQueenMove(startRow, startCol, endRow, endCol);
            case 'KING':
                return this.isValidKingMove(startRow, startCol, endRow, endCol);
        }
        return false;
    }

    // Add this new helper method after constructor
    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    isValidPawnMove(startRow, startCol, endRow, endCol) {
        const piece = this.board[startRow][startCol];
        const direction = piece.color === 'WHITE' ? -1 : 1;
        const startingRow = piece.color === 'WHITE' ? 6 : 1;

        // Regular move
        if (startCol === endCol && this.board[endRow][endCol] === null) {
            if (endRow === startRow + direction) return true;
            if (startRow === startingRow && endRow === startRow + 2 * direction && 
                this.board[startRow + direction][startCol] === null) return true;
        }

        // Regular capture
        if (Math.abs(startCol - endCol) === 1 && endRow === startRow + direction) {
            // Normal capture
            if (this.board[endRow][endCol] && 
                this.board[endRow][endCol].color !== piece.color) return true;
            
            // En passant capture
            if (this.lastPawnDoubleMove && 
                this.lastPawnDoubleMove.row === startRow &&
                this.lastPawnDoubleMove.col === endCol) {
                return true;
            }
        }

        return false;
    }

    isValidRookMove(startRow, startCol, endRow, endCol) {
        if (startRow !== endRow && startCol !== endCol) return false;
        return this.isPathClear(startRow, startCol, endRow, endCol);
    }

    isValidKnightMove(startRow, startCol, endRow, endCol) {
        const rowDiff = Math.abs(startRow - endRow);
        const colDiff = Math.abs(startCol - endCol);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    isValidBishopMove(startRow, startCol, endRow, endCol) {
        if (Math.abs(startRow - endRow) !== Math.abs(startCol - endCol)) return false;
        return this.isPathClear(startRow, startCol, endRow, endCol);
    }

    isValidQueenMove(startRow, startCol, endRow, endCol) {
        return this.isValidRookMove(startRow, startCol, endRow, endCol) ||
               this.isValidBishopMove(startRow, startCol, endRow, endCol);
    }

    isValidKingMove(startRow, startCol, endRow, endCol) {
        // Regular king move
        if (Math.abs(startRow - endRow) <= 1 && Math.abs(startCol - endCol) <= 1) {
            return true;
        }
        
        // Check for castling
        const piece = this.board[startRow][startCol];
        if (!piece.hasMoved && startRow === endRow && Math.abs(startCol - endCol) === 2) {
            return this.isValidCastling(startRow, startCol, endRow, endCol);
        }
        
        return false;
    }

    isValidCastling(startRow, startCol, endRow, endCol) {
        const direction = endCol > startCol ? 1 : -1;
        const rookCol = direction === 1 ? 7 : 0;
        const rook = this.board[startRow][rookCol];
        const kingColor = this.board[startRow][startCol].color;
        const oppositeColor = kingColor === 'WHITE' ? 'BLACK' : 'WHITE';

        // Cannot castle while in check
        if (this.isInCheck(kingColor)) {
            // console.log('Cannot castle while in check');
            return false;
        }

        // Check if rook exists and hasn't moved
        if (!rook || rook.type !== 'ROOK' || rook.hasMoved) {
            // console.log('Invalid rook state for castling');
            return false;
        }

        // Check if path is clear and king doesn't pass through attacked squares
        const pathStart = startCol;
        const pathEnd = direction === 1 ? startCol + 2 : startCol - 2;
        const step = direction;

        // Check each square in the king's path
        for (let col = pathStart; direction === 1 ? col <= pathEnd : col >= pathEnd; col += step) {
            // Skip checking occupancy of starting square
            if (col !== startCol && this.board[startRow][col] !== null) {
                // console.log('Path is blocked for castling');
                return false;
            }
            // Check if square is under attack (including starting and ending squares)
            if (this.isSquareUnderAttack(startRow, col, oppositeColor)) {
                // console.log(`Square ${startRow},${col} is under attack`);
                return false;
            }
        }

        return true;
    }

    isPathClear(startRow, startCol, endRow, endCol) {
        const rowDir = startRow === endRow ? 0 : (endRow - startRow) / Math.abs(endRow - startRow);
        const colDir = startCol === endCol ? 0 : (endCol - startCol) / Math.abs(endCol - startCol);
        let row = startRow + rowDir;
        let col = startCol + colDir;

        while (row !== endRow || col !== endCol) {
            if (this.board[row][col] !== null) return false;
            row += rowDir;
            col += colDir;
        }

        return true;
    }

    findKing(color) {
        let kingFound = false;
        let kingPosition = null;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'KING' && piece.color === color) {
                    if (kingFound) {
                        console.error('Multiple kings found for', color);
                    }
                    kingFound = true;
                    kingPosition = { row, col };
                }
            }
        }
        
        if (!kingFound) {
            console.error(`King not found for ${color}`);
        }
        
        return kingPosition;
    }

    isSquareUnderAttack(row, col, byColor, excludeKing = false) {
        for (let startRow = 0; startRow < 8; startRow++) {
            for (let startCol = 0; startCol < 8; startCol++) {
                const piece = this.board[startRow][startCol];
                if (piece && piece.color === byColor) {
                    // Skip king when checking for dangerous moves to avoid recursion
                    if (excludeKing && piece.type === 'KING') continue;
                    
                    const savedPlayer = this.currentPlayer;
                    this.currentPlayer = byColor;
                    const isValid = this.isValidMove(startRow, startCol, row, col);
                    this.currentPlayer = savedPlayer;
                    if (isValid) return true;
                }
            }
        }
        return false;
    }

    isInCheck(color) {
        const king = this.findKing(color);
        if (!king) {
            console.error('King not found for', color, 'current board state:', this.board);
            return false;
        }
        const oppositeColor = color === 'WHITE' ? 'BLACK' : 'WHITE';
        return this.isSquareUnderAttack(king.row, king.col, oppositeColor);
    }

    evaluateMove(startRow, startCol, endRow, endCol, color) {
        const piece = this.board[startRow][startCol];
        if (!piece || piece.color !== color) return false;

        // Prevent capturing kings during evaluation
        const targetPiece = this.board[endRow][endCol];
        if (targetPiece && targetPiece.type === 'KING') return false;

        // Prevent moving to a square occupied by a piece of the same color
        if (targetPiece && targetPiece.color === color) return false;

        // Try the move
        const savedTarget = this.board[endRow][endCol];
        const savedLastPawnMove = this.lastPawnDoubleMove;
        this.board[endRow][endCol] = { ...piece };
        this.board[startRow][startCol] = null;

        // Check if this move would leave or put king in check
        const movePutsInCheck = this.isInCheck(color);

        // Restore the board
        this.board[startRow][startCol] = piece;
        this.board[endRow][endCol] = savedTarget;
        this.lastPawnDoubleMove = savedLastPawnMove;

        return !movePutsInCheck;
    }

    hasLegalMoves(color) {
        if (color === this.currentPlayer) {
            return this.validMovesCache.size > 0;
        }
        // Fall back to computation for non-current player
        return super.hasLegalMoves(color);
    }

    movePiece(startRow, startCol, endRow, endCol) {
        // Save state before making the move
        this.saveMoveState();

        const piece = this.board[startRow][startCol];
        
        if (!this.isValidMove(startRow, startCol, endRow, endCol)) {
            this.log('Invalid move attempted');
            return false;
        }

        const targetSquare = this.board[endRow][endCol];
        if (targetSquare && targetSquare.color === piece.color) return false;
        
        // Don't allow moving the last king
        if (piece.type === 'KING') {
            const oppositeColor = piece.color === 'WHITE' ? 'BLACK' : 'WHITE';
            if (!this.findKing(oppositeColor)) {
                console.error('Cannot move last remaining king');
                return false;
            }
        }

        // Make temporary move to check for king safety
        const savedPiece = { ...piece };
        const savedTarget = this.board[endRow][endCol];
        const savedLastPawnMove = this.lastPawnDoubleMove;
        
        this.board[endRow][endCol] = savedPiece;
        this.board[startRow][startCol] = null;

        // Verify both kings are still on board and check for check
        const whiteKing = this.findKing('WHITE');
        const blackKing = this.findKing('BLACK');
        const movePutsOwnKingInCheck = this.isInCheck(piece.color);
        
        // Restore board state
        this.board[startRow][startCol] = piece;
        this.board[endRow][endCol] = savedTarget;
        this.lastPawnDoubleMove = savedLastPawnMove;

        if (!whiteKing || !blackKing) {
            console.error('Invalid move - would remove king from board');
            return false;
        }

        if (movePutsOwnKingInCheck) {
            console.log('Move puts own king in check');
            return false;
        }

        // Reset last pawn double move
        this.lastPawnDoubleMove = null;

        // Handle special moves
        if (piece.type === 'PAWN') {
            // Handle pawn double move
            if (Math.abs(startRow - endRow) === 2) {
                this.lastPawnDoubleMove = { row: endRow, col: endCol };
            }
            // Handle en passant capture
            else if (Math.abs(startCol - endCol) === 1 && !targetSquare) {
                this.board[startRow][endCol] = null;
            }
            // Handle promotion
            if (endRow === 0 || endRow === 7) {
                this.board[endRow][endCol] = { type: 'QUEEN', color: piece.color, hasMoved: true };
                this.board[startRow][startCol] = null;
                // Skip the normal move as we've handled it
                this.afterMove(piece);
                return true;
            }
        }
        // Handle castling
        else if (piece.type === 'KING' && Math.abs(startCol - endCol) === 2) {
            const direction = endCol > startCol ? 1 : -1;
            const rookCol = direction === 1 ? 7 : 0;
            const newRookCol = direction === 1 ? endCol - 1 : endCol + 1;
            
            const rook = { ...this.board[startRow][rookCol] };
            this.board[endRow][newRookCol] = { ...rook, hasMoved: true };
            this.board[startRow][rookCol] = null;
        }

        const isCapture = this.board[endRow][endCol] !== null;
    
        // Generate notation before making the move
        const moveNotation = this.generateMoveNotation(startRow, startCol, endRow, endCol, isCapture);

        // Make the actual move
        this.board[endRow][endCol] = { ...piece, hasMoved: true };
        this.board[startRow][startCol] = null;

        // After successful move, before calling afterMove:
        const positionKey = this.generatePositionKey();
        this.positionHistory.set(positionKey, (this.positionHistory.get(positionKey) || 0) + 1);

        // After the move is made, check for check/checkmate
        const inCheck = this.isInCheck(this.currentPlayer);
        const hasLegalMoves = this.hasLegalMoves(this.currentPlayer);

        // Add check/checkmate symbols to notation
        let finalNotation = moveNotation;
        if (inCheck && !hasLegalMoves) {
            finalNotation += '#';
        } else if (inCheck) {
            finalNotation += '+';
        }

        // Log the move with notation
        this.log(null, finalNotation);

        this.afterMove(piece);
        return true;
    }

    async afterMove(piece) {
        const previousPlayer = this.currentPlayer;
        this.currentPlayer = this.currentPlayer === 'WHITE' ? 'BLACK' : 'WHITE';
        this.computeAllValidMoves(); // Compute valid moves for next player
        
        // Update move counters
        this.halfMoveCounter++;
        if (this.currentPlayer === 'WHITE') {
            this.moveCounter++;
        }

        // Get cloud evaluation for the position
        const fen = this.generateFEN();
        try {
            const suggestedMove = await fetchCloudEval(fen);
            if (suggestedMove && !suggestedMove.error) {
                console.log(`Cloud suggests: ${suggestedMove}`);
                const aiScoreElement = document.getElementById('ai-score');
                aiScoreElement.textContent += ` (Cloud: ${suggestedMove})`;
            }
        } catch (error) {
            console.log('Cloud evaluation failed:', error);
        }

        // Update turn display
        const turnElement = document.getElementById('turn');
        turnElement.innerHTML = `
            <div class="turn-info">
                <span>${this.currentPlayer}'s turn</span>
                <div id="ai-spinner" class="spinner"></div>
            </div>
            <span class="move-counter">Move: ${this.moveCounter} (${this.halfMoveCounter})</span>
        `;

        // Hide spinner immediately after creating it
        document.getElementById('ai-spinner').style.display = 'none';

        // Check game state
        const inCheck = this.isInCheck(this.currentPlayer);
        const hasLegalMoves = this.hasLegalMoves(this.currentPlayer);
        const insufficientMaterial = this.hasInsufficientMaterial();
        const repeatingPosition = this.hasRepeatingPosition();
        
        // Update game status
        const status = document.getElementById('status');
        
        if (repeatingPosition) {
            status.textContent = 'Draw by threefold repetition!';
            this.log('Game drawn due to threefold repetition');
            this.gameOver = true;
            
            const modal = document.getElementById('checkmateModal');
            const modalMessage = document.getElementById('modalMessage');
            modalMessage.textContent = 'Game is a draw by threefold repetition!';
            modal.classList.add('show');
        } else if (insufficientMaterial) {
            status.textContent = 'Draw by insufficient material!';
            this.log('Game drawn due to insufficient material');
            this.gameOver = true;
            
            // Show insufficient material modal
            const modal = document.getElementById('checkmateModal');
            const modalMessage = document.getElementById('modalMessage');
            modalMessage.textContent = 'Game is a draw by insufficient material!';
            modal.classList.add('show');
        } else if (inCheck && !hasLegalMoves) {
            // Checkmate
            status.textContent = `Checkmate! ${piece.color} wins!`;
            this.log(`Checkmate! ${piece.color} wins!`);
            this.gameOver = true;
            
            // Show checkmate modal
            const modal = document.getElementById('checkmateModal');
            const modalMessage = document.getElementById('modalMessage');
            modalMessage.textContent = `${piece.color} wins the game!`;
            modal.classList.add('show');
        } else if (inCheck) {
            // Check
            status.textContent = `${this.currentPlayer} is in check!`;
            this.log(`${this.currentPlayer} is in check!`);
        } else if (!hasLegalMoves) {
            // Stalemate
            status.textContent = 'Stalemate! Game is a draw.';
            this.log('Stalemate! Game is a draw.');
            this.gameOver = true;
            
            // Show stalemate modal
            const modal = document.getElementById('checkmateModal');
            const modalMessage = document.getElementById('modalMessage');
            modalMessage.textContent = 'Game is a draw by stalemate!';
            modal.classList.add('show');
        } else {
            status.textContent = '';
        }

        // Render immediately after white's move
        this.renderBoard();
        
        if (this.currentPlayer === 'BLACK' && !this.gameOver) {
            this.makeAIMove();
        }
    }

    computeAllValidMoves() {
        this.validMovesCache.clear();
        
        for (let startRow = 0; startRow < 8; startRow++) {
            for (let startCol = 0; startCol < 8; startCol++) {
                const piece = this.board[startRow][startCol];
                if (!piece || piece.color !== this.currentPlayer) continue;

                const key = `${startRow},${startCol}`;
                const validMoves = [];

                for (let endRow = 0; endRow < 8; endRow++) {
                    for (let endCol = 0; endCol < 8; endCol++) {
                        // Skip if destination has friendly piece
                        const targetPiece = this.board[endRow][endCol];
                        if (targetPiece && targetPiece.color === this.currentPlayer) {
                            continue;
                        }

                        if (this.isValidMove(startRow, startCol, endRow, endCol) &&
                            this.evaluateMove(startRow, startCol, endRow, endCol, this.currentPlayer)) {
                            validMoves.push({ row: endRow, col: endCol });
                        }
                    }
                }

                if (validMoves.length > 0) {
                    this.validMovesCache.set(key, validMoves);
                }
            }
        }
    }

    getValidMovesForPiece(row, col) {
        const key = `${row},${col}`;
        return this.validMovesCache.get(key) || [];
    }

    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';

        // Get valid moves if a piece is selected
        const validMoves = this.selectedPiece ? 
            this.getValidMovesForPiece(this.selectedPiece.row, this.selectedPiece.col) : [];

        // Get opposing color
        const oppositeColor = this.currentPlayer === 'WHITE' ? 'BLACK' : 'WHITE';

        // Get endangered pieces after potential move
        let endangeredPieces = new Set();
        if (this.selectedPiece && validMoves.length > 0) {
            endangeredPieces = this.getEndangeredPiecesAfterMove();
        }

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 ? 'black' : 'white'}`;
                
                // Add endangered class if this piece would be in danger
                if (endangeredPieces.has(`${row},${col}`)) {
                    square.classList.add('endangered');
                }

                // Rest of the rendering code...
                // ...existing code...
                const piece = this.board[row][col];

                // Highlight endangered pieces when no piece is selected
                if (!this.selectedPiece && piece && piece.color === this.currentPlayer && 
                    this.isPieceInDanger(row, col)) {
                    square.classList.add('endangered');
                }
                
                // Highlight valid moves
                const isValidMove = validMoves.some(move => move.row === row && move.col === col);
                if (isValidMove) {
                    square.classList.add('valid-move');
                    // Add special highlighting for captures
                    if (piece && piece.color !== this.currentPlayer) {
                        square.classList.add('valid-capture');
                    }

                    if (this.selectedPiece) {


                        // Check for dangerous moves (existing code)
                        const selectedPiece = this.board[this.selectedPiece.row][this.selectedPiece.col];
                        const savedTarget = this.board[row][col];
                        
                        this.board[row][col] = selectedPiece;
                        this.board[this.selectedPiece.row][this.selectedPiece.col] = null;
                        
                        const isDangerous = this.isSquareUnderAttack(row, col, oppositeColor, true);
                        
                        this.board[this.selectedPiece.row][this.selectedPiece.col] = selectedPiece;
                        this.board[row][col] = savedTarget;
                        
                        if (isDangerous) {
                            square.classList.add('dangerous');
                        }
                        // Check for checkmate moves
                        if (this.isCheckmateAfterMove(this.selectedPiece.row, this.selectedPiece.col, row, col)) {
                            square.classList.add('checkmate');
                        }
                    }
                }

                // Highlight selected piece
                if (this.selectedPiece && 
                    row === this.selectedPiece.row && 
                    col === this.selectedPiece.col) {
                    square.classList.add('selected');
                }

                if (piece) {
                    const pieceSpan = document.createElement('span');
                    pieceSpan.className = `${piece.color.toLowerCase()}-piece`;
                    pieceSpan.textContent = PIECE_SETS[this.pieceSet || 'unicode'][piece.color][piece.type];
                    square.appendChild(pieceSpan);
                }

                square.dataset.row = row;
                square.dataset.col = col;
                square.addEventListener('click', this.handleSquareClick.bind(this));
                boardElement.appendChild(square);
            }
        }
    }

    getEndangeredPiecesAfterMove() {
        const endangered = new Set();
        if (!this.selectedPiece) return endangered;

        const validMoves = this.getValidMovesForPiece(this.selectedPiece.row, this.selectedPiece.col);
        const piece = this.board[this.selectedPiece.row][this.selectedPiece.col];
        const originalPos = this.board[this.selectedPiece.row][this.selectedPiece.col];

        for (const move of validMoves) {
            // Save the current state
            const targetPiece = this.board[move.row][move.col];

            // Make temporary move
            this.board[move.row][move.col] = piece;
            this.board[this.selectedPiece.row][this.selectedPiece.col] = null;

            // Check which friendly pieces would be in danger
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const checkPiece = this.board[r][c];
                    if (checkPiece && checkPiece.color === piece.color &&
                        (r !== move.row || c !== move.col)) {  // Don't check the moved piece
                        if (this.isPieceInDanger(r, c)) {
                            endangered.add(`${r},${c}`);
                        }
                    }
                }
            }

            // Restore the board state
            this.board[this.selectedPiece.row][this.selectedPiece.col] = originalPos;
            this.board[move.row][move.col] = targetPiece;
        }

        return endangered;
    }

    handleSquareClick(event) {
        if (this.gameOver) {
            this.log('Game is already over');
            return;
        }

        // Get row and col from clicked element or its parent
        let row, col;
        if (event.target.dataset.row) {
            row = parseInt(event.target.dataset.row);
            col = parseInt(event.target.dataset.col);
        } else if (event.target.parentElement.dataset.row) {
            row = parseInt(event.target.parentElement.dataset.row);
            col = parseInt(event.target.parentElement.dataset.col);
        } else {
            return; // Invalid click target
        }

        // Validate position
        if (!this.isValidPosition(row, col)) {
            return;
        }

        const piece = this.board[row][col];

        // Clicking on an already selected piece
        if (this.selectedPiece && 
            this.selectedPiece.row === row && 
            this.selectedPiece.col === col) {
            this.selectedPiece = null;
            this.renderBoard();
            return;
        }

        // Clicking on a valid move for selected piece
        if (this.selectedPiece) {
            const validMoves = this.getValidMovesForPiece(this.selectedPiece.row, this.selectedPiece.col);
            const isValidMove = validMoves.some(move => move.row === row && move.col === col);

            if (isValidMove) {
                this.movePiece(this.selectedPiece.row, this.selectedPiece.col, row, col);
                this.selectedPiece = null;
                this.renderBoard();
                return;
            }
        }

        // Selecting a new piece
        if (piece && piece.color === this.currentPlayer) {
            this.selectedPiece = { row, col };
            this.renderBoard();
        }
    }

    evaluatePosition(color) {
        const pieceValues = {
            'PAWN': 100,
            'KNIGHT': 320,
            'BISHOP': 330,
            'ROOK': 500,
            'QUEEN': 900,
            'KING': 20000
        };

        // Positional bonuses for pieces - now from black's perspective
        const pawnPositionBonus = [
            [0,  0,  0,  0,  0,  0,  0,  0],
            [5, 10, 10,-20,-20, 10, 10,  5],
            [5, -5,-10,  0,  0,-10, -5,  5],
            [0,  0,  0, 20, 20,  0,  0,  0],
            [5,  5, 10, 25, 25, 10,  5,  5],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [50, 50, 50, 50, 50, 50, 50, 50]
        ];

        let score = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    // Material value
                    let value = pieceValues[piece.type];
                    
                    // Position value for pawns
                    if (piece.type === 'PAWN') {
                        // For black pawns, read the bonus array as is
                        // For white pawns, flip the array vertically
                        const positionRow = piece.color === 'BLACK' ? row : 7 - row;
                        value += pawnPositionBonus[positionRow][col];
                    }

                    // Center control bonus for minor pieces
                    if (['KNIGHT', 'BISHOP'].includes(piece.type)) {
                        if ((row === 3 || row === 4) && (col === 3 || col === 4)) {
                            value += 10;
                        }
                    }

                    score += value * (piece.color === color ? 1 : -1);
                }
            }
        }
        return score;
    }

    minimax(depth, alpha, beta, maximizingPlayer) {
        // Check for leaf node
        if (depth === 0) {
            return this.evaluatePosition('BLACK');
        }

        const currentColor = maximizingPlayer ? 'BLACK' : 'WHITE';
        const savedPlayer = this.currentPlayer;
        this.currentPlayer = currentColor;

        let bestScore = maximizingPlayer ? -Infinity : Infinity;
        
        for (let startRow = 0; startRow < 8; startRow++) {
            for (let startCol = 0; startCol < 8; startCol++) {
                const piece = this.board[startRow][startCol];
                if (!piece || piece.color !== currentColor) continue;

                for (let endRow = 0; endRow < 8; endRow++) {
                    for (let endCol = 0; endCol < 8; endCol++) {
                        if (this.isValidMove(startRow, startCol, endRow, endCol) &&
                            this.evaluateMove(startRow, startCol, endRow, endCol, currentColor)) {
                            
                            // Make move
                            const savedTarget = this.board[endRow][endCol];
                            this.board[endRow][endCol] = piece;
                            this.board[startRow][startCol] = null;

                            const score = this.minimax(depth - 1, alpha, beta, !maximizingPlayer);

                            // Undo move
                            this.board[startRow][startCol] = piece;
                            this.board[endRow][endCol] = savedTarget;

                            if (maximizingPlayer) {
                                bestScore = Math.max(bestScore, score);
                                alpha = Math.max(alpha, score);
                            } else {
                                bestScore = Math.min(bestScore, score);
                                beta = Math.min(beta, score);
                            }

                            if (beta <= alpha) {
                                this.currentPlayer = savedPlayer;
                                return bestScore;
                            }
                        }
                    }
                }
            }
        }

        this.currentPlayer = savedPlayer;
        return bestScore;
    }

    findBestMove() {
        let bestScore = -Infinity;
        let validMoves = [];
        const depth = this.searchDepth;
        
        const savedPlayer = this.currentPlayer;
        this.currentPlayer = 'BLACK';

        // First pass: collect all valid moves and their scores
        for (let startRow = 0; startRow < 8; startRow++) {
            for (let startCol = 0; startCol < 8; startCol++ ) {
                const piece = this.board[startRow][startCol];
                if (!piece || piece.color !== 'BLACK') continue;

                for (let endRow = 0; endRow < 8; endRow++) {
                    for (let endCol = 0; endCol < 8; endCol++) {
                        if (this.isValidMove(startRow, startCol, endRow, endCol) &&
                            this.evaluateMove(startRow, startCol, endRow, endCol, 'BLACK')) {
                            
                            const savedTarget = this.board[endRow][endCol];
                            this.board[endRow][endCol] = piece;
                            this.board[startRow][startCol] = null;

                            const score = this.minimax(depth - 1, -Infinity, Infinity, false);

                            this.board[startRow][startCol] = piece;
                            this.board[endRow][endCol] = savedTarget;

                            // Store all valid moves with their scores
                            validMoves.push({
                                startRow,
                                startCol,
                                endRow,
                                endCol,
                                score
                            });

                            if (score > bestScore) {
                                bestScore = score;
                            }
                        }
                    }
                }
            }
        }

        this.currentPlayer = savedPlayer;

        // If no valid moves were found, return null
        if (validMoves.length === 0) {
            return null;
        }

        // Find all moves that have the best score
        const bestMoves = validMoves.filter(move => move.score === bestScore);
        console.log('Best moves:', bestMoves);
        
        // Randomly select one of the best moves
        const selectedMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        
        // If all moves are equally bad, just pick a random valid move
        return selectedMove || validMoves[Math.floor(Math.random() * validMoves.length)];
    }

    makeAIMove() {
        if (!this.isAIEnabled || this.currentPlayer !== 'BLACK' || this.gameOver) return;
        
        const spinner = document.getElementById('ai-spinner');
        spinner.style.display = 'inline-block';
        
        setTimeout(() => {
            const move = this.findBestMove();
            if (move) {
                // Draw the move line
                this.drawMoveLine(move.startRow, move.startCol, move.endRow, move.endCol);

                // Update the AI score display
                const aiScoreElement = document.getElementById('ai-score');
                aiScoreElement.textContent = `AI Score: ${move.score} (prev: ${this.previousAIScore})`;
                this.previousAIScore = move.score;
                
                this.movePiece(move.startRow, move.startCol, move.endRow, move.endCol);
                this.renderBoard();

                // Clear the line after a delay
                setTimeout(() => {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                }, 1500);
            }
            spinner.style.display = 'none';
        }, 50);
    }

    initializeControls() {
        // Replace slider event listener with button listeners
        document.querySelectorAll('.difficulty-button').forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                document.querySelectorAll('.difficulty-button').forEach(b => 
                    b.classList.remove('active'));
                // Add active class to clicked button
                e.target.classList.add('active');
                // Update search depth
                this.searchDepth = parseInt(e.target.dataset.depth);
            });
        });

        // Add revert button listener
        document.getElementById('revertButton').addEventListener('click', () => {
            if (this.revertMove() && this.currentPlayer === 'BLACK') {
                // If we reverted to black's turn, revert one more time
                this.revertMove();
            }
        });
    }

    hasInsufficientMaterial() {
        // Count pieces for each player
        let whitePieces = new Map();
        let blackPieces = new Map();

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (!piece) continue;

                const piecesList = piece.color === 'WHITE' ? whitePieces : blackPieces;
                piecesList.set(piece.type, (piecesList.get(piece.type) || 0) + 1);
            }
        }

        // Helper function to check piece counts
        const hasPieces = (pieces) => {
            const count = (type) => pieces.get(type) || 0;
            
            // If there are pawns, rooks, or queens, there's sufficient material
            if (count('PAWN') > 0 || count('ROOK') > 0 || count('QUEEN') > 0) {
                return false;
            }

            // King only
            if (pieces.size === 1 && count('KING') === 1) {
                return true;
            }

            // King and single knight/bishop
            if (pieces.size === 2 && count('KING') === 1 && 
                (count('KNIGHT') === 1 || count('BISHOP') === 1)) {
                return true;
            }

            return false;
        };

        // Check if both players have insufficient material
        return hasPieces(whitePieces) && hasPieces(blackPieces);
    }

    // Add new method to generate position key
    generatePositionKey() {
        let key = '';
        // Add board position
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    key += `${piece.type}${piece.color}${row}${col}`;
                }
            }
        }
        // Add current player
        key += this.currentPlayer;
        // Add castling rights
        for (let row of [0, 7]) {
            for (let col of [0, 4, 7]) {
                const piece = this.board[row][col];
                if (piece && !piece.hasMoved) {
                    key += `${row}${col}`;
                }
            }
        }
        // Add en passant possibility
        if (this.lastPawnDoubleMove) {
            key += `ep${this.lastPawnDoubleMove.row}${this.lastPawnDoubleMove.col}`;
        }
        return key;
    }

    // Add method to check for repetition
    hasRepeatingPosition() {
        const currentKey = this.generatePositionKey();
        const count = this.positionHistory.get(currentKey) || 0;
        return count >= 3; // Threefold repetition
    }

    getSquareNotation(row, col) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        return files[col] + ranks[row];
    }

    getPieceNotation(piece) {
        const notation = {
            'KING': 'K', 'QUEEN': 'Q', 'ROOK': 'R',
            'BISHOP': 'B', 'KNIGHT': 'N'
        };
        return notation[piece.type] || '';
    }

    generateMoveNotation(startRow, startCol, endRow, endCol, capture = false) {
        const piece = this.board[startRow][startCol];
        let notation = '';

        // Handle castling
        if (piece.type === 'KING' && Math.abs(startCol - endCol) === 2) {
            return endCol > startCol ? 'O-O' : 'O-O-O';
        }

        // Add piece letter (except for pawns)
        notation += this.getPieceNotation(piece);

        // Disambiguate moves if necessary
        const needsDisambiguation = this.needsDisambiguation(piece, startRow, startCol, endRow, endCol);
        if (needsDisambiguation.file) notation += this.getSquareNotation(startRow, startCol)[0];
        if (needsDisambiguation.rank) notation += this.getSquareNotation(startRow, startCol)[1];

        // Add capture symbol
        if (capture) {
            if (piece.type === 'PAWN') notation += this.getSquareNotation(startRow, startCol)[0];
            notation += 'x';
        }

        // Add destination square
        notation += this.getSquareNotation(endRow, endCol);

        // Handle pawn promotion
        if (piece.type === 'PAWN' && (endRow === 0 || endRow === 7)) {
            notation += '=Q';
        }

        return notation;
    }

    needsDisambiguation(piece, startRow, startCol, endRow, endCol) {
        let needFile = false;
        let needRank = false;

        // Check other pieces of same type that could move to the same square
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (row === startRow && col === startCol) continue;

                const otherPiece = this.board[row][col];
                if (!otherPiece || otherPiece.type !== piece.type || otherPiece.color !== piece.color) continue;

                if (this.isValidMove(row, col, endRow, endCol)) {
                    if (col !== startCol) needFile = true;
                    if (row !== startRow) needRank = true;
                }
            }
        }

        return { file: needFile, rank: needRank };
    }

    isCheckmateAfterMove(startRow, startCol, endRow, endCol) {
        // Save current state
        const piece = this.board[startRow][startCol];
        const targetPiece = this.board[endRow][endCol];
        const savedPlayer = this.currentPlayer;
        
        // Make temporary move
        this.board[endRow][endCol] = piece;
        this.board[startRow][startCol] = null;
        
        // Switch to opponent's perspective
        this.currentPlayer = this.currentPlayer === 'WHITE' ? 'BLACK' : 'WHITE';
        
        // Check if opponent is in check and has no legal moves
        const inCheck = this.isInCheck(this.currentPlayer);
        const hasLegalMoves = this.computeHasLegalMoves(this.currentPlayer);
        
        // Restore board state
        this.board[startRow][startCol] = piece;
        this.board[endRow][endCol] = targetPiece;
        this.currentPlayer = savedPlayer;
        
        return inCheck && !hasLegalMoves;
    }

    computeHasLegalMoves(color) {
        for (let startRow = 0; startRow < 8; startRow++) {
            for (let startCol = 0; startCol < 8; startCol++) {
                const piece = this.board[startRow][startCol];
                if (!piece || piece.color !== color) continue;

                for (let endRow = 0; endRow < 8; endRow++) {
                    for (let endCol = 0; endCol < 8; endCol++) {
                        if (this.isValidMove(startRow, startCol, endRow, endCol) &&
                            this.evaluateMove(startRow, startCol, endRow, endCol, color)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    saveMoveState() {
        const state = {
            board: this.board.map(row => row.map(piece => piece ? {...piece} : null)),
            currentPlayer: this.currentPlayer,
            lastPawnDoubleMove: this.lastPawnDoubleMove ? {...this.lastPawnDoubleMove} : null,
            halfMoveCounter: this.halfMoveCounter,
            moveCounter: this.moveCounter,
            selectedPiece: this.selectedPiece ? {...this.selectedPiece} : null  // Add this line
        };
        this.moveStack.push(state);
        document.getElementById('revertButton').disabled = false;
    }

    revertMove() {
        if (this.moveStack.length === 0) return false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const prevState = this.moveStack.pop();
        this.board = prevState.board;
        this.currentPlayer = prevState.currentPlayer;
        this.lastPawnDoubleMove = prevState.lastPawnDoubleMove;
        this.halfMoveCounter = prevState.halfMoveCounter;
        this.moveCounter = prevState.moveCounter;
        this.selectedPiece = prevState.selectedPiece;
        
        // Recompute valid moves after reverting
        this.computeAllValidMoves();
        
        // Update UI
        this.renderBoard();
        document.getElementById('revertButton').disabled = this.moveStack.length === 0;
        
        // Update turn display
        const turnElement = document.getElementById('turn');
        turnElement.innerHTML = `
            <div class="turn-info">
                <span>${this.currentPlayer}'s turn</span>
                <div id="ai-spinner" class="spinner"></div>
            </div>
            <span class="move-counter">Move: ${this.moveCounter} (${this.halfMoveCounter})</span>
        `;

        // Remove last move from game log
        const gameLog = document.getElementById('game-log');
        if (gameLog.lastChild) {
            gameLog.removeChild(gameLog.lastChild);
        }

        // Reset gameOver if it was true
        this.gameOver = false;

        return true;
    }

    isPieceInDanger(row, col) {
        const piece = this.board[row][col];
        if (!piece) return false;

        const oppositeColor = piece.color === 'WHITE' ? 'BLACK' : 'WHITE';
        return this.isSquareUnderAttack(row, col, oppositeColor);
    }

    initializeCanvas() {
        this.canvas = document.getElementById('moveCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const board = document.getElementById('board');
        const rect = board.getBoundingClientRect();
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.width + 'px'; // Keep it square
        
        // Set actual canvas dimensions (multiplied for better resolution)
        this.canvas.width = rect.width * 2;
        this.canvas.height = rect.width * 2;
        this.ctx.scale(2, 2); // Scale up for retina display
        
        this.squareSize = rect.width / 8;
        
        // Clear any existing lines when resizing
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawMoveLine(startRow, startCol, endRow, endCol) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const startX = (startCol + 0.5) * this.squareSize;
        const startY = (startRow + 0.5) * this.squareSize;
        const endX = (endCol + 0.5) * this.squareSize;
        const endY = (endRow + 0.5) * this.squareSize;

        // Draw glow effect
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = this.colors.moveLineColor;
        this.ctx.strokeStyle = this.colors.moveLineColor;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';

        // Draw the line
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();

        // Draw circles at start and end points
        this.ctx.beginPath();
        this.ctx.arc(startX, startY, 5, 0, Math.PI * 2);
        this.ctx.arc(endX, endY, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }

    initializeSettings() {
        this.defaultColors = {
            primaryColor: '#00ffff',
            secondaryColor: '#ff00ff',
            lightSquare: '#1a1a2e',
            darkSquare: '#2a2a4e',
            dangerColor: '#ff0000',
            moveLineColor: '#ff8c00',
            checkmateColor: '#00ff00',
            whitePieceColor: '#ffffff',
            blackPieceColor: '#000000'
        };
        
        // Add piece set to settings
        this.defaultSettings = {
            colors: this.defaultColors,
            pieceSet: 'unicode'
        };
        
        // Load saved settings or use defaults
        const savedSettings = JSON.parse(localStorage.getItem('chessSettings')) || this.defaultSettings;
        this.colors = savedSettings.colors;
        this.pieceSet = savedSettings.pieceSet;
        
        // Initialize color inputs and piece set selector
        Object.entries(this.colors).forEach(([key, value]) => {
            const input = document.getElementById(key);
            if (input) input.value = value;
        });
        
        const pieceSetSelect = document.getElementById('pieceSetSelect');
        if (pieceSetSelect) pieceSetSelect.value = this.pieceSet;
        
        this.applySettings();
    }

    toggleSettings() {
        const overlay = document.getElementById('settingsOverlay');
        overlay.style.display = overlay.style.display === 'flex' ? 'none' : 'flex';
    }

    resetColors() {
        Object.entries(this.defaultColors).forEach(([key, value]) => {
            const input = document.getElementById(key);
            if (input) input.value = value;
        });
        this.applyColors();
    }

    applyColors() {
        // Get current values from inputs
        const colors = {};
        Object.keys(this.defaultColors).forEach(key => {
            const input = document.getElementById(key);
            if (input) colors[key] = input.value;
        });
        
        // Save to localStorage
        localStorage.setItem('chessColors', JSON.stringify(colors));
        this.colors = colors;

        // Apply CSS variables
        document.documentElement.style.setProperty('--primary-color', colors.primaryColor);
        document.documentElement.style.setProperty('--secondary-color', colors.secondaryColor);
        document.documentElement.style.setProperty('--light-square', colors.lightSquare);
        document.documentElement.style.setProperty('--dark-square', colors.darkSquare);
        document.documentElement.style.setProperty('--danger-color', colors.dangerColor);
        document.documentElement.style.setProperty('--move-line-color', colors.moveLineColor);
        document.documentElement.style.setProperty('--checkmate-color', colors.checkmateColor);
        document.documentElement.style.setProperty('--white-piece-color', colors.whitePieceColor);
        document.documentElement.style.setProperty('--black-piece-color', colors.blackPieceColor);

        // Update existing elements
        this.updateStyles();
        this.renderBoard();

        // Close settings after applying
        this.toggleSettings();
    }

    applySettings() {
        // Save all settings including piece set
        const settings = {
            colors: this.colors,
            pieceSet: this.pieceSet
        };
        localStorage.setItem('chessSettings', JSON.stringify(settings));
        localStorage.setItem('chessPieceSet', this.pieceSet); // Save piece set separately for initialization

        // Apply colors and update pieces
        this.applyColors();
        this.renderBoard();
    }

    updateStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .white { background: var(--light-square) !important; }
            .black { background: var(--dark-square) !important; }
            .valid-move::after { border-color: var(--primary-color); box-shadow: 0 0 10px var(--primary-color); }
            .valid-capture::after { border-color: var(--secondary-color); box-shadow: 0 0 10px var(--secondary-color); }
            .valid-move.dangerous::after { border-color: var(--danger-color); box-shadow: 0 0 10px var(--danger-color); }
            .valid-capture.dangerous::after { border-color: var(--danger-color); box-shadow: 0 0 10px var(--danger-color); }
            .valid-move.checkmate::after { border-color: var(--checkmate-color); box-shadow: 0 0 10px var(--checkmate-color); }
            .valid-capture.checkmate::after { border-color: var(--checkmate-color); box-shadow: 0 0 10px var(--checkmate-color); }
            .white-piece { color: var(--white-piece-color); }
            .black-piece { color: var(--black-piece-color); }
        `;
        
        // Remove previous dynamic styles if they exist
        const oldStyle = document.getElementById('dynamicStyles');
        if (oldStyle) oldStyle.remove();
        
        style.id = 'dynamicStyles';
        document.head.appendChild(style);
    }
}

const game = new Chess();