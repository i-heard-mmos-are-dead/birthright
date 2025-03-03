import { ChatWindowRenderer } from './WindowRenderers/ChatWindow.js';
import { AssetsWindowRenderer } from './WindowRenderers/AssetsWindow.js';
import { CharSelectWindowRenderer } from './WindowRenderers/CharSelectWindow.js';

// this file is a disaster, revamp soon pls ty

export class WindowRenderer {
    constructor(gameClient) {
        this.gameClient = gameClient
        this.assetManager = gameClient.assetManager;
        this.animationManager = null;
        this.uiSheetReader = gameClient.uiSheetReader;
        this.assetsRenderer = null;
        this.charSelectRenderer = null;
    }

    // Main render method that contains all the current rendering logic
    render(window, ctx) {
        // Try to render custom background first
        if (window.backgroundStyle !== 'transparent') {
            if (window.backgroundStyle) {
                const bgImage = this.uiSheetReader.getWindowBackground(
                    window.backgroundStyle,
                    'sproutlands',
                    window.width,
                    window.height
                );
                if (bgImage && bgImage.complete) {
                    // Calculate center position
                    const xOffset = window.x + (window.width - bgImage.width) / 2;
                    const yOffset = window.y + (window.height - bgImage.height) / 2;
                    
                    ctx.drawImage(bgImage, 
                        xOffset,
                        yOffset,
                        bgImage.width,
                        bgImage.height
                    );
                } else {
                    // Fallback to default if image isn't loaded
                    this.renderDefaultBackground(window, ctx);
                }
            } else {
                // No custom background, render default
                this.renderDefaultBackground(window, ctx);
            }
        }
        
        //////////////////////////////////////////////////////////
        // Special cases that were too long to leave in this main window renderer
        if (window.type === 'chat' && window.chatManager) {
            const chatRenderer = new ChatWindowRenderer(this.uiSheetReader);
            chatRenderer.render(window, ctx);
        }

        if (window.type === 'assets') {
            if (!this.assetsRenderer && this.animationManager) {
                this.assetsRenderer = new AssetsWindowRenderer(this.assetManager, this.uiSheetReader, this.animationManager);
            }
            if (this.assetsRenderer) {
                this.assetsRenderer.render(window, ctx);
            }
        }

        if (window.type === 'charselect') {
            if (this.gameClient.charSelectRenderer) {
                this.gameClient.charSelectRenderer.render(window, ctx);
            }
            
            return;
        }

        if (window.type === 'patchnotes') {
            if (this.gameClient.patchNotesRenderer) {
                console.log('[WindowRenderer] Delegating to PatchNotesRenderer');
                this.gameClient.patchNotesRenderer.render(window, ctx);
            } else {
                console.warn('[WindowRenderer] PatchNotesRenderer not found');
            }
        }

        //////////////////////////////////////////////////////////
        
        // Draw window title
        ctx.fillStyle = 'white';
        ctx.font = '12px "Early GameBoy"';
        ctx.textAlign = 'center';
        ctx.fillText(window.getTitle(), window.x + (window.width/2), window.y + 17);
        
        // Component rendering
        let yOffset = window.titleHeight + 20;
        window.components.forEach(component => {
        let componentX, componentY;
            
            // Position calculation
            if (component.position === 'titleBar') {
                componentX = window.x + window.width - (component.bounds.width/2);
                componentY = window.y + (component.bounds.height/2);
            } else if (component.position === 'titleBarLeft') {
                // Find how many titleBarLeft buttons came before this one
                const titleBarLeftIndex = window.components
                    .filter(c => c.position === 'titleBarLeft')
                    .indexOf(component);
                
                const offset = titleBarLeftIndex * (component.bounds.width + 4); // width + padding
                componentX = window.x + (component.bounds.width/2) + 2 + offset;
                componentY = window.y + (component.bounds.height/2) + 2;
                
            }
    
            else if (window.type === 'animations') {
                if (component.type === 'animationDisplay') {
                    componentX = window.x + 10;
                    componentY = window.y;
                }
                else {
                    const PADDING_BETWEEN_BUTTONS = 5; // Fixed padding between buttons
                    
                    // Quarter positions for button columns
                    const leftX = window.x + (window.width * 0.1);
                    const middleX = window.x + (window.width * 0.5);
                    const rightX = window.x + (window.width * 0.9);
            
                    if (component.position === 'midBottomLeft') {
                        componentX = middleX - (component.bounds.width/2) - PADDING_BETWEEN_BUTTONS;
                        componentY = window.y + window.height - 15;
                    }
                    else if (component.position === 'midBottomRight') {
                        componentX = middleX + (component.bounds.width/2) + PADDING_BETWEEN_BUTTONS;
                        componentY = window.y + window.height - 15;
                    }
                    else {
                        const posMatch = component.position.match(/(left|right)(Top|Bottom)(\d+)?/);
                        if (posMatch) {
                            const [_, side, vPos, num] = posMatch;
                            const stackIndex = num ? parseInt(num) - 1 : 0;
                            
                            componentX = side === 'left' ? leftX : rightX;
                            
                            const buttonStackOffset = (component.bounds.height + PADDING_BETWEEN_BUTTONS) * stackIndex;
                            
                            if (vPos === 'Top') {
                                componentY = window.y + window.titleHeight + 35 + buttonStackOffset;
                            } else if (vPos === 'Bottom') {
                                componentY = window.y + window.height - 15 - buttonStackOffset;
                            }
                        }
                    }
                }
            }
    
            else if (window.type === 'settings') {
                // Position all interactive components on the right
                if (component.type === 'slider' || component.type === 'choosebackground') {
                    componentX = window.x + window.width - 70;
                    componentY = window.y + yOffset + 10; // constant - offset from title bar
                    
                    // Draw label on the left side
                    ctx.fillStyle = 'white';
                    ctx.font = '12px "nokiafc22"';
                    ctx.textAlign = 'left';
                    ctx.fillText(component.label, window.x + 20, componentY);
                } else {
                    componentX = window.x + 20;
                    componentY = window.y + yOffset;
                }
                yOffset += 40;
            }
            else if (window.type === 'editor') {
                const initialSpacing = 0;
                const buttonIndex = window.components.indexOf(component);
                
                componentX = window.x + (window.width / 2);
                componentY = window.y + window.titleHeight + initialSpacing + 
                            (buttonIndex * component.bounds.height);
            }

            else if (window.type === 'assets') {
                if (component.type === 'assetGrid') {
                    const gridWidth = component.bounds.width;
                    const windowCenterX = window.x + (window.width / 2);
                    componentX = windowCenterX - (gridWidth / 2);
                    componentY = window.y;
                }
                else if (component.type === 'button') {
                    const buttonRightPadding = 5;
                    const buttonIndex = window.components.indexOf(component) - 1;
                    
                    componentX = window.x + window.width - component.bounds.width - buttonRightPadding;
                    componentY = window.y + window.titleHeight + 50 + (buttonIndex * (component.bounds.height + 5));
                }
            }

            else if (window.type === 'ui_buttons') {
                componentX = window.x + 16;  // Half of the button width (32/2)
                if (component.position === 'top') {
                    componentY = window.y + 16;  // First button
                } else if (component.position === 'middle') {
                    componentY = window.y + 48;  // Second button
                } else if (component.position === 'bottom') {
                    componentY = window.y + 80;  // Third button
                } else if (component.position === 'bottom2') {
                    componentY = window.y + 112;  // Fourth button
                }
            }

            else {
                componentX = window.x + 120;
                componentY = window.y + yOffset;
                yOffset += 40;
            }
    
            // Update component bounds
            component.bounds = {
                x: componentX,
                y: componentY,
                width: component.bounds.width,
                height: component.bounds.height
            };
    
            // Draw component label if needed
            if (component.label && !['assetGrid', 'button', 'slider','animationDisplay'].includes(component.type) && window.type !== 'settings') {
                ctx.fillStyle = 'white';
                ctx.font = '14px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(component.label, window.x + 20, componentY + 15);
            }
    
            // Render the component
            if (component.type === 'slider') {
                this.renderSlider(ctx, component, componentX, componentY);
            } else if (component.type === 'button') {
                this.renderButton(ctx, component, componentX, componentY);
            } else if (component.type === 'animationDisplay') {
                this.renderAnimationDisplay(ctx, component, componentX, componentY);
            } else if (component.type === 'assetDisplay') {
                this.renderAssetDisplay(ctx, component, componentX, componentY);
            }
        });
    }

    renderDefaultBackground(window, ctx) {
        ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        ctx.fillRect(window.x, window.y + window.titleHeight, window.width, window.height - window.titleHeight);
        
        ctx.fillStyle = 'rgba(60, 60, 60, 0.9)';
        ctx.fillRect(window.x, window.y, window.width, window.titleHeight);
    }

    renderButton(ctx, component) {
        const buttonImage = this.uiSheetReader.getButton(
            component.label, 
            component.isPressed,
            'sproutlands',
            component.bounds.width,
            component.bounds.height
        );

        if (buttonImage && buttonImage.complete) {
            const centerX = component.bounds.x - (component.bounds.width / 2);
            const centerY = component.bounds.y - (component.bounds.height / 2);
            ctx.drawImage(buttonImage, centerX, centerY);
        } else {
            // Fallback to existing button rendering
            ctx.fillStyle = component.isPressed ? 'rgba(180,180,180,0.8)' : 'rgba(200,200,200,0.8)';
            ctx.fillRect(
                component.bounds.x - (component.bounds.width/2),
                component.bounds.y - (component.bounds.height/2),
                component.bounds.width,
                component.bounds.height
            );
            
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                component.label,
                component.bounds.x,
                component.bounds.y
            );
        }
    }

    renderSlider(ctx, component, x, y) {
        const sliderImage = this.uiSheetReader.getSlider(
            component.value,
            'sproutlands',
            component.bounds.width,
            component.bounds.height
        );
    
        if (sliderImage && sliderImage.complete) {
            const centerX = x - (sliderImage.width / 2);
            const centerY = y - (sliderImage.height / 2);
            ctx.drawImage(sliderImage, centerX, centerY);
        } else {
            // Fallback rendering if image fails to load
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 60;
            tempCanvas.height = 30;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Move origin to center of temp canvas
            const offsetX = 5;
            const offsetY = 5;
            
            // Draw toggle background
            const width = 40;
            const height = 20;
            tempCtx.fillStyle = 'rgba(100, 100, 100, 0.8)';
            tempCtx.roundRect(offsetX, offsetY, width, height, height/2);
            tempCtx.fill();
        
            // Draw toggle handle
            const handleSize = height - 4;
            const handleX = component.value ? offsetX + width - handleSize - 2 : offsetX + 2;
            tempCtx.fillStyle = component.value ? '#4CAF50' : '#f44336';
            tempCtx.beginPath();
            tempCtx.arc(handleX + handleSize/2, offsetY + height/2, handleSize/2, 0, Math.PI * 2);
            tempCtx.fill();
            
            // Copy to main canvas
            ctx.drawImage(tempCanvas, x-5, y-5);
        }
    }

    renderAnimationDisplay(ctx, component, x, y) {
        const playerState = this.animationManager.getOrCreatePlayerState('animationswindow');
        const sprite = this.animationManager.requestAnimation('animationswindow', playerState.currentActionState, playerState.currentSprite);
        
        if (sprite && sprite.complete) {
            // Set maximum dimensions we want for the display
            const MAX_WIDTH = 100;
            const MAX_HEIGHT = 100;
            
            // Calculate scale while maintaining aspect ratio
            const scaleX = MAX_WIDTH / sprite.width;
            const scaleY = MAX_HEIGHT / sprite.height;
            const scale = Math.min(scaleX, scaleY);
            
            const scaledWidth = sprite.width * scale;
            const scaledHeight = sprite.height * scale;
            
            // Center the sprite in the available space
            const centerX = x + (component.bounds.width - scaledWidth) / 2;
            const centerY = y + (component.bounds.height - scaledHeight) / 2;
            
            // Draw sprite with pixel art settings
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(sprite, centerX, centerY, scaledWidth, scaledHeight);
            ctx.imageSmoothingEnabled = true;
    
            // Draw thin border around sprite
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.strokeRect(centerX, centerY, scaledWidth, scaledHeight);
    
            // Calculate TPS and FPS
            const tps = 1000 / this.animationManager.currentTickInterval;
            const fps = tps / this.animationManager.ticksPerFrame;
    
            // Draw animation name and stats
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            
            // Animation name
            ctx.font = '12px nokiafc22';
            ctx.fillText(
                playerState.currentActionState,
                centerX + scaledWidth / 2,
                centerY + scaledHeight + 20
            );
            
            // Stats
            ctx.font = '6px nokiafc22';
            ctx.fillText(
                `TPS: ${tps.toFixed(1)} | TPF: ${this.animationManager.ticksPerFrame} | FPS: ${fps.toFixed(1)}`,
                centerX + scaledWidth / 2,
                centerY + scaledHeight + 35
            );
        }
    }

    renderAssetDisplay(ctx, component, x, y) {
        if (!this.window.imageUrl) return;
        
        const image = this.assetManager.loadHouse(this.window.imageUrl);
        if (image && image.complete) {
            const scale = 3;
            const scaledWidth = image.width * scale;
            const scaledHeight = image.height * scale;
            
            const centerX = x + (component.bounds.width - scaledWidth) / 2;
            const centerY = y + (component.bounds.height - scaledHeight) / 2;
            
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(image, centerX, centerY, scaledWidth, scaledHeight);
            ctx.imageSmoothingEnabled = true;
        }
    }

}