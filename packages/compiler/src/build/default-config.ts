const canvasOptions = {
    "canvas": {
        "type": "object",
        "properties": {
            "transparent": {
                "type": "boolean"
            },
            "autoDensity": {
                "type": "boolean"
            },
            "antialias": {
                "type": "boolean"
            },
            "resolution": {
                "type": "number"
            },
            "preserveDrawingBuffer": {
                "type": "boolean"
            },
            "backgroundColor": {
                "type": "number"
            }
        }
    },
    "selector": {
        "type": "string"
    },
    "selectorGui": {
        "type": "string"
    },
    "selectorCanvas": {
        "type": "string"
    },
    "standalone": {
        "type": "boolean"
    },
    "drawMap": {
        "type": "boolean"
    },
    "maxFps": {
        "type": "number"
    },
    "serverFps": {
        "type": "number"
    }
}

const compilerOptions = {
    "compilerOptions": {
        "type": "object",
        "properties": {
            "alias": {
                "type": "object",
                "additionalProperties": {
                    "type": "string"
                }
            }
        }
    }
}

export default {
    "server": {
        "type": "object",
        "properties": {
            "startMap": {
                "type": "string"
            },
            "start": {
                "type": "object",
                "properties": {
                    "map": {
                        "type": "string"
                    },
                    "graphic": {
                        "type": "string"
                    },
                    "hitbox": {
                        "type": "array",
                        "items": [
                            { "type": "integer" },
                            { "type": "integer" }
                        ],
                        "additionalItems": false,
                        "minItems": 2,
                        "maxItems": 2
                    }
                }
            },
            "spritesheetDirectories": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "api": {
                "type": "object",
                "properties": {
                    "enabled": {
                        "type": "boolean"
                    },
                    "authSecret": {
                        "type": "string"
                    }
                },
                "required": ["enabled", "authSecret"]
            },
            ...compilerOptions
        }
    },
    "client": {
        "type": "object",
        "properties": {
            "shortName": {
                "type": "string"
            },
            "description": {
                "type": "string"
            },
            "themeColor": {
                "type": "string"
            },
            "icons": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "src": {
                            "type": "string"
                        },
                        "sizes": {
                            "type": "array",
                            "items": {
                                "type": "number",
                                "minimum": 0
                            }
                        },
                        "type": {
                            "type": "string"
                        }
                    }
                }
            },
            "themeCss": {
                "type": "string"
            },
            "matchMakerService": {
                "type": "string"
            },
            ...canvasOptions
        }
    },
    "*": {
        "type": "object",
        "properties": {
            "inputs": {
                "type": "object",
                "additionalProperties": {
                    "oneOf": [
                        {
                            "type": "object",
                            "properties": {
                                "repeat": {
                                    "type": "boolean",
                                    "default": false
                                },
                                "bind": {
                                    "type": [
                                        "string",
                                        "array"
                                    ]
                                },
                                "delay": {
                                    "type": "object",
                                    "properties": {
                                        "duration": {
                                            "type": "number",
                                            "minimum": 0
                                        },
                                        "otherControls": {
                                            "type": "array",
                                            "items": {
                                                "type": "string"
                                            }
                                        }
                                    },
                                    "required": [
                                        "duration"
                                    ]
                                }
                            },
                            "required": [
                                "bind"
                            ]
                        }
                    ]
                }
            },
            "name": {
                "type": "string"
            }
        }
    }
}