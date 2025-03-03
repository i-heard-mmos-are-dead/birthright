import { SPRITESHEETS } from './UITemplates.js';

export class UISheetReader {
    constructor(gameClient) {
        this.assetManager = gameClient.assetManager;
        this.cachedWindows = new Map();
        this.cachedButtons = new Map();
        this.cachedSliders = new Map();
    }

    getWindowBackground(style = 'wooden', sheet = 'sproutlands', contentWidth, contentHeight) {
        const config = SPRITESHEETS[sheet];
        const { topLeft, size } = config.windows[style];
        const { tileSize, tilesPerRow } = config;
    
        // For 5x5 windows, corners are 2x2. For 3x3, corners are 1x1
        const cornerMultiplier = size === 5 ? 2 : 1;
        const cornerSize = tileSize * cornerMultiplier;
        
        // contentWidth/Height are the inner dimensions, add padding for corners
        const totalWidth = contentWidth + (cornerSize * 2);
        const totalHeight = contentHeight + (cornerSize * 2);
    
        const cacheKey = `${sheet}_${style}_${totalWidth}_${totalHeight}`;
        if (this.cachedWindows.has(cacheKey)) {
            return this.cachedWindows.get(cacheKey);
        }
    
        const spritesheet = this.assetManager.loadUISheet(`${sheet}.png`);
        if (!spritesheet || !spritesheet.complete) {
            return null;
        }
    
        const canvas = document.createElement('canvas');
        canvas.width = totalWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');
    
        // Draw corners
        // Top left
        this.drawRegion(ctx, spritesheet, topLeft, tilesPerRow, tileSize, cornerMultiplier, cornerMultiplier, 0, 0);
        // Top right
        this.drawRegion(ctx, spritesheet, topLeft + size - cornerMultiplier, tilesPerRow, tileSize, cornerMultiplier, cornerMultiplier, totalWidth - cornerSize, 0);
        // Bottom left
        this.drawRegion(ctx, spritesheet, topLeft + (tilesPerRow * (size - cornerMultiplier)), tilesPerRow, tileSize, cornerMultiplier, cornerMultiplier, 0, totalHeight - cornerSize);
        // Bottom right
        this.drawRegion(ctx, spritesheet, topLeft + (tilesPerRow * (size - cornerMultiplier)) + (size - cornerMultiplier), tilesPerRow, tileSize, cornerMultiplier, cornerMultiplier, totalWidth - cornerSize, totalHeight - cornerSize);
    
        // Draw edges
        // Top edge
        this.drawStretchedRegion(ctx, spritesheet, topLeft + cornerMultiplier, tilesPerRow, tileSize, 1, cornerMultiplier, cornerSize, 0, contentWidth, cornerSize);
        // Bottom edge
        this.drawStretchedRegion(ctx, spritesheet, topLeft + (tilesPerRow * (size - cornerMultiplier)) + cornerMultiplier, tilesPerRow, tileSize, 1, cornerMultiplier, cornerSize, totalHeight - cornerSize, contentWidth, cornerSize);
        // Left edge
        this.drawStretchedRegion(ctx, spritesheet, topLeft + (tilesPerRow * cornerMultiplier), tilesPerRow, tileSize, cornerMultiplier, 1, 0, cornerSize, cornerSize, contentHeight);
        // Right edge
        this.drawStretchedRegion(ctx, spritesheet, topLeft + (tilesPerRow * cornerMultiplier) + (size - cornerMultiplier), tilesPerRow, tileSize, cornerMultiplier, 1, totalWidth - cornerSize, cornerSize, cornerSize, contentHeight);
    
        // Draw center
        this.drawStretchedRegion(ctx, spritesheet, topLeft + (tilesPerRow * cornerMultiplier) + cornerMultiplier, tilesPerRow, tileSize, 1, 1, cornerSize, cornerSize, contentWidth, contentHeight);
    
        const image = new Image();
        image.src = canvas.toDataURL();
        this.cachedWindows.set(cacheKey, image);
        return image;
    }

    drawRegion(ctx, spritesheet, tileId, tilesPerRow, tileSize, width, height, destX, destY) {
        for(let y = 0; y < height; y++) {
            for(let x = 0; x < width; x++) {
                const currentTileId = tileId + x + (y * tilesPerRow);
                const srcX = (currentTileId % tilesPerRow) * tileSize;
                const srcY = Math.floor(currentTileId / tilesPerRow) * tileSize;
                ctx.drawImage(spritesheet,
                    srcX, srcY, tileSize, tileSize,
                    destX + (x * tileSize), destY + (y * tileSize), tileSize, tileSize);
            }
        }
    }

    drawStretchedRegion(ctx, spritesheet, tileId, tilesPerRow, tileSize, srcWidth, srcHeight, destX, destY, destWidth, destHeight) {
        const srcX = (tileId % tilesPerRow) * tileSize;
        const srcY = Math.floor(tileId / tilesPerRow) * tileSize;
        ctx.drawImage(spritesheet,
            srcX, srcY, tileSize * srcWidth, tileSize * srcHeight,
            destX, destY, destWidth, destHeight);
    }

    // having a separate method for each component is peak mental retardation
    // rmb fix l8r
    getButton(type, pressed = false, sheet = 'sproutlands', targetWidth, targetHeight) {
        const config = SPRITESHEETS[sheet];
        
        const shouldMirror = type.startsWith('-');
        const baseType = shouldMirror ? type.slice(1) : type;
        
        const buttonConfig = config.buttons[baseType];
        if (!buttonConfig) return null;
    
        const cacheKey = `${sheet}_${type}_${pressed}_${targetWidth}_${targetHeight}`;
        if (this.cachedButtons.has(cacheKey)) {
            return this.cachedButtons.get(cacheKey);
        }
    
        const spritesheet = this.assetManager.loadUISheet(`${sheet}.png`);
        if (!spritesheet || !spritesheet.complete) return null;
    
        const refTileId = pressed ? buttonConfig.pressed : buttonConfig.unpressed;
        
        // NEW: Handle both size formats
        const sizeWidth = typeof buttonConfig.size === 'number' ? buttonConfig.size : buttonConfig.size.width;
        const sizeHeight = typeof buttonConfig.size === 'number' ? buttonConfig.size : buttonConfig.size.height;
        
        const baseWidth = config.tileSize * sizeWidth;
        const baseHeight = config.tileSize * sizeHeight;
        
        // First canvas for raw sprite
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = baseWidth;
        tempCanvas.height = baseHeight;
        const tempCtx = tempCanvas.getContext('2d');
    
        // Draw original size (updated to use width/height)
        this.drawRegion(tempCtx, spritesheet, refTileId, config.tilesPerRow, config.tileSize, 
            sizeWidth, sizeHeight, 0, 0);
    
        // Calculate scaling factor to maintain aspect ratio
        const scaleX = targetWidth / baseWidth;
        const scaleY = targetHeight / baseHeight;
        const scale = Math.max(scaleX, scaleY);
        
        // Calculate new dimensions that maintain aspect ratio
        const scaledWidth = baseWidth * scale;
        const scaledHeight = baseHeight * scale;
    
        // Second canvas for scaled version
        const canvas = document.createElement('canvas');
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        const ctx = canvas.getContext('2d');
    
        ctx.imageSmoothingEnabled = false;
    
        if (shouldMirror) {
            ctx.translate(scaledWidth, 0);
            ctx.scale(-1, 1);
        }
    
        ctx.drawImage(tempCanvas, 0, 0, baseWidth, baseHeight, 0, 0, scaledWidth, scaledHeight);
    
        const image = new Image();
        image.src = canvas.toDataURL();
        this.cachedButtons.set(cacheKey, image);
        return image;
    }
    
    getSlider(value = false, sheet = 'sproutlands', targetWidth, targetHeight) {
        const config = SPRITESHEETS[sheet];
        const sliderConfig = config.sliders.toggle;
        if (!sliderConfig) return null;
    
        const cacheKey = `${sheet}_slider_${value}_${targetWidth}_${targetHeight}`;
        if (this.cachedSliders.has(cacheKey)) {
            return this.cachedSliders.get(cacheKey);
        }
    
        const spritesheet = this.assetManager.loadUISheet(`${sheet}.png`);
        if (!spritesheet || !spritesheet.complete) return null;
    
        const refTileId = value ? sliderConfig.on.ref : sliderConfig.off.ref;
        const size = sliderConfig.on.size;
        const baseSize = config.tileSize * size;
    
        // First canvas for raw sprite
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = baseSize;
        tempCanvas.height = baseSize;
        const tempCtx = tempCanvas.getContext('2d');
    
        // Draw original size
        this.drawRegion(tempCtx, spritesheet, refTileId, config.tilesPerRow, config.tileSize, 
            size, size, 0, 0);
    
        // Calculate scaling factor to maintain aspect ratio
        const scaleX = targetWidth / baseSize;
        const scaleY = targetHeight / baseSize;
        const scale = Math.max(scaleX, scaleY);
        
        // Calculate new dimensions that maintain aspect ratio
        const scaledWidth = baseSize * scale;
        const scaledHeight = baseSize * scale;
    
        // Second canvas for scaled version
        const canvas = document.createElement('canvas');
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        const ctx = canvas.getContext('2d');
    
        ctx.imageSmoothingEnabled = false;
        
        if (!value) {
            // For "off" position, flip horizontally
            ctx.translate(scaledWidth, 0);
            ctx.scale(-1, 1);
        }
        
        ctx.drawImage(tempCanvas, 0, 0, baseSize, baseSize, 0, 0, scaledWidth, scaledHeight);
    
        const image = new Image();
        image.src = canvas.toDataURL();
        this.cachedSliders.set(cacheKey, image);
        return image;
    }

    getChatBubble(contentWidth, contentHeight, sheet = 'sproutlands') {
        console.log('=== getChatBubble called ===');
        console.log('Input dimensions:', {contentWidth, contentHeight});
        
        const config = SPRITESHEETS[sheet];
        const bubbleConfig = config.chatBubbles.basic;
        const { tileSize, tilesPerRow } = config;
     
        // Swap dimensions since we're building sideways first
        const swappedContentWidth = contentHeight;
        const swappedContentHeight = contentWidth;
        console.log('Swapped dimensions:', {swappedContentWidth, swappedContentHeight});
     
        // Add padding for borders (1 tile on each side)
        const totalWidth = Math.ceil(swappedContentWidth + (tileSize * 2));
        const totalHeight = Math.ceil(swappedContentHeight + (tileSize * 2));
        console.log('Total dimensions after border padding:', {totalWidth, totalHeight});
        
        const finalWidth = totalWidth + tileSize;
        console.log('Final width after pointer space:', finalWidth);
     
        const cacheKey = `${sheet}_chatbubble_${finalWidth}_${totalHeight}`;
        if (this.cachedWindows.has(cacheKey)) {
            return this.cachedWindows.get(cacheKey);
        }
     
        const spritesheet = this.assetManager.loadUISheet(`${sheet}.png`);
        if (!spritesheet || !spritesheet.complete) return null;
     
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = finalWidth;
        tempCanvas.height = totalHeight;
        console.log('Temp canvas dimensions:', {width: finalWidth, height: totalHeight});
        const tempCtx = tempCanvas.getContext('2d');
     
        // Draw corners
        this.drawRegion(tempCtx, spritesheet, bubbleConfig.topLeft, tilesPerRow, tileSize, 1, 1, 0, 0);
        this.drawRegion(tempCtx, spritesheet, bubbleConfig.topLeft + 2, tilesPerRow, tileSize, 1, 1, totalWidth - tileSize, 0);
        this.drawRegion(tempCtx, spritesheet, bubbleConfig.topLeft + (tilesPerRow * 2), tilesPerRow, tileSize, 1, 1, 0, totalHeight - tileSize);
        this.drawRegion(tempCtx, spritesheet, bubbleConfig.topLeft + (tilesPerRow * 2) + 2, tilesPerRow, tileSize, 1, 1, totalWidth - tileSize, totalHeight - tileSize);
     
        // Draw edges
        this.drawStretchedRegion(tempCtx, spritesheet, bubbleConfig.topLeft + 1, tilesPerRow, tileSize, 
            1, 1, tileSize, 0, totalWidth - (tileSize * 2), tileSize);
        this.drawStretchedRegion(tempCtx, spritesheet, bubbleConfig.topLeft + (tilesPerRow * 2) + 1, tilesPerRow, tileSize,
            1, 1, tileSize, totalHeight - tileSize, totalWidth - (tileSize * 2), tileSize);
        this.drawStretchedRegion(tempCtx, spritesheet, bubbleConfig.topLeft + tilesPerRow, tilesPerRow, tileSize,
            1, 1, 0, tileSize, tileSize, totalHeight - (tileSize * 2));
        this.drawStretchedRegion(tempCtx, spritesheet, bubbleConfig.topLeft + tilesPerRow + 2, tilesPerRow, tileSize,
            1, 1, totalWidth - tileSize, tileSize, tileSize, totalHeight - (tileSize * 2));
     
        // Draw center
        this.drawStretchedRegion(tempCtx, spritesheet, bubbleConfig.topLeft + tilesPerRow + 1, tilesPerRow, tileSize,
            1, 1, tileSize, tileSize, totalWidth - (tileSize * 2), totalHeight - (tileSize * 2));
     
        // Draw pointer
        this.drawRegion(tempCtx, spritesheet, bubbleConfig.topLeft + 3, tilesPerRow, tileSize, 
            1, 1, totalWidth, (totalHeight/2) - (tileSize/2));
     
        // Create rotated canvas
        const rotatedCanvas = document.createElement('canvas');
        rotatedCanvas.width = totalHeight;
        rotatedCanvas.height = finalWidth;
        const rotCtx = rotatedCanvas.getContext('2d');

        // Rotate -90 degrees and translate
        rotCtx.translate(0, finalWidth);
        rotCtx.rotate(-Math.PI/2);
        rotCtx.drawImage(tempCanvas, 0, 0);

        // Trim transparent pixels
        const trimmedCanvas = this.trimTransparentPixels(rotatedCanvas);
        const ctx = trimmedCanvas.getContext('2d');

        const image = new Image();
        image.src = trimmedCanvas.toDataURL();
        console.log('Final image dimensions:', {width: image.width, height: image.height});
        this.cachedWindows.set(cacheKey, image);
        return image;
    }

    trimTransparentPixels(canvas) {
        const ctx = canvas.getContext('2d');
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    
        // Scan pixels to find bounds of non-transparent content
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const alpha = pixels.data[(y * canvas.width + x) * 4 + 3];
                if (alpha > 0) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
    
        // If we found no non-transparent pixels, return original
        if (minX > maxX || minY > maxY) {
            return canvas;
        }
    
        // Create new canvas with just the content
        const trimmed = document.createElement('canvas');
        trimmed.width = maxX - minX + 1;
        trimmed.height = maxY - minY + 1;
        const trimmedCtx = trimmed.getContext('2d');
    
        // Copy just the content portion
        trimmedCtx.drawImage(canvas,
            minX, minY, maxX - minX + 1, maxY - minY + 1,
            0, 0, maxX - minX + 1, maxY - minY + 1
        );
    
        return trimmed;
    }
}