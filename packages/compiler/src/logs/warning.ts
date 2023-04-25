import colors from 'picocolors'

export function warn(message: string) {
    console.log(colors.yellow(`⚠️  Warning - ${message}`))
}