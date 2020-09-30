function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

module.exports = {
    randomDirection(userContext, events, done) {
        const rand = getRandomInt(4)
        userContext.vars.direction = [
            'right',
            'left',
            'down',
            'up'
        ][rand]
        return done()
    }
}