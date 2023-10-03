function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function randomDir() {
    return getRandomInt(4)+1
}

export {
    randomDir
}