export class ChatWindowRenderer {
    constructor(uiSheetReader) {
        this.uiSheetReader = uiSheetReader;
        this.textFont = '10px "nokiafc22"';
    }

    render(window, ctx) {
        // Main chat background - now using full dimensions
        // This background should be handled more generally but WHATEVER
        const background = this.uiSheetReader.getWindowBackground('oak', 'sproutlands', 
            window.width, 
            window.height
        );
        
        if (background) {
            // Calculate centering offsets
            const xOffset = (window.width - background.width) / 2;
            const yOffset = (window.height - background.height) / 2;
            
            ctx.drawImage(background, 
                window.x + xOffset, 
                window.y + yOffset,
            );
        }
        
        // Draw semi-transparent background for text input area
        const inputAreaGradient = ctx.createLinearGradient(
            window.x + 5,
            window.y + window.height - 30,
            window.x + 5,
            window.y + window.height - 5
        );
        inputAreaGradient.addColorStop(0, 'rgba(76, 61, 87, 0.25)');  // Light purplish, more transparent
        inputAreaGradient.addColorStop(1, 'rgba(59, 45, 68, 0.35)');  // Slightly darker purple, bit less transparent

        ctx.fillStyle = inputAreaGradient;

        // Draw rounded rectangle
        const radius = 6;  // Border radius
        const x = window.x + 5;
        const y = window.y + window.height - 30;
        const width = window.width - 10;
        const height = 25;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.fill();

        // Draw all text directly
        ctx.fillStyle = '#FFFFFF';
        ctx.font = this.textFont;
        ctx.textAlign = 'left';
        
        // Draw messages
        const maxCharsPerLine = 35;
        let yOffset = window.titleHeight + 20;
        
        window.chatManager.getChatContent().forEach((message) => {
            // Break message into lines
            for (let i = 0; i < message.length; i += maxCharsPerLine) {
                const line = message.substring(i, i + maxCharsPerLine);
                ctx.fillText(line, window.x + 10, window.y + yOffset);
                yOffset += 20;
            }
        });
    
        // Draw navigation arrows if needed
        const totalPages = window.chatManager.getTotalPages();
        if (totalPages > 1) {
            const arrowX = window.x + window.width - 20;
            
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText('▲', arrowX, window.y + window.titleHeight + 20);
            ctx.fillText('▼', arrowX, window.y + window.height - 40);
            
            window.upArrowBounds = {
                x: arrowX,
                y: window.y + window.titleHeight + 5,
                width: 20,
                height: 20
            };
            
            window.downArrowBounds = {
                x: arrowX,
                y: window.y + window.height - 55,
                width: 20,
                height: 20
            };
        }
        


        // Draw preview
        const preview = window.chatManager.getPreview();
        ctx.font = this.textFont;

        ctx.font = this.textFont;
    
        // Split preview into lines
        const lines = [];
        for (let i = 0; i < preview.length; i += maxCharsPerLine) {
            lines.push(preview.substring(i, i + maxCharsPerLine));
        }
    
        // Always have at least an empty line for preview box
        const lastLine = lines.length > 0 ? lines[lines.length - 1] : '';
    
        // If there's a selection, draw the highlight first
        const selection = window.chatManager.getSelection();
        if (selection) {
            const lineStartIndex = (lines.length - 1) * maxCharsPerLine;
            const adjustedStart = Math.max(0, selection.start - lineStartIndex);
            const adjustedEnd = Math.min(maxCharsPerLine, selection.end - lineStartIndex);
            
            if (adjustedEnd > 0 && adjustedStart < maxCharsPerLine) {
                const beforeSelection = lastLine.substring(0, adjustedStart);
                const selectedText = lastLine.substring(adjustedStart, adjustedEnd);
                
                const beforeWidth = ctx.measureText(beforeSelection).width;
                const selectionWidth = ctx.measureText(selectedText).width;
    
                // Draw selection highlight
                ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
                ctx.fillRect(
                    window.x + 10 + beforeWidth,
                    window.y + window.height - 23,
                    selectionWidth,
                    16
                );
            }
        }
    
        // Draw the text if it exists
        ctx.fillStyle = '#FFFFFF';
        if (lastLine) {
            ctx.fillText(lastLine, window.x + 10, window.y + window.height - 10);
        }
    
        // Draw cursor if typing - modified to work with empty text
        if (window.chatManager.isTyping) {
            const cursorLine = Math.floor(window.chatManager.cursorPosition / maxCharsPerLine);
            const cursorPosInLine = window.chatManager.cursorPosition % maxCharsPerLine;
            
            if (cursorLine === Math.max(0, lines.length - 1)) {
                const cursorText = lastLine.substring(0, cursorPosInLine);
                const cursorX = ctx.measureText(cursorText).width;
                
                if (Math.floor(Date.now() / 530) % 2 === 0) {
                    ctx.fillRect(
                        window.x + 10 + cursorX,
                        window.y + window.height - 23,
                        2,
                        16
                    );
                }
            }
        }
    }
}