export class AssetsWindowRenderer {
    constructor(assetManager, uiSheetReader, animationManager) {
        this.assetManager = assetManager;
        this.uiSheetReader = uiSheetReader;
        this.animationManager = animationManager;
        this.hoverX = null;
        this.hoverY = null;
        this.isTitleHovered = false;
        this.hoverStartTime = null;
        this.hoverEndTime = null;
        this.HOVER_ANIMATION_MS = 200;
        this.currentAssetTypeIndex = 0;
        this.subtypes = new Set();
        this.pollInterval = null;
        this.defaultSet = false;
    }

    handleMove(window, globalX, globalY) {
        if (window.containsPoint(globalX, globalY)) {
            this.hoverX = globalX;
            this.hoverY = globalY;
            
            const titleY = window.y + 40;
            const titleX = window.x + window.width/2;
            
            const wasHovered = this.isTitleHovered;
            this.isTitleHovered = (
                globalX >= titleX - 30 &&
                globalX <= titleX + 30 &&
                globalY >= titleY - 5 &&
                globalY <= titleY + 15
            );
    
            // Start hover timer if we just started hovering
            if (!wasHovered && this.isTitleHovered) {
                this.hoverStartTime = performance.now();
                this.hoverEndTime = null;
            }
            // Start fade-out timer if we just stopped hovering
            else if (wasHovered && !this.isTitleHovered) {
                this.hoverEndTime = performance.now();
                this.hoverStartTime = null;
            }
        } else {
            this.hoverX = null;
            this.hoverY = null;
            if (this.isTitleHovered) {
                this.hoverEndTime = performance.now();
                this.hoverStartTime = null;
            }
            this.isTitleHovered = false;
        }
    }

    handleClick(window, globalX, globalY) {
        if (this.isTitleHovered) {
            const subtypeArray = Array.from(this.subtypes);
            this.currentAssetTypeIndex = (this.currentAssetTypeIndex + 1) % subtypeArray.length;
            
            // Update options based on new type
            const component = window.components.find(c => c.type === 'assetGrid');
            if (component) {
                component.options = this.parseManifest(component);
                component.currentPage = 0;  // Reset to first page
            }
            return true;
        }
        return false;
    }

    parseManifest(component) {
        console.log('[AssetsRenderer] Starting manifest parse');
        console.log('[AssetsRenderer] Raw manifest:', component.manifest);
        // List of subtypes to ignore in the asset window
        // Add new ones here:
        const IGNORED_SUBTYPES = [
            'emote',
            // 'something_else',
            // 'another_thing',
        ];
        
        if (!component.manifest) {
            console.warn('[AssetsRenderer] No manifest found, returning empty array');
            return [];
        }
    
        const lines = component.manifest.split('\n');
        const assets = [];
        this.subtypes.clear();
    
        let currentAsset = null;
        let currentAssetData = {};

        for (const line of lines) {
            if (!line.trim()) continue;
    
            if (!line.startsWith(' ')) {
                if (currentAsset && (currentAssetData.type === 'static' || currentAssetData.type === 'animated')) {
                    if (!IGNORED_SUBTYPES.includes(currentAssetData.subtype)) {
                        this.subtypes.add(currentAssetData.subtype);
                        const currentSubtype = Array.from(this.subtypes)[this.currentAssetTypeIndex];
                        if (currentAssetData.subtype === currentSubtype) {
                            assets.push({
                                name: currentAsset,
                                type: currentAssetData.type
                            });
                        }
                    }
                }
    
                currentAsset = line.replace(':', '').trim();
                currentAssetData = {};
            } else {
                const [key, value] = line.trim().split(':').map(s => s.trim());
                if (key && value) {
                    currentAssetData[key] = value;
                }
            }
        }
    
        // Process final asset
        if (currentAsset && (currentAssetData.type === 'static' || currentAssetData.type === 'animated')) {
            if (!IGNORED_SUBTYPES.includes(currentAssetData.subtype)) {
                this.subtypes.add(currentAssetData.subtype);
                const currentSubtype = Array.from(this.subtypes)[this.currentAssetTypeIndex];
                if (currentAssetData.subtype === currentSubtype) {
                    assets.push({
                        name: currentAsset,
                        type: currentAssetData.type
                    });
                }
            }
        }
    
        console.log('[AssetsRenderer] Parse complete. Results:', {
            subtypes: Array.from(this.subtypes),
            currentSubtype: Array.from(this.subtypes)[this.currentAssetTypeIndex],
            assetCount: assets.length,
            assets: assets
        });

        if (!this.defaultSet) {
            const subtypeArray = Array.from(this.subtypes);
            const housingIndex = subtypeArray.indexOf('housing');
            if (housingIndex >= 0) {
                this.currentAssetTypeIndex = housingIndex;
                this.defaultSet = true;
                // Reparse with new index
                return this.parseManifest(component);
            }
            this.defaultSet = true;
        }
    
        return assets;
    }

    render(window, ctx) {
        if (window.type !== 'assets') return;

        const component = window.components.find(c => c.type === 'assetGrid');
        if (!component) {
            console.warn('No assetGrid component found in assets window');
            return;
        }

        // No options yet - check for manifest or start polling
        if (!component.options || component.options.length === 0) {
            // If we have manifest, parse it
            if (component.manifest) {
                component.options = this.parseManifest(component);
                if (this.pollInterval) {
                    clearInterval(this.pollInterval);
                    this.pollInterval = null;
                }
            } 
            // If no manifest and not polling yet, start polling
            else if (!this.pollInterval) {
                this.pollInterval = setInterval(() => {
                    if (component.manifest) {
                        component.options = this.parseManifest(component);
                        if (component.options) {
                            clearInterval(this.pollInterval);
                            this.pollInterval = null;
                        }
                    }
                }, 1000);
            }
            return; // Don't continue rendering until we have options
        }

        // Initialize currentPage if undefined
        if (typeof component.currentPage === 'undefined') {
            component.currentPage = 0;
        }

        const now = performance.now();
        let alpha = 0;

        if (this.hoverStartTime) {
            // Fading in
            const elapsed = now - this.hoverStartTime;
            alpha = Math.min(1, elapsed / this.HOVER_ANIMATION_MS) * 0.5;
        } else if (this.hoverEndTime) {
            // Fading out
            const elapsed = now - this.hoverEndTime;
            alpha = Math.max(0, (1 - elapsed / this.HOVER_ANIMATION_MS)) * 0.5;
            
            // Clean up old timer if animation is done
            if (elapsed >= this.HOVER_ANIMATION_MS) {
                this.hoverEndTime = null;
            }
        }

        if (alpha > 0) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 1;
            
            const x = window.x + window.width/2;
            const y = window.y + 38.5;
            const width = 80;
            const height = 24;
            const radius = 6;
            
            // Draw rounded rectangle
            ctx.beginPath();
            ctx.moveTo(x - width/2 + radius, y - height/2);
            ctx.lineTo(x + width/2 - radius, y - height/2);
            ctx.arc(x + width/2 - radius, y - height/2 + radius, radius, -Math.PI/2, 0);
            ctx.lineTo(x + width/2, y + height/2 - radius);
            ctx.arc(x + width/2 - radius, y + height/2 - radius, radius, 0, Math.PI/2);
            ctx.lineTo(x - width/2 + radius, y + height/2);
            ctx.arc(x - width/2 + radius, y + height/2 - radius, radius, Math.PI/2, Math.PI);
            ctx.lineTo(x - width/2, y - height/2 + radius);
            ctx.arc(x - width/2 + radius, y - height/2 + radius, radius, Math.PI, -Math.PI/2);
            ctx.stroke();
        }

        // Draw title centered
        ctx.fillStyle = 'white';
        ctx.font = '10px nokiafc22';
        ctx.textAlign = 'center';
        const subtypeArray = Array.from(this.subtypes);
        ctx.fillText(subtypeArray[this.currentAssetTypeIndex] || 'No Assets', 
            window.x + window.width/2, 
            window.y + 40
        );
        ctx.textAlign = 'left';

        const thumbSize = 50;
        const spacing = 10;
        const ITEMS_PER_PAGE = 4;
        const totalPages = Math.ceil((component.options?.length || 0) / ITEMS_PER_PAGE);

        // Center the grid horizontally
        const gridX = window.x + (window.width - thumbSize)/2;
        const gridStartY = window.y + 55;

        const startIdx = component.currentPage * ITEMS_PER_PAGE;
        const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, component.options?.length || 0);

        // Reset click areas
        component.clickAreas = [];
        
        // Render items
        if (component.options) {
            for(let i = startIdx; i < endIdx; i++) {
                const asset = component.options[i];
                const itemY = gridStartY + ((i - startIdx) * (thumbSize + spacing));
        
                let loadHandler;
                if (asset.type === 'static') {
                    const currentSubtype = Array.from(this.subtypes)[this.currentAssetTypeIndex];
                    // This is such dogshit code I can't
                    loadHandler = (assetName) => {
                        if (currentSubtype === 'housing') {
                            return this.assetManager.loadHouse(assetName, thumbSize);
                        } else {
                            return this.assetManager.loadAsset(assetName, thumbSize);
                        }
                    }
                } else if (asset.type === 'animated') {
                    loadHandler = (assetName) => this.animationManager.requestAnimation(
                        assetName,  // Using filename as playerID
                        null,       // No specific action state needed
                        assetName   // Sprite name is same as filename
                    );
                }
        
                component.clickAreas.push({
                    x: gridX,
                    y: itemY,
                    width: thumbSize,
                    height: thumbSize,
                    assetName: asset.name,
                    assetType: asset.type,
                    loadAsset: loadHandler
                });
            
                let thumbnail = loadHandler(asset.name);
        
                if (thumbnail && thumbnail.complete) {
                    // Calculate scaled dimensions that maintain aspect ratio
                    let scaledWidth, scaledHeight;
                    const aspectRatio = thumbnail.width / thumbnail.height;
                    
                    if (aspectRatio > 1) {
                        // Image is wider than tall
                        scaledWidth = thumbSize;
                        scaledHeight = thumbSize / aspectRatio;
                    } else {
                        // Image is taller than wide
                        scaledHeight = thumbSize;
                        scaledWidth = thumbSize * aspectRatio;
                    }
                    
                    // Center the image in its box
                    const xOffset = (thumbSize - scaledWidth) / 2;
                    const yOffset = (thumbSize - scaledHeight) / 2;
                    
                    // For pixel art, we should also:
                    ctx.imageSmoothingEnabled = false; // Disable smoothing
                    
                    ctx.drawImage(
                        thumbnail,
                        gridX + xOffset,
                        itemY + yOffset,
                        scaledWidth,
                        scaledHeight
                    );
                    
                    // Still draw the full boundary box
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(gridX, itemY, thumbSize, thumbSize);
                } else {
                    ctx.fillStyle = '#333';
                    ctx.fillRect(gridX, itemY, thumbSize, thumbSize);
                    ctx.fillStyle = 'white';
                    ctx.font = '10px Arial';
                    ctx.fillText('Loading...', gridX + 5, itemY + thumbSize/2);
                }
            }
        }
        
        // Page counter at bottom right
        if (totalPages > 1) {
            const counterY = window.y + window.height - 25;
            const counterX = window.x + window.width - 25;
            
            ctx.fillStyle = 'white';
            ctx.font = '12px nokiafc22';
            ctx.textAlign = 'right';
            ctx.fillText(`${component.currentPage + 1}/${totalPages}`, counterX, counterY);
        }
    }
}