export class AssetManager {
    constructor(gameClient) {
        this.camera = gameClient.camera
        this.images = new Map();
        this.svgs = new Map();
        this.processedImages = new Map();
    }

    async processImage(img, maxWidth) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
    
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const bounds = this.getImageBounds(imageData);
    
        const canvas = document.createElement('canvas');
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        const ctx = canvas.getContext('2d');
    
        ctx.drawImage(img, 
            bounds.left, bounds.top, bounds.width, bounds.height,
            0, 0, bounds.width, bounds.height
        );
    
        if (maxWidth && canvas.width > maxWidth) {
            const ratio = maxWidth / canvas.width;
            const scaledCanvas = document.createElement('canvas');
            scaledCanvas.width = maxWidth;
            scaledCanvas.height = canvas.height * ratio;
            scaledCanvas.getContext('2d').drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
            canvas = scaledCanvas;
        }
    
        const processedImg = new Image();
        processedImg.src = canvas.toDataURL();
        return new Promise((resolve) => {
            processedImg.onload = () => resolve(processedImg);
        });
    }
    
    getImageBounds(imageData) {
        const { width, height, data } = imageData;
        let left = width, right = 0, top = height, bottom = 0;
    
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const alpha = data[(y * width + x) * 4 + 3];
                if (alpha > 0) {
                    left = Math.min(left, x);
                    right = Math.max(right, x);
                    top = Math.min(top, y);
                    bottom = Math.max(bottom, y);
                }
            }
        }
    
        return {
            left,
            top,
            width: right - left + 1,
            height: bottom - top + 1
        };
    }

    loadImage(path, key, maxWidth = null) {
        if (this.images.has(key)) {
            return this.images.get(key);
        }
    
        const img = new Image();
        
        img.onerror = (e) => {
            console.error(`[AssetManager] Error loading image ${key}:`, e);
        };
    
        this.images.set(key, img);
        img.src = path;
    
        return img;
    }

    loadSprite(name, maxWidth = null) {
        const key = maxWidth ? `${name}_thumb${maxWidth}` : name;
        return this.loadImage(`/assets/sprites/${name}`, key, maxWidth);
    }

    loadMap(name, maxWidth = null) {
        const key = maxWidth ? `map_${name}_thumb${maxWidth}` : `map_${name}`;
        const path = `/assets/maps/${name}`;
        const img = new Image();
        img.src = path;
        this.images.set(key, img);
        return img;
    }

    loadHouse(name, maxWidth = null) {
        // Add .png if it's not already there
        const filename = name.endsWith('.png') ? name : `${name}.png`;
        const key = maxWidth ? `house_${filename}_thumb${maxWidth}` : `house_${filename}`;
        return this.loadImage(`/assets/aesthetic/houses/${filename}`, key, maxWidth);
    }

    // This should deprecate loadhouse eventually
    loadAsset(name, maxWidth = null) {
        // Add .png if it's not already there
        const filename = name.endsWith('.png') ? name : `${name}.png`;
        const key = maxWidth ? `asset_${filename}_thumb${maxWidth}` : `asset_${filename}`;
        
        // Extract asset type from filename (part before first underscore)
        const assetType = filename.split('_')[0];
        
        // Try to load from the appropriate subdirectory in aesthetic
        return this.loadImage(`/assets/aesthetic/${assetType}/${filename}`, key, maxWidth);
    }

    loadSpritesheet(characterName, spritesheetName, maxWidth = null) {
        const filename = spritesheetName.endsWith('.png') ? spritesheetName : `${spritesheetName}.png`;
        
        const key = maxWidth ? 
            `spritesheet_${characterName}_${filename}_thumb${maxWidth}` : 
            `spritesheet_${characterName}_${filename}`;
        
        if (this.images.has(key)) {
            return this.images.get(key);
        }
     
        const img = new Image();
        this.images.set(key, img);
    
        // If characterName matches a standalone animation name, load from animated directory
        if (characterName === filename.replace('.png', '')) {
            img.src = `/assets/aesthetic/animated/${filename}`;
            img.onerror = () => {
                console.warn(`Failed to load standalone animation: ${filename}`);
            };
        } else {
            // Otherwise treat as character animation
            img.src = `/assets/sprites/${characterName}/${filename}`;
            img.onerror = () => {
                console.warn(`Failed to load character animation: ${characterName}/${filename}`);
            };
        }
        
        return img;
    }

    loadAnimation(name, maxWidth = null) {
        // Add .png if it's not already there
        const filename = name.endsWith('.png') ? name : `${name}.png`;
        const key = maxWidth ? `animation_${filename}_thumb${maxWidth}` : `animation_${filename}`;
        return this.loadImage(`/assets/aesthetic/animated/${filename}`, key, maxWidth);
    }

    getMapSVG(name) {
        if (!this.svgs.has(name)) {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', `/assets/mapsvgs/${name}`, false);
                xhr.send();
                
                if (xhr.status === 200) {
                    this.svgs.set(name, xhr.responseText);
                } else {
                    this.svgs.set(name, '');
                }
            } catch (error) {
                console.error('Failed to load SVG file:', error);
                this.svgs.set(name, '');
            }
        }
        return this.svgs.get(name);
    }

    loadUISheet(name) {
        const key = `uisheet_${name}`;
        return this.loadImage(`/assets/uisheets/${name}`, key);
    }
}