import colors from 'picocolors'

export function warn(message: string) {
    console.log(colors.yellow(`⚠️  Warning - ${message}`))
}

export function info(message: string) {
    console.log(colors.blue(`ℹ️  Info - ${message}`))
}

export function error(message: string) {
    console.log(colors.red(`❌  Error - ${message}`))
}

export const errorApi = (err) => {
    error(`${err.response.status} - ${err.response.data.error}`)
}