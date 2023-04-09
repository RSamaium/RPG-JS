export default {
    "server": {
        "type": "object",
        "properties": {
            "startMap": {
                "type": "string"
            }
        }
    },
    "client": {},
    "*": {
        "type": "object",
        "properties": {
            "inputs": {
                "type": "object",
                "properties": {
                    "action": {
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
                                ],
                                "enum": [
                                    "up",
                                    "down",
                                    "left",
                                    "right"
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
                            "repeat",
                            "bind"
                        ]
                    }
                }
            },
            "name": {
                "type": "string"
            }
        }
    }
}