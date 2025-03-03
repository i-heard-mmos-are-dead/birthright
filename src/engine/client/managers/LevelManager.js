import { YAMLParser } from '../utils/YAMLParser.js';

export class LevelManager {
    constructor(gameClient) {
        
        // Core setup
        this.isBarrierLineMode = false;
        this.isTopZMode = false;
        this.camera = gameClient.camera;
        this.assetManager = gameClient.assetManager;
        this.barrierLines = [];
        this.topZLines = [];
        this.currentBarrierLine = null;
        this.labelsVisible = true;
        this.MAX_REMOVE_DISTANCE = 50;
        this.MAX_HOUSE_REMOVE_DISTANCE = 50;
        
        // Get and parse YAML
        const yamlText = this.assetManager.getMapSVG('test06.yaml');
        this.yamlParser = new YAMLParser(yamlText);
        
        // Store original data as read-only
        this.originalServerData = Object.freeze({
            paths: this.yamlParser.barrierLines || [],
            topZ: this.yamlParser.topZLines || []
        });
        
        // Asset placement setup
        this.staticAssets = [];
        this.animatedAssets = [];
        this.selectedHouse = null;
        this.isHousePlacementMode = false;
        this.housePreviewX = 0;
        this.housePreviewY = 0;
        
        // Initialize barrier lines
        this.barrierLines = this.yamlParser.barrierLines.map(points => 
            points.map((point, index) => ({
                rawX: point.rawX || 0,
                rawY: point.rawY || 0,
                index: index + 1
            }))
        );
        
        // Initialize topZ lines
        this.topZLines = this.yamlParser.topZLines.map(points => 
            points.map((point, index) => ({
                rawX: point.rawX || 0,
                rawY: point.rawY || 0,
                index: index + 1
            }))
        );
        
        // Editor lines
        this.editorBarrierLines = [];
        this.editorTopZLines = [];
        
        // Bind handlers
        this.handleMouseInput = this.handleMouseInput.bind(this);
    }
    

    setLabelsVisible(visible) {
        this.labelsVisible = visible;
    }
 
    setBarrierLineMode(active, type = 'barrier', closePolygon = false) {
    
        if (!active && closePolygon && this.currentBarrierLine) {
            if (this.currentBarrierLine.length >= 3) {
                const firstPoint = this.currentBarrierLine[0];
                const closingPoint = {
                    rawX: firstPoint.rawX,
                    rawY: firstPoint.rawY,
                    index: this.currentBarrierLine.length + 1
                };
                this.currentBarrierLine.push(closingPoint);
            }
        }
    
        if (active) {
            this.currentBarrierLine = [];
            if (type === 'barrier') {
                this.isBarrierLineMode = true;
                this.isTopZMode = false;
            } else if (type === 'topZ') {
                this.isTopZMode = true;
                this.isBarrierLineMode = false;
            }
        } else {
            this.isBarrierLineMode = false;
            this.isTopZMode = false;
        }
    
        if (this.windowManager) {
            this.windowManager.setLevelDrawingMode(active);
        }
    }
 
    handleMouseInput(e) {
    
        const pos = this.camera.screenToWorld(e.clientX, e.clientY);
        const worldX = pos.x / this.camera.zoom;
        const worldY = pos.y / this.camera.zoom;
    
        if (this.isHousePlacementMode) {
            this.housePreviewX = worldX;
            this.housePreviewY = worldY;
            
            if (e.button === 0) { // Left click
                const asset = {
                    file: this.selectedHouseFile,
                    loadHandler: this.loadHandler,
                    x: worldX,
                    y: worldY
                };
                
                if (this.assetType === 'static') {
                    this.staticAssets.push(asset);
                } else if (this.assetType === 'animated') {
                    this.animatedAssets.push(asset);
                }
                
                // Then clear the placement mode
                this.isHousePlacementMode = false;
                this.selectedHouseFile = null;
                this.loadHandler = null;
            }
            return;
        }
    
        if (e.button === 2) { // Right click
            e.preventDefault();
            this.removeHouseNear(worldX, worldY);
            if (this.isBarrierLineMode || this.isTopZMode) {
                this.removeDotNear(worldX, worldY);
            }
            return;
        }
    
        if (!this.isBarrierLineMode && !this.isTopZMode) {
            return;
        }
    
        if (e.button === 0) { // Left click
            this.addDot(worldX, worldY);
        }
    }
 
    handleMouseMove(e) {
    
        const pos = this.camera.screenToWorld(e.clientX, e.clientY);
        const worldX = pos.x / this.camera.zoom;
        const worldY = pos.y / this.camera.zoom;
    
        if (this.isHousePlacementMode) {
            this.housePreviewX = worldX;
            this.housePreviewY = worldY;
        }
    }
 
    addDot(x, y) {
        const dot = {
            rawX: x,
            rawY: y,
            index: this.currentBarrierLine.length + 1
        };
        
        // If this is the first point, add the line array to the appropriate collection
        if (this.currentBarrierLine.length === 0) {
            if (this.isBarrierLineMode) {
                this.editorBarrierLines.push(this.currentBarrierLine);
            } else if (this.isTopZMode) {
                this.editorTopZLines.push(this.currentBarrierLine);
            }
        }
        
        this.currentBarrierLine.push(dot);
    }
 
    removeDotNear(x, y) {
        const lines = this.isBarrierLineMode ? this.editorBarrierLines : this.editorTopZLines;
        if (!lines || lines.length === 0) {
            return;
        }
    
        let closestDot = null;
        let closestDistance = Infinity;
        let closestIndex = -1;
        let closestGroupIndex = -1;
    
        lines.forEach((group, groupIndex) => {
            group.forEach((dot, index) => {
                const distance = Math.sqrt(
                    Math.pow((dot.rawX - x), 2) + 
                    Math.pow((dot.rawY - y), 2)
                );
    
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestDot = dot;
                    closestIndex = index;
                    closestGroupIndex = groupIndex;
                }
            });
        });
    
        if (closestDistance <= this.MAX_REMOVE_DISTANCE && closestGroupIndex !== -1) {
            const targetGroup = lines[closestGroupIndex];
            targetGroup.splice(closestIndex, 1);
            
            targetGroup.forEach((dot, index) => {
                dot.index = index + 1;
            });
        }
    }
 
    removeHouseNear(x, y) {
        // Check both static and animated assets
        const allAssets = [...this.staticAssets, ...this.animatedAssets];
        
        if (allAssets.length === 0) {
            return;
        }
    
        let closestHouse = null;
        let closestDistance = Infinity;
        let closestIndex = -1;
        let assetType = null;
    
        allAssets.forEach((house, index) => {
            const distance = Math.sqrt(
                Math.pow((house.x - x), 2) + 
                Math.pow((house.y - y), 2)
            );
    
            if (distance < closestDistance) {
                closestDistance = distance;
                closestHouse = house;
                closestIndex = index;
                // Determine if it's in static or animated array
                assetType = index < this.staticAssets.length ? 'static' : 'animated';
            }
        });
    
        if (closestDistance <= this.MAX_HOUSE_REMOVE_DISTANCE) {
            if (assetType === 'static') {
                this.staticAssets.splice(closestIndex, 1);
            } else {
                // Adjust index for animated assets array
                this.animatedAssets.splice(closestIndex - this.staticAssets.length, 1);
            }
        } else {
            console.log(`No house within removal distance. Closest was ${closestDistance}px away`);
        }
    }
 
    exportPaths() {
        const yamlString = this.yamlParser.generateYAML(
            this.barrierLines,
            this.editorBarrierLines,
            this.topZLines,
            this.editorTopZLines,
            [...this.yamlParser.staticAssets, ...this.staticAssets],
            [...this.yamlParser.animatedAssets, ...this.animatedAssets]
        );
    
        const blob = new Blob([yamlString], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const dateStr = new Date().toISOString().split('T')[0];
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `level-paths-${dateStr}.yaml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }
 
    handleHouseSelection(houseFile, loadHandler, assetType) {
        console.log(`[LevelManager] Selected house: ${houseFile}, type: ${assetType}`);
        this.selectedHouseFile = houseFile;
        this.loadHandler = loadHandler;
        this.assetType = assetType;  // Add this
        this.isHousePlacementMode = true;
    }
 
    render(ctx) {
        // Render fro
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        
        ctx.restore();
        
        ctx.save();
        ctx.imageSmoothingEnabled = false;
    
        // Render placed houses
        [...this.staticAssets, ...this.animatedAssets].forEach(house => {
            const currentFrame = house.loadHandler(house.file);
            if (currentFrame && currentFrame.complete) {
                const baseWidth = currentFrame.width;
                const baseHeight = currentFrame.height;
                const scaledWidth = baseWidth * this.camera.zoom;
                const scaledHeight = baseHeight * this.camera.zoom;
                
                const x = (house.x * this.camera.zoom) - (scaledWidth / 2);
                const y = (house.y * this.camera.zoom) - (scaledHeight / 2);
                
                ctx.drawImage(
                    currentFrame,
                    x,
                    y,
                    scaledWidth,
                    scaledHeight
                );
            }
        });
        
        // Render all barrier lines
        this.barrierLines.forEach((group, groupIndex) => {
            if (group.length === 0) return;
    
            if (group.length >= 2) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
                ctx.lineWidth = 2;
                
                const firstDot = group[0];
                ctx.moveTo(firstDot.rawX * this.camera.zoom, firstDot.rawY * this.camera.zoom);
                
                for (let i = 1; i < group.length; i++) {
                    const dot = group[i];
                    ctx.lineTo(dot.rawX * this.camera.zoom, dot.rawY * this.camera.zoom);
                }
                ctx.stroke();
            }
    
            group.forEach(dot => {
                const scaledX = dot.rawX * this.camera.zoom;
                const scaledY = dot.rawY * this.camera.zoom;
                
                ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
                ctx.beginPath();
                ctx.arc(scaledX, scaledY, 5, 0, Math.PI * 2);
                ctx.fill();
                
                if (this.labelsVisible) {
                    const rawText = `raw: (${Math.round(dot.rawX)}, ${Math.round(dot.rawY)})`;
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 3;
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                   ctx.strokeText(rawText, scaledX, scaledY - 25);
                   ctx.fillText(rawText, scaledX, scaledY - 25);
   
                   const scaledText = `scaled: (${Math.round(scaledX)}, ${Math.round(scaledY)})`;
                   ctx.strokeText(scaledText, scaledX, scaledY - 10);
                   ctx.fillText(scaledText, scaledX, scaledY - 10);
               }
           });
       });

       // Render editor barrier lines (red)
        this.editorBarrierLines.forEach((group, groupIndex) => {
            if (group.length === 0) return;

            if (group.length >= 2) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 2;
                
                const firstDot = group[0];
                ctx.moveTo(firstDot.rawX * this.camera.zoom, firstDot.rawY * this.camera.zoom);
                
                for (let i = 1; i < group.length; i++) {
                    const dot = group[i];
                    ctx.lineTo(dot.rawX * this.camera.zoom, dot.rawY * this.camera.zoom);
                }
                ctx.stroke();
            }

                    group.forEach(dot => {
                        const scaledX = dot.rawX * this.camera.zoom;
                        const scaledY = dot.rawY * this.camera.zoom;
                        
                        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                        ctx.beginPath();
                        ctx.arc(scaledX, scaledY, 5, 0, Math.PI * 2);
                        ctx.fill();
                        
                        if (this.labelsVisible) {
                            const rawText = `raw: (${Math.round(dot.rawX)}, ${Math.round(dot.rawY)})`;
                            ctx.fillStyle = 'white';
                            ctx.strokeStyle = 'black';
                            ctx.lineWidth = 3;
                            ctx.font = '12px Arial';
                            ctx.textAlign = 'center';
                            ctx.strokeText(rawText, scaledX, scaledY - 25);
                            ctx.fillText(rawText, scaledX, scaledY - 25);

                            const scaledText = `scaled: (${Math.round(scaledX)}, ${Math.round(scaledY)})`;
                            ctx.strokeText(scaledText, scaledX, scaledY - 10);
                            ctx.fillText(scaledText, scaledX, scaledY - 10);
                        }
                    });
                });

        this.topZLines.forEach((group, groupIndex) => {
            if (group.length === 0) return;
        
            // Line rendering
            if (group.length >= 2) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(128, 0, 128, 0.5)';  // Purple
                ctx.lineWidth = 2;
                
                const firstDot = group[0];
                ctx.moveTo(firstDot.rawX * this.camera.zoom, firstDot.rawY * this.camera.zoom);
                
                for (let i = 1; i < group.length; i++) {
                    const dot = group[i];
                    ctx.lineTo(dot.rawX * this.camera.zoom, dot.rawY * this.camera.zoom);
                }
                ctx.stroke();
            }
        
            // Dot rendering - moved outside the labelsVisible condition
            group.forEach(dot => {
                const scaledX = dot.rawX * this.camera.zoom;
                const scaledY = dot.rawY * this.camera.zoom;
                
                ctx.fillStyle = 'rgba(128, 0, 128, 0.5)';
                ctx.beginPath();
                ctx.arc(scaledX, scaledY, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Label rendering - keep this part inside the condition
                if (this.labelsVisible) {
                    const rawText = `raw: (${Math.round(dot.rawX)}, ${Math.round(dot.rawY)})`;
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 3;
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.strokeText(rawText, scaledX, scaledY - 25);
                    ctx.fillText(rawText, scaledX, scaledY - 25);
        
                    const scaledText = `scaled: (${Math.round(scaledX)}, ${Math.round(scaledY)})`;
                    ctx.strokeText(scaledText, scaledX, scaledY - 10);
                    ctx.fillText(scaledText, scaledX, scaledY - 10);
                }
            });
        });

        this.editorTopZLines.forEach((group, groupIndex) => {
            if (group.length === 0) return;
        
            if (group.length >= 2) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';  // Green
                ctx.lineWidth = 2;
                
                const firstDot = group[0];
                ctx.moveTo(firstDot.rawX * this.camera.zoom, firstDot.rawY * this.camera.zoom);
                
                for (let i = 1; i < group.length; i++) {
                    const dot = group[i];
                    ctx.lineTo(dot.rawX * this.camera.zoom, dot.rawY * this.camera.zoom);
                }
                ctx.stroke();
            }
        
            group.forEach(dot => {
                const scaledX = dot.rawX * this.camera.zoom;
                const scaledY = dot.rawY * this.camera.zoom;
                
                ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
                ctx.beginPath();
                ctx.arc(scaledX, scaledY, 5, 0, Math.PI * 2);
                ctx.fill();
                
                if (this.labelsVisible) {
                    const rawText = `raw: (${Math.round(dot.rawX)}, ${Math.round(dot.rawY)})`;
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 3;
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.strokeText(rawText, scaledX, scaledY - 25);
                    ctx.fillText(rawText, scaledX, scaledY - 25);
        
                    const scaledText = `scaled: (${Math.round(scaledX)}, ${Math.round(scaledY)})`;
                    ctx.strokeText(scaledText, scaledX, scaledY - 10);
                    ctx.fillText(scaledText, scaledX, scaledY - 10);
                }
            });
        });
       
       // Render house preview
       if (this.isHousePlacementMode && this.selectedHouseFile && this.loadHandler) {
        const currentHouse = this.loadHandler(this.selectedHouseFile);
        
        if (currentHouse && currentHouse.complete) {
            const baseWidth = currentHouse.width;
            const baseHeight = currentHouse.height;
            const scaledWidth = baseWidth * this.camera.zoom;
            const scaledHeight = baseHeight * this.camera.zoom;
            
            const x = (this.housePreviewX * this.camera.zoom) - (scaledWidth / 2);
            const y = (this.housePreviewY * this.camera.zoom) - (scaledHeight / 2);
            
            ctx.drawImage(
                currentHouse,
                x,
                y,
                scaledWidth,
                scaledHeight
            );
        }
    }
       
       ctx.restore();
   }
}