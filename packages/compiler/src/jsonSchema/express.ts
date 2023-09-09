export default {
    "express": {
        "type": "object",
        "properties": {
            "static": {
                "type": "string"
            },
            "port": {
                "type": "integer"
            },
            "json": {
                "type": "object",
                "additionalProperties": true
            },
            "cors": {
                "type": "object",
                "additionalProperties": true
            },
            "socketIo": {
                "type": "object",
                "additionalProperties": true
            }
        }
    }
}