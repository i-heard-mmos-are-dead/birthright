import { Window } from '../ui/Window.js';
import { AssetEditor } from '../ui/AssetEditor.js';

export class WindowManager {
    static DEFAULT_WINDOWS = ['chat', 'ui_buttons', 'charselect'];
    constructor(gameClient) {
        this.gameClient = gameClient;
        this.sceneTree = gameClient.sceneTree;
        this.assetManager = gameClient.assetManager;
        this.camera = gameClient.camera;
        this.levelManager = gameClient.levelManager;
        this.windowRenderer = gameClient.windowRenderer;
        this.networkManager = gameClient.networkManager;

        // So we can tell windows when they STOP being hovered
        this.lastHoveredWindow = null;

        this.animationManager = null
        this.levelManager.windowManager = this;
        this.assetEditor = new AssetEditor(this.gameClient);
        this.isDrawingMode = false;
        this.windows = new Map();
        this.specialWindows = new Map();
        this.nextWindowId = 0;
        this.specialWindowStates = new Map();
        this.setupListeners();
    
        // Assign chatManager first
        this.chatManager = gameClient.chatManager;
        this.initDefaultWindows();
        this.updateSceneTree();
    }

    initDefaultWindows() {
        WindowManager.DEFAULT_WINDOWS.forEach(type => {
            // Initialize specialWindowStates for default windows
            if (!this.specialWindowStates.has(type)) {
                this.specialWindowStates.set(type, new Map());
            }
            this.createSpecialWindow(type);
        });
    }

    setLevelDrawingMode(active) {
        this.isDrawingMode = active;
    }

    // Input handling methods
    setupListeners() {
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', () => this.handleMouseUp());
    }

    // Core window management methods
    createWindow() {
        const id = this.nextWindowId++;
        const window = new Window(id, 100, 100, null, {
            onClose: (windowId) => this.closeWindow(windowId)
        }, null, this.windowRenderer); // Add windowRenderer here
        this.windows.set(id, window);
        this.updateSceneTree();
    }

    closeWindow(id) {
        this.windows.delete(id);
        this.updateSceneTree();
    }

    closeTopWindow() {
        const windowsArray = Array.from(this.windows.entries());
        if (windowsArray.length > 0) {
            const [topWindowId, topWindow] = windowsArray[windowsArray.length - 1];
            
            // Check if window type exists in SPECIAL_WINDOWS and has ignoreComponents
            if (topWindow.type && 
                Window.SPECIAL_WINDOWS[topWindow.type]?.ignoreComponents?.includes('X')) {
                return; // Don't close windows that ignore the X button
            }
            
            // Rest of the existing logic
            if (topWindow.type === 'editor') {
                
                if (this.specialWindowStates.has('settings')) {
                    this.specialWindowStates.get('settings').set('toggleEditor', false);
                }
                
                const settingsWindow = this.windows.get('settings');
                if (settingsWindow) {
                    const editorToggle = settingsWindow.components.find(c => c.callback === 'toggleEditor');
                    if (editorToggle) {
                        editorToggle.value = false;
                    }
                }
                
                this.closeSpecialWindow('editor');
            } else if (topWindow.type) {
                this.closeSpecialWindow(topWindow.type);
            } else {
                this.closeWindow(topWindowId);
            }
        }
    }

    // Special window management methods
    toggleSpecialWindow(type) {
        if (this.windows.has(type)) {
            this.closeSpecialWindow(type);
            return null;  // window was closed
        } else {
            if (!this.specialWindowStates.has(type)) {
                this.specialWindowStates.set(type, new Map(
                    Window.SPECIAL_WINDOWS[type].components.map(comp => [
                        comp.callback,
                        comp.defaultValue
                    ])
                ));
            }
            const window = this.createSpecialWindow(type);
            return window;  // return the newly created window
        }
    }

    createSpecialWindow(type) {
        let position;
    
        // Special case for editor - always top right, no calculations needed
        // really need to add reference positions to windows
        // topright, topleft, remember (remember = where was it when closed), etc.
 
        // thse positions should be more hardcoded in the template
        // i have one good window position hardcoded, globalcenter. rest is ass. 
        const template = Window.SPECIAL_WINDOWS[type];
        if (template.windowPosition) {
            switch (template.windowPosition) {
                case 'GlobalCenter':
                    position = {
                        x: (globalThis.window.innerWidth - template.width) / 2,
                        y: (globalThis.window.innerHeight - template.height) / 2
                    };
                    break;
            }
        } else if (type === 'editor') {
            position = {
                x: globalThis.window.innerWidth - 140,
                y: Math.floor(globalThis.window.innerHeight * 0.05)
            };
        } else if (type === 'chat') {
            position = {
                x: 10,
                y: globalThis.window.innerHeight - 220
            };
        } else if (type === 'ui_buttons') {
            position = {
                x: 10,
                y: 10
            };
        } else {
            const savedState = this.specialWindowStates.get(type);
            const savedX = savedState?.get('lastX');
            const savedY = savedState?.get('lastY');
            
            if (savedX !== undefined && savedY !== undefined) {
                position = { x: savedX, y: savedY };
            } else if (Window.SPECIAL_WINDOWS[type].docked) {
                position = this.calculateDockedPosition();
            } else {
                position = { x: 100, y: 100 };
            }
        }
        
        const window = new Window(
            null,
            position.x,
            position.y,
            type,
            {
                onClose: () => this.closeSpecialWindow(type),
                presstester: () => {
                    console.log('[WindowManager] I hear your press');
                },
                toggleGrid: (value) => this.sceneTree.setGridVisibility(value),
                toggleCursorPosition: (value) => {
                    this.sceneTree.setCursorPositionVisibility(value);
                    value ? this.camera.startTrackingMouse() : this.camera.stopTrackingMouse();
                },
                togglePlayerPosition: (value) => this.sceneTree.setPlayerPositionVisibility(value),

                toggleEditor: (value) => {
                    this.sceneTree.setLevelManagerVisibility(value);
                    if (value) {
                        this.toggleSpecialWindow('editor');
                    } else {
                        this.closeSpecialWindow('editor');
                    }
                },

                toggleServerShadow: () => this.sceneTree.setServerShadowVisibility(),

                // Updated BL callback
                selectOpenTool: (isPressed) => {
                    if (isPressed) {
                        const editorWindow = this.windows.get('editor');
                        const closedTool = editorWindow.components.find(c => c.callback === 'selectClosedTool');
                        const zTool = editorWindow.components.find(c => c.callback === 'selectTopZTool');
                        if (closedTool) closedTool.value = false;
                        if (zTool) zTool.isPressed = false;
                    }
                    this.levelManager.setBarrierLineMode(isPressed, 'barrier');
                },

                selectTopZTool: (isPressed) => {
                    if (isPressed) {
                        const editorWindow = this.windows.get('editor');
                        const closedTool = editorWindow.components.find(c => c.callback === 'selectClosedTool');
                        const blTool = editorWindow.components.find(c => c.callback === 'selectOpenTool');
                        if (closedTool) closedTool.value = false;
                        if (blTool) blTool.isPressed = false;
                    }
                    this.levelManager.setBarrierLineMode(isPressed, 'topZ');
                },
                
                selectClosedTool: (value) => {
                    if (value) {
                        const editorWindow = this.windows.get('editor');
                        const openTool = editorWindow.components.find(c => c.callback === 'selectOpenTool');
                        const zTool = editorWindow.components.find(c => c.callback === 'selectTopZTool');
                        if (openTool) openTool.isPressed = false;
                        if (zTool) zTool.isPressed = false;
                        this.levelManager.setBarrierLineMode(false, 'barrier', true);
                    }
                },

                toggleLabels: (value) => {
                    this.levelManager.setLabelsVisible(value);
                },

                toggleAssets: (value) => {
                    if (value) {
                        this.toggleSpecialWindow('assets');
                    } else {
                        this.closeSpecialWindow('assets');
                    }
                },

                toggleAnimations: (value) => {
                    if (value) {
                        this.toggleSpecialWindow('animations');
                    } else {
                        this.closeSpecialWindow('animations');
                    }
                },
                
                // left/right arrows in animation window
                previousFrame: () => {
                    this.animationManager.previousFrame('animationswindow');
                },
                nextFrame: () => {
                    this.animationManager.nextFrame('animationswindow');
                },
                previousAnimation: () => {
                    this.animationManager.previousAnimation('animationswindow');
                },
                nextAnimation: () => {
                    this.animationManager.nextAnimation('animationswindow');
                },
                previousSpriteSheet: () => {
                    this.animationManager.previousSpriteSheet('animationswindow');
                },
                nextSpriteSheet: () => {
                    this.animationManager.nextSpriteSheet('animationswindow');
                },
                previousSprite: () => {
                    this.animationManager.previousSprite('animationswindow');
                },
                nextSprite: () => {
                    this.animationManager.nextSprite('animationswindow');
                },
                play: () => {
                    this.animationManager.play('animationswindow');
                },
                pause: () => {
                    this.animationManager.pause('animationswindow');
                },
                lowerTicksPerSecond: () => {
                    this.animationManager.lowerTicksPerSecond('animationswindow');
                },
                increaseTicksPerSecond: () => {
                    this.animationManager.increaseTicksPerSecond('animationswindow');
                },
                increaseTicksPerFrame: () => {
                    this.animationManager.increaseTicksPerFrame('animationswindow');
                },
                lowerTicksPerFrame: () => {
                    this.animationManager.lowerTicksPerFrame('animationswindow');
                },

                exportPaths: () => {
                    this.levelManager.exportPaths();
                },

                onAssetEdit: (assetName) => {
                    const editorWindow = this.toggleSpecialWindow('asseteditor');
                    if (editorWindow) {  // window was created (not toggled off)
                        this.assetEditor.activate(editorWindow, assetName);
                    }
                },

                previousAssetPage: () => {
                    const assetGrid = window.components.find(c => c.type === 'assetGrid');
                    if (assetGrid) {
                        assetGrid.currentPage = Math.max(0, assetGrid.currentPage - 1);
                    }
                },
                nextAssetPage: () => {
                    const assetGrid = window.components.find(c => c.type === 'assetGrid');
                    if (assetGrid) {
                        const totalPages = Math.ceil(assetGrid.options.length / 4);
                        assetGrid.currentPage = Math.min(totalPages - 1, assetGrid.currentPage + 1);
                    }
                },

                toggleSettings: (value) => {
                    if (value) {
                        this.toggleSpecialWindow('settings');
                    } else {
                        this.closeSpecialWindow('settings');
                    }
                },

                selectLeft: () => {
                    this.gameClient.charSelectRenderer.left();
                },
                selectRight: () => {
                    this.gameClient.charSelectRenderer.right();
                },
                selectPlay: () => {
                    const closeWindow = () => this.closeSpecialWindow('charselect');
                    this.gameClient.charSelectRenderer.play(closeWindow);
                },

                togglePatchNotes: (value) => {
                    this.toggleSpecialWindow('patchnotes');
                },
                openCharSelect: () => {
                    if (!this.windows.has('charselect')) {
                        this.createSpecialWindow('charselect');
                    }
                },
                donate: () => {
                    globalThis.window.open('https://donate.stripe.com/9AQdR11u3fKN31CfYY', '_blank');
                },
                handleDownload: () => this.assetEditor.handleDownload(),
                resetEditor: () => this.assetEditor.resetEditor(),
                
            },
            this.gameClient,
            null
        );
            
        if (this.specialWindowStates.has(type)) {
            window.components.forEach(comp => {
                if (comp.callback) {
                    const savedValue = this.specialWindowStates.get(type).get(comp.callback);
                    if (savedValue !== undefined) {
                        comp.value = savedValue;
                    }
                }
            });
        }

        if (type === 'chat') {
            window.chatManager = this.chatManager;
        }
        
        this.specialWindows.set(type, window);
        this.windows.set(type, window);
        this.updateSceneTree();
        return window;
    }

    closeSpecialWindow(type) {
        const window = this.windows.get(type);
        if (window) {
            if (type === 'editor') {
                if (this.specialWindowStates.has('settings')) {
                    this.specialWindowStates.get('settings').set('toggleEditor', false);
                }
                
                const settingsWindow = this.windows.get('settings');
                if (settingsWindow) {
                    const editorToggle = settingsWindow.components.find(c => c.callback === 'toggleEditor');
                    if (editorToggle) {
                        editorToggle.value = false;
                    }
                }
                this.sceneTree.setLevelManagerVisibility(false);
            } else {
                // Save position for non-editor windows
                this.specialWindowStates.get(type).set('lastX', window.x);
                this.specialWindowStates.get(type).set('lastY', window.y);
            }
    
            if (type === 'asseteditor') {
                this.assetEditor.deactivate();
            }
    
            window.components.forEach(comp => {
                if (comp.callback) {
                    this.specialWindowStates.get(type).set(comp.callback, comp.value);
                }
            });
        }
        this.windows.delete(type);
        this.specialWindows.delete(type);
    }

    calculateDockedPosition() {
        const editorWindow = this.windows.get('editor');
        // Use editor window's actual x position as starting point
        const startX = editorWindow.x;
        
        // Get template widths
        const TEMPLATE = Window.SPECIAL_WINDOWS;
        const assetWidth = TEMPLATE['assets'].width;
        
        const WALL_PADDING = 0;
        const WINDOW_PADDING = 0;
        
        // Calculate docked position relative to editor's current x
        const baseX = startX - (WALL_PADDING + assetWidth + WINDOW_PADDING + (assetWidth / 2));        
        const baseY = Math.floor(globalThis.window.innerHeight * 0.05);

        
        return { x: baseX, y: baseY };
    }

    handleMouseDown(e) {
        // Right click handling for level editor
        if (e.button === 2 && this.sceneTree.nodes.has('levelManager')) {
            this.levelManager.handleMouseInput(e);
            e.preventDefault();
            return;
        }

        // Check windows - much simpler now
        for (const window of Array.from(this.windows.values()).reverse()) {
            const relX = e.clientX - window.x;
            const relY = e.clientY - window.y;
            
            if (window.handleMouseDown(e.clientX, e.clientY, relX, relY, e)) {
                // If we're in house placement mode, don't propagate clicks
                if (this.levelManager?.isHousePlacementMode) {
                    e.stopPropagation();
                    e.preventDefault();
                }
                return;
            }
        }

        // Level manager handling stays the same
        if (this.levelManager) {
            if (this.isDrawingMode || this.levelManager.isHousePlacementMode) {
                this.levelManager.handleMouseInput(e);
            }
        }
    }

    handleMouseMove(e) {
        let foundHoveredWindow = false;
        
        for (const window of Array.from(this.windows.values()).reverse()) {
            if (window.containsPoint(e.clientX, e.clientY)) {
                const relX = e.clientX - window.x;
                const relY = e.clientY - window.y;
                
                window.handleMouseMove(relX, relY);
                
                if (this.lastHoveredWindow && this.lastHoveredWindow !== window) {
                    this.lastHoveredWindow.handleMouseLeave();
                }
                
                this.lastHoveredWindow = window;
                foundHoveredWindow = true;
                break;
            }
        }
    
        if (!foundHoveredWindow && this.lastHoveredWindow) {
            this.lastHoveredWindow.handleMouseLeave();
            this.lastHoveredWindow = null;
        }
        
        // why the FUCK am i doing levelmanager shit both in the manager and in the base window class
        // im retarded
        // Forward to LevelManager if node exists
        if (this.levelManager && this.sceneTree.nodes.has('levelManager')) {
            this.levelManager.handleMouseMove(e);
        }
    }
    
    handleMouseUp() {
        for (const window of this.windows.values()) {
            window.isDragging = false;
        }
    }


    // Scene tree management
    updateSceneTree() {
        if (!this.sceneTree.nodes.has('windows')) {
            this.sceneTree.addNode('windows');
        }
        const windowsNode = this.sceneTree.nodes.get('windows');
        windowsNode.windows = this.windows;
    }

    
}