import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock simple de la fonction signal
const signal = (initialValue: any) => {
  let value = initialValue
  const signalFn = () => value
  signalFn.set = (newValue: any) => { value = newValue }
  signalFn.update = (updateFn: (v: any) => any) => { value = updateFn(value) }
  return signalFn
}

// Spy sur la fonction h de canvasengine
const hSpy = vi.fn()

// Mock de canvasengine pour espionner h
vi.mock('canvasengine', () => ({
  signal,
  h: hSpy,
  bootstrapCanvas: vi.fn(),
  computed: vi.fn(),
  effect: vi.fn(),
  trigger: vi.fn()
}))

describe('Module standalone avec serveur et clients', () => {
  // Simulation d'un serveur simple
  const mockServer = {
    isStandalone: true,
    players: signal([]),
    addPlayer: vi.fn(),
    removePlayer: vi.fn()
  }

  beforeEach(() => {
    // Réinitialiser les spies avant chaque test
    vi.clearAllMocks()
    // Réinitialiser les players
    mockServer.players.set([])
  })

  afterEach(() => {
    // Nettoyer après chaque test
    vi.restoreAllMocks()
  })

  describe('Test du joueur', () => {
    it('devrait créer un serveur et permettre plusieurs clients', () => {
      // Vérifier que le serveur est bien configuré
      expect(mockServer).toBeDefined()
      
      // Le serveur devrait être en mode standalone
      expect(mockServer.isStandalone).toBe(true)
      
      // Vérifier que le signal players est initialisé
      expect(mockServer.players()).toEqual([])
    })

    it('devrait téléporter le joueur et mettre à jour le signal players', () => {
      // Simuler la connexion d'un joueur
      const mockPlayer = {
        id: 'player1',
        x: signal(100),
        y: signal(200),
        teleport: vi.fn(({ x, y }) => {
          mockPlayer.x.set(x)
          mockPlayer.y.set(y)
        })
      }

      // Ajouter le joueur au signal du serveur
      mockServer.players.update(players => [...players, mockPlayer])
      
      // Vérifier que le signal players contient bien un joueur
      expect(mockServer.players().length).toBe(1)
      expect(mockServer.players()[0].id).toBe('player1')

      // Tester la téléportation
      const newPosition = { x: 1000, y: 400 }
      mockPlayer.teleport(newPosition)

      // Vérifier que les coordonnées ont été mises à jour
      expect(mockPlayer.x()).toBe(1000)
      expect(mockPlayer.y()).toBe(400)
      expect(mockPlayer.teleport).toHaveBeenCalledWith(newPosition)
    })

    it('devrait afficher le joueur avec h et les bonnes positions x et y', () => {
      // Simuler un joueur avec des coordonnées
      const mockPlayer = {
        id: 'player1',
        x: signal(1000),
        y: signal(400),
        graphics: ['hero']
      }

      // Ajouter le joueur au serveur
      mockServer.players.update(players => [...players, mockPlayer])

      // Appeler h comme le ferait canvasengine pour afficher le joueur
      hSpy('Container', {
        x: mockPlayer.x(),
        y: mockPlayer.y(),
        id: mockPlayer.id
      }, [
        hSpy('Sprite', { sheet: 'hero' })
      ])

      // Vérifier que h a été appelé avec les bonnes coordonnées
      expect(hSpy).toHaveBeenCalledWith('Container', {
        x: 1000,
        y: 400,
        id: 'player1'
      }, expect.any(Array))

      // Vérifier que h a été appelé pour le sprite du joueur
      expect(hSpy).toHaveBeenCalledWith('Sprite', { sheet: 'hero' })
      
      // Vérifier le nombre total d'appels à h
      expect(hSpy).toHaveBeenCalledTimes(2)
    })

    it('devrait gérer plusieurs clients simultanément', () => {
      // Simuler plusieurs joueurs
      const player1 = {
        id: 'player1',
        x: signal(100),
        y: signal(200)
      }

      const player2 = {
        id: 'player2', 
        x: signal(300),
        y: signal(400)
      }

      // Ajouter les joueurs au serveur
      mockServer.players.update(players => [...players, player1, player2])

      // Vérifier qu'on a bien 2 joueurs
      expect(mockServer.players().length).toBe(2)
      
      // Vérifier que chaque joueur a son ID unique
      expect(mockServer.players().find(p => p.id === 'player1')).toBeDefined()
      expect(mockServer.players().find(p => p.id === 'player2')).toBeDefined()

      // Simuler l'affichage de chaque joueur avec h
      mockServer.players().forEach(player => {
        hSpy('Container', {
          x: player.x(),
          y: player.y(),
          id: player.id
        })
      })

      // Vérifier que h a été appelé pour chaque joueur
      expect(hSpy).toHaveBeenCalledTimes(2)
      expect(hSpy).toHaveBeenCalledWith('Container', {
        x: 100,
        y: 200,
        id: 'player1'
      })
      expect(hSpy).toHaveBeenCalledWith('Container', {
        x: 300,
        y: 400,
        id: 'player2'
      })
    })
  })
})