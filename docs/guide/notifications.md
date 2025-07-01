# Système de Notifications

Le système de notifications de RPGJS permet d'afficher des messages temporaires aux joueurs avec des options de personnalisation avancées.

## Utilisation de base

### Côté serveur

```ts
// Notification simple
player.showNotification('You have unlocked the secret passage');

// Notification avec durée personnalisée
player.showNotification('Item received!', { time: 2000 });

// Notification complète avec icône et son
player.showNotification('Level up!', {
  time: 4000,
  icon: 'level-up-icon',
  sound: 'level-up-sound'
});
```

### Côté client

```ts
// Les notifications peuvent aussi être affichées côté client
const player = engine.getCurrentPlayer();
player.showNotification('Connection established', { time: 3000 });
```

## Options disponibles

### `time` (number, optionnel)
- **Défaut**: 3000ms (3 secondes)
- **Description**: Durée d'affichage de la notification en millisecondes

```ts
player.showNotification('Quick message', { time: 1000 }); // 1 seconde
player.showNotification('Long message', { time: 5000 });  // 5 secondes
```

### `icon` (string, optionnel)
- **Description**: ID de l'icône à afficher dans la notification
- **Prérequis**: L'icône doit être définie dans les ressources du client

```ts
player.showNotification('Treasure found!', { 
  icon: 'treasure-chest' 
});
```

### `sound` (string, optionnel)
- **Description**: ID du son à jouer lors de l'affichage
- **Prérequis**: Le son doit être défini dans les ressources du client

```ts
player.showNotification('Achievement unlocked!', { 
  sound: 'achievement-sound' 
});
```

## Exemples d'utilisation

### Dans un événement de carte

```ts
export function TreasureChest() {
  return {
    name: "TREASURE-1",
    onInit() {
      this.setGraphic("treasure-chest");
    },
    async onAction(player: RpgPlayer) {
      // Donner de l'or au joueur
      player.gold += 100;
      
      // Afficher une notification
      await player.showNotification('You found 100 gold!', {
        time: 2500,
        icon: 'gold-coin',
        sound: 'coin-sound'
      });
      
      // Supprimer le coffre
      this.remove();
    }
  };
}
```

### Dans les hooks de joueur

```ts
const player: RpgPlayerHooks = {
  onLevelUp(player: RpgPlayer, nbLevel: number) {
    // Notification de montée de niveau
    player.showNotification(`Level Up! You are now level ${player.level}`, {
      time: 4000,
      icon: 'level-up-star',
      sound: 'level-up-fanfare'
    });
  },
  
  onInput(player: RpgPlayer, { input }) {
    if (input === 'inventory') {
      player.showNotification('Inventory opened', { time: 1000 });
    }
  }
};
```

### Notifications contextuelles

```ts
// Notification d'erreur
player.showNotification('Not enough mana!', {
  time: 2000,
  icon: 'error-icon',
  sound: 'error-sound'
});

// Notification de succès
player.showNotification('Spell learned successfully!', {
  time: 3000,
  icon: 'success-icon',
  sound: 'success-sound'
});

// Notification d'information
player.showNotification('New quest available in town', {
  time: 4000,
  icon: 'quest-icon'
});
```

## Personnalisation avancée

### Gestion des ressources

Pour utiliser des icônes et des sons dans vos notifications, vous devez d'abord les définir dans votre configuration client :

```ts
// Dans votre module client
export default defineModule({
  spritesheets: [
    {
      id: 'ui-icons',
      imageSrc: 'path/to/ui-icons.png',
      framesWidth: 32,
      framesHeight: 32,
      animations: {
        'treasure-icon': { frames: [0] },
        'level-up-icon': { frames: [1] },
        'error-icon': { frames: [2] }
      }
    }
  ],
  sounds: [
    {
      id: 'notification-sound',
      src: 'path/to/notification.mp3'
    }
  ]
});
```

### Notifications multiples

Le système gère automatiquement l'affichage de plusieurs notifications :

```ts
// Les notifications s'empilent automatiquement
player.showNotification('First notification');
player.showNotification('Second notification');
player.showNotification('Third notification');
```

## Bonnes pratiques

1. **Durée appropriée**: Adaptez la durée au contenu du message
   - Messages courts: 1-2 secondes
   - Messages informatifs: 3-4 secondes
   - Messages importants: 4-5 secondes

2. **Cohérence visuelle**: Utilisez des icônes cohérentes pour les types de messages similaires

3. **Feedback audio**: Utilisez des sons pour renforcer l'importance des notifications

4. **Évitez le spam**: Ne pas afficher trop de notifications simultanément

```ts
// ❌ Éviter
for (let i = 0; i < 10; i++) {
  player.showNotification(`Message ${i}`);
}

// ✅ Préférer
player.showNotification('10 items collected!');
```

## Compatibilité

- ✅ Serveur: Fonctionne dans tous les contextes serveur
- ✅ Client: Fonctionne dans tous les contextes client
- ✅ Responsive: S'adapte automatiquement à la taille de l'écran
- ✅ Animations: Transitions d'entrée et de sortie fluides

## API Reference

### `player.showNotification(message, options?)`

**Paramètres:**
- `message` (string): Le message à afficher
- `options` (object, optionnel):
  - `time` (number): Durée en millisecondes (défaut: 3000)
  - `icon` (string): ID de l'icône à afficher
  - `sound` (string): ID du son à jouer

**Retour:**
- `Promise<any>`: Promesse résolue quand la notification se ferme

**Exemple:**
```ts
await player.showNotification('Message important', {
  time: 5000,
  icon: 'important-icon',
  sound: 'alert-sound'
});
// La notification est maintenant fermée
```