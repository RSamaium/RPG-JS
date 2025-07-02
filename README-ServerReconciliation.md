# Réconciliation Serveur avec Injection de Dépendance

Ce système fournit une réconciliation serveur automatique avec prédiction côté client pour RPGJS, en utilisant l'injection de dépendance pour une intégration propre.

## Installation et Configuration

### Configuration Basique

```typescript
import { startGame } from '@rpgjs/client'
import { provideServerReconciliation } from '@rpgjs/client'

startGame({
  providers: [
    provideServerReconciliation()
  ]
})
```

### Configuration Avancée

```typescript
startGame({
  providers: [
    provideServerReconciliation({
      enabled: true,                  // Activer la réconciliation
      smoothThreshold: 5,             // Seuil pour interpolation douce (pixels)
      snapThreshold: 50,              // Seuil pour téléportation instantanée (pixels)
      interpolationDuration: 100,     // Durée d'interpolation (ms)
      maxTimeDifference: 500          // Différence de temps maximale acceptée (ms)
    })
  ]
})
```

## Fonctionnement

### Prédiction Côté Client
- Le personnage se déplace immédiatement selon les entrées utilisateur
- Les positions sont envoyées au serveur en parallèle
- Pas de latence perçue pour le joueur

### Réconciliation Serveur
Quand le serveur envoie une position :

1. **Distance ≤ 5px** : Aucune correction (positions équivalentes)
2. **Distance 5-50px** : Interpolation douce vers la position serveur
3. **Distance > 50px** : Téléportation instantanée (autorité serveur)

### Compensation de Latence
- Prise en compte des timestamps pour gérer le décalage réseau
- Rejection des données serveur trop anciennes
- Buffer de variance réseau pour éviter les corrections erronées

## Options de Configuration

### `ServerReconciliationConfig`

```typescript
interface ServerReconciliationConfig {
  /** Activer la réconciliation serveur */
  enabled?: boolean;
  
  /** Seuil de distance pour interpolation douce (pixels) */
  smoothThreshold?: number;
  
  /** Seuil de distance pour téléportation instantanée (pixels) */
  snapThreshold?: number;
  
  /** Durée d'interpolation douce en millisecondes */
  interpolationDuration?: number;
  
  /** Différence de temps maximale pour accepter la réconciliation (ms) */
  maxTimeDifference?: number;
}
```

### Configurations Recommandées

#### Jeu Rapide (Action)
```typescript
provideServerReconciliation({
  smoothThreshold: 3,      // Corrections plus sensibles
  snapThreshold: 30,       // Téléportation plus aggressive
  interpolationDuration: 50 // Corrections très rapides
})
```

#### Jeu Standard (RPG)
```typescript
provideServerReconciliation({
  smoothThreshold: 5,      // Équilibre standard
  snapThreshold: 50,       // Téléportation modérée
  interpolationDuration: 100 // Corrections fluides
})
```

#### Connexion Lente
```typescript
provideServerReconciliation({
  smoothThreshold: 8,      // Plus tolérant
  snapThreshold: 80,       // Téléportation moins fréquente
  maxTimeDifference: 1000  // Accepte des données plus anciennes
})
```

## Utilisation Avancée

### Accès aux Services

```typescript
import { 
  getClientPredictionService, 
  getInterpolationService,
  getServerReconciliationConfig 
} from '@rpgjs/client'

// Obtenir les services configurés
const predictionService = getClientPredictionService();
const interpolationService = getInterpolationService();
const config = getServerReconciliationConfig();

// Obtenir des statistiques
const stats = predictionService.getStats(playerId);
console.log('Mouvements en attente:', stats.pendingMovements);
console.log('Interpolation en cours:', stats.isInterpolating);
```

### Intégration avec RpgClientPlayer

Le système s'intègre automatiquement avec `RpgClientPlayer` :

```typescript
// La réconciliation est automatique
player.reconcileServerPosition({
  x: 100,
  y: 200,
  timestamp: Date.now()
});

// Forcer une synchronisation (téléportation, changement de carte)
player.forceServerSync(x, y);

// Obtenir les statistiques de réconciliation
const reconciliationStats = player.getReconciliationStats();
```

## Architecture

### Injection de Dépendance
- `provideServerReconciliation()` configure les services
- Les services sont automatiquement injectés dans les composants
- Évite les dépendances circulaires et les singletons globaux

### Services Inclus
- **ClientPredictionService** : Gestion des mouvements prédictifs
- **InterpolationService** : Interpolation douce des positions
- Configuration centralisée via le provider

### Avantages de cette Approche
1. **Configuration Centralisée** : Toutes les options en un seul endroit
2. **Injection Propre** : Pas de dépendances globales
3. **Testabilité** : Services facilement mockables
4. **Flexibilité** : Configuration par environnement
5. **Performance** : Services configurés une seule fois au démarrage

## Bonnes Pratiques

### Configuration par Environnement
```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

startGame({
  providers: [
    provideServerReconciliation({
      smoothThreshold: isDevelopment ? 10 : 5,
      snapThreshold: isDevelopment ? 100 : 50,
      // Plus tolérant en développement
    })
  ]
})
```

### Monitoring et Debug
```typescript
// Activer les logs en développement
if (process.env.NODE_ENV === 'development') {
  const service = getClientPredictionService();
  setInterval(() => {
    const stats = service.getStats(currentPlayerId);
    console.log('Reconciliation Stats:', stats);
  }, 5000);
}
```

### Gestion des Erreurs
```typescript
try {
  const game = await startGame({
    providers: [
      provideServerReconciliation({
        // configuration...
      })
    ]
  });
} catch (error) {
  console.error('Erreur initialisation réconciliation:', error);
  // Fallback sans réconciliation
}
```

## Résolution de Problèmes

### Mouvements Saccadés
- Réduire `smoothThreshold`
- Augmenter `interpolationDuration`
- Vérifier la latence réseau

### Téléportations Fréquentes
- Augmenter `snapThreshold`
- Réduire `maxTimeDifference`
- Vérifier la synchronisation des horloges

### Performance
- Surveiller le nombre de mouvements en attente
- Ajuster la fréquence d'envoi au serveur
- Optimiser les calculs de distance

## Compatibilité

- Compatible avec RPGJS v4+
- Fonctionne avec tous les types de connexion (WebSocket, Socket.IO)
- Supporte les serveurs multijoueurs
- Intégration transparente avec les systèmes existants