export class PatchNotesWindowRenderer {
    constructor(gameClient) {
        this.gameClient = gameClient;
        this.entries = [];
        this.selectedEntryIndex = null;
        this.sidebarWidth = 200;
    }

    async loadPatchNotes() {
        if (!this.gameClient.networkManager) return;
        
        const patchNotes = await this.gameClient.networkManager.fetchPatchNotes();
        if (!patchNotes) return;

        console.log('Raw patch notes received:', patchNotes);

        this.entries = patchNotes.split('===ENTRY===')
            .filter(entry => entry.trim())
            .map(entry => {
                console.log('Processing entry:', entry);

                // Initialize accumulator objects for each field
                let currentField = null;
                const fields = {
                    date: '',
                    title: '',
                    subtitle: '',
                    text: ''
                };

                // Split into lines but preserve newlines within sections
                const lines = entry.split('\n');
                
                // Process each line
                lines.forEach(line => {
                    const trimmedLine = line.trim();
                    
                    // Check if this line is a field marker
                    if (trimmedLine.startsWith('[')) {
                        Object.keys(fields).forEach(field => {
                            if (trimmedLine.includes(`[${field.toUpperCase()}]`)) {
                                currentField = field;
                                // Remove the marker from the first line
                                const content = line.replace(`[${field.toUpperCase()}]`, '').trim();
                                if (content) {
                                    fields[field] += content;
                                }
                            }
                        });
                    } else if (currentField && trimmedLine) {
                        // If we're in a field and the line isn't empty, append it
                        fields[currentField] += (fields[currentField] ? ' ' : '') + trimmedLine;
                    }
                });

                console.log('Processed entry fields:', fields);
                return fields;
            });

        console.log('Final processed entries:', this.entries);
    }

    render(window, ctx) {
        if (this.entries.length === 0) {
            this.loadPatchNotes();
            return;
        }

        const topPadding = 30; // Added padding from title bar

        // Draw sidebar outline
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(
            window.x, 
            window.y + window.titleHeight + topPadding,
            this.sidebarWidth,
            window.height - window.titleHeight - topPadding
        );

        // Draw entry outlines in sidebar
        const entryHeight = 50;
        this.entries.forEach((entry, index) => {
            const y = window.y + window.titleHeight + topPadding + (index * entryHeight);
            ctx.strokeRect(window.x, y, this.sidebarWidth, entryHeight);

            // Draw preview text in sidebar
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px nokiafc22';
            
            // Calculate maximum width for text (sidebar width minus padding)
            const maxSidebarTextWidth = this.sidebarWidth - 20;
            const title = entry.title || '';
            let truncatedTitle = title;

            // Measure and truncate if needed
            const metrics = ctx.measureText(title);
            if (metrics.width > maxSidebarTextWidth) {
                for (let i = title.length; i > 0; i--) {
                    truncatedTitle = title.substring(0, i) + '...';
                    if (ctx.measureText(truncatedTitle).width <= maxSidebarTextWidth) {
                        break;
                    }
                }
            }

            const xPadding = 100;
            ctx.fillText(truncatedTitle, window.x + xPadding, y + 25);
        });

        // Handle hover detection
        if (window.hoverPosition) {
            const relY = window.hoverPosition.relY - topPadding;
            const hoveredIndex = Math.floor((relY - window.titleHeight) / entryHeight);
            
            if (hoveredIndex >= 0 && hoveredIndex < this.entries.length && 
                window.hoverPosition.relX <= this.sidebarWidth) {
                this.selectedEntryIndex = hoveredIndex;
            }
        }

        // Draw selected entry content
        if (this.selectedEntryIndex !== null) {
            const entry = this.entries[this.selectedEntryIndex];
            const padding = 20;
            
            let contentY = window.y + window.titleHeight + padding + topPadding;
            const contentX = window.x + 500;

            ctx.fillStyle = '#ffffff';
            
            // Title
            ctx.font = '16px nokiafc22';
            if (entry.title) {
                ctx.fillText(entry.title, contentX, contentY);
                contentY += 30;
            }

            // Date
            ctx.font = '14px nokiafc22';
            if (entry.date) {
                ctx.fillText(entry.date, contentX, contentY);
                contentY += 30;
            }

            // Text with word wrap
            if (entry.text) {
                console.log('Rendering text:', entry.text);
                ctx.font = '12px nokiafc22';
                const maxWidth = window.width - this.sidebarWidth - (padding * 3);
                const words = entry.text.split(' ');
                let line = '';

                words.forEach(word => {
                    const testLine = line + word + ' ';
                    const metrics = ctx.measureText(testLine);
                    
                    if (metrics.width > maxWidth) {
                        ctx.fillText(line, contentX, contentY);
                        contentY += 20;
                        line = word + ' ';
                    } else {
                        line = testLine;
                    }
                });
                
                ctx.fillText(line, contentX, contentY);
            }
        }
    }
}