import ws from "k6/ws";
import { check } from "k6";

export const options = {
  stages: [
    { duration: '10s', target: 10 }
  ]
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

export default function () {
  const { CHAT_WS } = __ENV
  const token =
    "....token...";
  const url = `${CHAT_WS}/socket.io/?token=${token}&tokenType=jwt&EIO=4&transport=websocket`
  let i=0
  const response = ws.connect(url, {}, function (socket) {
    socket.on("open", function open() {
      console.log('connect')
      let direction = 'right'
      socket.setInterval(function timeout() {
        if (i == 50) {
          const rand = getRandomInt(4)
          direction = [
              'right',
              'left',
              'down',
              'up'
          ][rand]
          i = 0
        }
        else {
          i++
        }
        socket.send(`42${ JSON.stringify(["move", { input: direction, options: {"movement": true}, step: 0 }]) }`)
      }, 50);
    });

    socket.on("close", function close() {
      console.log("disconnected");
    });

    socket.on("error", function (e) {
      /*console.log("error", e);
      if (e.error() != "websocket: close sent") {
        console.log("An unexpected error occured: ", e.error());
      }*/
    });

    socket.setTimeout(function () {
      socket.close();
    }, 1000 * 30);
  });

  check(response, { "status is 101": (r) => r && r.status === 101 });
}