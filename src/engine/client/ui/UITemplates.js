// UITemplates.js
export const SPRITESHEETS = {
    sproutlands: {
        // spritesheet props
        tilesPerRow: 56,
        tileSize: 16,

        // UI component pictures and refs to spritesheet
        // one dimension means square shape
        windows: { 
            wooden: {
                topLeft: 36,
                size: 5
            },
            oak: {
                topLeft: 357,
                size: 3
            }
        },

        buttons: {
            X: {
                unpressed: 2079,
                pressed: 2081,
                size: 2
            },
            '🏠': {
                unpressed: 1639,
                pressed: 1641,
                size: 2
            },
            C: {
                unpressed: 2191,
                pressed: 2193,
                size: 2
            },
            '🧑': {
                unpressed: 1859,
                pressed: 1861,
                size: 2
            },
            BL: {
                unpressed: 2639,
                pressed: 2641,
                size: 2
            },
            Z: {
                unpressed: 2303,
                pressed: 2305,
                size: 2
            },
            '⬇': {
                unpressed: 1183,
                pressed: 1185,
                size: 2
            },
            '←-': {
                unpressed: 1183,
                pressed: 1185,
                size: 2
            },
            '-→': {
                unpressed: 1187,
                pressed: 1189,
                size: 2
            },
            '▲': {
                unpressed: 1187,
                pressed: 1189,
                size: 2
            },
            '←': {
                unpressed: 1195,
                pressed: 1197,
                size: 2
            },
            '→': {
                unpressed: 1191,
                pressed: 1193,
                size: 2
            },
            '⏩': {
                unpressed: 1411,
                pressed: 1413,
                size: 2
            },
            '⏸️': {
                unpressed: 1299,
                pressed: 1301,
                size: 2
            },
            '▶️': {
                unpressed: 1303,
                pressed: 1305,
                size: 2
            },
            'longplay': {
                unpressed: 1199,
                pressed: 1205,
                size: {
                    width: 6,
                    height: 2
                }
            },
            '⚙️': {
                unpressed: 1407,
                pressed: 1409,
                size: 2
            },
            '⭐': {
                unpressed: 1747,
                pressed: 1749,
                size: 2
            },
            '!': {
                unpressed: 1519,
                pressed: 1521,
                size: 2
            },
            '$': {
                unpressed: 2307,
                pressed: 2309,
                size: 2
            },
            'power': {
                unpressed: 1863,
                pressed: 1865,
                size: 2
            },

        },

        sliders: {
            toggle: {
                on: {
                    ref: 491,
                    size: 2
                },
                off: {
                    ref: 493,
                    size: 2
                }
            }
        },

        chatBubbles: {
            basic: {
                topLeft: 2576,
                size: 3,
                pointer: {
                    offset: 1,
                    height: 1
                }
            }
        }
    }
};