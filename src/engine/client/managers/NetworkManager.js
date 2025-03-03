export class NetworkManager {
    constructor(gameClient) {
        this.gameClient = gameClient;
        this.storeFacade = gameClient.storeFacade;
        this.chatManager = null;

        this.socket = io();
        this.socketId = null;

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // initial state because i cant be arsed to properly fix this shit
        this.socket.on('connect', () => {
            this.socket.emit('init', null, (initialState) => {
                this.socketId = initialState.id;
                //this.storeFacade.initializePlayer(this.socketId, initialState);
            });
        });
    
        this.socket.on('gameState', (state) => {
            this.storeFacade.updateServerState(state.players);
        });
        
        this.socket.on('disconnect', () => {
            console.warn('[Network] Disconnected');
            this.socketId = null;
        });
    
        this.socket.on('chatMessage', (message) => {
            if (this.chatManager) {
                this.chatManager.receiveMessage(message);
            } else {
                console.warn('[NetworkManager] Dropped chat - no chat manager');
            }
        });

        this.socket.on('blacklisted', (data) => {
            window.location.href = data.redirectUrl;
        });
    }

    async fetchAssetManifest() {
        try {
            const response = await fetch('/api/manifest');
            
            if (!response.ok) {
                console.error('[NetworkManager] Fetch failed with status:', response.status);
                throw new Error('Failed to fetch asset manifest');
            }
            
            const yamlText = await response.text();
            return yamlText;
        } catch (error) {
            console.error('[NetworkManager] Error fetching manifest:', error.message);
            return null;
        }
    }

    async fetchPatchNotes() {
        try {
            const response = await fetch('/api/patchnotes');
            
            if (!response.ok) {
                console.error('[NetworkManager] Failed to fetch patch notes:', response.status);
                throw new Error('Failed to fetch patch notes');
            }
            
            const patchNotes = await response.text();
            return patchNotes;
        } catch (error) {
            console.error('[NetworkManager] Error fetching patch notes:', error.message);
            return null;
        }
    }
    
    updatePosition(x, y, currentActionState, character, emoteState) {
        console.log(`[NetworkManager] Emitting position update with emote state: ${emoteState}`);
        this.socket.emit('position', { x, y, currentActionState, character, emoteState });
    }
    
    sendChatMessage(message) {
        this.socket.emit('chatMessage', message);
    }
    
    getSocketId() {
        return this.socketId;
    }
}