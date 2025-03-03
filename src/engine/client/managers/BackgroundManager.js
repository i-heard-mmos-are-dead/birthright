export class BackgroundManager {
    constructor(gameClient) {
        this.assetManager = gameClient.assetManager;
        this.dimensions = { width: 1920, height: 1080 }; // Default until load
        this.scale = 1;
        this.subscribers = new Set();
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        callback(this.dimensions, this.scale);
        return () => this.subscribers.delete(callback);
    }

    setDimensions(width, height) {
        this.dimensions = { width, height };
        this.notifySubscribers();
    }

    setScale(newScale) {
        this.scale = newScale;
        this.notifySubscribers();
    }

    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.dimensions, this.scale));
    }

    getDimensions() {
        return this.dimensions;
    }

    getScale() {
        return this.scale;
    }
}