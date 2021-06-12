const { ncp } = require('ncp')
const path = require('path')
const fs = require('fs')

module.exports = async (filename) => {
    try {
        const currentProjet = process.cwd()
        const modPath = path.join(currentProjet, 'src', 'modules', filename)
        const source = path.join(__dirname, 'templates', 'module')
        await (new Promise((resolve, reject) => {
            fs.mkdir(modPath, (err) => {
                if (err) {
                    return reject(err)
                }
                resolve()
            })
        }))
        await (new Promise((resolve, reject) => {
            ncp(source, modPath, (err) => {
                if (err) {
                    return reject(err)
                }
                resolve()
            })
        }))
        console.log('The module has been generated. remember to add it in the file src/modules/index.ts')
    }
    catch (err) {
        console.log('Error during module creation')
        console.error(err)
    }
}