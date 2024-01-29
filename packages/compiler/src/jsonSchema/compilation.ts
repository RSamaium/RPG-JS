export default {
    "compilerOptions": {
        "type": "object",
        "properties": {
            "alias": {
                "type": "object",
                "additionalProperties": {
                    "type": "string"
                }
            },
            "build": {
                "type": "object",
                "properties": {
                    "pwaEnabled": {
                        "type": "boolean"
                    },
                    "assetsPath": {
                        "type": "string"
                    },
                    "outputDir": {
                        "type": "string"
                    },
                    "serverUrl": {
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
    "vite": {
        "type": "object",
        "additionalProperties": true
    },
    "modulesRoot": {
        "type": "string"
    },
    "autostart": {
        "type": "boolean"
    },
    "spritesheetDirectories": {
        "type": "array",
        "items": {
            "type": "string"
        }
    }
}
