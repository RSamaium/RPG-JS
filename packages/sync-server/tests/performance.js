const { Room } = require('../lib/room')

const room = new Room()

const bigObject = {
    list: []
}

for (let i=0 ; i < 10000 ; i++) {
    bigObject.list.push({
        public: Math.random(),
        private: Math.random()
    })
}

//console.time()
room.extractObjectOfRoom(bigObject, {
    list: [{
        public: String
    }]
})
//console.timeEnd()