function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

function randomDir(context, events, done) {
    
    const rand = getRandomInt(4)
    const direction = [
        'right',
        'left',
        'down',
        'up'
    ][rand];
    
    context.vars.direction = direction
  
    return done();
}

module.exports = {
    randomDir
}