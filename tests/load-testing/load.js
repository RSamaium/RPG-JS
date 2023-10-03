#!/usr/bin/env node

// ex: ./load.js --players=100 --output=0  --arrival=10 --duration=1000

import { io } from "socket.io-client";
import { hideBin } from 'yargs/helpers';
import { randomDir } from './random-move.js';
import { cpus, platform as _platform, arch as _arch, release, totalmem } from 'os';
import { writeFileSync } from 'fs';
import { decode as _decode } from 'msgpack-lite';
import yargs from 'yargs/yargs';
const argv = yargs(hideBin(process.argv)).argv

const URL = process.env.URL || "http://localhost:8000";
const MAX_CLIENTS = argv.players || 100;
const CLIENT_CREATION_INTERVAL = argv.arrival || 0.1;
const EMIT_INTERVAL_IN_MS = 16
const MAX_TIME = 1000 * (argv.duration || 30)
const OUTPUT = +argv.output ?? true
const REPORT_INTERVAL = 5000

const date = new Date()
const [cpu] = cpus()
const platform = _platform()
const arch = _arch()
const version = release()
const ram = totalmem()
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
let packetBytes = 0
let canMove = false

function round(num) {
  return Math.round(num * 100) / 100
}

const clients = {}

const createClient = () => {
  const socket = io(URL, {
    transports: ['websocket']
  });

  socket.on('connect', () => {
    clients[socket.id] = {
      connected: Date.now(),
      loaded: false
    }
  })

  socket.on("w", (data) => {
    packetBytes += data.length
    const bufView = new Uint8Array(data)
    const decode = _decode(bufView)
    const isLoad = !!decode[2].shapes
    const nbClients = Object.values(clients).filter(client => client.loaded).length
    if (nbClients >= MAX_CLIENTS && !canMove) {
      console.log('--- Move Stress Test ----')
      canMove = true
    }
    if (isLoad) {
      clients[socket.id].loaded = true
      console.log('Load', socket.id, Date.now() - clients[socket.id].connected)
    }
    packetsSinceLastReport++;
  });

  socket.on("disconnect", (reason) => {
    console.log(`disconnect due to ${reason}`);
  })

  socket.on('loadScene', () => {
    setInterval(() => {
     socket.emit("move",  { input: [randomDir()] });
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
    `client count: ${clientCount} ; average packets received per second: ${packetsPerSeconds}`,
    `${packetBytes / 8 / 1024 / durationSinceLastReport} Kbit/s`
  );

  packetsSinceLastReport = 0;
  packetBytes = 0
  lastReport = now;

  if (time >= MAX_TIME) {
    clearInterval(interval)
    console.log(mkReport)
    if (OUTPUT) writeFileSync('./reports/' + Date.now() + '.md', mkReport, 'utf-8')
    process.exit()
  }
};

interval = setInterval(printReport, REPORT_INTERVAL);