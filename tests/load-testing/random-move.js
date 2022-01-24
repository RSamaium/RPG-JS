function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function randomDir() {
    const rand = getRandomInt(4)
    const direction = [
        'right',
        'left',
        'down',
        'up'
    ][rand];
    
    return direction
}

module.exports = {
    randomDir
}