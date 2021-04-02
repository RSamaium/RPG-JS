import client from 'prom-client'

function cpu(oldUsage?) {
  let usage
  if (oldUsage && oldUsage._start) {
    usage = Object.assign({}, process.cpuUsage(oldUsage._start.cpuUsage))
    usage.time = Date.now() - oldUsage._start.time
  } else {
    usage = Object.assign({}, process.cpuUsage())
    usage.time = process.uptime() * 1000 // s to ms
  }
  usage.percent = (usage.system + usage.user) / (usage.time * 10)
  Object.defineProperty(usage, '_start', {
    value: {
      cpuUsage: process.cpuUsage(),
      time: Date.now()
    }
  })
  return usage
}

export default function({ RpgPlugin }, options) {
  const register = new client.Registry()

  register.setDefaultLabels({
    app: 'game-app'
  })

  client.collectDefaultMetrics({ register })

  const gaugeNbPlayer = new client.Gauge({ 
    name: 'player_nb_connected', 
    help: 'Number of players connected' 
  })

  const gaugeCpu = new client.Gauge({ 
    name: 'game_cpu_percent', 
    help: 'CPU used by game' 
  })

  register.registerMetric(gaugeNbPlayer)
  register.registerMetric(gaugeCpu)

  if (options.init) options.init(register)

  let end

  function onConnected() {
    gaugeNbPlayer.inc()
  }

  function onDisconnected() {
    gaugeNbPlayer.dec()
  }

  let usage

  setInterval(() => {
    if (usage) {
      const { percent } = cpu(usage)
      gaugeCpu.set(percent)
    }
    usage = cpu()
  }, 1000)

  RpgPlugin.on('Server.onPlayerConnected', onConnected)
  RpgPlugin.on('Server.onPlayerDisconnected', onDisconnected)
}