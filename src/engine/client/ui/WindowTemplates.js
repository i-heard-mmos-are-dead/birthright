// windowTemplates.js
export const TEMPLATES = {
    base: {
        components: [
            {
                type: 'button',
                label: 'X',
                callback: 'onClose',
                position: 'titleBar',  
                bounds: { width: 32, height: 32 }
            }
        ]
    },

    // settings window template
    settings: {
        title: 'Settings',
        width: 300,
        height: 240,
        backgroundStyle: 'wooden',
        components: [
            {
                type: 'slider',
                label: 'Cursor Position',
                callback: 'toggleCursorPosition',
                defaultValue: false
            },
            {
                type: 'slider',
                label: 'Grid',
                callback: 'toggleGrid',
                defaultValue: false
            },
            {
                type: 'slider',
                label: 'Player Stats',
                callback: 'togglePlayerPosition',
                defaultValue: false
            },
            {
                type: 'slider',
                label: 'Editor Mode',
                callback: 'toggleEditor',
                defaultValue: false
            },
            {
                type: 'slider',
                label: 'Ping',
                callback: 'toggleServerShadow',
            }
        ]
    },

    // houses for now
    assets: {
        title: 'Assets',
        width: 200,
        height: 300,
        docked: true,
        backgroundStyle: 'wooden',
        components: [
            {
                type: 'assetGrid',
                label: 'Houses',
                bounds: {
                    width: 200,
                    height: 275
                },
                options: []
            },
            {
                type: 'button',
                label: '▲',
                callback: 'previousAssetPage',
                bounds: { width: 32, height: 32 }
            },
            {
                type: 'button',
                label: '⬇',
                callback: 'nextAssetPage',
                bounds: { width: 32, height: 32 }
            }
        ]
    },
    
    // chat
    chat: {
        title: 'Chat',
        width: 300,
        height: 200,
        ignoreComponents: ['X'],
        components: []
    },

    // editor UI - shit that docks, docks to this by default
    editor: {
        title: 'Edit',
        width: 100,
        height: globalThis.window.innerHeight * 0.9,
        backgroundStyle: 'wooden',
        components: [
            {
                type: 'button',
                label: 'C',
                callback: 'selectClosedTool',
                bounds: { width: 64, height: 64 },
            },
            {
                type: 'button',
                label: 'BL',
                callback: 'selectOpenTool',
                bounds: { width: 64, height: 64 },
                isToggle: true
            },
            {
                type: 'button',
                label: 'Z',
                callback: 'selectTopZTool',
                bounds: { width: 64, height: 64 },
                isToggle: true
            },
            {
                type: 'button',
                label: '🏠',
                callback: 'toggleAssets',
                bounds: { width: 64, height: 64 }
            },
            {
                type: 'button',
                label: '🧑',
                callback: 'toggleAnimations',
                bounds: { width: 64, height: 64 }
            },
            {
                type: 'button',
                label: '⬇',
                callback: 'exportPaths',
                bounds: { width: 64, height: 64 }
            },
            {
                type: 'slider',
                label: '',
                callback: 'toggleLabels',
                bounds: { width: 64, height: 64 },
                defaultValue: true
            }
        ]
    },

    // Animation visualizer
    animations: {
        title: 'Animations',
        width: 200,
        height: 270,
        docked: true,
        backgroundStyle: 'wooden',
        components: [
            {
                type: 'animationDisplay',
                bounds: { width: 180, height: 260 }
            },
    
            // Sprite switching
            {
                type: 'button',
                label: '←-',
                callback: 'previousSprite',
                bounds: { width: 32, height: 32 },
                position: 'leftTop1'
            },
            {
                type: 'button',
                label: '▲',
                callback: 'nextSprite',
                bounds: { width: 32, height: 32 },
                position: 'rightTop1'
            },
    
            // Sheet switching
            {
                type: 'button',
                label: '←',
                callback: 'previousSpriteSheet',
                bounds: { width: 32, height: 32 },
                position: 'leftTop2'
            },
            {
                type: 'button',
                label: '→',
                callback: 'nextSpriteSheet',
                bounds: { width: 32, height: 32 },
                position: 'rightTop2'
            },
    
            // Animation switching
            {
                type: 'button',
                label: '←',
                callback: 'previousAnimation',
                bounds: { width: 32, height: 32 },
                position: 'leftTop3'
            },
            {
                type: 'button',
                label: '→',
                callback: 'nextAnimation',
                bounds: { width: 32, height: 32 },
                position: 'rightTop3'
            },
    
            // Frame switching
            {
                type: 'button',
                label: '←',
                callback: 'previousFrame',
                bounds: { width: 32, height: 32 },
                position: 'leftTop4'
            },
            {
                type: 'button',
                label: '→',
                callback: 'nextFrame',
                bounds: { width: 32, height: 32 },
                position: 'rightTop4'
            },
    
            // New pause/play buttons
            {
                type: 'button',
                label: '⏸️',
                callback: 'pause',
                bounds: { width: 32, height: 32 },
                position: 'midBottomLeft'
            },
            {
                type: 'button',
                label: '▶️',
                callback: 'play',
                bounds: { width: 32, height: 32 },
                position: 'midBottomRight'
            },
                
            // Frame speed
            {
                type: 'button',
                label: '-⏩',
                callback: 'lowerTicksPerSecond',
                bounds: { width: 32, height: 32 },
                position: 'leftBottom1'
            },
            {
                type: 'button',
                label: '⏩',
                callback: 'increaseTicksPerSecond',
                bounds: { width: 32, height: 32 },
                position: 'rightBottom1'
            },
            {
                type: 'button',
                label: '-⏩',
                callback: 'lowerTicksPerFrame',
                bounds: { width: 32, height: 32 },
                position: 'leftBottom2'
            },
            {
                type: 'button',
                label: '⏩',
                callback: 'increaseTicksPerFrame',
                bounds: { width: 32, height: 32 },
                position: 'rightBottom2'
            }
    
        ]
    },

    asseteditor: {
        title: 'Asset Editor',
        width: 800,
        height: 800,
        backgroundStyle: 'wooden',
        components: [
            {
                type: 'button',
                label: '⬇',
                position: 'titleBarLeft',
                bounds: { width: 32, height: 32 },
                callback: 'handleDownload'  // Changed from doNothing
            },
            {
                type: 'button',
                label: 'power',
                position: 'titleBarLeft',
                bounds: { width: 32, height: 32 },
                callback: 'resetEditor'    // Changed from doNothing
            }
        ]
    },


    // these "middle top bottom" refs are dogshit and need to go
    ui_buttons: {
        title: '',
        width: 64,
        height: 256,  // 64 * 4 for four buttons
        ignoreComponents: ['X'],
        backgroundStyle: 'transparent',
        draggable: false,
        components: [
            {
                type: 'button',
                label: '⚙️',
                callback: 'toggleSettings',
                position: 'top',
                bounds: { width: 32, height: 32 }
            },
            {
                type: 'button',
                label: '⭐',
                callback: 'openCharSelect',
                position: 'middle',
                bounds: { width: 32, height: 32 }
            },
            {
                type: 'button',
                label: '!',
                callback: 'togglePatchNotes',
                position: 'bottom',
                bounds: { width: 32, height: 32 }
            },
            {
                type: 'button',
                label: '$',
                callback: 'donate',
                position: 'bottom2',
                bounds: { width: 32, height: 32 }
            }
        ]
    },

    charselect: {
        title: 'Select Character',
        width: 800,
        height: 600,
        windowPosition: 'GlobalCenter',
        ignoreComponents: ['X'],
        backgroundStyle: 'oak',
        components: [
            {
                type: 'button',
                label: 'Left',
                callback: 'selectLeft',
                bounds: { width: 350, height: 400 }  // Much larger to fill the space
            },
            {
                type: 'button',
                label: 'Right', 
                callback: 'selectRight',
                bounds: { width: 350, height: 400 }  // Much larger to fill the space
            },
            {
                type: 'button',
                label: 'longplay',
                callback: 'selectPlay',
                bounds: { width: 96, height: 32 }  // Specific size as requested
            }
        ]
    },

    patchnotes: {
        title: 'Patch Notes',
        width: 800,
        height: 600,
        windowPosition: 'GlobalCenter',
        backgroundStyle: 'wooden',
        components: []
    },
};