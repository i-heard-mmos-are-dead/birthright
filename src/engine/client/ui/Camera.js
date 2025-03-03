export class Camera {
    constructor(x = 0, y = 0) {
        this.backgroundManager = null;
        this.x = x;
        this.y = y;
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
        this.zoom = 3;
        this.zoomSubscribers = new Set();
        this.mouseX = 0;
        this.mouseY = 0;
        this.isTrackingMouse = false;
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.mapBounds = null;

        // For when player is near map edge
        this.offsetX = 0;  // Add this
        this.offsetY = 0;  // Add this
    }
    
    screenToWorld(screenX, screenY) {
        const worldX = (screenX - (this.screenWidth / 2)) - this.x;
        const worldY = (screenY - this.screenHeight / 2) - this.y;
        return { x: worldX, y: worldY };
    }

    updateScreenSize() {
        const oldWidth = this.screenWidth;
        const oldHeight = this.screenHeight;
        this.screenWidth = window.innerWidth;
        this.screenHeight = window.innerHeight;
    }

    startTrackingMouse() {
        if (!this.isTrackingMouse) {
            window.addEventListener('mousemove', this.handleMouseMove);
            this.isTrackingMouse = true;
        }
    }

    stopTrackingMouse() {
        if (this.isTrackingMouse) {
            window.removeEventListener('mousemove', this.handleMouseMove);
            this.isTrackingMouse = false;
        }
    }

    handleMouseMove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    renderCursorPosition(ctx) {
        if (!this.isTrackingMouse) return;
        
        const worldPos = this.screenToWorld(this.mouseX, this.mouseY);
        
        ctx.save();
        const drawOutlinedText = (text, x, y) => {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
            ctx.strokeText(text, x, y);
            ctx.fillStyle = 'white';
            ctx.fillText(text, x, y);
        };
    
        ctx.font = '12px monospace';
        
        const adjustedX = this.mouseX - (this.x + ctx.canvas.width/2);
        const adjustedY = this.mouseY - (this.y + ctx.canvas.height/2);
        
        const text = `Screen: (${Math.round(this.mouseX)}, ${Math.round(this.mouseY)})
        World: (${Math.round(worldPos.x/this.zoom)}, ${Math.round(worldPos.y/this.zoom)})`;
        
        drawOutlinedText(text, adjustedX, adjustedY - 25);
        ctx.restore();
    }

    // Am I even using this anywhere? If I am I really shouldn't be this is trash
    subscribeToZoom(callback) {
        this.zoomSubscribers.add(callback);
        return () => {
            this.zoomSubscribers.delete(callback);
        };
    }

    setZoom(newZoom) { 
        // Calculate world coordinates of current center, accounting for offset
        const centerX = -this.x/this.zoom + this.offsetX;
        const centerY = -this.y/this.zoom + this.offsetY;
    
        this.zoom = newZoom;
        
        // Pass world coordinates to moveToPosition
        this.moveToPosition(centerX, centerY);
    }

    moveToPosition(x, y) {
        let mapBounds = this.mapBounds;
        if (!mapBounds && this.backgroundManager) {
            mapBounds = this.backgroundManager.getDimensions();
        }
    
        if (!mapBounds) {
            const scaledX = x * this.zoom;
            const scaledY = y * this.zoom;
            this.x = scaledX;
            this.y = scaledY;
            this.offsetX = 0;
            this.offsetY = 0;
            return;
        }
    
        const visibleWidth = this.screenWidth / this.zoom;
        const visibleHeight = this.screenHeight / this.zoom;
        const maxX = (mapBounds.width / 2) - (visibleWidth / 2);
        const maxY = (mapBounds.height / 2) - (visibleHeight / 2);
        
        const clampedX = Math.max(-maxX, Math.min(maxX, x));
        const clampedY = Math.max(-maxY, Math.min(maxY, y));
        
        // Store the offset between desired and clamped position
        this.offsetX = x - clampedX;
        this.offsetY = y - clampedY;
        
        const finalX = -clampedX * this.zoom;
        const finalY = -clampedY * this.zoom;
        
        this.x = finalX;
        this.y = finalY;
    }

    setBackgroundManager(backgroundManager) {
        this.backgroundManager = backgroundManager;
    }
}