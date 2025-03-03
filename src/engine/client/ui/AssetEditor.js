import { YAMLParser } from '../utils/YAMLParser.js';

export class AssetEditor {
   constructor(gameClient) {
        this.gameClient = gameClient;
        this.windowManager = gameClient.windowManager;
        this.window = null;
        this.assetName = null;
        this.image = null;
        this.active = false;
        this.mousePos = null;
        this.currentScale = 1; // Store current scale factor

        // line for Depth calcs
        this.depthLine = null;

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.backgroundColor = 'transparent';
        this.canvas.style.zIndex = '1000';
        this.canvas.style.display = 'none';
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');

        // Polygon data structures
        this.backgroundPolygons = []; // Red polygons
        this.foregroundPolygons = []; // Blue polygons
        this.currentPolygon = null;
        this.currentPolygonType = null; // 'background' or 'foreground'

        // Fixed coordinate versions
        this.fixedBackgroundPolygons = [];
        this.fixedForegroundPolygons = [];
        this.fixedCurrentPolygon = null;

        // Constants
        this.DOT_RADIUS = 3;
        this.MAX_REMOVE_DISTANCE = 5;
        this.TITLE_HEIGHT = 25;

        // Bind handlers
        this.handleMouseInput = this.handleMouseInput.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);

        // Start update loop
        this.startUpdateLoop();
    }

   activate(window, assetName) {
       if (this.active) {
           this.deactivate();
       }
       
       this.active = true;
       this.window = window;
       this.assetName = assetName;
       
       this.canvas.width = window.width;
       this.canvas.height = window.height;
       this.canvas.style.display = 'block';
       
       // Add event listeners only when active
       this.canvas.addEventListener('mousedown', this.handleMouseInput);
       this.canvas.addEventListener('mousemove', this.handleMouseMove);
       
       this.loadAndCenterImage(assetName);
   }

   deactivate() {
       // Remove event listeners when deactivating
       this.canvas.removeEventListener('mousedown', this.handleMouseInput);
       this.canvas.removeEventListener('mousemove', this.handleMouseMove);
       
       this.active = false;
       this.window = null;
       this.assetName = null;
       this.image = null;
       this.canvas.style.display = 'none';
       this.currentScale = 1;
   }

   downloadYaml() {
    console.log("AssetEditor: Starting YAML download for", this.assetName);

    const yamlParser = new YAMLParser("");
    
    const closedBackgroundPolygons = this.fixedBackgroundPolygons.filter(p => p.length >= 3);
    const closedForegroundPolygons = this.fixedForegroundPolygons.filter(p => p.length >= 3);

    console.log("AssetEditor: Preparing data", {
        backgroundPolygons: closedBackgroundPolygons.length,
        foregroundPolygons: closedForegroundPolygons.length,
        depthLine: Math.floor(this.depthLine / this.currentScale)
    });

    // Create static asset entry with depth line
    const imageHalfHeight = Math.floor(this.image.height / 2);
    const centeredDepthLine = Math.floor(this.depthLine / this.currentScale) - imageHalfHeight;
    console.log('Depth line YAML:', {
        raw: this.depthLine,
        scaled: Math.floor(this.depthLine / this.currentScale),
        imageHalfHeight,
        final: centeredDepthLine
    });
    
    const staticAsset = [{
        file: this.assetName,
        depthLine: centeredDepthLine
    }];

    const content = yamlParser.generateYAML(
        [], 
        closedBackgroundPolygons,
        [], 
        closedForegroundPolygons,
        staticAsset,
        [],
        true
    );

        console.log("AssetEditor: YAML generation complete");
        
        const blob = new Blob([content], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.assetName}.yaml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

   handleMouseMove(e) {
    if (!this.active) return;
 
    const rect = this.canvas.getBoundingClientRect();
    const rawY = e.clientY - rect.top;
       
       // Only show coordinates if below title bar
       if (rawY < this.TITLE_HEIGHT) {
           this.mousePos = null;
           return;
       }
       
       this.mousePos = {
           x: e.clientX - rect.left,
           y: rawY - this.TITLE_HEIGHT  // Subtract title height to make 0,0 start at content area
       };
   }

   handleMouseInput(e) {
    if (!this.active) return;
   
    console.log('Mouse input:', {x: e.clientX, y: e.clientY});
    const rect = this.canvas.getBoundingClientRect();
    const rawY = e.clientY - rect.top;
 
    if (e.ctrlKey && e.button === 0) {  // Ctrl + left click
        const clickY = rawY - this.TITLE_HEIGHT;
        console.log('AssetEditor: Setting depth line to Y:', clickY);
        this.depthLine = clickY;
        return;
    }

       // Ignore clicks in the title bar area
       if (rawY < this.TITLE_HEIGHT) return;
       
       const x = e.clientX - rect.left;
       const y = rawY - this.TITLE_HEIGHT;  // Adjust Y coordinate

       // Middle click - close current polygon if exists
       if (e.button === 1) {
           e.preventDefault();
           if (this.currentPolygon && this.currentPolygon.length > 0) {
               this.closeCurrentPolygon();
           }
           return;
       }

       // Check for dot removal first (inverted buttons)
       if (e.button === 0) { // Left click checks blue (foreground) dots
           if (this.removeDotIfNearby(x, y, 'foreground')) {
               return;
           }
       } else if (e.button === 2) { // Right click checks red (background) dots
           if (this.removeDotIfNearby(x, y, 'background')) {
               return;
           }
       }

       // If no dot was removed, add new dot
       const windowCenterX = Math.floor(this.window.width / 2);
       const windowCenterY = Math.floor((this.window.height - this.TITLE_HEIGHT) / 2);
       const fixedX = Math.floor((x - windowCenterX) / this.currentScale);
       const fixedY = Math.floor((y - windowCenterY) / this.currentScale);
       
       console.log('Adding point:', {
           raw: {x, y},
           windowCenter: {x: windowCenterX, y: windowCenterY},
           adjusted: {x: fixedX, y: fixedY}
       });
       
       if (e.button === 0) { // Left click - red/background
           if (this.currentPolygonType !== 'background') {
               this.startNewPolygon('background');
           }
           this.currentPolygon.push({ x, y });
           this.fixedCurrentPolygon.push({ x: fixedX, y: fixedY });
       } else if (e.button === 2) { // Right click - blue/foreground
           e.preventDefault();
           if (this.currentPolygonType !== 'foreground') {
               this.startNewPolygon('foreground');
           }
           this.currentPolygon.push({ x, y });
           this.fixedCurrentPolygon.push({ x: fixedX, y: fixedY });
       }
   }

   startNewPolygon(type) {
       this.currentPolygonType = type;
       this.currentPolygon = [];
       this.fixedCurrentPolygon = [];
       if (type === 'background') {
           this.backgroundPolygons.push(this.currentPolygon);
           this.fixedBackgroundPolygons.push(this.fixedCurrentPolygon);
       } else {
           this.foregroundPolygons.push(this.currentPolygon);
           this.fixedForegroundPolygons.push(this.fixedCurrentPolygon);
       }
   }

   closeCurrentPolygon() {
       if (!this.currentPolygon || this.currentPolygon.length < 3) return;
       this.currentPolygon.push({ ...this.currentPolygon[0] });
       this.fixedCurrentPolygon.push({ ...this.fixedCurrentPolygon[0] });
       this.startNewPolygon(this.currentPolygonType);
   }

   removeDotIfNearby(x, y, type) {
       const polygons = type === 'background' ? this.backgroundPolygons : this.foregroundPolygons;
       const fixedPolygons = type === 'background' ? this.fixedBackgroundPolygons : this.fixedForegroundPolygons;
       
       for (let polyIndex = 0; polyIndex < polygons.length; polyIndex++) {
           const polygon = polygons[polyIndex];
           const fixedPolygon = fixedPolygons[polyIndex];
           for (let dotIndex = 0; dotIndex < polygon.length; dotIndex++) {
               const dot = polygon[dotIndex];
               const distance = Math.sqrt(Math.pow(dot.x - x, 2) + Math.pow(dot.y - y, 2));
               
               if (distance <= this.MAX_REMOVE_DISTANCE) {
                   polygon.splice(dotIndex, 1);
                   fixedPolygon.splice(dotIndex, 1);
                   if (polygon.length === 0) {
                       polygons.splice(polyIndex, 1);
                       fixedPolygons.splice(polyIndex, 1);
                       if (polygon === this.currentPolygon) {
                           this.currentPolygon = null;
                           this.fixedCurrentPolygon = null;
                           this.currentPolygonType = null;
                       }
                   }
                   return true;
               }
           }
       }
       return false;
   }

   startUpdateLoop() {
       this.updateLoopId = setInterval(() => {
           if (this.active) {
               this.updatePosition();
               this.redraw();
           }
       }, 1000 / 60);
   }

   updatePosition() {
       if (!this.active || !this.window) return;
       
       const newX = this.window.x + 'px';
       const newY = this.window.y + 'px';
       
       if (this.canvas.style.left !== newX || this.canvas.style.top !== newY) {
           this.canvas.style.left = newX;
           this.canvas.style.top = newY;
       }
   }

   loadAndCenterImage(assetName) {
    if (!this.active || !this.window) return;
    
    const subtype = assetName.split('_')[0];  // Get everything before first _
    
    if (subtype === 'housing') {
        this.image = this.gameClient.assetManager.loadHouse(assetName);
    } else {
        this.image = this.gameClient.assetManager.loadAsset(assetName);
    }

    this.image.onload = () => {
        if (!this.active) return;
        console.log('Setting initial line position to image center');
        
        const availableHeight = this.window.height - this.TITLE_HEIGHT;
        const scaleX = Math.floor(this.window.width / this.image.width);
        const scaleY = Math.floor(availableHeight / this.image.height);
        const scale = Math.max(1, Math.min(scaleX, scaleY));
        
        this.depthLine = Math.floor((this.image.height * scale) / 2);
        console.log('AssetEditor: Set initial depth line to center:', this.depthLine);
        this.redraw();
    };
}

   redraw() {
       if (!this.active || !this.window || !this.image?.complete) return;

       this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
       
       // Calculate image scaling and position
       const availableHeight = this.window.height - this.TITLE_HEIGHT;
       const scaleX = Math.floor(this.window.width / this.image.width);
       const scaleY = Math.floor(availableHeight / this.image.height);
       const scale = Math.max(1, Math.min(scaleX, scaleY));
       
       // Store current scale for coordinate conversion
       this.currentScale = scale;
       
       const scaledWidth = this.image.width * scale;
       const scaledHeight = this.image.height * scale;
       
       const x = Math.floor((this.window.width - scaledWidth) / 2);
       const y = Math.floor(this.TITLE_HEIGHT + (availableHeight - scaledHeight) / 2);
       
       this.ctx.imageSmoothingEnabled = false;
       this.ctx.drawImage(this.image, x, y, scaledWidth, scaledHeight);
       
       // Draw polygons on top
       this.drawPolygons(this.backgroundPolygons, 'rgba(255, 0, 0, 0.5)');
       this.drawPolygons(this.foregroundPolygons, 'rgba(0, 0, 255, 0.5)');

        // Depth line
       if (this.depthLine !== null) {
            const centerX = this.canvas.width / 2;
            
            // Draw line
            this.ctx.beginPath();
            this.ctx.strokeStyle = 'black';
            this.ctx.moveTo(0, this.depthLine + this.TITLE_HEIGHT);
            this.ctx.lineTo(this.canvas.width, this.depthLine + this.TITLE_HEIGHT);
            this.ctx.stroke();
        
            // Draw center dot
            this.ctx.beginPath();
            this.ctx.fillStyle = 'black';
            this.ctx.arc(centerX, this.depthLine + this.TITLE_HEIGHT, this.DOT_RADIUS, 0, Math.PI * 2);
            this.ctx.fill();
        
            // Draw Y position
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = 'black';
            const imageHalfHeight = Math.floor(this.image.height / 2);
            const scaledY = Math.floor(this.depthLine / this.currentScale) - imageHalfHeight;
            this.ctx.fillText(`Y: ${scaledY}`, 10, this.depthLine + this.TITLE_HEIGHT - 5);
        }

       // Draw mouse coordinates if we have them
       if (this.mousePos) {
            this.ctx.font = '10px Arial';
            // Calculate relative to window center instead of image size
            const windowCenterX = Math.floor(this.window.width / 2);
            const windowCenterY = Math.floor((this.window.height - this.TITLE_HEIGHT) / 2);
            const adjustedX = Math.floor((this.mousePos.x - windowCenterX) / scale);
            const adjustedY = Math.floor((this.mousePos.y - windowCenterY) / scale);
            const text = `${adjustedX},${adjustedY}`;
           
           this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
           this.ctx.fillRect(
               this.mousePos.x + 10, 
               this.mousePos.y + this.TITLE_HEIGHT - 15,
               this.ctx.measureText(text).width + 4, 
               12
           );
           
           this.ctx.fillStyle = 'white';
           this.ctx.fillText(text, this.mousePos.x + 12, this.mousePos.y + this.TITLE_HEIGHT - 5);
       }
   }

   drawPolygons(polygons, color) {
       polygons.forEach(polygon => {
           // Draw lines only if we have 2 or more points
           if (polygon.length >= 2) {
               this.ctx.beginPath();
               this.ctx.strokeStyle = color;
               this.ctx.lineWidth = 2;
               
               this.ctx.moveTo(polygon[0].x, polygon[0].y + this.TITLE_HEIGHT);
               for (let i = 1; i < polygon.length; i++) {
                   this.ctx.lineTo(polygon[i].x, polygon[i].y + this.TITLE_HEIGHT);
               }
               this.ctx.stroke();
           }

           // Always draw dots
           this.ctx.fillStyle = color;
           polygon.forEach(dot => {
               this.ctx.beginPath();
               this.ctx.arc(dot.x, dot.y + this.TITLE_HEIGHT, this.DOT_RADIUS, 0, Math.PI * 2);
               this.ctx.fill();
           });
       });
   }

   cleanup() {
       clearInterval(this.updateLoopId);
       this.deactivate();  // This now handles removing event listeners
       document.body.removeChild(this.canvas);
       this.image = null;
       this.ctx = null;
       this.canvas = null;
       this.window = null;
   }

   resetEditor() {
        console.log('[AssetEditor] Resetting editor state');
        this.backgroundPolygons = [];
        this.foregroundPolygons = [];
        this.fixedBackgroundPolygons = [];
        this.fixedForegroundPolygons = [];
        this.currentPolygon = null;
        this.fixedCurrentPolygon = null;
        this.currentPolygonType = null;
        this.depthLine = Math.floor((this.image.height * this.currentScale) / 2);
    }

    handleDownload() {
        this.downloadYaml();
    }
}