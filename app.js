class TileBlendGame {
    constructor() {
        this.gameState = {};
        this.colors = ['red', 'blue', 'yellow', 'green'];
        this.numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
        this.draggedTile = null;
        this.draggedFrom = null;
        this.currentMove = [];
        this.resetGameState();
        this.initializeEventListeners();
    }
    
    resetGameState() {
        this.gameState = {
            currentScreen: 'main-menu',
            players: [],
            currentPlayerIndex: 0,
            playerTiles: {},
            tableSets: [],
            gameStarted: false,
            isSinglePlayer: false,
            hasInitialMeld: {},
            turnHistory: [],
            drawPile: []
        };
    }

    initializeEventListeners() {
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
    }

    // 画面遷移
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
        this.gameState.currentScreen = screenId;
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

        const playerCount = parseInt(playerCountSelect.value, 10);
        const isSinglePlayer = this.gameState.isSinglePlayer;
        
        playerInputs.innerHTML = '';
        
        for (let i = 1; i <= playerCount; i++) {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'player-input';
            
            if (i === 1 || !isSinglePlayer) {
                inputGroup.innerHTML = `
                    <label for="player-${i}-name">プレイヤー${i}:</label>
                    <input type="text" id="player-${i}-name" class="form-control" placeholder="名前を入力" value="プレイヤー${i}">
                `;
            } else {
                inputGroup.innerHTML = `
                    <label for="player-${i}-difficulty">AI ${i - 1}:</label>
                    <select id="player-${i}-difficulty" class="form-control">
                        <option value="easy">簡単</option>
                        <option value="medium" selected>普通</option>
                        <option value="hard">難しい</option>
                    </select>
                `;
            }
            playerInputs.appendChild(inputGroup);
        }
    }

    // ゲームロジック
    createTiles() {
        const tiles = [];
        let id = 0;
        for (let copy = 0; copy < 2; copy++) {
            for (const color of this.colors) {
                for (const number of this.numbers) {
                    tiles.push({ id: id++, number, color, isJoker: false });
                }
            }
        }
        for (let i = 0; i < 2; i++) {
            tiles.push({ id: id++, number: 0, color: 'joker', isJoker: true });
        }
        return this.shuffleArray(tiles);
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    startGame() {
        const playerCount = parseInt(document.getElementById('player-count').value, 10);
        const players = [];
        for (let i = 0; i < playerCount; i++) {
            const nameInput = document.getElementById(`player-${i + 1}-name`);
            const difficultySelect = document.getElementById(`player-${i + 1}-difficulty`);
            players.push({
                id: i,
                name: nameInput ? nameInput.value : `AI ${i}`,
                isAI: this.gameState.isSinglePlayer && i > 0,
                difficulty: difficultySelect ? difficultySelect.value : 'medium',
                hasInitialMeld: false
            });
        }
        
        this.gameState.players = players;
        this.gameState.drawPile = this.createTiles();
        this.gameState.playerTiles = {};
        players.forEach(p => {
            this.gameState.playerTiles[p.id] = this.gameState.drawPile.splice(0, 14);
        });
        
        this.gameState.tableSets = [];
        this.gameState.currentPlayerIndex = 0;
        this.gameState.gameStarted = true;
        
        this.showScreen('game-board');
        this.updateGameUI();
    }
    
    // UI更新
    updateGameUI() {
        this.updateCurrentPlayerDisplay();
        this.updatePlayerTiles();
        this.updateTableSets();
        this.updateOtherPlayers();
    }

    updateCurrentPlayerDisplay() {
        const element = document.getElementById('current-player-name');
        if (element) {
            element.textContent = this.gameState.players[this.gameState.currentPlayerIndex].name;
        }
    }

    updatePlayerTiles() {
        const tilesContainer = document.getElementById('player-tiles');
        const tileCountEl = document.getElementById('tile-count');
        const playerTiles = this.gameState.playerTiles[this.gameState.currentPlayerIndex];
        
        tilesContainer.innerHTML = '';
        playerTiles.forEach(tile => {
            const tileEl = this.createTileElement(tile);
            tileEl.draggable = true;
            tilesContainer.appendChild(tileEl);
        });
        tileCountEl.textContent = `${playerTiles.length}枚`;
    }

    updateTableSets() {
        const tableArea = document.getElementById('table-area');
        const placeholder = tableArea.querySelector('.table-placeholder');
        
        tableArea.querySelectorAll('.table-set').forEach(el => el.remove());
        
        if (this.gameState.tableSets.length === 0) {
            placeholder.style.display = 'flex';
        } else {
            placeholder.style.display = 'none';
            this.gameState.tableSets.forEach(set => {
                const setEl = document.createElement('div');
                setEl.className = 'table-set valid';
                setEl.dataset.setId = set.id;
                set.tiles.forEach(tile => {
                    const tileEl = this.createTileElement(tile);
                    tileEl.draggable = true;
                    setEl.appendChild(tileEl);
                });
                tableArea.appendChild(setEl);
            });
        }
    }

    updateOtherPlayers() {
        const container = document.getElementById('other-players');
        container.innerHTML = '';
        this.gameState.players.forEach((player, index) => {
            const el = document.createElement('div');
            el.className = 'player-info';
            if (index === this.gameState.currentPlayerIndex) {
                el.classList.add('current');
            }
            el.innerHTML = `<span>${player.name}</span><span class="tile-count">${this.gameState.playerTiles[player.id].length}枚</span>`;
            container.appendChild(el);
        });
    }

    createTileElement(tile) {
        const el = document.createElement('div');
        el.className = `tile ${tile.color}`;
        el.dataset.tileId = tile.id;
        el.textContent = tile.isJoker ? '★' : tile.number;
        if(tile.isJoker) el.classList.add('joker');
        return el;
    }

    // ドラッグ＆ドロップ処理
    handleDragStart(e) {
        if (!e.target.classList.contains('tile')) return;
        this.draggedTile = {
            id: parseInt(e.target.dataset.tileId, 10),
            element: e.target
        };
        this.draggedFrom = e.target.closest('.rack-tiles') ? 'rack' : 'table';
        if (this.draggedFrom === 'table') {
            this.draggedTile.setId = e.target.closest('.table-set').dataset.setId;
        }
        e.target.classList.add('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDrop(e) {
        e.preventDefault();
        if (!this.draggedTile) return;

        const tableArea = document.getElementById('table-area');
        const targetSetEl = e.target.closest('.table-set');

        if (targetSetEl) {
            this.dropTileOnSet(targetSetEl);
        } else if (tableArea.contains(e.target)) {
            this.dropTileOnTable();
        }
        this.handleDragEnd(e);
    }
    
    handleDragEnd(e) {
        if(this.draggedTile && this.draggedTile.element) {
            this.draggedTile.element.classList.remove('dragging');
        }
        this.draggedTile = null;
        this.draggedFrom = null;
    }
    
    // タイル操作
    dropTileOnTable() {
        const tile = this.removeTileFromSource();
        if (tile) {
            this.gameState.tableSets.push({
                id: Date.now(),
                tiles: [tile]
            });
            this.updateGameUI();
        }
    }
    
    dropTileOnSet(targetSetEl) {
        const targetSetId = targetSetEl.dataset.setId;
        const targetSet = this.gameState.tableSets.find(s => s.id == targetSetId);
        const tile = this.removeTileFromSource();
        if (tile && targetSet) {
            targetSet.tiles.push(tile);
            this.updateGameUI();
        }
    }
    
    removeTileFromSource() {
        let tile;
        const tileId = this.draggedTile.id;
        
        if (this.draggedFrom === 'rack') {
            const playerTiles = this.gameState.playerTiles[this.gameState.currentPlayerIndex];
            const tileIndex = playerTiles.findIndex(t => t.id === tileId);
            if (tileIndex > -1) {
                [tile] = playerTiles.splice(tileIndex, 1);
            }
        } else if (this.draggedFrom === 'table') {
            const sourceSet = this.gameState.tableSets.find(s => s.id == this.draggedTile.setId);
            if (sourceSet) {
                const tileIndex = sourceSet.tiles.findIndex(t => t.id === tileId);
                if (tileIndex > -1) {
                    [tile] = sourceSet.tiles.splice(tileIndex, 1);
                }
                if (sourceSet.tiles.length === 0) {
                    this.gameState.tableSets = this.gameState.tableSets.filter(s => s.id !== sourceSet.id);
                }
            }
        }
        return tile;
    }
    
    endTurn() {
         // (実装は省略)
        console.log("Turn ended");
    }
    
    drawTile() {
        // (実装は省略)
        console.log("Tile drawn");
    }
    
    undoMove() {
        // (実装は省略)
        console.log("Move undone");
    }
    
    restartGame() {
        this.resetGameState();
        this.showScreen('main-menu');
    }
}

// --- グローバルスコープ ---
let game;

// HTMLから呼び出すためのグローバル関数
// これらがボタンの`onclick`から呼び出される
function showMainMenu() { if (game) game.showScreen('main-menu'); }
function showSinglePlayerSetup() { if (game) game.showPlayerSetup(true); }
function showMultiPlayerSetup() { if (game) game.showPlayerSetup(false); }
function showRulesScreen() { if (game) game.showScreen('rules'); }
function updatePlayerSetupUI() { if (game) game.updatePlayerSetup(); }
function startGameFromSetup() {
    if (game) {
        game.showScreen('loading');
        setTimeout(() => game.startGame(), 1000);
    }
}
function undoMove() { if (game) game.undoMove(); }
function drawTile() { if (game) game.drawTile(); }
function endTurn() { if (game) game.endTurn(); }
function restartGame() { if (game) game.restartGame(); }

// ページの読み込みが完了したらゲームを初期化
document.addEventListener('DOMContentLoaded', () => {
    game = new TileBlendGame();
});
