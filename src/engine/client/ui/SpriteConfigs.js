// All sprite names MUST be unique

export const spriteConfigs = {
    'TheAdventurer': {
        spritesheets: {
            'idle.png': {
                type: 'rectangular',
                dimensions: { rows: 6, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'Sidle' },
                    1: { name: 'SWidle' },
                    2: { name: 'NWidle' },
                    3: { name: 'Nidle' },
                    4: { name: 'NEidle' },
                    5: { name: 'Eidle' }
                }
            },
            'walk.png': {
                type: 'rectangular',
                dimensions: { rows: 6, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'Swalk' },
                    1: { name: 'SWwalk' },
                    2: { name: 'NWwalk' },
                    3: { name: 'Nwalk' },
                    4: { name: 'NEwalk' },
                    5: { name: 'SEwalk' }
                }
            },
            'Dash.png': {
                type: 'rectangular',
                dimensions: { rows: 6, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'Sdash' },
                    1: { name: 'SWdash' },
                    2: { name: 'NWdash' },
                    3: { name: 'Ndash' },
                    4: { name: 'NEWdash' },
                    5: { name: 'Edash' }
                }
            },
            'death_normal.png': {
                type: 'rectangular',
                dimensions: { rows: 6, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'Sdeath' },
                    1: { name: 'SWdeath' },
                    2: { name: 'NWdeath' },
                    3: { name: 'Ndeath' },
                    4: { name: 'NEWdeath' },
                    5: { name: 'Edeath' }
                }
            }
        }
    },

    'TheFemaleAdventurer': {
        spritesheets: {
            'idle.png': {
                type: 'rectangular',
                dimensions: { rows: 6, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'Sidle' },
                    1: { name: 'SWidle' },
                    2: { name: 'NWidle' },
                    3: { name: 'Nidle' },
                    4: { name: 'NEidle' },
                    5: { name: 'Eidle' }
                }
            },
            'walk.png': {
                type: 'rectangular',
                dimensions: { rows: 6, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'Swalk' },
                    1: { name: 'SWwalk' },
                    2: { name: 'NWwalk' },
                    3: { name: 'Nwalk' },
                    4: { name: 'NEwalk' },
                    5: { name: 'SEwalk' }
                }
            },
            'Dash.png': {
                type: 'rectangular',
                dimensions: { rows: 6, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'Sdash' },
                    1: { name: 'SWdash' },
                    2: { name: 'NWdash' },
                    3: { name: 'Ndash' },
                    4: { name: 'NEWdash' },
                    5: { name: 'Edash' }
                }
            },
            'death_normal.png': {
                type: 'rectangular',
                dimensions: { rows: 6, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'Sdeath' },
                    1: { name: 'SWdeath' },
                    2: { name: 'NWdeath' },
                    3: { name: 'Ndeath' },
                    4: { name: 'NEWdeath' },
                    5: { name: 'Edeath' }
                }
            }
        }
    },
    
    'martialhero': {
        spritesheets: {
            'attack1.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 6, scale: 0.5 },
                animations: {
                    0: { name: 'attack1' }
                }
            },
            'attack2.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 6, scale: 0.5 },
                animations: {
                    0: { name: 'attack2' }
                }
            },
            'death.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 6, scale: 0.5 },
                animations: {
                    0: { name: 'death' }
                }
            },
            'fall.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 2, scale: 0.5 },
                animations: {
                    0: { name: 'fall' }
                }
            },
            'idle.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 8, scale: 0.5 },
                animations: {
                    0: { name: 'idle' }
                }
            },
            'jump.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 2, scale: 0.5 },
                animations: {
                    0: { name: 'jump' }
                }
            },
            'run.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 8, scale: 0.5 },
                animations: {
                    0: { name: 'run' }
                }
            },
            'takehit.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 4, scale: 0.5 },
                animations: {
                    0: { name: 'takehit' }
                }
            },
            'takehit2.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 4, scale: 0.5 },
                animations: {
                    0: { name: 'takehit2' }
                }
            }
        }
    },

    'etc_fire_strip_01': {
        isCharacter: false,
        spritesheets: {
            'etc_fire_strip_01.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 4, scale: 1 },
                animations: {
                    0: { name: 'fire01' }
                }
            }
        }
    },

    'etc_fire_strip_02': {
        isCharacter: false,
        spritesheets: {
            'etc_fire_strip_02.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 4, scale: 1 },
                animations: {
                    0: { name: 'fire02' }
                }
            }
        }
    },

    'etc_glint_01': {
        isCharacter: false,
        spritesheets: {
            'etc_glint_01.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 6, scale: 1 },
                animations: {
                    0: { name: 'glint01' }
                }
            }
        }
    },

    'etc_glint_02': {
        isCharacter: false,
        spritesheets: {
            'etc_glint_02.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 4, scale: 1 },
                animations: {
                    0: { name: 'glint02' }
                }
            }
        }
    },

    'housing_chimneysmoke_01': {
        isCharacter: false,
        spritesheets: {
            'housing_chimneysmoke_01.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 30, scale: 1 },
                animations: {
                    0: { name: 'chimneysmoke_01' }
                }
            }
        }
    },

    'housing_chimneysmoke_02': {
        isCharacter: false,
        spritesheets: {
            'housing_chimneysmoke_02.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 30, scale: 1 },
                animations: {
                    0: { name: 'chimneysmoke_02' }
                }
            }
        }
    },

    'housing_chimneysmoke_03': {
        isCharacter: false,
        spritesheets: {
            'housing_chimneysmoke_03.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 30, scale: 1 },
                animations: {
                    0: { name: 'chimneysmoke_03' }
                }
            }
        }
    },

    'housing_chimneysmoke_04': {
        isCharacter: false,
        spritesheets: {
            'housing_chimneysmoke_04.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 30, scale: 1 },
                animations: {
                    0: { name: 'chimneysmoke_04' }
                }
            }
        }
    },

    'housing_chimneysmoke_05': {
        isCharacter: false,
        spritesheets: {
            'housing_chimneysmoke_05.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 30, scale: 1 },
                animations: {
                    0: { name: 'chimneysmoke_05' }
                }
            }
        }
    },

    'housing_windmill_shadow': {
        isCharacter: false,
        spritesheets: {
            'housing_windmill_shadow.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 9, scale: 1 },
                animations: {
                    0: { name: 'chimneysmoke_06' }
                }
            }
        }
    },

    'housing_windmill': {
        isCharacter: false,
        spritesheets: {
            'housing_windmill.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 9, scale: 1 },
                animations: {
                    0: { name: 'chimneysmoke_07' }
                }
            }
        }
    },

    'skeleton': {
        isCharacter: false,
        spritesheets: {
            'attack3.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 6, scale: 1 },
                animations: {
                    0: { name: 'attack' }
                }
            },

            'sword.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'sword' }
                }
            }
        }
    },

    'mushroom': {
        isCharacter: false,
        spritesheets: {
            'attack3.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 11, scale: 1 },
                animations: {
                    0: { name: 'attack' }
                }
            },

            'projectile.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'projectile' }
                }
            }
        }
    },

    'goblin': {
        isCharacter: false,
        spritesheets: {
            'attack3.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 12, scale: 1 },
                animations: {
                    0: { name: 'attack' }
                }
            },

            'bomb.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 19, scale: 1 },
                animations: {
                    0: { name: 'bomb' }
                }
            }
        }
    },

    'flyingeye': {
        isCharacter: false,
        spritesheets: {
            'attack3.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 6, scale: 1 },
                animations: {
                    0: { name: 'attack' }
                }
            },

            'projectile.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'projectile' }
                }
            }
        }
    },

    'emotes': {
        isCharacter: false,
        spritesheets: {
            'awkward.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 5, scale: 1 },
                animations: {
                    0: { name: 'awkward', isFinite: true }
                }
            },

            'ear.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 10, scale: 1 },
                animations: {
                    0: { name: 'ear', isFinite: true }
                }
            },
            
            'love.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 7, scale: 1 },
                animations: {
                    0: { name: 'love', isFinite: true }
                }
            },

            'madge.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 8, scale: 1 },
                animations: {
                    0: { name: 'madge', isFinite: true }
                }
            },

            'pop.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 21, scale: 1 },
                animations: {
                    0: { name: 'pop', isFinite: true }
                }
            },

            'sleep.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 12, scale: 1 },
                animations: {
                    0: { name: 'sleep', isFinite: true }
                }
            },

            'swag.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 7, scale: 1 },
                animations: {
                    0: { name: 'swag', isFinite: true }
                }
            },

            'yawn.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 13, scale: 1 },
                animations: {
                    0: { name: 'yawn', isFinite: true }
                }
            },

            'yay.png': {
                type: 'rectangular',
                dimensions: { rows: 1, cols: 7, scale: 1 },
                animations: {
                    0: { name: 'yay', isFinite: true }
                }
            },
        }
    },
};