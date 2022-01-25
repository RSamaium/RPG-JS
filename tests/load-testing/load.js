#!/usr/bin/env node

const { io } = require("socket.io-client");
const { hideBin } = require('yargs/helpers')
const { randomDir } = require('./random-move')
const os = require('os');
const fs = require('fs')
const yargs = require('yargs/yargs')
const argv = yargs(hideBin(process.argv)).argv

const URL = process.env.URL || "http://localhost:3000";
const MAX_CLIENTS = argv.players || 100;
const CLIENT_CREATION_INTERVAL = argv.arrival || 0.1;
const EMIT_INTERVAL_IN_MS = 100
const MAX_TIME = 1000 * (argv.duration || 30)
const OUTPUT = +argv.output ?? true
const REPORT_INTERVAL = 5000

const date = new Date()
const [cpu] = os.cpus()
const platform = os.platform()
const arch = os.arch()
const version = os.release()
const ram = os.totalmem()
let mkReport = `Loading Test 
- Date: ${date.toDateString()}
- Platform: ${platform} ${version}
- CPU Architecture: ${arch}
- CPU Speed: ${cpu.speed} [${cpu.model}]
- RAM: ${Math.round(ram / 1024/ 1024 / 1024)}Mo

Description: Arrival of a player every ${CLIENT_CREATION_INTERVAL}s. Creation of a maximum of ${MAX_CLIENTS} players on the same map in total. The test takes place during ${MAX_TIME / 1000}s 
Note: Having less than 10 paquest/s per player is not a good result

| Time (s)    | Nb Players   |    Avg Packets / seconds   |  Packets / second / player
|-------------|---------------|----------------------------|---------------------------|
`

let clientCount = 0;
let lastReport = new Date().getTime();
let packetsSinceLastReport = 0;

function round(num) {
  return Math.round(num * 100) / 100
}

const createClient = () => {
  const socket = io(URL, {
    transports: ['websocket']
  });

  socket.on("w", () => {
    packetsSinceLastReport++;
  });

  socket.on("disconnect", (reason) => {
    console.log(`disconnect due to ${reason}`);
  })

  socket.on('loadScene', () => {
    setInterval(() => {
      socket.emit("move",  { input: randomDir() });
    }, EMIT_INTERVAL_IN_MS);
  })

  if (++clientCount < MAX_CLIENTS) {
    setTimeout(createClient, +CLIENT_CREATION_INTERVAL * 1000);
  }
};

createClient();

let time = 0
let interval

const printReport = () => {
  time += REPORT_INTERVAL
  const now = new Date().getTime();
  const durationSinceLastReport = (now - lastReport) / 1000;
  const packetsPerSeconds = (
    packetsSinceLastReport / durationSinceLastReport
  ).toFixed(2);

  mkReport += `${time / 1000} | ${clientCount} | ${packetsPerSeconds} | ${round(packetsPerSeconds / clientCount)}
`

  console.log(
    `client count: ${clientCount} ; average packets received per second: ${packetsPerSeconds}`
  );

  packetsSinceLastReport = 0;
  lastReport = now;

  if (time >= MAX_TIME) {
    clearInterval(interval)
    console.log(mkReport)
    if (OUTPUT) fs.writeFileSync('./reports/' + Date.now() + '.md', mkReport, 'utf-8')
    process.exit()
  }
};

interval = setInterval(printReport, REPORT_INTERVAL);