// src/engine/client/store/facade.js
import { store } from './index.js';

export class StoreFacade {
    constructor(gameClient) {
        this.gameClient = gameClient;
        this.config = gameClient.config;
        this.camera = gameClient.camera;
        this.subscribers = new Map();
        this.networkManager = null;
        
        store.subscribe(() => this.notifySubscribers());

    }
 
    notifySubscribers() {
        const state = store.getState();
        this.subscribers.forEach(callback => callback(state));
    }
    
    subscribeToPlayers(callback) {
        const id = Date.now();
        this.subscribers.set(id, callback);
        return () => this.subscribers.delete(id);
    }
    
    handleMovementInput(newPosition) {
        const socketId = this.networkManager.getSocketId();
        if (!socketId) return;
    
        // Get current player state to preserve character
        const currentState = store.getState().players[socketId];
    
        // Store raw position in local state
        store.dispatch({
            type: 'SET_PLAYER_POSITION',
            payload: { 
                id: socketId,
                position: {
                    x: newPosition.x,
                    y: newPosition.y,
                },
                currentActionState: newPosition.currentActionState,
                character: currentState?.character,
                emoteState: newPosition.emoteState
            },
            config: this.config
        });
    
        // Send position to server (already 1x)
        this.networkManager.updatePosition(
            newPosition.x,
            newPosition.y,
            newPosition.currentActionState,
            currentState?.character,
            newPosition.emoteState
        );
    }
    
    updateServerState(players) {
        const socketId = this.networkManager.getSocketId();
        if (!socketId) return;
    
        store.dispatch({
            type: 'UPDATE_PLAYERS',
            payload: {
                players: players,
                selfId: socketId
            },
            config: this.config
        });
    }

    initializePlayer(socketId, initialState) {
        this.camera.moveToPosition(initialState.x, initialState.y);
        
        store.dispatch({
            type: 'PLAYER_INITIALIZED',
            payload: {
                id: socketId,
                x: initialState.x,
                y: initialState.y,
                baseHeight: initialState.baseHeight,
                character: initialState.character || 'TheFemaleAdventurer'
            },
            config: this.config
        });
    }

    
    
    getPlayers() {
        return store.getState().players;
    }
    
    getServerPlayers() {
        return store.getState().serverPlayers;
    }

    getServerSelf() {
        return store.getState().serverSelf;
    }

    getSocketId() {
        return this.networkManager?.getSocketId();
    }
}