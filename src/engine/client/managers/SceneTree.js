import { Trees, Nodes } from '../ui/NodeConfigs.js';
import { YAMLParser } from '../utils/YAMLParser.js';

export class SceneTree {
    constructor(gameClient) {
        this.config = gameClient.config;
        this.storeFacade = gameClient.storeFacade;
        this.assetManager = gameClient.assetManager;
        this.movementManager = gameClient.movementManager;
        this.backgroundManager = gameClient.backgroundManager;
        this.levelManager = gameClient.levelManager;
        this.collisionSystem = gameClient.collisionSystem;
        this.collisionableNodes = ['asset', 'currentPlayer', 'otherPlayers'];
        
        this.showCursorPosition = false;
        this.showPlayerStats = false;
        this.showServerShadow = false;

        this.assetCounter = 0;

        this.entityComponents = new Map();
        this.chatBubbleTimeouts = new Map();
        
        this.tree = {
        };
        
        // Initialize node system
        this.nodes = new Map();
        this.sortedNodes = []; // Cache for layer-sorted nodes
        this.isDirty = true; // Dirty = resort nodes

        // Load and parse YAML
        const yamlText = this.assetManager.getMapSVG('test06.yaml');
        this.yamlParser = new YAMLParser(yamlText);

        this.buildNodeTree();

        // Add all static assets
        this.yamlParser.staticAssets.forEach(asset => {
            this.addAsset(asset.file, asset.x, asset.y, 'static', asset.depthLine || 0, asset.layer || 2);
        });

        // Add all animated assets 
        this.yamlParser.animatedAssets.forEach(asset => {
            this.addAsset(asset.file, asset.x, asset.y, 'animated');
        });

        //this.addAsset('housing_AllGreenSmall', -160, -70, 'static');  // Test asset

        this.storeFacade.subscribeToPlayers(() => this.updatePositions()); // Player movement = tree update
    }

    addNode(nodeType) {
        const config = Nodes[nodeType];
        if (!config) {
            console.warn(`Attempted to add invalid node type: ${nodeType}`);
            return false;
        }

        const node = { ...config };
        
        // Handle any runtime initialization
        switch(nodeType) {
            case 'background':
                node.asset = this.assetManager.loadMap('DemoMap_01.png');
                node.asset.onload = () => {
                    this.backgroundManager.setDimensions(node.asset.width, node.asset.height);
                };
                break;
            case 'currentPlayer':
                node.width = this.config.entities.size.width;
                node.height = this.config.entities.size.height;
                break;
        }

        this.nodes.set(nodeType, node);
        this.isDirty = true;
        return true;
    }

    removeNode(nodeType) {
        console.log(`[SceneTree] Attempting to remove node: ${nodeType}`);
        const success = this.nodes.delete(nodeType);
        if (success) {
            console.log(`[SceneTree] Successfully removed node: ${nodeType}`);
            this.isDirty = true;
        } else {
            console.log(`[SceneTree] Failed to remove node: ${nodeType} (node not found)`);
        }
        return success;
    }

    getNodes() {
        if (this.isDirty) {
            // Sort nodes by layer
            this.sortedNodes = Array.from(this.nodes.entries())
                .sort(([, a], [, b]) => a.layer - b.layer);
            this.isDirty = false;
        }
        return this.sortedNodes;
    }

    buildNodeTree() {
        // Clear existing nodes
        this.nodes.clear();
        this.isDirty = true;
    
        // Add initial nodes from Trees config
        Trees.main.nodeOrder.forEach(nodeType => {
            this.addNode(nodeType);
        });
    }

    // Bro why the FUCK is my scenetree loading images
    // My code is so ass I hate it here
    // Only the renderer should load images wtf is this
    addAsset(file, x, y, assetType, depthLine = 0, layer = 2) {
        const assetKey = `asset_${this.assetCounter++}`;
        const node = { ...Nodes.asset };
        node.type = 'asset';
        node.file = file;
        node.x = x;
        node.y = y;
        node.depthLine = depthLine;
        node.assetType = assetType;
        node.layer = layer;  // Use provided layer or default to 2
    
        if (assetType === 'static') {
            const fileType = file.split('_')[0];
            
            // Create new image directly here
            const image = new Image();
            
            // Attach onload BEFORE setting src
            image.onload = () => {
                node.width = image.width;
                node.height = image.height;
                this.isDirty = true;
            };
    
            // Set the src last
            image.src = fileType === 'housing' 
                ? `/assets/aesthetic/houses/${file}.png`
                : `/assets/aesthetic/${fileType}/${file}.png`;
        }
    
        this.nodes.set(assetKey, node);
        this.isDirty = true;
    }

    // Keep existing method as proxy for backward compatibility
    setGridVisibility(visible) {
        if (visible) {
            this.addNode('grid');
        } else {
            this.removeNode('grid');
        }
    }

    updatePositions() {
        const players = this.storeFacade.getPlayers();
        const serverSelf = this.storeFacade.getServerSelf();
        const socketId = this.storeFacade.getSocketId();
        
        // Get other players node
        const otherPlayersNode = this.nodes.get('otherPlayers');
    
        // Clear existing other players
        if (otherPlayersNode) {
            otherPlayersNode.players.clear();
        }

        // Update other players
        Object.entries(players).forEach(([id, playerData]) => {
            if (id !== socketId && otherPlayersNode) {
                const node = {
                    position: {x: playerData.x, y: playerData.y},
                    id: playerData.id,
                    asset: this.animationManager.requestAnimation(id, playerData.currentActionState, playerData.character),
                    width: this.config.entities.size.width,
                    height: this.config.entities.size.height,
                    currentActionState: playerData.currentActionState,
                    headY: playerData.headY,
                    footY: playerData.footY,
                    character: playerData.character,
                    emoteState: playerData.emoteState  // Add this line
                };
                otherPlayersNode.players.set(id, node);
            }
        });
    
        // Update local player
        if (socketId && players[socketId]) {
            const playerData = players[socketId];
            const currentPlayerNode = this.nodes.get('currentPlayer');
            
            if (currentPlayerNode) {
                Object.assign(currentPlayerNode, {
                    ...playerData,
                    id: playerData.id,
                    currentActionState: playerData.currentActionState,
                    width: this.config.entities.size.width,
                    height: this.config.entities.size.height,
                    character: playerData.character
                });
            }
        }
    
        // Update server shadow if it exists
        const serverShadowNode = this.nodes.get('serverShadow');
        if (serverShadowNode && serverSelf) {
            Object.assign(serverShadowNode, {
                x: serverSelf.x,
                y: serverSelf.y,
                asset: this.animationManager.requestAnimation('serverShadow', serverSelf.currentActionState, serverSelf.character),
                width: this.config.entities.size.width,
                height: this.config.entities.size.height,
                character: serverSelf.character
            });
        }
    
        const relevantNodes = this.collisionableNodes.map(type => {
            if (type === 'asset') {
                return Array.from(this.nodes.entries())
                    .filter(([key]) => key.startsWith('asset_'))
                    .map(([key, node]) => ({...node, key}));  // Include the key in the node data
            }
            return this.nodes.get(type);
        }).flat().filter(Boolean);
        
        const collisions = this.collisionSystem.handleNodeUpdate(relevantNodes);

        if (collisions && collisions.length > 0) {
            const currentPlayerNode = this.nodes.get('currentPlayer');
            if (currentPlayerNode) {
                
                let highestLayer = 2;
                let newLayer = 1;
                collisions.forEach((collision, index) => {
                
                    const assetNode = this.nodes.get(collision.key);
                    if (assetNode) {
                        const assetLayer = assetNode.layer || 2;
                        if (collision.position === 'low') {
                            newLayer = Math.max(newLayer, assetLayer + 1);
                        } else if (collision.position === 'high') {
                            newLayer = Math.max(1, assetLayer - 1);
                        }
                    }
                });
             
                if (currentPlayerNode.layer !== newLayer) {
                    currentPlayerNode.layer = newLayer;
                    this.isDirty = true;
                }
            }
        }
    }

    setCursorPositionVisibility(visible) {
        if (visible) {
            this.addNode('cursorPosition');
        } else {
            this.removeNode('cursorPosition');
        }
    }
    
    setServerShadowVisibility() {
        if (this.nodes.has('serverShadow')) {
            this.removeNode('serverShadow');
        } else {
            this.addNode('serverShadow');
        }
    }

    setPlayerPositionVisibility(visible) {
        if (visible) {
            this.addNode('playerStats');
        } else {
            this.removeNode('playerStats');
        }
    }

    setAnimationManager(animationManager) {
        this.animationManager = animationManager;
    }

    getTree() {
        return this.tree;
    }

    createChatBubble(content, isCurrentPlayer, playerId = null) {
        const bubbleId = isCurrentPlayer ? this.storeFacade.getSocketId() : playerId;
        const nodeType = isCurrentPlayer ? 'currentPlayerBubble' : 'otherPlayerBubble';
        
        // Clear existing bubble if present
        this.removeNode(`${nodeType}-${bubbleId}`);
        
        // Create new bubble node
        const bubbleNode = {
            ...Nodes[nodeType],
            id: `${nodeType}-${bubbleId}`,
            content,
            playerId: bubbleId,
            createdAt: Date.now()
        };

        this.nodes.set(bubbleNode.id, bubbleNode);
        this.isDirty = true;
    
        // Set timeout to remove the bubble
        if (this.chatBubbleTimeouts.has(bubbleId)) {
            clearTimeout(this.chatBubbleTimeouts.get(bubbleId));
        }
    
        const timeoutId = setTimeout(() => {
            this.removeNode(bubbleNode.id);
            this.chatBubbleTimeouts.delete(bubbleId);
        }, bubbleNode.duration);
        
        this.chatBubbleTimeouts.set(bubbleId, timeoutId);
    }

    setLevelManagerVisibility(visible) {
        if (visible) {
            const success = this.addNode('levelManager');
            if (success) {
                const node = this.nodes.get('levelManager');
                node.manager = this.levelManager;
            }
        } else {
            const success = this.removeNode('levelManager');
        }
    }

}