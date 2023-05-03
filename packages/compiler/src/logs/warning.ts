import colors from 'picocolors'

export function warn(message: string) {
    console.log(colors.yellow(`⚠️  Warning - ${message}`))
}

export function info(message: string) {
    console.log(colors.blue(`ℹ️  Info - ${message}`))
}

export const errorApi = (err) => {
    console.log(colors.red(`❌  Error ${err.response.status} - ${err.response.data.error}`))
}