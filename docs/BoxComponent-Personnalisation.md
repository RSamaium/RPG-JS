# BoxComponent - Guide de Personnalisation

Le `BoxComponent` a été amélioré pour offrir de nombreuses options de personnalisation pour la position, la couleur et l'apparence.

## Props Disponibles

### Position et Layout

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `positionType` | string | `"absolute"` | Type de positionnement ("absolute", "relative") |
| `top` | number | `0` | Position depuis le haut |
| `left` | number | `0` | Position depuis la gauche |
| `right` | number | `null` | Position depuis la droite |
| `bottom` | number | `null` | Position depuis le bas |
| `anchor` | array | `[0.5, 0.5]` | Point d'ancrage [x, y] (0-1) |
| `zIndex` | number | `0` | Ordre d'affichage en profondeur |

### Dimensions

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `width` | number | Requis | Largeur de la boîte |
| `height` | number | Requis | Hauteur de la boîte |

### Apparence

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `color` | string | `"#1a1a2e"` | Couleur de fond (hex, rgb, etc.) |
| `alpha` | number | `0.9` | Transparence (0-1) |
| `borderRadius` | number | `0` | Rayon des coins arrondis |

### Bordure

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `border` | object/null | `null` | Configuration de la bordure |

Structure de l'objet `border` :
```javascript
{
  width: 2,        // Épaisseur de la bordure
  color: "#595971" // Couleur de la bordure
}
```

### Ombre

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `shadow` | object/null | `null` | Configuration de l'ombre |

Structure de l'objet `shadow` :
```javascript
{
  color: "#000",    // Couleur de l'ombre
  blur: 5,          // Flou de l'ombre
  offsetX: 2,       // Décalage horizontal
  offsetY: 2        // Décalage vertical
}
```

## Exemples d'Utilisation

### Boîte Simple
```javascript
<BoxComponent width={120} height={70} top={10} left={10}>
  <Container>
    <Text text="Contenu simple" color="white" />
  </Container>
</BoxComponent>
```

### Boîte avec Style Complet
```javascript
<BoxComponent 
  width={150} 
  height={80} 
  top={10} 
  left={10}
  color="#2c3e50"
  alpha={0.95}
  borderRadius={10}
  border={{ width: 3, color: "#e74c3c" }}
  shadow={{ color: "#000", blur: 8, offsetX: 4, offsetY: 4 }}
  zIndex={100}
>
  <Container>
    <Text text="Boîte stylisée" color="white" />
  </Container>
</BoxComponent>
```

### Positionnement en Bas à Droite
```javascript
<BoxComponent 
  width={100} 
  height={50} 
  bottom={20} 
  right={20}
  color="#8e44ad"
  borderRadius={8}
>
  <Container>
    <Text text="Menu" color="white" />
  </Container>
</BoxComponent>
```

### Boîte avec Ancrage Personnalisé
```javascript
<BoxComponent 
  width={120} 
  height={60} 
  top={100} 
  left={10}
  anchor={[0, 0]}  // Ancrage en haut à gauche
  color="#27ae60"
  alpha={0.8}
>
  <Container>
    <Text text="Ancrage personnalisé" color="white" />
  </Container>
</BoxComponent>
```

## Configuration Globale

La couleur par défaut peut être configurée globalement via `engine.globalConfig.gui.windowColor`.

## Notes Techniques

- Les valeurs de `border` et `shadow` sont des objets réactifs qui peuvent être modifiés dynamiquement
- Le `positionType` permet de choisir entre positionnement absolu et relatif
- L'`anchor` détermine le point de référence pour le positionnement (centre par défaut)
- Le `zIndex` permet de contrôler l'ordre d'affichage des éléments superposés

## Compatibilité

Ces améliorations sont rétrocompatibles avec l'ancienne API du BoxComponent. Tous les anciens usages continueront de fonctionner avec les valeurs par défaut.