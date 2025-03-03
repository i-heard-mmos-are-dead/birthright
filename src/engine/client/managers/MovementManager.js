export class MovementManager {
    constructor(gameClient) {
        this.gameClient = gameClient;
        this.camera = gameClient.camera;
        this.levelManager = gameClient.levelManager;
        this.sceneTree = null;
        this.currentMapBounds = {
            width: 0,
            height: 0
        };
        this.currentZoom = 3;
        this.minZoom = 1;
        this.maxZoom = 10;
 
        this.idleTimer = null;
        this.IDLE_THRESHOLD = 100;
        
        this.walkToIdleMap = {
            'Swalk': 'Sidle',
            'SWwalk': 'SWidle', 
            'NWwalk': 'NWidle',
            'Nwalk': 'Nidle',
            'NEwalk': 'NEidle',
            'SEwalk': 'Eidle'
        };

    }

    updateMapBounds(width, height) {
        this.currentMapBounds = {
            width: width / 2,
            height: height / 2
        };
    }

    resetIdleTimer(currentActionState, playerId) {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }

        this.idleTimer = setTimeout(() => {
            const player = this.sceneTree.storeFacade.getPlayers()[playerId];
            if (!player) return;
            
            const idleState = this.walkToIdleMap[currentActionState];
            if (idleState) {
                this.processMovement(player.x, player.y, idleState);
            }
            this.idleTimer = null;
        }, this.IDLE_THRESHOLD);
    }

    validateMovement(playerId, dx, dy, direction) {
        const currentPlayer = this.sceneTree.storeFacade.getPlayers()[playerId];
        if (!currentPlayer) {
            console.warn('Player not found in state!');
            return;
        }

        let newX = currentPlayer.x + dx;
        let newFeetY = currentPlayer.footY + dy;
        
        let currentActionState;
        if (dx === 0 && dy === 0) {
            const lastWalkState = this.getWalkStateFromDirection(direction);
            currentActionState = this.walkToIdleMap[lastWalkState] || 'Sidle';
        } else {
            const directionToAction = {
                'north': 'Nwalk',
                'south': 'Swalk',
                'southwest': 'SWwalk',
                'southeast': 'SEwalk',
                'northwest': 'NWwalk',
                'northeast': 'NEwalk',
                'west': 'SWwalk',
                'east': 'SEwalk'
            };
            currentActionState = directionToAction[direction] || 'Swalk';
            this.resetIdleTimer(currentActionState, playerId);
        }
        
        if (!this.levelManager || !this.levelManager.barrierLines) {
            console.warn('No barrier lines found:', {
                levelManager: !!this.levelManager,
                barrierLines: this.levelManager?.barrierLines
            });
            const newY = newFeetY - currentPlayer.height/2;
            this.processMovement(newX, newY, currentActionState);
            return;
        }
        
        let willCollide = false;
    
        for (const barrierGroup of this.levelManager.barrierLines) {
            for (let i = 0; i < barrierGroup.length - 1; i++) {
                const p1 = barrierGroup[i];
                const p2 = barrierGroup[i + 1];
                
                const intersection = this.findIntersectionPoint(
                    currentPlayer.x, currentPlayer.footY,
                    newX, newFeetY,
                    p1.rawX, p1.rawY,
                    p2.rawX, p2.rawY
                );
        
                if (intersection) {
                    willCollide = true;
                    break;
                }
            }
            if (willCollide) break;
        }
        
        if (willCollide) {
            newX = currentPlayer.x;
            newFeetY = currentPlayer.footY;
        }
        
        const newY = newFeetY - currentPlayer.height/2;
        this.processMovement(newX, newY, currentActionState);
    }

    getWalkStateFromDirection(direction) {
        const directionToWalk = {
            'north': 'Nwalk',
            'south': 'Swalk',
            'southwest': 'SWwalk',
            'southeast': 'SEwalk',
            'northwest': 'NWwalk',
            'northeast': 'NEwalk',
            'west': 'SWwalk',
            'east': 'SEwalk'
        };
        return directionToWalk[direction] || 'Swalk';
    }
    
    findIntersectionPoint(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denominator = ((x2 - x1) * (y4 - y3)) - ((y2 - y1) * (x4 - x3));
        if (denominator === 0) {
            //console.log('Lines are parallel (denominator = 0)');
            return null;
        }
    
        const ua = (((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3))) / denominator;
        const ub = (((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3))) / denominator;
    
        if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            const result = {
                x: x1 + (ua * (x2 - x1)),
                y: y1 + (ua * (y2 - y1))
            };
            return result;
        }
    
        return null;
    }

    processMovement(newX, newY, currentActionState) {

        this.camera.moveToPosition(newX, newY);
    
        this.sceneTree.storeFacade.handleMovementInput({
            x: newX,
            y: newY,
            currentActionState
        });
    }

    handleZoom(zoomIn, currentDirection) {
        const oldZoom = this.currentZoom;
        const newZoom = zoomIn ? 
            Math.min(this.currentZoom + 1, this.maxZoom) :
            Math.max(this.currentZoom - 1, this.minZoom);
                
        if (newZoom !== oldZoom) {
            this.currentZoom = newZoom;
            this.camera.setZoom(newZoom);
    
        }
    }

    cleanup() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
    }
}