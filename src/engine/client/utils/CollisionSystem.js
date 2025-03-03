export class CollisionSystem {
    constructor(gameClient) {
        this.camera = gameClient.camera;
        this.debug = true;
    }

    convertToBaseCoords(value) {
        return value;
    }

    checkCollision(rect1, rect2) {
        return (rect1.x < rect2.x + rect2.width/2 &&
                rect1.x + rect1.width > rect2.x - rect2.width/2 &&
                rect1.y < rect2.y + rect2.height/2 &&
                rect1.y + rect1.height > rect2.y - rect2.height/2);
    }

    getAssetBounds(asset) {
        if ((!asset.width || !asset.height) && asset.assetType === 'static') {
            console.warn(`Missing dimensions for asset ${asset.file}`);
        }
        return {
            x: asset.x,
            y: asset.y,
            width: asset.width,
            height: asset.height
        };
     }

     getPlayerBounds(player) {
        const x = this.convertToBaseCoords(player.x);
        const y = this.convertToBaseCoords(player.y);
        const width = this.convertToBaseCoords(player.width);
        const height = this.convertToBaseCoords(player.height);
    
        return {
            x: x - width/2,
            y: y - height/2,
            width,
            height
        };
    }

    handleNodeUpdate(nodes) {
        const assets = [];
        let currentPlayer = null;
        const otherPlayers = [];
        const collisions = [];  // Moved this up here
    
        nodes.forEach(node => {
            switch(node.type) {
                case 'asset':
                    assets.push(node);
                    break;
                case 'currentPlayer':
                    currentPlayer = node;
                    break;
                case 'otherPlayers':
                    node.players.forEach(player => {
                        otherPlayers.push(player);
                    });
                    break;
            }
        });
    
        if (currentPlayer) {
            const playerBounds = this.getPlayerBounds(currentPlayer);
            for (const asset of assets) {
                const assetBounds = this.getAssetBounds(asset);
                
                if (this.checkCollision(playerBounds, assetBounds)) {
                    const assetComparisonY = assetBounds.y + (asset.depthLine || 0);
                    const position = playerBounds.y < assetComparisonY ? 'high' : 'low';
                    
                    if (this.debug) {
                        console.log('=== Collision Detected ===');
                        console.log('Asset:', {
                            file: asset.file,
                            position: position,
                            depthLine: asset.depthLine,
                            assetComparisonY,
                            assetY: assetBounds.y,
                            playerY: playerBounds.y
                        });
                        
                        console.log('[CollisionSystem] Processing collision for:', {file: asset.file, key: asset.key});
                    }
                    
                    collisions.push({
                        asset: asset.file,
                        key: asset.key,
                        position,
                        depthLine: asset.depthLine
                    });
                    
                    if (this.debug && asset.file && asset.file.includes('tree')) {
                        console.log('Tree specific collision:', {
                            file: asset.file,
                            depthLine: asset.depthLine,
                            rawAsset: asset
                        });
                    }
                }
            }
            
            if (this.debug && collisions.length > 0) {
                console.log('All collisions this frame:', collisions);
            }
        }
        return collisions;
    }
}