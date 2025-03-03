export class YAMLParser {
    constructor(yamlText) {
        
        // Storage for parsed data
        this.barrierLines = [];
        this.topZLines = [];
        this.staticAssets = [];
        this.animatedAssets = [];
        
        // Parse YAML immediately
        this._parseYAML(yamlText);
    }

    _parseYAML(yamlText) {
        if (!yamlText) {
            console.warn("YAMLParser: Empty YAML text provided");
            return;
        }
    
        try {
            const lines = yamlText.split('\n');
            let currentSection = null;
            let subSection = null;
            let currentPointsArray = null;
    
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
    
                // Main sections
                if (trimmedLine === 'paths:') {
                    currentSection = 'paths';
                    continue;
                }
                if (trimmedLine === 'assets:') {
                    currentSection = 'assets';
                    continue;
                }
    
                // Handle paths
                if (currentSection === 'paths') {
                    if (trimmedLine === 'barrierLine:') {
                        subSection = 'barrierLine';
                        continue;
                    }
                    if (trimmedLine === 'topZ:') {
                        subSection = 'topZ';
                        continue;
                    }
    
                    // Handle points array
                    if (trimmedLine.includes('- points:')) {
                        currentPointsArray = [];
                        if (subSection === 'barrierLine') {
                            this.barrierLines.push(currentPointsArray);
                        } else if (subSection === 'topZ') {
                            this.topZLines.push(currentPointsArray);
                        }
                        continue;
                    }
    
                    // Parse point coordinates
                    const pointMatch = trimmedLine.match(/- {x: (-?\d+), y: (-?\d+)}/);
                    if (pointMatch && currentPointsArray) {
                        const point = {
                            rawX: parseInt(pointMatch[1]),
                            rawY: parseInt(pointMatch[2])
                        };
                        currentPointsArray.push(point);
                    }
                }
    
                // Handle assets
                if (currentSection === 'assets') {
                    if (trimmedLine === 'static:') {
                        subSection = 'static';
                        continue;
                    }
                    if (trimmedLine === 'animations:') {
                        subSection = 'animations';
                        continue;
                    }
    
                    // Parse single-line asset
                    if (trimmedLine.startsWith('- {')) {
                        const assetData = trimmedLine.slice(3, -1); // Remove "- {" and "}"
                        const asset = {};
                    
                        // Extract coordinates
                        const coords = assetData.match(/x: (-?\d+), y: (-?\d+)/);
                        if (coords) {
                            asset.x = parseInt(coords[1]);
                            asset.y = parseInt(coords[2]);
                        }
                    
                        // Extract file name
                        const fileMatch = assetData.match(/file: "([^"]+)"/);
                        if (fileMatch) {
                            asset.file = fileMatch[1];
                        }
                    
                        // Extract depthLine if present
                        const depthMatch = assetData.match(/depthLine: (-?\d+)/);
                        if (depthMatch) {
                            asset.depthLine = parseInt(depthMatch[1]);
                        }
                    
                        // Extract layer if present
                        const layerMatch = assetData.match(/layer: (-?\d+)/);
                        if (layerMatch) {
                            asset.layer = parseInt(layerMatch[1]);
                        }
                    
                        if (asset.file) {
                            if (subSection === 'static') {
                                this.staticAssets.push(asset);
                            } else if (subSection === 'animations') {
                                this.animatedAssets.push(asset);
                            }
                        }
                    }
                }
            }
    
        } catch (error) {
            console.error("YAMLParser: Error parsing YAML:", error);
            throw error;
        }
    }

    generateYAML(barrierLines, editorBarrierLines, topZLines, editorTopZLines, staticAssets, animatedAssets, isAssetEditor = false) {        
        let yamlString = 'paths:\n';
        
        // Barrier lines (unchanged)
        yamlString += '  barrierLine:\n';
        [...barrierLines, ...editorBarrierLines].forEach(points => {
            yamlString += '    - points:\n';
            points.forEach(point => {
                yamlString += `        - {x: ${Math.round(point.rawX || point.x)}, y: ${Math.round(point.rawY || point.y)}}\n`;
            });
        });
        
        // TopZ lines (unchanged)
        yamlString += '  topZ:\n';
        [...topZLines, ...editorTopZLines].forEach(points => {
            yamlString += '    - points:\n';
            points.forEach(point => {
                yamlString += `        - {x: ${Math.round(point.rawX || point.x)}, y: ${Math.round(point.rawY || point.y)}}\n`;
            });
        });
        
        // Simplified Assets sections
        yamlString += 'assets:\n';
        yamlString += '  static:\n';
        staticAssets.forEach(asset => {
            if (!isAssetEditor) {
                yamlString += `    - {x: ${Math.round(asset.x)}, y: ${Math.round(asset.y)}, file: "${asset.file}"${asset.depthLine !== undefined ? `, depthLine: ${Math.round(asset.depthLine)}` : ''}}\n`;
            } else {
                yamlString += `    - {file: "${asset.file}", depthLine: ${Math.round(asset.depthLine)}}\n`;
            }
        });
    
        yamlString += '  animations:\n';
        animatedAssets.forEach(asset => {
            if (!isAssetEditor) {
                yamlString += `    - {x: ${Math.round(asset.x)}, y: ${Math.round(asset.y)}, file: "${asset.file}"}\n`;
            } else {
                yamlString += `    - {file: "${asset.file}"}\n`;
            }
        });
        
        return yamlString;
    }
}