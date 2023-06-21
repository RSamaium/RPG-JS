// Use https://formatjs.io/ to format messages, but if module is not installed, just return defaultMessage 
export function formatMessage(message: {
    defaultMessage: string,
    description?: string,
    id: string
}): string {
    return message.defaultMessage
}