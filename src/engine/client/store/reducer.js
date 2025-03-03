const initialState = {
    players: {},        // Local player + synced others
    serverSelf: null,   // Server's view of local player
    serverPlayers: {},  // Server's view of others
    movements: {}       // Computed movements from config
};

export function initializeMovements(config) {
    const computedMovements = {};
    for (const [key, movement] of Object.entries(config.controls)) {
        computedMovements[key] = movement;
    }
    return computedMovements;
}

export function reducer(state = initialState, action) {
    // Get base dimensions from config - only care about height now
    const rawHeight = action.config?.entities?.size?.height || 32;

    switch (action.type) {
        case 'INIT_MOVEMENTS': {
            return {
                ...state,
                movements: action.payload
            };
        }

        case 'PLAYER_INITIALIZED': {
            const { id, x, y, baseHeight, character } = action.payload;
            return {
                ...state,
                players: {
                    ...state.players,
                    [id]: {
                        id,
                        x, 
                        y,
                        baseHeight,
                        height: baseHeight,
                        headY: y - (baseHeight/2),
                        footY: y + (baseHeight/2),
                        character: character
                    }
                }
            };
        }

        case 'SET_PLAYER_POSITION': {
            const { id, position, currentActionState, character } = action.payload;
            const currentPlayer = state.players[id];
            
            const updatedPlayer = {
                ...currentPlayer,
                ...position,
                currentActionState,
                baseHeight: currentPlayer.baseHeight,
                height: currentPlayer.baseHeight,  // Keep at 1x
                headY: position.y - (currentPlayer.baseHeight/2),  // 1x calculations
                footY: position.y + (currentPlayer.baseHeight/2),  // 1x calculations
                character: character || currentPlayer.character,
                emoteState: action.payload.emoteState
            };
        
        
            const newState = {
                ...state,
                players: {
                    ...state.players,
                    [id]: updatedPlayer
                }
            };
        
            return newState;
        }

        case 'UPDATE_PLAYERS': {
            const { players, selfId } = action.payload;
            const newPlayers = {};
        
            Object.entries(players).forEach(([id, player]) => {
                console.log(`[Reducer] Processing player update for ${id} with emote state:`, player.emoteState);
                newPlayers[id] = {
                    ...player,
                    id,
                    baseHeight: rawHeight,
                    height: rawHeight,
                    headY: player.y - (rawHeight/2),
                    footY: player.y + (rawHeight/2),
                    character: player.character,
                    emoteState: player.emoteState
                };
            });
            
            const newState = {
                ...state,
                serverSelf: players[selfId] ? newPlayers[selfId] : null,
                serverPlayers: Object.fromEntries(
                    Object.entries(newPlayers).filter(([id]) => id !== selfId)
                ),
                players: {
                    ...Object.fromEntries(
                        Object.entries(newPlayers).filter(([id]) => id !== selfId)
                    ),
                    [selfId]: state.players[selfId]
                }
            };
            return newState;
        }
            
        default:
            return state;
    }
}