import { TEMPLATES } from './WindowTemplates.js';

export class Window {
    static SPECIAL_WINDOWS = TEMPLATES; 

    constructor(id, x, y, type = null, callbacks = {}, gameClient, imageUrl = null) {
        this.type = type;
        this.chatManager = callbacks.chatManager; // callbacks? wtf bro was i high?
        this.assetManager = gameClient.assetManager;
        this.windowRenderer = gameClient.windowRenderer
        this.networkManager = gameClient.networkManager;
        this.imageUrl = imageUrl;
        this.levelManager = gameClient.levelManager;

        // Mouse hovering
        this.hoverPosition = null;
        this.lastHoverTime = null;

        if (type && Window.SPECIAL_WINDOWS[type]) {
            const template = Window.SPECIAL_WINDOWS[type];
            this.id = type;
            this.width = template.width;
            this.height = template.height;
            this.backgroundStyle = template.backgroundStyle || null;

            // If this is an assets window, fetch and update the house list
            if (type === 'assets' && this.networkManager) {
                this.updateAssetManifest();
            }
        } else {
            this.id = id;
            this.width = 200;
            this.height = 150;
        }

        this.x = x;
        this.y = y;
        this.titleHeight = 25;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        
        this.callbacks = callbacks;
        
        this.components = [];
    
        // temp canvas for flattening shit because fuck compositing
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        // Merge base and add template components if they exist
        this.initializeComponents(Window.SPECIAL_WINDOWS.base.components);
        if (type && Window.SPECIAL_WINDOWS[type]) {
            this.initializeComponents(Window.SPECIAL_WINDOWS[type].components);
        }
    }

    async updateAssetManifest() {
        try {
            console.log('[Window] Fetching asset manifest...');
            const manifest = await this.networkManager.fetchAssetManifest();
            console.log('[Window] Received manifest:', manifest);
            const assetGrid = this.components.find(comp => comp.type === 'assetGrid');
            if (assetGrid) {
                assetGrid.manifest = manifest;
                console.log('[Window] Set manifest on assetGrid component');
            }
        } catch (error) {
            console.error('[Window] Failed to fetch manifest:', error);
        }
    }

    initializeComponents(componentConfigs) {
        // If this is the base config, check for components to ignore
        if (componentConfigs === Window.SPECIAL_WINDOWS.base.components) {
            if (this.type && Window.SPECIAL_WINDOWS[this.type].ignoreComponents) {
                const ignoreList = Window.SPECIAL_WINDOWS[this.type].ignoreComponents;
                componentConfigs = componentConfigs.filter(config => 
                    !ignoreList.includes(config.label)
                );
            }
        }
    
        componentConfigs.forEach(config => {
            if (config.type === 'button') {
                this.components.push({
                    ...config,
                    isPressed: false,
                    bounds: config.bounds || { x: 0, y: 0, width: 20, height: 20 }
                });
            } else {
                this.components.push({
                    ...config,
                    value: config.defaultValue,
                    bounds: config.bounds || { x: 0, y: 0, width: 50, height: 20 }  // Only use defaults if no bounds provided
                });
            }
        });
    }

    renderSelf(ctx) {
        this.windowRenderer.render(this, ctx);
    }

    handleMouseDown(globalX, globalY, relX, relY, event) {
        const hit = this.containsPoint(globalX, globalY);
        if (hit) {
            // Add this first
            if (this.type === 'assets' && this.windowRenderer && this.windowRenderer.assetsRenderer) {
                if (this.windowRenderer.assetsRenderer.handleClick(this, globalX, globalY)) {
                    return true;
                }
            }
            
            this.lastTitleBarCheck = {
                x: this.x,
                y: this.y,
                width: this.width,
                height: this.titleHeight
            };
    
            this.components.forEach(component => {
                if (component.type === 'button') {
                    // Store the centered button detection area
                    this.lastButtonCheck = {
                        x: component.bounds.x - component.bounds.width/2,
                        y: component.bounds.y - component.bounds.height/2,
                        width: component.bounds.width,
                        height: component.bounds.height
                    };
                }
            });
        
            this.lastClickCoords = { x: globalX, y: globalY, relX, relY };
        }
        if (this.containsPoint(globalX, globalY)) {
            // Title bar area check - includes both close button and dragging
            
        
            // Check for chat navigation arrows
            if (this.type === 'chat' && this.chatManager) {
                if (this.upArrowBounds && this.isInBounds(globalX, globalY, this.upArrowBounds)) {
                    this.chatManager.previousPage();
                    return true;
                }
                if (this.downArrowBounds && this.isInBounds(globalX, globalY, this.downArrowBounds)) {
                    this.chatManager.nextPage();
                    return true;
                }
            }
        
            const assetGrid = this.components.find(c => c.type === 'assetGrid');
            if (assetGrid) {
                // Handle regular left clicks for house selection
                for (const area of assetGrid.clickAreas) {
                    if (this.isInBounds(globalX, globalY, area)) {
                        
                        // Left click - select house
                        if (!event || event.button === 0) {
                            if (this.levelManager) {
                                this.levelManager.handleHouseSelection(area.assetName, area.loadAsset, area.assetType);
                            }
                            return true;
                        }
                        
                        // Middle click - open editor
                        if (event && event.button === 1) {
                            if (this.callbacks.onAssetEdit) {
                                this.callbacks.onAssetEdit(area.assetName);
                            }
                            return true;
                        }
                    }
                }
            }
        
            // Handle all component clicks including close button
            this.components.forEach(component => {
                if (component.type === 'button') {
                    // Special centered hit detection for buttons
                    const inButton = globalX >= component.bounds.x - component.bounds.width/2 &&
                    globalX <= component.bounds.x + component.bounds.width/2 &&
                    globalY >= component.bounds.y - component.bounds.height/2 &&
                    globalY <= component.bounds.y + component.bounds.height/2;
                    if (inButton) {
                        if (component.isToggle) {
                            component.isPressed = !component.isPressed;
                        } else {
                            component.isPressed = true;
                            setTimeout(() => {
                                component.isPressed = false;
                            }, 100);
                        }
                        // Execute callback if it exists
                        if (this.callbacks[component.callback]) {
                            this.callbacks[component.callback](component.isPressed);
                        }
                    }
                } else if (component.type === 'slider') {
                    const inSlider = globalX >= component.bounds.x - component.bounds.width/2 &&
                                     globalX <= component.bounds.x + component.bounds.width/2 &&
                                     globalY >= component.bounds.y - component.bounds.height/2 &&
                                     globalY <= component.bounds.y + component.bounds.height/2;
                    if (inSlider) {
                        component.value = !component.value;
                        if (this.callbacks[component.callback]) {
                            this.callbacks[component.callback](component.value);
                        }
                    }
                }
            });
            
            if (relY <= this.titleHeight && relY >= 0 && relX >= 0 && relX <= this.width) {
                // Check for title bar components first
                let componentClicked = false;
                this.components.forEach(component => {
                    if ((component.position === 'titleBar' || component.position === 'titleBarLeft') && this.isInBounds(globalX, globalY, component.bounds)) {
                        componentClicked = true;
                        if (component.type === 'button') {
                            component.isPressed = true;
                            setTimeout(() => {
                                component.isPressed = false;
                            }, 100);
                            if (this.callbacks[component.callback]) {
                                this.callbacks[component.callback](this.id);
                            }
                        }
                    }
                });
                
                if (componentClicked) return true;
                
                // If no components were clicked and window is draggable, initiate dragging
                const template = Window.SPECIAL_WINDOWS[this.type];
                if (!template || template.draggable !== false) {
                    this.isDragging = true;
                    this.dragOffsetX = globalX - this.x;
                    this.dragOffsetY = globalY - this.y;
                }
                return true;
            }
            
            // Yes i need this in 2 places because I'm retarded and my code is bad
            // If no components were clicked, initiate dragging
            const template = Window.SPECIAL_WINDOWS[this.type];
            if (!template || template.draggable !== false) {
                this.isDragging = true;
                this.dragOffsetX = globalX - this.x;
                this.dragOffsetY = globalY - this.y;
            }

            return true;
        }
        return false;
    }
    
    handleMouseMove(relX, relY) {
        this.hoverPosition = { relX, relY };
        // Always inform renderer about hover position
        if (this.windowRenderer && this.type === 'assets') {
            // Convert back to global for assets renderer since it expects global coords
            this.windowRenderer.assetsRenderer.handleMove(this, relX + this.x, relY + this.y);
        }
    
        // Handle dragging if active
        if (this.isDragging) {
            this.x = (relX + this.x) - this.dragOffsetX;
            this.y = (relY + this.y) - this.dragOffsetY;
        }
    }
    
    handleMouseLeave() {
        //console.log(`[Window ${this.type || this.id}] Mouse left window`);
    }

    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    isInBounds(x, y, bounds) {
        return x >= bounds.x && x <= bounds.x + bounds.width &&
               y >= bounds.y && y <= bounds.y + bounds.height;
    }

    getTitle() {
        if (this.type && Window.SPECIAL_WINDOWS[this.type]) {
            return Window.SPECIAL_WINDOWS[this.type].title;
        }
        return `Window ${this.id}`;
    }
}