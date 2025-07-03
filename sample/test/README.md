# Tests Standalone avec Spy sur la fonction h

Ce fichier de test démontre comment tester un module en mode standalone avec Vitest en espionnant la fonction `h` de Canvasengine.

## Fonctionnalités testées

### 1. Création du serveur standalone
- ✅ Vérifie que le serveur est créé correctement en mode standalone
- ✅ Permet plusieurs clients (simulation)

### 2. Spy sur la fonction h
- ✅ Espionne tous les appels à la fonction `h` de Canvasengine
- ✅ Vérifie que `h` est appelée avec les bons paramètres (coordonnées x, y)

### 3. Test des signaux avec effect
- ✅ Utilise `effect` pour écouter les changements sur les signaux
- ✅ Teste la téléportation : quand un joueur change de position, `h` est appelée avec les nouvelles coordonnées
- ✅ Teste plusieurs joueurs simultanément

### 4. Tests spécifiques

#### `devrait créer un serveur en mode standalone`
Vérifie que le système de jeu est correctement initialisé.

#### `devrait espionner les appels à la fonction h`
Test de base pour vérifier que le spy fonctionne.

#### `devrait surveiller les changements de position du joueur avec effect`
- Crée un signal pour la position d'un joueur
- Utilise `effect` pour surveiller les changements
- Vérifie que `h` est appelée avec les nouvelles coordonnées

#### `devrait surveiller plusieurs joueurs avec des effects`
- Teste avec plusieurs joueurs simultanément
- Vérifie que `h` est appelée pour chaque joueur

#### `devrait tester la téléportation avec effect sur signal`
- Simule une téléportation en changeant les coordonnées
- Vérifie que `h` est appelée pour le conteneur ET le sprite
- Test complet du rendu d'un joueur

## Structure du test

```typescript
// Mock de canvasengine pour espionner h
vi.mock('canvasengine', async () => {
  const actual = await vi.importActual('canvasengine')
  return {
    ...actual,
    h: hSpy  // On espionne uniquement h
  }
})
```

## Utilisation des effects

```typescript
const { effect, signal } = await import('canvasengine')

// Signal pour surveiller les changements
const playerSignal = signal({ x: 100, y: 200, id: 'player1' })

// Effect qui réagit aux changements
effect(() => {
  const player = playerSignal()
  hSpy('Container', { x: player.x, y: player.y, id: player.id })
})

// Changer le signal déclenche l'effect
playerSignal.set({ x: 1000, y: 400, id: 'player1' })
```

## Exécution

```bash
npm test
# ou
npx vitest run test/standalone.test.ts
```

## Résultats attendus

- ✅ 5 tests passent
- ✅ Spy sur `h` fonctionne correctement  
- ✅ Effects réagissent aux changements de signaux
- ✅ Coordonnées x, y sont correctement passées à `h`