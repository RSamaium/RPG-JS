# Système de Réconciliation Serveur et Client-Side Prediction

Ce guide explique comment utiliser le système de réconciliation serveur et de prédiction côté client implémenté pour RPGJS.

## Vue d'ensemble

Le système implémente :
- **Client-side prediction** : Les mouvements sont appliqués immédiatement côté client
- **Server reconciliation** : Vérification et correction des positions avec le serveur
- **Interpolation smooth** : Transition fluide pour les petites corrections
- **Snap direct** : Correction immédiate pour les grandes différences

## Architecture

### Services principaux

1. **ClientPredictionService** (`packages/client/src/services/ClientPrediction.ts`)
   - Gère les mouvements prédits côté client
   - Effectue la réconciliation avec le serveur
   - Configure les seuils de correction

2. **InterpolationService** (`packages/client/src/services/InterpolationService.ts`)
   - Gère les transitions smooth entre positions
   - Différents types d'easing (linear, easeOut, easeInOut)
   - Boucle d'animation optimisée

3. **ClientPredictionMixin** (`packages/client/src/Game/ClientPredictionMixin.ts`)
   - Mixin pour intégrer la prédiction dans les classes de joueur
   - API simple et transparente
   - Gestion automatique des resources

## Utilisation de base

### 1. Créer un joueur avec prédiction

```typescript
import { WithClientPrediction } from "./Game/ClientPredictionMixin";
import { RpgCommonPlayer, Direction } from "@rpgjs/common";

class MyPredictivePlayer extends WithClientPrediction(RpgCommonPlayer) {
  constructor() {
    super();
    
    // Activer la prédiction avec configuration
    this.enableClientPrediction({
      enablePrediction: true,
      smoothThreshold: 5,        // pixels
      snapThreshold: 50,         // pixels
      interpolationDuration: 100 // ms
    });
  }
}
```

### 2. Gérer les inputs de mouvement

```typescript
// Dans votre gestionnaire d'événements
function handleInput(direction: Direction) {
  // Le mouvement est appliqué immédiatement côté client
  player.predictiveMove(direction);
  
  // Envoyer l'input au serveur en parallèle
  socket.emit('moveInput', {
    direction,
    timestamp: Date.now(),
    x: player.x(),
    y: player.y()
  });
}
```

### 3. Réconcilier avec le serveur

```typescript
// Quand vous recevez une mise à jour du serveur
socket.on('positionUpdate', (data) => {
  player.reconcileServerPosition(
    data.x,
    data.y,
    data.timestamp
  );
});
```

## Configuration avancée

### Seuils de réconciliation

```typescript
// Configuration des seuils pendant le jeu
clientPredictionService.setConfig({
  smoothThreshold: 3,    // Plus sensible aux petites différences
  snapThreshold: 30,     // Snap plus rapide pour les grandes différences
  interpolationDuration: 150 // Interpolation plus lente
});
```

### Types d'interpolation

```typescript
// Dans InterpolationService
interpolationService.interpolate(
  player,
  targetX,
  targetY,
  duration,
  'easeOut'  // 'linear', 'easeOut', 'easeInOut'
);
```

## Intégration avec RPGJS

### Hooks pour l'intégration

```typescript
import { clientPredictionHooks } from "./Game/ClientPredictionMixin";

// Dans votre module client RPGJS
const sprite: RpgSpriteHooks = {
  onChanges(sprite, data, old) {
    // Réconciliation automatique quand les données changent
    clientPredictionHooks.onServerUpdate(sprite, data);
  },
  
  onMove(sprite) {
    // Hook appelé lors des mouvements
    console.log('Player moved:', sprite.x(), sprite.y());
  }
};
```

### Gestion des inputs

```typescript
const engine: RpgClientEngineHooks = {
  onInput(engine, { input, playerId }) {
    const player = engine.getCurrentPlayer();
    
    if (input === 'up') {
      clientPredictionHooks.onLocalMove(player, Direction.Up, 16);
    }
    // ... autres directions
  }
};
```

## Gestion des cas spéciaux

### Téléportations

```typescript
// Pour les téléportations ou changements de map
player.forceServerSync(newX, newY);

// Ou via le hook
clientPredictionHooks.onMapChange(player, newX, newY);
```

### Désactivation temporaire

```typescript
// Désactiver la prédiction (ex: pendant les cinématiques)
player.disableClientPrediction();

// Réactiver plus tard
player.enableClientPrediction();
```

### Debug et monitoring

```typescript
// Obtenir les statistiques de prédiction
const stats = player.getPredictionStats();
console.log('Pending movements:', stats.pendingMovements);
console.log('Is interpolating:', stats.isInterpolating);

// Informations détaillées
const debugInfo = player.getDebugInfo();
console.log('Debug info:', debugInfo);
```

## Workflow complet

1. **Input côté client** :
   ```
   Utilisateur appuie sur une touche
   → Mouvement appliqué immédiatement (prédiction)
   → Input envoyé au serveur
   ```

2. **Traitement serveur** :
   ```
   Serveur reçoit l'input
   → Validation et traitement physique
   → Envoi de la position authoritative
   ```

3. **Réconciliation côté client** :
   ```
   Client reçoit la position serveur
   → Comparaison avec la position prédite
   → Correction smooth ou snap selon la distance
   ```

## Paramètres recommandés

### Jeu rapide (action)
```typescript
{
  smoothThreshold: 2,
  snapThreshold: 20,
  interpolationDuration: 50
}
```

### Jeu RPG classique
```typescript
{
  smoothThreshold: 5,
  snapThreshold: 50,
  interpolationDuration: 100
}
```

### Jeu avec physique complexe
```typescript
{
  smoothThreshold: 8,
  snapThreshold: 80,
  interpolationDuration: 150
}
```

## Performance

- **Mémoire** : ~1KB par joueur pour les buffers de prédiction
- **CPU** : Impact minimal, calculs optimisés
- **Réseau** : Aucun overhead supplémentaire

## Limitations et considérations

1. **Latence variable** : Le système s'adapte mais de fortes variations peuvent affecter la fluidité
2. **Physique complexe** : Les prédictions peuvent diverger avec des simulations physiques avancées
3. **Compatibilité** : Requires RPGJS v5+ avec le système de signaux

## Troubleshooting

### Joueur "saccadé"
- Vérifier `smoothThreshold` (peut être trop bas)
- Augmenter `interpolationDuration`

### Corrections trop fréquentes
- Vérifier la synchronisation des horloges client/serveur
- Ajuster `snapThreshold`

### Performance dégradée
- Vérifier le nombre de joueurs avec prédiction active
- Limiter la taille des buffers d'inputs

## Exemple complet

Voir `packages/client/src/examples/PredictivePlayerExample.ts` pour un exemple complet d'implémentation avec gestion des inputs, réconciliation et debugging.

## API Reference

### ClientPredictionService
- `predictMovement(player, direction, deltaTime)`
- `reconcileWithServer(player, x, y, timestamp)`
- `setConfig(config)`
- `getStats(playerId)`

### InterpolationService
- `interpolate(player, x, y, duration, easeType)`
- `stopInterpolation(playerId)`
- `isInterpolating(playerId)`

### WithClientPrediction Mixin
- `enableClientPrediction(options)`
- `disableClientPrediction()`
- `predictiveMove(direction, deltaTime)`
- `reconcileServerPosition(x, y, timestamp)`
- `forceServerSync(x, y)`