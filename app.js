class TileBlendGame {
    constructor() {
        this.gameState = {
            currentScreen: 'main-menu',
            players: [],
            currentPlayerIndex: 0,
            tiles: [],
            playerTiles: {},
            tableSets: [],
            gameStarted: false,
            isSinglePlayer: false,
            hasInitialMeld: {},
            turnHistory: [],
            drawPile: []
        };
        
        this.colors = ['red', 'blue', 'yellow', 'green'];
        this.numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
        this.draggedTile = null;
        this.draggedFrom = null;
        this.currentMove = [];
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // ドラッグ&ドロップイベント
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
        
        // タッチイベント
        document.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    // 画面遷移
    showScreen(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.remove('active'));
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.gameState.currentScreen = screenId;
        }
    }

    showPlayerSetup(isSinglePlayer) {
        this.gameState.isSinglePlayer = isSinglePlayer;
        const title = document.getElementById('setup-title');
        if (title) {
            title.textContent = isSinglePlayer ? 'シングルプレイヤー設定' : 'マルチプレイヤー設定';
        }
        
        this.updatePlayerSetup();
        this.showScreen('player-setup');
    }

    updatePlayerSetup() {
        const playerCountSelect = document.getElementById('player-count');
        const playerInputs = document.getElementById('player-inputs');
        
        if (!playerCountSelect || !playerInputs) return;
        
        const playerCount = parseInt(playerCountSelect.value);
        const isSinglePlayer = this.gameState.isSinglePlayer;
        
        playerInputs.innerHTML = '';
        
        for (let i = 1; i <= playerCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'player-input';
            
            if (i === 1 || !isSinglePlayer) {
                // 人間プレイヤー
                inputGroup.innerHTML = `
                    <label>プレイヤー${i}:</label>
                    <input type="text" id="player-${i}-name" class="form-control" placeholder="名前を入力" value="プレイヤー${i}">
                `;
            } else {
                // AIプレイヤー
                inputGroup.innerHTML = `
                    <label>AI${i - 1}:</label>
                    <select id="player-${i}-difficulty" class="form-control">
                        <option value="easy">簡単</option>
                        <option value="medium">普通</option>
                        <option value="hard">難しい</option>
                    </select>
                `;
            }
            
            playerInputs.appendChild(inputGroup);
        }
    }

    // タイル生成
    createTiles() {
        const tiles = [];
        let id = 0;
        
        // 通常のタイル（各色・数字を2枚ずつ）
        for (let copy = 0; copy < 2; copy++) {
            for (const color of this.colors) {
                for (const number of this.numbers) {
                    tiles.push({
                        id: id++,
                        number: number,
                        color: color,
                        isJoker: false
                    });
                }
            }
        }
        
        // ジョーカーを2枚追加
        for (let i = 0; i < 2; i++) {
            tiles.push({
                id: id++,
                number: 0,
                color: 'joker',
                isJoker: true
            });
        }
        
        return this.shuffleArray(tiles);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // ゲーム開始
    startGame() {
        const playerCountSelect = document.getElementById('player-count');
        if (!playerCountSelect) return;
        
        const playerCount = parseInt(playerCountSelect.value);
        const players = [];
        
        for (let i = 0; i < playerCount; i++) {
            const nameInput = document.getElementById(`player-${i + 1}-name`);
            const difficultySelect = document.getElementById(`player-${i + 1}-difficulty`);
            
            players.push({
                id: i,
                name: nameInput ? nameInput.value || `プレイヤー${i + 1}` : `プレイヤー${i + 1}`,
                isAI: this.gameState.isSinglePlayer && i > 0,
                difficulty: difficultySelect ? difficultySelect.value : 'medium',
                hasInitialMeld: false
            });
        }
        
        this.gameState.players = players;
        this.gameState.tiles = this.createTiles();
        this.gameState.drawPile = [...this.gameState.tiles];
        this.gameState.playerTiles = {};
        this.gameState.tableSets = [];
        this.gameState.hasInitialMeld = {};
        
        // プレイヤーにタイルを配布
        for (const player of players) {
            this.gameState.playerTiles[player.id] = [];
            for (let i = 0; i < 14; i++) {
                if (this.gameState.drawPile.length > 0) {
                    this.gameState.playerTiles[player.id].push(this.gameState.drawPile.pop());
                }
            }
        }
        
        this.gameState.currentPlayerIndex = 0;
        this.gameState.gameStarted = true;
        
        this.showScreen('game-board');
        this.updateGameUI();
    }

    // AI関連メソッド（簡略版）
    makeAIMove(player) {
        const playerTiles = this.gameState.playerTiles[player.id];
        const possibleSets = this.findPossibleSets(playerTiles);
        
        if (possibleSets.length > 0 && Math.random() > 0.3) {
            const randomSet = possibleSets[Math.floor(Math.random() * possibleSets.length)];
            if (this.canPlaySet(randomSet, player.id)) {
                this.playSet(randomSet, player.id);
                return true;
            }
        }
        
        return false;
    }

    findPossibleSets(tiles) {
        const possibleSets = [];
        
        // 簡単なグループ検索
        const numberGroups = {};
        for (const tile of tiles) {
            if (!tile.isJoker) {
                if (!numberGroups[tile.number]) {
                    numberGroups[tile.number] = [];
                }
                numberGroups[tile.number].push(tile);
            }
        }
        
        for (const number in numberGroups) {
            const group = numberGroups[number];
            if (group.length >= 3) {
                possibleSets.push(group.slice(0, 3)); // 最初の3枚を取る
            }
        }
        
        return possibleSets;
    }

    canPlaySet(tiles, playerId) {
        const player = this.gameState.players[playerId];
        const setValue = tiles.reduce((sum, tile) => sum + tile.number, 0);
        
        if (!player.hasInitialMeld) {
            return setValue >= 30;
        }
        
        return true;
    }

    playSet(tiles, playerId) {
        // タイルをプレイヤーの手札から削除
        const playerTiles = this.gameState.playerTiles[playerId];
        for (const tile of tiles) {
            const index = playerTiles.findIndex(t => t.id === tile.id);
            if (index >= 0) {
                playerTiles.splice(index, 1);
            }
        }
        
        // テーブルにセットを追加
        this.gameState.tableSets.push({
            id: Date.now() + Math.random(),
            tiles: tiles,
            playerId: playerId
        });
        
        // 初回メルドフラグを設定
        this.gameState.players[playerId].hasInitialMeld = true;
        
        this.updateGameUI();
    }

    // UI更新
    updateGameUI() {
        this.updateCurrentPlayerDisplay();
        this.updatePlayerTiles();
        this.updateTableSets();
        this.updateOtherPlayers();
        this.updateActionButtons();
    }

    updateCurrentPlayerDisplay() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        const element = document.getElementById('current-player-name');
        if (element && currentPlayer) {
            element.textContent = currentPlayer.name;
        }
    }

    updatePlayerTiles() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (!currentPlayer) return;
        
        const playerTiles = this.gameState.playerTiles[currentPlayer.id];
        const tilesContainer = document.getElementById('player-tiles');
        const tileCountElement = document.getElementById('tile-count');
        
        if (!tilesContainer || !tileCountElement || !playerTiles) return;
        
        tilesContainer.innerHTML = '';
        tileCountElement.textContent = `${playerTiles.length}枚`;
        
        for (const tile of playerTiles) {
            const tileElement = this.createTileElement(tile);
            tileElement.draggable = true;
            tileElement.addEventListener('click', () => this.selectTile(tile));
            tilesContainer.appendChild(tileElement);
        }
    }

    createTileElement(tile) {
        const tileElement = document.createElement('div');
        tileElement.className = `tile ${tile.color}`;
        tileElement.dataset.tileId = tile.id;
        
        if (tile.isJoker) {
            tileElement.textContent = '★';
            tileElement.classList.add('joker');
        } else {
            tileElement.textContent = tile.number;
        }
        
        return tileElement;
    }

    updateTableSets() {
        const tableArea = document.getElementById('table-area');
        if (!tableArea) return;
        
        const placeholder = tableArea.querySelector('.table-placeholder');
        
        if (this.gameState.tableSets.length === 0) {
            if (placeholder) placeholder.style.display = 'flex';
            const existingSets = tableArea.querySelectorAll('.table-set');
            existingSets.forEach(set => set.remove());
        } else {
            if (placeholder) placeholder.style.display = 'none';
            
            const existingSets = tableArea.querySelectorAll('.table-set');
            existingSets.forEach(set => set.remove());
            
            for (const set of this.gameState.tableSets) {
                const setElement = this.createTableSetElement(set);
                tableArea.appendChild(setElement);
            }
        }
    }

    createTableSetElement(set) {
        const setElement = document.createElement('div');
        setElement.className = 'table-set valid';
        setElement.dataset.setId = set.id;
        
        for (const tile of set.tiles) {
            const tileElement = this.createTileElement(tile);
            setElement.appendChild(tileElement);
        }
        
        return setElement;
    }

    updateOtherPlayers() {
        const otherPlayersContainer = document.getElementById('other-players');
        if (!otherPlayersContainer) return;
        
        otherPlayersContainer.innerHTML = '';
        
        for (let i = 0; i < this.gameState.players.length; i++) {
            const player = this.gameState.players[i];
            const playerTiles = this.gameState.playerTiles[player.id];
            
            const playerElement = document.createElement('div');
            playerElement.className = 'player-info';
            if (i === this.gameState.currentPlayerIndex) {
                playerElement.classList.add('current');
            }
            
            playerElement.innerHTML = `
                <span>${player.name}</span>
                <span class="tile-count">${playerTiles.length}枚</span>
            `;
            
            otherPlayersContainer.appendChild(playerElement);
        }
    }

    updateActionButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const drawBtn = document.getElementById('draw-btn');
        const endTurnBtn = document.getElementById('end-turn-btn');
        
        if (undoBtn) undoBtn.disabled = this.currentMove.length === 0;
        
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        const isCurrentPlayerTurn = currentPlayer && !currentPlayer.isAI;
        
        if (drawBtn) drawBtn.disabled = !isCurrentPlayerTurn;
        if (endTurnBtn) endTurnBtn.disabled = !isCurrentPlayerTurn;
    }

    // ドラッグ&ドロップ処理
    handleDragStart(e) {
        if (!e.target.classList.contains('tile')) return;
        
        this.draggedTile = {
            id: parseInt(e.target.dataset.tileId),
            element: e.target
        };
        
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e) {
        e.preventDefault();
        
        if (!this.draggedTile) return;
        
        const tableArea = document.getElementById('table-area');
        if (tableArea && (tableArea.contains(e.target) || e.target === tableArea)) {
            this.dropTileOnTable(e);
        }
    }

    handleDragEnd(e) {
        if (e.target && e.target.classList.contains('tile')) {
            e.target.classList.remove('dragging');
        }
        this.draggedTile = null;
    }

    dropTileOnTable(e) {
        this.showMessage('タイルを配置しました', 'info');
    }

    // タッチイベント処理（簡略版）
    handleTouchStart(e) {
        if (!e.target.classList.contains('tile')) return;
        e.target.classList.add('selected');
    }

    handleTouchMove(e) {
        e.preventDefault();
    }

    handleTouchEnd(e) {
        // タッチ終了処理
    }

    // ゲームアクション
    drawTile() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (!currentPlayer) return;
        
        const playerTiles = this.gameState.playerTiles[currentPlayer.id];
        
        if (this.gameState.drawPile.length > 0) {
            const drawnTile = this.gameState.drawPile.pop();
            playerTiles.push(drawnTile);
            this.updateGameUI();
            this.showMessage('タイルを1枚引きました', 'info');
            
            setTimeout(() => this.endTurn(), 1000);
        } else {
            this.showMessage('山札がありません', 'error');
        }
    }

    undoMove() {
        this.showMessage('前の手を取り消しました', 'info');
    }

    endTurn() {
        const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (!currentPlayer) return;
        
        const playerTiles = this.gameState.playerTiles[currentPlayer.id];
        
        if (playerTiles.length === 0) {
            this.endGame(currentPlayer);
            return;
        }
        
        this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
        this.updateGameUI();
        
        const nextPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
        if (nextPlayer && nextPlayer.isAI) {
            setTimeout(() => this.executeAITurn(nextPlayer), 1500);
        }
    }

    executeAITurn(player) {
        this.showMessage(`${player.name}が考え中...`, 'info');
        
        setTimeout(() => {
            const madeMoves = this.makeAIMove(player);
            
            if (!madeMoves) {
                const playerTiles = this.gameState.playerTiles[player.id];
                if (this.gameState.drawPile.length > 0) {
                    const drawnTile = this.gameState.drawPile.pop();
                    playerTiles.push(drawnTile);
                    this.showMessage(`${player.name}がタイルを引きました`, 'info');
                }
            }
            
            this.updateGameUI();
            
            const playerTiles = this.gameState.playerTiles[player.id];
            if (playerTiles.length === 0) {
                this.endGame(player);
                return;
            }
            
            setTimeout(() => this.endTurn(), 1000);
        }, 1000 + Math.random() * 2000);
    }

    endGame(winner) {
        this.gameState.gameStarted = false;
        
        const finalScores = this.gameState.players.map(player => {
            const playerTiles = this.gameState.playerTiles[player.id];
            const score = playerTiles.reduce((sum, tile) => sum + (tile.isJoker ? 30 : tile.number), 0);
            return {
                name: player.name,
                tilesLeft: playerTiles.length,
                score: score
            };
        });
        
        const winnerElement = document.getElementById('winner-name');
        if (winnerElement) {
            winnerElement.textContent = winner.name;
        }
        
        const finalScoresContainer = document.getElementById('final-scores');
        if (finalScoresContainer) {
            finalScoresContainer.innerHTML = '';
            
            finalScores.forEach(playerScore => {
                const scoreElement = document.createElement('div');
                scoreElement.className = 'score-item';
                scoreElement.innerHTML = `
                    <span>${playerScore.name}</span>
                    <span>${playerScore.tilesLeft}枚 (-${playerScore.score}点)</span>
                `;
                finalScoresContainer.appendChild(scoreElement);
            });
        }
        
        this.showScreen('game-over');
    }

    showMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `game-message ${type}`;
        messageElement.textContent = message;
        document.body.appendChild(messageElement);
        
        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }

    selectTile(tile) {
        const tileElements = document.querySelectorAll('.tile');
        tileElements.forEach(el => el.classList.remove('selected'));
        
        const tileElement = document.querySelector(`[data-tile-id="${tile.id}"]`);
        if (tileElement) {
            tileElement.classList.add('selected');
        }
    }
}

// グローバル変数
let game;

// グローバル関数（HTMLから呼び出される）
window.showMainMenu = function() {
    if (game) {
        game.showScreen('main-menu');
    }
};

window.showPlayerSetup = function(isSinglePlayer) {
    if (game) {
        game.showPlayerSetup(isSinglePlayer);
    }
};

window.updatePlayerSetup = function() {
    if (game) {
        game.updatePlayerSetup();
    }
};

window.showRules = function() {
    if (game) {
        game.showScreen('rules');
    }
};

window.startGame = function() {
    if (game) {
        game.showScreen('loading');
        setTimeout(() => {
            game.startGame();
        }, 1500);
    }
};

window.undoMove = function() {
    if (game) {
        game.undoMove();
    }
};

window.drawTile = function() {
    if (game) {
        game.drawTile();
    }
};

window.endTurn = function() {
    if (game) {
        game.endTurn();
    }
};

window.restartGame = function() {
    if (game) {
        game.gameState = {
            currentScreen: 'main-menu',
            players: [],
            currentPlayerIndex: 0,
            tiles: [],
            playerTiles: {},
            tableSets: [],
            gameStarted: false,
            isSinglePlayer: false,
            hasInitialMeld: {},
            turnHistory: [],
            drawPile: []
        };
        game.showPlayerSetup(game.gameState.isSinglePlayer);
    }
};

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    game = new TileBlendGame();
    
    // プレイヤー数変更イベント
    const playerCountSelect = document.getElementById('player-count');
    if (playerCountSelect) {
        playerCountSelect.addEventListener('change', window.updatePlayerSetup);
    }
});