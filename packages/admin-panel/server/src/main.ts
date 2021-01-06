export function bootstrap(app: any, io: any, world: any) {
  
  const adminNamespace = io.of('/admin')
  
  app.get('/test', (req, res) => {
    res.json(1)
  })

  adminNamespace.on('connection', socket => {
      world.changes.subscribe((rooms) => {
         const players = world.getPlayers()
         socket.emit('players', players)
      })
  })
}
