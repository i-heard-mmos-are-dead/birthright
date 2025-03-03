window.INPUT_TICK_RATE = 60; // 120Hz by default
window.INPUT_RESET_TICKS = 1; // Reset after 3 ticks of no input

export class InputManager {
    constructor(gameClient) {
        this.config = gameClient.config;

        this.controls = {
        ...this.config.controls,  // Keep existing arrow key controls
        'w': {dx: 0, dy: -1},
        's': {dx: 0, dy: 1},
        'a': {dx: -1, dy: 0},
        'd': {dx: 1, dy: 0}
        };

        this.emotes = {
        '1': 'pop',
        '2': 'love',
        '3': 'awkward',
        '4': 'yay',
        '5': 'swag',
        '6': 'madge',
        '7': 'yawn',
        '8': 'sleep',
        '9': 'ear',
        };

        this.facade = gameClient.storeFacade;
        this.camera = gameClient.camera;
        this.windowManager = gameClient.windowManager;
        this.movementManager = gameClient.movementManager;
        this.chatManager = this.windowManager.chatManager;
        this.sceneTree = gameClient.sceneTree;

        this.activeKeys = new Set();
        this.currentMovement = { dx: 0, dy: 0, direction: null };
        this.noInputTicks = 0;
        this.inputTickInterval = setInterval(() => this.tickMovement(), 1000 / window.INPUT_TICK_RATE);
        this.setupInputListeners();
        this.diagonalReleaseTimeout = null;
        this.diagonalReleaseDelay = 32;

        this.movementAccumulator = { x: 0, y: 0 };
   }
   
   setupInputListeners() {
       // Keyboard handling
       document.addEventListener('keydown', e => {
           // Allow browser defaults for these keys
           if (e.key === 'F5' || e.key === 'F12' || e.key === 'F11') return;
           e.preventDefault();
           
           // Chat handling
           if (this.chatManager.isTyping) {
               const continueTyping = this.chatManager.handleKeyEvent(e);
               if (!continueTyping) {
                   return;
               }
               return;  // Skip other input processing while typing
           }
   
           if (e.key === 'Enter') {
               this.chatManager.isTyping = true;
               return;
           }
           
           // Window controls
           switch(e.key) {
               case 'o':  
               case 'O':
                   this.windowManager.createWindow();
                   break;
               case 'F1':
                   this.windowManager.toggleSpecialWindow('settings');
                   break;
               case 'Escape':
                   this.windowManager.closeTopWindow();
                   break;
           }

           if (this.emotes[e.key]) {
            console.log(`[InputManager] Emote key pressed: ${e.key} -> ${this.emotes[e.key]}`);
            const currentPlayer = this.facade.getPlayers()[this.facade.getSocketId()];
            this.facade.handleMovementInput({
                x: currentPlayer.x,
                y: currentPlayer.y,
                currentActionState: currentPlayer.currentActionState,
                emoteState: this.emotes[e.key]
            });
        }
           
           // Movement controls
           if (this.controls[e.key]) {
               this.activeKeys.add(e.key);
               this.processMovement();
           }
       }, { passive: false });
   
       // Handle key releases
       document.addEventListener('keyup', e => {
           if (this.chatManager.isTyping) {
               this.chatManager.handleKeyEvent(e);
           }
           
           if (this.controls[e.key]) {
               // Check if we're currently moving diagonally
               const wasMovingDiagonally = this.isDiagonalMovement();
               
               this.activeKeys.delete(e.key);
               
               if (wasMovingDiagonally) {
                   // Clear any existing timeout
                   if (this.diagonalReleaseTimeout) {
                       clearTimeout(this.diagonalReleaseTimeout);
                   }
                   
                   // Set a new timeout
                   this.diagonalReleaseTimeout = setTimeout(() => {
                       if (this.activeKeys.size > 0) {
                           this.processMovement();
                       }
                   }, this.diagonalReleaseDelay);
               } else if (this.activeKeys.size > 0) {
                   this.processMovement();
               }
           }
       }, { passive: false });
   
       // Mouse wheel for zoom
       document.addEventListener('wheel', (e) => {
           e.preventDefault();
           const currentDirection = this.currentMovement.direction || 'south';
           console.log('[InputManager] Zoom event with direction:', currentDirection);
           this.movementManager.handleZoom(e.deltaY < 0, currentDirection);
       }, { passive: false });
   }
   
   processMovement(speed) {
    let dx = 0, dy = 0;
    
    for (const key of this.activeKeys) {
        const movement = this.controls[key];
        dx += movement.dx || 0;
        dy += movement.dy || 0;
    }

    // Simple clamping to -1, 0, or 1 for each component
    dx = Math.sign(dx) * 10;
    dy = Math.sign(dy) * 10;

    const direction = this.getCardinalDirection(dx, dy);
    this.currentMovement = { dx, dy, direction };
    this.noInputTicks = 0;
}

   tickMovement() {
       if (this.activeKeys.size === 0) {
           this.noInputTicks++;
           if (this.noInputTicks >= window.INPUT_RESET_TICKS) {
               this.currentMovement = { dx: 0, dy: 0, direction: null };
               return;
           }
       }

       if (this.currentMovement.direction !== null) {
           this.movementManager.validateMovement(
               this.facade.getSocketId(),
               this.currentMovement.dx,
               this.currentMovement.dy,
               this.currentMovement.direction
           );
       }
   }

   isDiagonalMovement() {
       let dx = 0, dy = 0;
       for (const key of this.activeKeys) {
           const movement = this.controls[key];
           dx += movement.dx || 0;
           dy += movement.dy || 0;
       }
       return dx !== 0 && dy !== 0;
   }

   getCardinalDirection(dx, dy) {
       if (dx === 0 && dy === 0) return null;
       
       // Transform pure west/east into southwest/southeast
       if (dx < 0 && dy === 0) return 'southwest';  // West becomes Southwest
       if (dx > 0 && dy === 0) return 'southeast';  // East becomes Southeast
       
       // Handle other cardinal directions
       if (dx === 0) {
           if (dy < 0) return 'north';
           if (dy > 0) return 'south';
       }
       
       // Handle diagonal directions
       if (dy < 0) {  // Moving upward
           if (dx < 0) return 'northwest';
           if (dx > 0) return 'northeast';
       } else {  // Moving downward or level
           if (dx < 0) return 'southwest';
           if (dx > 0) return 'southeast';
       }
       
       return null;
   }
}
