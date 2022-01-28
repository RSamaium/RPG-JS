import client from 'prom-client'
import { RpgServerEngine } from '@rpgjs/server'
import { RpgServer, RpgModule } from '@rpgjs/server'

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

let gaugeNbPlayer

@RpgModule<RpgServer>({ 
    player: {
     onConnected() {
        if (gaugeNbPlayer) gaugeNbPlayer.inc()
     },
     onDisconnected() {
        if (gaugeNbPlayer) gaugeNbPlayer.dec()
     }
    },
    engine: {
        onStart(server: RpgServerEngine)  {
          if (process.env.NODE_ENV == 'test') {
            return
          }
          const register = new client.Registry()
          const { app } = server
        
          if (!app) {
            throw `Please add "rpgGame.app = app" before in server/main.ts`
          }
          else { 
            app.use('/metrics', async (req, res) => {
                res.setHeader('Content-Type', register.contentType)
                res.end(await register.metrics())
            })
          }
      
          register.setDefaultLabels({
            app: 'game-app'
          })
      
          client.collectDefaultMetrics({ register })
      
          gaugeNbPlayer = new client.Gauge({ 
            name: 'player_nb_connected', 
            help: 'Number of players connected' 
          })
      
          const gaugeCpu = new client.Gauge({ 
            name: 'game_cpu_percent', 
            help: 'CPU used by game' 
          })

          register.registerMetric(gaugeNbPlayer)
          register.registerMetric(gaugeCpu)
      
          let usage
      
          setInterval(() => {
            if (usage) {
              const { percent } = cpu(usage)
              gaugeCpu.set(percent)
            }
            usage = cpu()
          }, 1000)
        }
    }
})
export default class RpgServerModule {}