// trees are INITIAL STATE only DEFAULT NODES here
export const Trees = {
    main: {
        name: 'Main Scene Tree',
        nodeOrder: [
            'background',
            'currentPlayer',
            'otherPlayers',
            'windows'
        ]
    }
};

/*

Depth reference

0 - Background layer
1 - Base Player Layer (Behin Assets)
2-5 - Reserved Assets Layers (default 2, 3-5 unused for now)
6 - Secondary Player Layer (Above Assets)
99 - Text-based UI Layer
100 - Window-based UI Layer

 */

// Order here doesn't matter but is preserved for visual clarity
export const Nodes = {
    // First Background
    background: {
        type: 'background',
        layer: 0
    },

    
    grid: {
        type: 'grid',
        layer: 0.5,
        cellSize: 64,
        color: '#FFFFFF',
        lineWidth: 1
    },

    // Other clients, then
    otherPlayers: {
        type: 'otherPlayers',
        layer: 1,
        players: new Map()
    },
    otherPlayerBubble: {
        type: 'otherPlayerBubble',
        layer: 1,
        content: null,
        playerId: null,
        createdAt: null,
        duration: 5000
    },
    
    // Current player's server image
    serverShadow: {
        type: 'serverShadow',
        layer: 1,
        asset: null,
        width: null, 
        height: null,
        x: 0,
        y: 0
    },

    // Current player, then their stats, then their bubble
    currentPlayer: {
        type: 'currentPlayer',
        layer: 1,
        asset: null,
        width: null,
        height: null,
        x: 0,
        y: 0,
        headY: 0,
        footY: 0,
        id: null
    },
    playerStats: {
        type: 'playerStats',
        layer: 1,
        visible: true
    },
    currentPlayerBubble: {
        type: 'currentPlayerBubble',
        layer: 1,
        content: null,
        playerId: null,
        createdAt: null,
        duration: 5000
    },

    // Assets dynamically loaded onto the scene
    asset: {
        type: 'asset',
        layer: 2,
        assetType: null,
        file: null,
        x: 0,
        y: 0,
        width: null,
        height: null
    },

    // Levelmanager is gonna change in the future (probably) 3 is fine for now
    levelManager: {
        type: 'levelManager',
        layer: 3,
        manager: null
    },

    // Text-based UI
    cursorPosition: {
        type: 'cursorPosition',
        layer: 99,
        visible: false
    },

    // Window-based UI
    windows: {
        type: 'windows',
        layer: 100,
        windows: new Map()
    },

};