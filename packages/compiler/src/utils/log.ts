import colors from 'picocolors'

export enum ErrorCodes {
    IndexNotFound
}

const HELPS = {
    [ErrorCodes.IndexNotFound]: `The error message "ENOENT: no such file or directory, stat 'index.html'" indicates that the program or script is attempting to access a file named "index.html", but that file does not exist in the specified directory or location.

    The error message specifically indicates that the program is unable to locate the file or directory that it is trying to access. This can happen for a number of reasons, such as the file or directory being deleted or moved, a typo in the file or directory name, or the file or directory not being created yet.
    
    To resolve this error, you should check the path and name of the file or directory that the program is trying to access, and make sure that it exists in the correct location. If the file or directory has been moved or renamed, you may need to update the program's code to point to the correct location.`
}

export function error(error: Error, help?: ErrorCodes) {
    console.log(colors.red(error.message))
    if (help !== undefined) {
        console.log(`  ${colors.dim('➜')}  ${colors.dim(HELPS[help])}`)
    }
    process.exit()
}