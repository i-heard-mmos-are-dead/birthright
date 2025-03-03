export class RenderManager {
    constructor(gameClient) {
        this.canvas = gameClient.canvas;
        this.ctx = gameClient.ctx;
        this.sceneTree = gameClient.sceneTree;
        this.camera = gameClient.camera;
        this.backgroundManager = gameClient.backgroundManager; // if all we need is dimensions
        // then why not just set dimensions instead of bringing a whole manager in
        this.levelManager = gameClient.levelManager;
        this.uiSheetReader = gameClient.uiSheetReader;
        this.facade = gameClient.storeFacade;
 
        this.backgroundCache = document.createElement('canvas');
        this.backgroundCacheCtx = this.backgroundCache.getContext('2d');
        this.backgroundCacheCtx.imageSmoothingEnabled = false;
        this.hasInitializedCache = false;

        this.emoteTimeout = null; 
    }

    // note to self:
    /*
    The methods here are basically wrappers around addnode
    eventually all other engine components should use the addnode
    and we should just have one big add/remove system instead of 
    all these individual wrappers
    i just left the wrappers as placeholders from migration from the old system
    because im lazy
    */

    renderAsset(node) {
        if (node.assetType === 'static') {
            // Extract asset type from filename (part before first underscore)
            const assetType = node.file.split('_')[0];
            
            // Use loadHouse for housing assets, loadAsset for others
            const asset = assetType === 'housing' 
                ? this.sceneTree.assetManager.loadHouse(node.file)
                : this.sceneTree.assetManager.loadAsset(node.file);
                
            if (!asset?.complete) return;
    
            const posX = node.x * this.camera.zoom;
            const posY = node.y * this.camera.zoom;
    
            this.ctx.drawImage(
                asset,
                posX - (asset.width * this.camera.zoom / 2),
                posY - (asset.height * this.camera.zoom / 2), 
                asset.width * this.camera.zoom,
                asset.height * this.camera.zoom
            );
        } else if (node.assetType === 'animated') {
            // Generate a unique ID for this animation instance
            const animationId = `anim_${node.file}_${node.x}_${node.y}`;
            
            // Request the animation frame
            const asset = this.sceneTree.animationManager.requestAnimation(
                animationId,  // Unique ID for this instance
                null,         // No action state needed
                node.file     // The actual animation name from YAML
            );
    
            if (!asset?.complete) return;
    
            const posX = node.x * this.camera.zoom;
            const posY = node.y * this.camera.zoom;
    
            // For animated assets, we'll use the first frame's dimensions
            const renderWidth = asset.width * this.camera.zoom;
            const renderHeight = asset.height * this.camera.zoom;
    
            this.ctx.drawImage(
                asset,
                posX - (renderWidth / 2),
                posY - (renderHeight / 2),
                renderWidth,
                renderHeight
            );
        }
    }
 
    render() {

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const tree = this.sceneTree.getTree();
        
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false;
        
        // Move context based on camera
        this.ctx.translate(
            this.camera.x + this.canvas.width/2,
            this.camera.y + this.canvas.height/2
        );
    
        // Draw background
        // Try new node system first
        // eventually need to throttle this down to like 30fps or 60fps, variable
        const nodes = this.sceneTree.getNodes();

        // Render nodes in order
        for (const [type, node] of nodes) {
            switch(node.type) {
                case 'background':
                    this.renderBackground(this.sceneTree.nodes.get('background'));
                    break;
                case 'grid':
                    this.renderGrid(node);
                    break;
                case 'currentPlayer':
                    this.renderCurrentPlayer(node);
                    break;
                case 'playerStats':
                    this.renderPlayerStats();
                    break;
                case 'otherPlayers':
                    this.renderOtherPlayers(node);
                    break;
                case 'currentPlayerBubble':
                case 'otherPlayerBubble':
                    this.renderChatBubble(node);
                    break;
                case 'serverShadow':
                    this.renderServerShadow(node);
                    break;
                case 'levelManager':
                    if (node.manager) {
                        node.manager.render(this.ctx);
                    } else {
                        console.warn('[RenderManager] Level manager node exists but has no manager');
                    }
                    break;
                case 'cursorPosition':
                    this.camera.renderCursorPosition(this.ctx);
                    break;
                case 'asset':
                    this.renderAsset(node);
                    break;
            }
        }
    
        this.ctx.restore();

        
        // Now render windows node after restore
        const windowsNode = this.sceneTree.nodes.get('windows');
        if (windowsNode) {
            windowsNode.windows.forEach(window => {
                window.renderSelf(this.ctx);
            });
        }
    }

    renderOtherPlayers(node) {
        node.players.forEach((playerNode, id) => {
            playerNode.asset = this.sceneTree.animationManager.requestAnimation(
                id, 
                playerNode.currentActionState,
                playerNode.character
            );
    
            // Add emote rendering for other players
            if (playerNode.emoteState) {
                console.log(`[RenderManager] Rendering emote for other player ${id}: ${playerNode.emoteState}`);
                const emoteAsset = this.sceneTree.animationManager.requestAnimation(
                    `emote_${id}`,
                    playerNode.emoteState,
                    'emotes'
                );
    
                if (emoteAsset === null) {
                    console.log(`[RenderManager] Null emote asset for other player ${id}`);
                    return;
                }
    
                if (emoteAsset?.complete) {
                    const emoteWidth = emoteAsset.width * this.camera.zoom;
                    const emoteHeight = emoteAsset.height * this.camera.zoom;
                    
                    // Ensure we have valid positions
                    const renderX = playerNode.position.x * this.camera.zoom;
                    const headY = typeof playerNode.headY === 'number' 
                        ? playerNode.headY 
                        : playerNode.position.y - (playerNode.height/2);
                    const renderHeadY = headY * this.camera.zoom;
    
                    console.log(`[RenderManager] Drawing emote for ${id} at:`, {
                        x: renderX,
                        headY: renderHeadY,
                        width: emoteWidth,
                        height: emoteHeight
                    });
                    
                    this.ctx.drawImage(
                        emoteAsset,
                        renderX - (emoteWidth / 2),
                        renderHeadY - emoteHeight - (10 * this.camera.zoom),
                        emoteWidth,
                        emoteHeight
                    );
                }
            }
        
            if (playerNode.asset?.complete) {
                const aspectRatio = playerNode.asset.width / playerNode.asset.height;
                const renderHeight = playerNode.height * this.camera.zoom;
                const renderWidth = renderHeight * aspectRatio;
                const renderX = playerNode.position.x * this.camera.zoom;
                const renderY = playerNode.position.y * this.camera.zoom;
    
                this.ctx.drawImage(
                    playerNode.asset,
                    renderX - (renderWidth/2),
                    renderY - (renderHeight/2),
                    renderWidth,
                    renderHeight
                );
                
                const scaledLineWidth = Math.min(Math.max(1 * this.camera.zoom, 2), 5);
                const scaledFontSize = Math.max(4 * this.camera.zoom, 4);
                this.ctx.font = `${scaledFontSize}px nokiafc22`;
                this.ctx.textAlign = 'center';
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = scaledLineWidth;
                this.ctx.strokeText(playerNode.id, renderX,
                    renderY + (renderHeight/2) + (5 * this.camera.zoom));
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(playerNode.id, renderX,
                    renderY + (renderHeight/2) + (5 * this.camera.zoom));
            }
        });
    }

    renderServerShadow(node) {
        if (!node?.asset?.complete) return;
        
        const aspectRatio = node.asset.width / node.asset.height;
        const renderHeight = node.height * this.camera.zoom;
        const renderWidth = renderHeight * aspectRatio;
        const renderX = node.x * this.camera.zoom;
        const renderY = node.y * this.camera.zoom;
    
        this.ctx.save();
        this.ctx.globalAlpha = 0.6;
        this.ctx.drawImage(
            node.asset,
            renderX - (renderWidth/2),
            renderY - (renderHeight/2),
            renderWidth,
            renderHeight
        );
        this.ctx.restore();
    }

    renderPlayerStats() {
        const currentPlayer = this.sceneTree.nodes.get('currentPlayer');
        const otherPlayers = this.sceneTree.nodes.get('otherPlayers').players;
    
        const renderStatsForNode = (node) => {
            const x = node.position?.x || node.x;
            const y = node.position?.y || node.y;
            
            // Scale the dot size with zoom
            const dotSize = 3;
    
            // Draw center dot (red)
            this.ctx.fillStyle = 'red';
            this.ctx.beginPath();
            this.ctx.arc(x * this.camera.zoom, y * this.camera.zoom, dotSize, 0, Math.PI * 2);
            this.ctx.fill();
        
            // Draw head dot (blue)
            this.ctx.fillStyle = 'blue';
            this.ctx.beginPath();
            this.ctx.arc(x * this.camera.zoom, node.headY * this.camera.zoom, dotSize, 0, Math.PI * 2);
            this.ctx.fill();
        
            // Draw foot dot (green)
            this.ctx.fillStyle = 'green';
            this.ctx.beginPath();
            this.ctx.arc(x * this.camera.zoom, node.footY * this.camera.zoom, dotSize, 0, Math.PI * 2);
            this.ctx.fill();
        
            this.ctx.font = `${12}px monospace`;
            this.ctx.save();
            this.ctx.textAlign = 'center';
        
            // Show raw coordinates without zoom division
            const centerText = `Center: (${x}, ${y})`;
            const headText = `Head: (${x}, ${node.headY})`;
            const footText = `Foot: (${x}, ${node.footY})`;
    
            const baseY = node.headY * this.camera.zoom - (45);
            const spacing = 15;
    
            const drawOutlinedText = (text, x, y) => {
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 3;
                this.ctx.strokeText(text, x, y);
                this.ctx.fillStyle = 'white';
                this.ctx.fillText(text, x, y);
            };
    
            drawOutlinedText(headText, x * this.camera.zoom, baseY);
            drawOutlinedText(centerText, x * this.camera.zoom, baseY + spacing);
            drawOutlinedText(footText, x * this.camera.zoom, baseY + spacing * 2);
    
            this.ctx.restore();
        };
    
        if (currentPlayer) {
            renderStatsForNode(currentPlayer);
        }
        
        otherPlayers.forEach(node => {
            renderStatsForNode(node);
        });
    }
 
    renderGrid(gridConfig) {
        const { color, lineWidth } = gridConfig;
        const TICK_SIZE = 5;  
        const UNIT_SIZE = 32;
        const { width: worldWidth, height: worldHeight } = this.backgroundManager.getDimensions();
        
        const leftBound = (-worldWidth/2) * this.camera.zoom;
        const rightBound = (worldWidth/2) * this.camera.zoom;
        const topBound = (-worldHeight/2) * this.camera.zoom;
        const bottomBound = (worldHeight/2) * this.camera.zoom;
    
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
    
        // Draw light grid lines first
        this.ctx.globalAlpha = 0.15;  // Make lines semi-transparent
        this.ctx.beginPath();
        
        // Vertical lines
        for (let x = Math.ceil(leftBound/(UNIT_SIZE * this.camera.zoom)) * (UNIT_SIZE * this.camera.zoom); 
             x <= rightBound; 
             x += (UNIT_SIZE * this.camera.zoom)) {
            if (x === 0) continue; // Skip center axis
            this.ctx.moveTo(x, topBound);
            this.ctx.lineTo(x, bottomBound);
        }
        
        // Horizontal lines
        for (let y = Math.ceil(topBound/(UNIT_SIZE * this.camera.zoom)) * (UNIT_SIZE * this.camera.zoom); 
             y <= bottomBound; 
             y += (UNIT_SIZE * this.camera.zoom)) {
            if (y === 0) continue; // Skip center axis
            this.ctx.moveTo(leftBound, y);
            this.ctx.lineTo(rightBound, y);
        }
        this.ctx.stroke();
        
        // Reset alpha for main axes
        this.ctx.globalAlpha = 1;
        
        // Draw main axes
        this.ctx.beginPath();
        this.ctx.moveTo(leftBound, 0);
        this.ctx.lineTo(rightBound, 0);
        this.ctx.moveTo(0, topBound);
        this.ctx.lineTo(0, bottomBound);
        this.ctx.stroke();
    
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = color;
    
        const drawOutlinedText = (text, x, y) => {
            this.ctx.strokeStyle = 'black';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(text, x, y);
            this.ctx.fillStyle = color;
            this.ctx.fillText(text, x, y);
        };
    
        for (let x = Math.ceil(leftBound/(UNIT_SIZE * this.camera.zoom)) * (UNIT_SIZE * this.camera.zoom); 
             x <= rightBound; 
             x += (UNIT_SIZE * this.camera.zoom)) {
            if (x === 0) continue;
    
            this.ctx.beginPath();
            this.ctx.moveTo(x, -TICK_SIZE);
            this.ctx.lineTo(x, TICK_SIZE);
            this.ctx.stroke();
    
            const worldX = x / (UNIT_SIZE * this.camera.zoom);
            drawOutlinedText(Math.round(worldX).toString(), x, TICK_SIZE + 15);
        }
    
        for (let y = Math.ceil(topBound/(UNIT_SIZE * this.camera.zoom)) * (UNIT_SIZE * this.camera.zoom); 
             y <= bottomBound; 
             y += (UNIT_SIZE * this.camera.zoom)) {
            if (y === 0) continue;
    
            this.ctx.beginPath();
            this.ctx.moveTo(-TICK_SIZE, y);
            this.ctx.lineTo(TICK_SIZE, y);
            this.ctx.stroke();
    
            const worldY = y / (UNIT_SIZE * this.camera.zoom);
            drawOutlinedText(Math.round(worldY).toString(), -TICK_SIZE - 15, y + 3);
        }
        
        this.ctx.restore();
    }

    renderCurrentPlayer(node) {
        if (!node.character) {
            return;
        }
        
        const animationId = 'currentPlayer'
        node.asset = this.sceneTree.animationManager.requestAnimation(
            animationId, 
            node.currentActionState, 
            node.character
        );
        
        if (!node?.asset?.complete) return;
        
        const aspectRatio = node.asset.width / node.asset.height;
        const renderHeight = node.height * this.camera.zoom;
        const renderWidth = renderHeight * aspectRatio;
        const renderX = node.x * this.camera.zoom;
        const renderY = node.y * this.camera.zoom;
    
        // Draw the player sprite
        this.ctx.drawImage(
            node.asset,
            renderX - (renderWidth/2),
            renderY - (renderHeight/2),
            renderWidth,
            renderHeight
        );
        
        // Draw player name
        const scaledLineWidth = Math.min(Math.max(1 * this.camera.zoom, 2), 5);
        const scaledFontSize = Math.max(4 * this.camera.zoom, 4);
        this.ctx.font = `${scaledFontSize}px nokiafc22`;
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = scaledLineWidth;
        this.ctx.strokeText(node.id, renderX, renderY + (renderHeight/2) + (5 * this.camera.zoom));
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(node.id, renderX, renderY + (renderHeight/2) + (5 * this.camera.zoom));
    
        // Draw emote if exists
        if (node.emoteState) {
            console.log(`[RenderManager] Rendering emote for current player: ${node.emoteState}`);
            const emoteAsset = this.sceneTree.animationManager.requestAnimation(
                'emote_currentPlayer',
                node.emoteState,
                'emotes'
            );

            if (emoteAsset === null) {
                console.log(`[RenderManager] Received null asset, clearing emote state`);
                this.facade.handleMovementInput({
                    x: node.x,
                    y: node.y,
                    currentActionState: node.currentActionState,
                    emoteState: null
                });
                return;
            }

            if (!emoteAsset?.complete) return;

            const emoteWidth = emoteAsset.width * this.camera.zoom;
            const emoteHeight = emoteAsset.height * this.camera.zoom;
            
            this.ctx.drawImage(
                emoteAsset,
                renderX - (emoteWidth / 2),
                node.headY * this.camera.zoom - emoteHeight - (10 * this.camera.zoom),
                emoteWidth,
                emoteHeight
            );
        }
    }

    renderChatBubble(bubbleNode) {
        const playerNode = bubbleNode.type === 'currentPlayerBubble' 
            ? this.sceneTree.nodes.get('currentPlayer')
            : this.sceneTree.nodes.get('otherPlayers').players.get(bubbleNode.playerId);
    
        if (!playerNode) {
            console.warn('[RenderManager] No player found for bubble:', bubbleNode.playerId);
            return;
        }
    
        const PADDING = {
            top: 6,
            bottom: 3,
            left: 6,
            right: 6
        };
        const LINE_HEIGHT = 14;
        const MAX_WIDTH = 100;
    
        this.ctx.save();
        this.ctx.font = '16px "m5x7"';
        
        const lines = this.wrapText(this.ctx, bubbleNode.content, MAX_WIDTH - (PADDING.left + PADDING.right));
        
        const contentWidth = Math.max(...lines.map(line => this.ctx.measureText(line).width));
        const boxWidth = Math.min(MAX_WIDTH, contentWidth + PADDING.left + PADDING.right);
        const boxHeight = (lines.length * LINE_HEIGHT) + PADDING.top + PADDING.bottom;
    
        const playerX = (playerNode.position?.x || playerNode.x) * this.camera.zoom;  
        const playerHeadY = (playerNode.position?.headY || playerNode.headY) * this.camera.zoom;
        
        const centerX = playerX;
        const bubbleOffsetY = 10 * this.camera.zoom/2;  // Scale the offset too
        const centerY = playerHeadY - boxHeight - bubbleOffsetY;
    
        const boxX = centerX - (boxWidth / 2);
        const boxY = centerY - (boxHeight / 2);
    
        const bubbleBackground = this.uiSheetReader?.getChatBubble(boxWidth, boxHeight);
        if (bubbleBackground?.complete) {
            this.ctx.drawImage(
                bubbleBackground,
                boxX - (bubbleBackground.width/2) + (boxWidth/2),
                boxY - (bubbleBackground.height/2) + (boxHeight/2)
            );
        } else {
            this.ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
            this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        }
        
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        lines.forEach((line, index) => {
            // Add black outline to make text pop
            this.ctx.strokeStyle = '#8b7355';
            this.ctx.lineWidth = 2;
            this.ctx.strokeText(
                line,
                centerX,
                boxY + (index * LINE_HEIGHT)
            );
            // Draw white text on top
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(
                line,
                centerX,
                boxY + (index * LINE_HEIGHT)
            );
        });
        
        this.ctx.restore();
    }
    
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
    
        for (let i = 0; i < words.length; i++) {
            let word = words[i];
            
            // Handle long words by splitting them
            while (ctx.measureText(word).width > maxWidth) {
                let splitIndex = 0;
                let testWord = '';
                
                // Find the maximum characters that fit within maxWidth
                while (ctx.measureText(testWord + word[splitIndex]).width <= maxWidth && splitIndex < word.length) {
                    testWord += word[splitIndex];
                    splitIndex++;
                }
                
                lines.push(testWord);
                word = word.slice(splitIndex);
            }
            
            const testLine = currentLine ? currentLine + ' ' + word : word;
            const testWidth = ctx.measureText(testLine).width;
            
            if (testWidth <= maxWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
        
        if (currentLine) lines.push(currentLine);
        return lines;
    }

    renderBackground(node) {
        if (node?.asset?.complete) {
            if (!this.hasInitializedCache) {
                this.initializeBackgroundCache(node);
            }
    
            const { width: worldWidth, height: worldHeight } = this.backgroundManager.getDimensions();
            const scaledWidth = worldWidth * this.camera.zoom;
            const scaledHeight = worldHeight * this.camera.zoom;
            
            this.ctx.drawImage(
                this.backgroundCache,
                -scaledWidth/2,
                -scaledHeight/2,
                scaledWidth,
                scaledHeight
            );
        }
    }
    
    initializeBackgroundCache(node) {
        if (!node?.asset?.complete) return;
        
        this.backgroundCache.width = node.asset.naturalWidth;
        this.backgroundCache.height = node.asset.naturalHeight;
        
        this.backgroundCacheCtx.drawImage(
            node.asset,
            0, 0
        );
        
        this.hasInitializedCache = true;
    }

    renderEmote(node) {
        // NEW:
        if (!node.hasInitialized) {
            console.log(`[RenderManager] Initializing new emote render: ${node.name}`);
            node.hasInitialized = true;
        }
     
        const playerNode = this.sceneTree.nodes.get('currentPlayer');
        if (!playerNode) {
            console.warn('[RenderManager] No player node found for emote rendering');
            return;
        }
     
        const playerX = playerNode.x * this.camera.zoom;
        const playerHeadY = playerNode.headY * this.camera.zoom;
     
        // NEW:
        console.log(`[RenderManager] Requesting emote animation frame for: ${node.name}`);
        const emoteAsset = this.sceneTree.animationManager.requestAnimation(
            'emote_animation',
            node.name,
            'emotes'
        );
     
        if (emoteAsset === null) {
            console.log(`[RenderManager] Received null asset, removing emote node: ${node.name}`);
            this.sceneTree.removeNode('emote');
            return;
        }
        
        // NEW:
        console.log(`[RenderManager] Rendering emote frame for: ${node.name}`);
        
        if (!emoteAsset?.complete) {
            console.warn('[RenderManager] Emote asset not complete, skipping render');
            return;
        }
     
        const renderWidth = emoteAsset.width * this.camera.zoom;
        const renderHeight = emoteAsset.height * this.camera.zoom;
     
        this.ctx.drawImage(
            emoteAsset,
            playerX - (renderWidth / 2),
            playerHeadY - renderHeight - (10 * this.camera.zoom),
            renderWidth,
            renderHeight
        );
    }
}