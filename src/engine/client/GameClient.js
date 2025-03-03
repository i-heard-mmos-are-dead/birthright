import { InputManager } from './managers/InputManager.js';
import { RenderManager } from './managers/RenderManager.js';
import { NetworkManager } from './managers/NetworkManager.js';
import { AssetManager } from './managers/AssetManager.js';
import { WindowManager } from './managers/WindowManager.js';
import { MovementManager } from './managers/MovementManager.js';
import { BackgroundManager } from './managers/BackgroundManager.js';
import { LevelManager } from './managers/LevelManager.js';
import { ChatManager } from './managers/ChatManager.js';
import { AnimationManager } from './managers/AnimationManager.js';
import { WindowRenderer } from './ui/WindowRenderer.js';
import { CharSelectWindowRenderer } from './ui/WindowRenderers/CharSelectWindow.js';
import { PatchNotesWindowRenderer } from './ui/WindowRenderers/PatchNotesWindow.js';
import { StoreFacade } from './store/facade.js';
import { SceneTree } from './managers/SceneTree.js';
import { Camera } from './ui/Camera.js';
import { UISheetReader } from './ui/UISheetReader.js';
import { CollisionSystem } from './utils/CollisionSystem.js';

export class Client {
    constructor(config) {
        this.config = config;
        this.canvas = document.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        if (this.config.mode === 'DEV') {
            console.log(`[${new Date().toISOString()}] [GameClient.js] - Initializing client with config:`, config);
        }
        
        this.patchNotesRenderer = new PatchNotesWindowRenderer(this);
        this.camera = new Camera();
        this.storeFacade = new StoreFacade(this);
        this.assetManager = new AssetManager(this);
        this.uiSheetReader = new UISheetReader(this);
        this.windowRenderer = new WindowRenderer(this);
        this.backgroundManager = new BackgroundManager(this);
        this.levelManager = new LevelManager(this)
        this.movementManager = new MovementManager(this);
        this.networkManager = new NetworkManager(this);
        this.chatManager = new ChatManager(this);
        this.networkManager.chatManager = this.chatManager;
        this.chatManager.networkManager = this.networkManager;
        this.storeFacade.networkManager = this.networkManager;
        this.collisionSystem = new CollisionSystem(this);
        this.sceneTree = new SceneTree(this);
        this.movementManager.sceneTree = this.sceneTree
        this.chatManager.sceneTree = this.sceneTree
        this.windowManager = new WindowManager(this); 
        this.animationManager = new AnimationManager(this);
        this.charSelectRenderer = new CharSelectWindowRenderer(this);
        this.sceneTree.animationManager = this.animationManager;
        this.windowManager.animationManager = this.animationManager;
        this.windowRenderer.animationManager = this.animationManager;
        this.inputManager = new InputManager(this);
        this.renderManager = new RenderManager(this);
        this.camera.backgroundManager = this.backgroundManager;
        this.start();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.config.mode === 'DEV') {
            console.log(`[${new Date().toISOString()}] [GameClient.js] - Canvas resized to:`, 
                {width: this.canvas.width, height: this.canvas.height});
        }
    }
    
    start() {
        if (this.config.mode === 'DEV') {
            console.log(`[${new Date().toISOString()}] [GameClient.js] - Starting game loop`);
        }
        
        const gameLoop = () => {
            this.renderManager.render();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }
}