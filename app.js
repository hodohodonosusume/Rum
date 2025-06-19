class TileBlendGame {
    constructor() {
        this.gameState = {};
        this.colors = ['red', 'blue', 'yellow', 'green'];
        this.numbers = Array.from({ length: 13 }, (_, i) => i + 1);
        this.draggedTile = null;
        this.draggedFrom = null; // 'rack' or 'table'
        this.resetGameState();
    }

    // ゲームの状態を初期化
    resetGameState() {
        this.gameState = {
            currentScreen: 'main-menu',
            players: [],
            currentPlayerIndex: 0,
            playerTiles: {},
            tableSets: [],
            gameStarted: false,
            isSinglePlayer: false,
            drawPile: [],
        };
    }
    
    // UIイベントの紐付け
    bindUIEvents() {
        // メインメニュー
        document.getElementById('btn-single-player').addEventListener('click', () => this.showPlayerSetup(true));
        document.getElementById('btn-multi-player').addEventListener('click', () => this.showPlayerSetup(false));
        document.getElementById('btn-rules').addEventListener('click', () => this.showScreen('rules-screen'));

        // 設定画面
        document.getElementById('btn-back-to-main-from-setup').addEventListener('click', () => this.showScreen('main-menu'));
        document.getElementById('player-count').addEventListener('change', () => this.updatePlayerSetupUI());
        document.getElementById('btn-start-game').addEventListener('click', () => this.prepareAndStartGame());

        // ルール画面
        document.getElementById('btn-back-to-main-from-rules').addEventListener('click', () => this.showScreen('main-menu'));
        
        // ゲームボード画面
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));

        // ゲームオーバー画面
        document.getElementById('btn-restart-game').addEventListener('click', () => this.restartGame());
        document.getElementById('btn-back-to-main-from-over').addEventListener('click', () => this.showScreen('main-menu'));
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

    // プレイヤー設定画面の表示
    showPlayerSetup(isSinglePlayer) {
        this.gameState.isSinglePlayer = isSinglePlayer;
        document.getElementById('setup-title').textContent = isSinglePlayer ? 'シングルプレイヤー設定' : 'マルチプレイヤー設定';
        this.updatePlayerSetupUI();
        this.showScreen('player-setup');
    }

    // プレイヤー設定UIの更新
    updatePlayerSetupUI() {
        const playerCount = parseInt(document.getElementById('player-count').value, 10);
        const playerInputs = document.getElementById('player-inputs');
        playerInputs.innerHTML = '';

        for (let i = 1; i <= playerCount; i++) {
            const isAI = this.gameState.isSinglePlayer && i > 1;
            const inputGroup = document.createElement('div');
            inputGroup.className = 'form-group';
            
            if (!isAI) {
                inputGroup.innerHTML = `
                    <label for="player-${i}-name">プレイヤー ${i}:</label>
                    <input type="text" id="player-${i}-name" class="form-control" value="プレイヤー ${i}">
                `;
            } else {
                inputGroup.innerHTML = `
                    <label for="player-${i}-difficulty">AI ${i - 1} の強さ:</label>
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

    // ゲーム開始準備
    prepareAndStartGame() {
        this.showScreen('loading');
        // ローディング画面を少し見せるためにsetTimeoutを使用
        setTimeout(() => {
            this.startGame();
        }, 500);
    }

    // ゲーム開始
    startGame() {
        this.resetGameState(); // ゲーム状態をリセット
        
        const playerCount = parseInt(document.getElementById('player-count').value, 10);
        const players = [];
        for (let i = 1; i <= playerCount; i++) {
            const isAI = this.gameState.isSinglePlayer && i > 1;
            const nameEl = document.getElementById(`player-${i}-name`);
            const difficultyEl = document.getElementById(`player-${i}-difficulty`);
            
            players.push({
                id: i - 1,
                name: isAI ? `AI ${i - 1} (${difficultyEl.value})` : nameEl.value,
                isAI: isAI,
                difficulty: isAI ? difficultyEl.value : null
            });
        }
        this.gameState.players = players;
        
        // タイル生成と配布
        this.gameState.drawPile = this.createTiles();
        players.forEach(p => {
            this.gameState.playerTiles[p.id] = this.gameState.drawPile.splice(0, 14);
        });

        this.gameState.gameStarted = true;
        this.gameState.currentPlayerIndex = 0;
        
        this.showScreen('game-board');
        this.updateGameUI();
    }
    
    // タイル生成
    createTiles() {
        const tiles = [];
        let id = 0;
        // 数字タイル
        for (let i = 0; i < 2; i++) {
            for (const color of this.colors) {
                for (const number of this.numbers) {
                    tiles.push({ id: id++, number, color, isJoker: false });
                }
            }
        }
        // ジョーカー
        tiles.push({ id: id++, number: 0, color: 'joker', isJoker: true });
        tiles.push({ id: id++, number: 0, color: 'joker', isJoker: true });
        
        // シャッフル
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
        return tiles;
    }
    
    // UI全体の更新
    updateGameUI() {
        this.updateCurrentPlayerDisplay();
        this.updatePlayerTiles();
        this.updateTableSets();
        this.updateOtherPlayers();
    }
    
    updateCurrentPlayerDisplay() {
        const player = this.gameState.players[this.gameState.currentPlayerIndex];
        document.getElementById('current-player-name').textContent = player.name;
    }

    updatePlayerTiles() {
        const player = this.gameState.players[this.gameState.currentPlayerIndex];
        const tiles = this.gameState.playerTiles[player.id];
        const container = document.getElementById('player-tiles');
        container.innerHTML = '';
        tiles.forEach(tile => {
            const tileEl = this.createTileElement(tile);
            tileEl.draggable = true;
            container.appendChild(tileEl);
        });
        document.getElementById('tile-count').textContent = `${tiles.length}枚`;
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
            const tileCount = this.gameState.playerTiles[player.id]?.length || 0;
            el.innerHTML = `<span>${player.name}</span><span class="tile-count">${tileCount}枚</span>`;
            container.appendChild(el);
        });
    }

    createTileElement(tile) {
        const el = document.createElement('div');
        el.className = `tile ${tile.color}`;
        el.dataset.tileId = tile.id;
        if (tile.isJoker) {
            el.textContent = '★';
            el.classList.add('joker');
        } else {
            el.textContent = tile.number;
        }
        return el;
    }
    
    // ドラッグ＆ドロップ処理
    handleDragStart(e) {
        if (!e.target.classList.contains('tile')) return;
        this.draggedTile = { id: parseInt(e.target.dataset.tileId, 10), element: e.target };
        this.draggedFrom = e.target.closest('.rack-tiles') ? 'rack' : 'table';
        if (this.draggedFrom === 'table') {
            this.draggedTile.setId = e.target.closest('.table-set').dataset.setId;
        }
        setTimeout(() => e.target.classList.add('dragging'), 0);
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDrop(e) {
        e.preventDefault();
        if (!this.draggedTile) return;

        const targetSetEl = e.target.closest('.table-set');
        if (targetSetEl) {
            this.dropTileOnSet(targetSetEl);
        } else if (e.target.closest('#table-area')) {
            this.dropTileOnTable();
        }
    }
    
    handleDragEnd(e) {
        if (this.draggedTile && this.draggedTile.element) {
            this.draggedTile.element.classList.remove('dragging');
        }
        this.draggedTile = null;
        this.draggedFrom = null;
    }

    removeTileFromSource() {
        let tile;
        const tileId = this.draggedTile.id;
        
        if (this.draggedFrom === 'rack') {
            const playerTiles = this.gameState.playerTiles[this.gameState.currentPlayerIndex];
            const tileIndex = playerTiles.findIndex(t => t.id === tileId);
            if (tileIndex > -1) [tile] = playerTiles.splice(tileIndex, 1);
        } else if (this.draggedFrom === 'table') {
            const sourceSet = this.gameState.tableSets.find(s => s.id == this.draggedTile.setId);
            if (sourceSet) {
                const tileIndex = sourceSet.tiles.findIndex(t => t.id === tileId);
                if (tileIndex > -1) [tile] = sourceSet.tiles.splice(tileIndex, 1);
                if (sourceSet.tiles.length === 0) {
                    this.gameState.tableSets = this.gameState.tableSets.filter(s => s.id != sourceSet.id);
                }
            }
        }
        return tile;
    }

    dropTileOnTable() {
        const tile = this.removeTileFromSource();
        if (tile) {
            this.gameState.tableSets.push({ id: Date.now(), tiles: [tile] });
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
    
    restartGame() {
        this.resetGameState();
        this.showPlayerSetup(this.gameState.isSinglePlayer);
    }
}

// ページの読み込みが完了したら、ゲームを初期化してイベントを紐付ける
document.addEventListener('DOMContentLoaded', () => {
    const game = new TileBlendGame();
    game.bindUIEvents();
    game.updatePlayerSetupUI(); // 初期表示のために呼び出し
});
