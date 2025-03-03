export class CharSelectWindowRenderer {
    constructor(gameClient) {
        this.gameClient = gameClient;
        this.uiSheetReader = gameClient.uiSheetReader;
        this.animationManager = gameClient.animationManager;
        this.window = null;
        this.selectedCharacter = null;
    }

    render(window, ctx) {
        this.window = window;
        // First render the components
        window.components.forEach(component => {
            const index = window.components.indexOf(component);
            const effectiveHeight = window.height * 0.8;
            let componentX, componentY;
            
            if (index === 2) {  // Bottom button
                componentX = window.x + (window.width / 2);
                componentY = window.y + window.height - 40;
            } else {  // Left/Right buttons
                componentX = window.x + (index === 0 ? window.width * 0.25 : window.width * 0.75);
                componentY = window.y + window.titleHeight + (effectiveHeight / 2);
            }

            // Update component bounds
            component.bounds = {
                x: componentX,
                y: componentY,
                width: component.bounds.width,
                height: component.bounds.height
            };

            // Render the button
            if (component.type === 'button') {
                this.renderButton(ctx, component);
            }
        });
    }

    renderButton(ctx, component) {
        if (component.label === 'longplay') {
            // Only render the UI button for the bottom 'Play' button
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
                // Fallback rendering for play button only
                ctx.fillStyle = component.isPressed ? 'rgba(180,180,180,0.8)' : 'rgba(200,200,200,0.8)';
                ctx.fillRect(
                    component.bounds.x - (component.bounds.width/2),
                    component.bounds.y - (component.bounds.height/2),
                    component.bounds.width,
                    component.bounds.height
                );
            }
        } else {
            // For Left/Right character buttons
            const spriteName = component.label === 'Left' ? 'TheFemaleAdventurer' : 'TheAdventurer';
            const getAnimationType = (characterType) => {
                if (!this.selectedCharacter) return 'Sidle';
                return characterType === this.selectedCharacter ? 'Swalk' : 'Sidle';
            };
            
            const characterFrame = this.animationManager.requestAnimation(
                `charselect_${component.label}`,
                getAnimationType(spriteName),
                spriteName
            );
    
            if (characterFrame && characterFrame.complete) {
                // Calculate the maximum scale that will fit within the button bounds
                // while maintaining aspect ratio and using integer scaling
                const scaleX = Math.floor(component.bounds.width / characterFrame.width);
                const scaleY = Math.floor(component.bounds.height / characterFrame.height);
                const scale = Math.min(scaleX, scaleY);
    
                const scaledWidth = characterFrame.width * scale;
                const scaledHeight = characterFrame.height * scale;
    
                // Center the scaled image within the button bounds
                const centerX = component.bounds.x - (scaledWidth / 2);
                const centerY = component.bounds.y - (scaledHeight / 2);
    
                // Draw button outline based on hover state
                // Get current hover position from window

                const hoverPos = this.window?.hoverPosition;
                let isHovered = false;
                if (hoverPos) {
                    // Check if hover position is within button bounds
                    // Convert relative mouse position to absolute window space for comparison
                    const absoluteX = hoverPos.relX + this.window.x;
                    const absoluteY = hoverPos.relY + this.window.y;

                    isHovered = 
                        absoluteX >= (component.bounds.x - component.bounds.width/2) &&
                        absoluteX <= (component.bounds.x + component.bounds.width/2) &&
                        absoluteY >= (component.bounds.y - component.bounds.height/2) &&
                        absoluteY <= (component.bounds.y + component.bounds.height/2);
                }

                // Draw red outline if hovered, black if not
                ctx.strokeStyle = isHovered ? 'rgba(255,0,0,0.5)' : 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    component.bounds.x - (component.bounds.width/2),
                    component.bounds.y - (component.bounds.height/2),
                    component.bounds.width,
                    component.bounds.height
                );
    
                // Set up context for pixel-perfect scaling
                ctx.imageSmoothingEnabled = false;
                
                // Draw the scaled character
                ctx.drawImage(
                    characterFrame,
                    0, 0, characterFrame.width, characterFrame.height,
                    centerX, centerY, scaledWidth, scaledHeight
                );
            }
        }
    }

    left() {
        this.selectedCharacter = 'TheFemaleAdventurer';
    }
    
    right() {
        this.selectedCharacter = 'TheAdventurer';
    }
    
    play(closeWindowCallback) {
        if (!this.selectedCharacter) {
            console.log('[CharSelectRenderer] Please select a character first!');
            return;
        }
        
        // Initialize with selected character
        this.gameClient.networkManager.socket.emit('init', { character: this.selectedCharacter }, (initialState) => {
            initialState.character = this.selectedCharacter;
            this.gameClient.networkManager.socketId = initialState.id;
            this.gameClient.storeFacade.initializePlayer(initialState.id, initialState);
            
            // Close the window after successful initialization
            closeWindowCallback();
        });
    }
}