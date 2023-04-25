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
                    }
                }
            },
            "spritesheetDirectories": {
                "type": "array",
                "items": {
                    "type": "string"
                }
            }
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
                            "type": "string"
                        },
                        "type": {
                            "type": "string"
                        }
                    }
                }
            },
            "themeCss": {
                "type": "string"
            }
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