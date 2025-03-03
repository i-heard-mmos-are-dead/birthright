import { spriteConfigs } from '../ui/SpriteConfigs.js';

export class AnimationManager {
    constructor(gameClient) {
        this.windowManager = gameClient.windowManager;
        this.windowManager.animationManager = this;
        this.assetManager = this.windowManager.assetManager;
        this.frameCache = new Map();
        this.sheetCache = new Map();
        this.processingFlags = new Map();
        
        this.availableSprites = Object.keys(spriteConfigs);
        
        // Defaults
        this.tickCount = 0;
        this.ticksPerFrame = 1;
        
        this.minTickInterval = 0;
        this.maxTickInterval = 100;
        this.tickIntervalStep = 10;
        this.currentTickInterval = 100;
        
        this.minTicksPerFrame = 1;
        this.maxTicksPerFrame = 10;
        this.ticksPerFrameStep = 1;
        
        this.tickIntervalId = setInterval(() => this.tick(), this.currentTickInterval);
        this.playerStates = new Map();
    }

    tick() {
        this.tickCount = (this.tickCount + 1) & 0xFFFF;
        if (this.tickCount % this.ticksPerFrame === 0) {
            for (let [_, playerState] of this.playerStates) {
                if (!playerState.isPlaying) continue;
    
                const currentConfig = spriteConfigs[playerState.currentSprite]?.spritesheets[playerState.currentSheet];
                if (!currentConfig) {
                    console.error(`Invalid config for ${playerState.currentSprite}/${playerState.currentSheet}`);
                    continue;
                }
    
                const maxFrames = currentConfig.dimensions.cols;
                if (playerState.frameDirection !== 0) {
                    playerState.currentFrame = 
                        ((playerState.currentFrame + playerState.frameDirection) + maxFrames) % maxFrames;
                }
            }
        }
    }

    getOrCreatePlayerState(playerId, spriteName = this.availableSprites[0]) {
        if (!this.playerStates.has(playerId)) {
            const initialSheet = Object.keys(spriteConfigs[spriteName].spritesheets)[0];
            const initialAnimations = spriteConfigs[spriteName].spritesheets[initialSheet].animations;
            const initialAction = Object.values(initialAnimations)[0].name;
            
            this.playerStates.set(playerId, {
                currentFrame: 0,
                currentActionState: initialAction,
                currentSprite: spriteName,
                currentSheetIndex: 0,
                currentSheet: initialSheet,
                currentRow: 0,
                frameDirection: 1,
                isPlaying: true
            });
        }
        return this.playerStates.get(playerId);
    }

    getMaxBoundsForRow(spritesheet, row, dimensions) {
        const frameWidth = spritesheet.width / dimensions.cols;
        const frameHeight = spritesheet.height / dimensions.rows;
        
        let globalTopMost = frameHeight;
        let globalBottomMost = 0;
        let globalLeftMost = frameWidth;
        let globalRightMost = 0;
    
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frameWidth;
        tempCanvas.height = frameHeight;
        const tempCtx = tempCanvas.getContext('2d');
    
        // Analyze each frame in the row
        for (let col = 0; col < dimensions.cols; col++) {
            tempCtx.clearRect(0, 0, frameWidth, frameHeight);
            tempCtx.drawImage(
                spritesheet,
                col * frameWidth,
                row * frameHeight,
                frameWidth,
                frameHeight,
                0,
                0,
                frameWidth,
                frameHeight
            );
    
            const imageData = tempCtx.getImageData(0, 0, frameWidth, frameHeight);
            const data = imageData.data;
    
            // Find bounds for this frame
            for (let y = 0; y < frameHeight; y++) {
                for (let x = 0; x < frameWidth; x++) {
                    const alpha = data[(y * frameWidth + x) * 4 + 3];
                    if (alpha > 0) {
                        globalTopMost = Math.min(globalTopMost, y);
                        globalBottomMost = Math.max(globalBottomMost, y);
                        globalLeftMost = Math.min(globalLeftMost, x);
                        globalRightMost = Math.max(globalRightMost, x);
                    }
                }
            }
        }
    
        // Add padding
        const padding = 1;
        return {
            top: Math.max(0, globalTopMost - padding),
            bottom: Math.min(frameHeight - 1, globalBottomMost + padding),
            left: Math.max(0, globalLeftMost - padding),
            right: Math.min(frameWidth - 1, globalRightMost + padding)
        };
    }
    
    getFrameFromPosition(spritesheet, row, col, dimensions) {
        const cacheKey = `${spritesheet.src}_${row}_${col}`;
        
        if (this.frameCache.has(cacheKey)) {
            return this.frameCache.get(cacheKey);
        }
    
        if (!spritesheet.complete) {
            return spritesheet;
        }
    
        const frameWidth = spritesheet.width / dimensions.cols;
        const frameHeight = spritesheet.height / dimensions.rows;
    
        // Get the consistent bounds for this animation row
        const bounds = this.getMaxBoundsForRow(spritesheet, row, dimensions);
        
        const trimmedWidth = bounds.right - bounds.left + 1;
        const trimmedHeight = bounds.bottom - bounds.top + 1;
    
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = trimmedWidth;
        tempCanvas.height = trimmedHeight;
        const tempCtx = tempCanvas.getContext('2d');
    
        // Draw the frame with consistent trimming bounds
        tempCtx.drawImage(
            spritesheet,
            col * frameWidth + bounds.left,
            row * frameHeight + bounds.top,
            trimmedWidth,
            trimmedHeight,
            0,
            0,
            trimmedWidth,
            trimmedHeight
        );
    
        // Define maximum available space
        const maxWidth = dimensions.maxWidth || trimmedWidth * 1;
        const maxHeight = dimensions.maxHeight || trimmedHeight * 1;
    
        // Calculate scale factor while preserving aspect ratio
        const scale = Math.floor(Math.min(
            maxWidth / trimmedWidth,
            maxHeight / trimmedHeight
        ));
    
        // Calculate actual dimensions after scaling
        const scaledWidth = trimmedWidth * scale;
        const scaledHeight = trimmedHeight * scale;
    
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = maxWidth;
        finalCanvas.height = maxHeight;
        const finalCtx = finalCanvas.getContext('2d');
    
        // Disable smoothing
        finalCtx.imageSmoothingEnabled = false;
        finalCtx.mozImageSmoothingEnabled = false;
        finalCtx.webkitImageSmoothingEnabled = false;
        finalCtx.msImageSmoothingEnabled = false;
    
        // Center the scaled image
        const offsetX = Math.floor((maxWidth - scaledWidth) / 2);
        const offsetY = Math.floor((maxHeight - scaledHeight) / 2);
    
        // Clear canvas and draw centered image
        finalCtx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
        finalCtx.drawImage(
            tempCanvas,
            0, 0, trimmedWidth, trimmedHeight,
            offsetX, offsetY, scaledWidth, scaledHeight
        );
    
        const img = new Image();
        img.onload = () => {
            this.frameCache.set(cacheKey, img);
        };
        img.src = finalCanvas.toDataURL();
        
        return img;
    }

    cacheAllFramesForSheet(spriteName, sheetName) {
        const sheetCacheKey = `${spriteName}_${sheetName}`;
        if (this.sheetCache.has(sheetCacheKey)) {
            return;
        }
        
        const spritesheet = this.assetManager.loadSpritesheet(spriteName, sheetName);
        const config = spriteConfigs[spriteName].spritesheets[sheetName];

        if (!spritesheet.complete) {
            spritesheet.onload = () => {
                this.processingFlags.set(sheetCacheKey, true);
                
                for (let row = 0; row < config.dimensions.rows; row++) {
                    for (let col = 0; col < config.dimensions.cols; col++) {
                        this.getFrameFromPosition(spritesheet, row, col, config.dimensions);
                    }
                }
                
                this.sheetCache.set(sheetCacheKey, true);
                this.processingFlags.set(sheetCacheKey, false);
            };
            return;
        }
        this.processingFlags.set(sheetCacheKey, true);
        
        for (let row = 0; row < config.dimensions.rows; row++) {
            for (let col = 0; col < config.dimensions.cols; col++) {
                this.getFrameFromPosition(spritesheet, row, col, config.dimensions);
            }
        }
        
        this.sheetCache.set(sheetCacheKey, true);
        this.processingFlags.set(sheetCacheKey, false);
    }

    cacheAllSpritesheets(spriteName) {

        if (!spriteConfigs[spriteName]) {
            return;
        }

        const sheets = spriteConfigs[spriteName].spritesheets;
        for (const sheetName of Object.keys(sheets)) {
            this.cacheAllFramesForSheet(spriteName, sheetName);
        }
    }

    // Animation control methods
    nextSprite(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        const spriteIndex = this.availableSprites.indexOf(state.currentSprite);
        state.currentSprite = this.availableSprites[(spriteIndex + 1) % this.availableSprites.length];
        const availableSheets = Object.keys(spriteConfigs[state.currentSprite].spritesheets);
        state.currentSheetIndex = 0;
        state.currentSheet = availableSheets[0];
        state.currentRow = 0;
        state.currentFrame = 0;
        
        // Add this to update animation state
        const currentConfig = spriteConfigs[state.currentSprite].spritesheets[state.currentSheet];
        const animations = currentConfig.animations;
        const animationEntry = Object.entries(animations).find(([row]) => parseInt(row) === state.currentRow);
        if (animationEntry) {
            state.currentActionState = animationEntry[1].name;
        }
        
    }
    
    previousSprite(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        const spriteIndex = this.availableSprites.indexOf(state.currentSprite);
        state.currentSprite = this.availableSprites[spriteIndex === 0 ? 
            this.availableSprites.length - 1 : spriteIndex - 1];
        const availableSheets = Object.keys(spriteConfigs[state.currentSprite].spritesheets);
        state.currentSheetIndex = 0;
        state.currentSheet = availableSheets[0];
        state.currentRow = 0;
        state.currentFrame = 0;
        
        // Add this to update animation state
        const currentConfig = spriteConfigs[state.currentSprite].spritesheets[state.currentSheet];
        const animations = currentConfig.animations;
        const animationEntry = Object.entries(animations).find(([row]) => parseInt(row) === state.currentRow);
        if (animationEntry) {
            state.currentActionState = animationEntry[1].name;
        }
    }
    
    nextSpriteSheet(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        const wasPlaying = state.isPlaying;
        const availableSheets = Object.keys(spriteConfigs[state.currentSprite].spritesheets);
        state.currentSheetIndex = (state.currentSheetIndex + 1) % availableSheets.length;
        state.currentSheet = availableSheets[state.currentSheetIndex];
        state.currentRow = 0;
        state.currentFrame = 0;
        
        // Add this to update animation state
        const currentConfig = spriteConfigs[state.currentSprite].spritesheets[state.currentSheet];
        const animations = currentConfig.animations;
        const animationEntry = Object.entries(animations).find(([row]) => parseInt(row) === state.currentRow);
        if (animationEntry) {
            state.currentActionState = animationEntry[1].name;
        }
        
        state.isPlaying = wasPlaying;
    }
    
    previousSpriteSheet(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        const wasPlaying = state.isPlaying;
        const availableSheets = Object.keys(spriteConfigs[state.currentSprite].spritesheets);
        state.currentSheetIndex = state.currentSheetIndex === 0 ? 
            availableSheets.length - 1 : state.currentSheetIndex - 1;
        state.currentSheet = availableSheets[state.currentSheetIndex];
        state.currentRow = 0;
        state.currentFrame = 0;
        
        // Add this to update animation state
        const currentConfig = spriteConfigs[state.currentSprite].spritesheets[state.currentSheet];
        const animations = currentConfig.animations;
        const animationEntry = Object.entries(animations).find(([row]) => parseInt(row) === state.currentRow);
        if (animationEntry) {
            state.currentActionState = animationEntry[1].name;
        }
        
        state.isPlaying = wasPlaying;
    }
    
    nextAnimation(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        const currentConfig = spriteConfigs[state.currentSprite].spritesheets[state.currentSheet];
        state.currentRow = (state.currentRow + 1) % currentConfig.dimensions.rows;
        
        // Add this to update animation state
        const animations = currentConfig.animations;
        const animationEntry = Object.entries(animations).find(([row]) => parseInt(row) === state.currentRow);
        if (animationEntry) {
            state.currentActionState = animationEntry[1].name;
        }
        
        state.currentFrame = 0;
    }
    
    previousAnimation(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        const currentConfig = spriteConfigs[state.currentSprite].spritesheets[state.currentSheet];
        state.currentRow = state.currentRow === 0 ? 
            currentConfig.dimensions.rows - 1 : state.currentRow - 1;
        
        // Add this to update animation state
        const animations = currentConfig.animations;
        const animationEntry = Object.entries(animations).find(([row]) => parseInt(row) === state.currentRow);
        if (animationEntry) {
            state.currentActionState = animationEntry[1].name;
        }
        
        state.currentFrame = 0;
    }
    
    nextFrame(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        if (state.frameDirection !== 0) {
            state.frameDirection = 1;
        }
        const currentConfig = spriteConfigs[state.currentSprite].spritesheets[state.currentSheet];
        const maxFrames = currentConfig.dimensions.cols;
        state.currentFrame = ((state.currentFrame + 1) + maxFrames) % maxFrames;
    }
    
    previousFrame(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        if (state.frameDirection !== 0) {
            state.frameDirection = -1;
        }
        const currentConfig = spriteConfigs[state.currentSprite].spritesheets[state.currentSheet];
        const maxFrames = currentConfig.dimensions.cols;
        state.currentFrame = ((state.currentFrame - 1) + maxFrames) % maxFrames;
    }
    
    play(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        state.frameDirection = 1;
        state.isPlaying = true;
    }
    
    pause(playerId) {
        const state = this.getOrCreatePlayerState(playerId);
        state.frameDirection = 0;
        state.isPlaying = false;
    }

    // Timing control methods (these stay global)
    updateTickInterval(targetTPS) {
        clearInterval(this.tickIntervalId);
        this.currentTickInterval = 1000 / targetTPS;
        this.tickIntervalId = setInterval(() => this.tick(), this.currentTickInterval);
    }
    
    lowerTicksPerSecond() {
        const currentTPS = 1000 / this.currentTickInterval;
        const targetTPS = Math.max(10, currentTPS - 10);
        this.updateTickInterval(targetTPS);
    }
    
    increaseTicksPerSecond() {
        const currentTPS = 1000 / this.currentTickInterval;
        const targetTPS = Math.min(60, currentTPS + 10);
        this.updateTickInterval(targetTPS);
    }
    
    lowerTicksPerFrame() {
        this.ticksPerFrame = Math.max(this.minTicksPerFrame, 
        this.ticksPerFrame - this.ticksPerFrameStep);
    }
   
   increaseTicksPerFrame() {
        this.ticksPerFrame = Math.min(this.maxTicksPerFrame, 
        this.ticksPerFrame + this.ticksPerFrameStep);
    }

    requestAnimation(playerId, actionState, spriteName = 'TheAdventurer') {
        
        const playerState = this.getOrCreatePlayerState(playerId, spriteName);
    
        // Validate sprite config exists
        if (!spriteConfigs[spriteName]) {
            console.error(`No sprite config found for ${spriteName}`);
            return null;
        }
        
        // Only update action state if one is explicitly provided AND different
        if (actionState && playerState.currentActionState !== actionState) {
            playerState.currentActionState = actionState;
            
            // For action-based requests, derive and update the sheet/row in the state
            const sheets = Object.entries(spriteConfigs[spriteName].spritesheets);
            const sheet = sheets.find(([_, config]) => 
                Object.values(config.animations).some(anim => anim.name === actionState)
            )?.[0] || sheets[0][0];
            playerState.currentSheet = sheet;
            
            const animations = spriteConfigs[spriteName].spritesheets[playerState.currentSheet].animations;
            const animationEntry = Object.entries(animations).find(([_, anim]) => 
                anim.name === actionState);
            
            if (animationEntry) {
                playerState.currentRow = parseInt(animationEntry[0]);
                // Track if this is a finite animation that should complete
                playerState.isFinite = animationEntry[1].isFinite || false;
                // Reset completion tracking when starting new animation
                playerState.hasCompleted = false;
                // NEW:
                console.log(`[AnimationManager] Updated animation state:`, {
                    sheet: playerState.currentSheet,
                    row: playerState.currentRow,
                    isFinite: playerState.isFinite
                });
            }
        }
    
    // NEW: Before checking completion, ensure isFinite is properly initialized
    if (actionState && playerState.isFinite === undefined) {
        const animations = spriteConfigs[spriteName].spritesheets[playerState.currentSheet].animations;
        const animationEntry = Object.entries(animations).find(([_, anim]) => 
            anim.name === actionState);
        if (animationEntry) {
            playerState.isFinite = animationEntry[1].isFinite || false;
            playerState.hasCompleted = false;
        }
    }

    // Check if finite animation has completed a full loop
    if (playerState.isFinite && 
        playerState.currentFrame === 0 && 
        playerState.hasCompleted) {
        // NEW:
        console.log(`[AnimationManager] Animation complete, cleaning up state for ID: ${playerId}`);
        this.playerStates.delete(playerId);
        return null;
    }

    // Mark completion when we hit the last frame
    const sheetConfig = spriteConfigs[spriteName]?.spritesheets[playerState.currentSheet];
    if (playerState.isFinite && 
        playerState.currentFrame === sheetConfig.dimensions.cols - 1) {
        playerState.hasCompleted = true;
        // NEW:
        console.log(`[AnimationManager] Marked animation as completed for ID: ${playerId}`);
    }
        
        const sheetCacheKey = `${spriteName}_${playerState.currentSheet}`;
        if (!this.sheetCache.has(sheetCacheKey)) {
            this.cacheAllSpritesheets(spriteName);
        }
    
        const spritesheet = this.assetManager.loadSpritesheet(spriteName, playerState.currentSheet);
        if (!sheetConfig) {
            console.error(`Failed to load sheet config for ${spriteName}/${playerState.currentSheet}`);
            return null;
        }
        const dimensions = sheetConfig.dimensions;
        
        return this.getFrameFromPosition(
            spritesheet,
            playerState.currentRow,
            playerState.currentFrame,
            dimensions
        );
    }
}