# Block System - Visual Programming for RPG Events

## Overview

Ce système de blocs permet la création d'événements RPG via programmation visuelle. Il est utilisé par :
- **Front-end** : Affichage des formulaires et édition visuelle
- **Back-end** : Gestion et validation des blocs
- **IA** : Génération intelligente de blocs à partir de descriptions textuelles
- **Moteur de jeu** : Exécution des blocs dans RPGJS

## Architecture d'Exécution

Le système de blocs fonctionne en plusieurs couches :

```
┌─────────────────────────────────────────────────────────────┐
│  Front-end (Angular)                                        │
│  - Event Builder UI                                         │
│  - Édition visuelle des blocs                               │
│  - Validation des schémas                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Common Blocks (TypeScript)                                  │
│  - definitions.ts : Définitions et schémas                 │
│  - types.ts : Types TypeScript                              │
│  - executors.ts : Logique d'exécution                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Moteur de Jeu (RPGJS)                                      │
│  - BlockExecutionService : Orchestration                    │
│  - GameExecutionContext : Contexte typé                    │
│  - Exécution dans les événements (onInit, onAction, etc.)   │
└─────────────────────────────────────────────────────────────┘
```

### Flux d'Exécution

1. **Définition** : Le bloc est défini dans `definitions.ts` avec son schéma JSON
2. **Typage** : Les paramètres sont typés dans `types.ts` via `BlockParamsMap`
3. **Exécution** : L'exécuteur est implémenté dans `executors.ts`
4. **Intégration** : Le bloc est automatiquement disponible dans le moteur via `BlockExecutionService`

### Contexte d'Exécution

Lors de l'exécution, chaque bloc reçoit un `GameExecutionContext` typé :

```typescript
interface GameExecutionContext {
  player: RpgPlayer;        // Instance du joueur (de @rpgjs/server)
  event: RpgEvent;          // Instance de l'événement (de @rpgjs/server)
  game: ExecutionGame;      // Instance du jeu
  
  // Méthodes utilitaires
  getVariable(variableId: string): unknown;
  setVariable(variableId: string, value: unknown): void;
  getSwitch(switchId: string): boolean;
  setSwitch(switchId: string, value: boolean): void;
  callEvent(eventId: string, params: Record<string, unknown>): Promise<void>;
  executeScript(code: string): Promise<void>;
  // ... autres méthodes
}
```

## Source de Vérité Unique

**Fichier central :** [`definitions.ts`](./definitions.ts)

Ce fichier contient toutes les définitions de blocs avec leurs schémas JSON Schema complets.

```typescript
import { defaultBlocks } from '@common/blocks';

// Tous les blocs disponibles avec leurs schémas
console.log(defaultBlocks);
```

## Structure d'un Bloc

```typescript
{
  type: 'show_text',                    // Type unique
  label: 'Show Text',                   // Label UI
  description: 'Display a message',     // Description pour l'IA
  category: 'message',                  // Catégorie
  icon: '💬',                           // Icône
  canHaveChildren: false,               // Peut contenir des blocs enfants?
  outputs: [],                          // Ports de sortie (pour branches)
  schema: {                             // JSON Schema
    type: 'object',
    properties: {
      text: { type: 'string', title: 'Message', format: 'textarea' },
      position: { type: 'string', enum: ['top', 'bottom'], default: 'bottom' }
    },
    required: ['text']
  }
}
```

## Configuration IA

**Fichier :** [`server/src/ai/config.ts`](../../server/src/ai/config.ts)

```typescript
import { blockGenerationModel } from '@server/ai/config';

// Configuration centralisée pour la génération de blocs par IA
const config = blockGenerationModel.getConfig();
// {
//   model: 'gpt-4o',
//   temperature: 0.3,
//   maxTokens: 4000,
//   responseFormat: { type: 'json_object' }
// }

// Prompt système avec définitions complètes
const prompt = blockGenerationModel.systemPrompt(
  JSON.stringify(defaultBlocks, null, 2)
);
```

## Prévention des Hallucinations

Le système empêche l'IA d'inventer des blocs invalides via :

1. **Schémas JSON complets** envoyés à l'IA
2. **Température basse** (0.3) pour cohérence
3. **Format de réponse forcé** (JSON)
4. **Instructions strictes** dans le prompt système
5. **Validation post-génération** contre les schémas
6. **Rejet automatique** des blocs invalides avec logs détaillés

## Utilisation

### 1. Front-end (Angular)

```typescript
import { BlockRegistryService } from './block-registry.service';
import { registerDefaultBlocks } from './blocks';

export class EventBuilderComponent {
  constructor(public registry: BlockRegistryService) {
    // Enregistrer tous les blocs par défaut
    registerDefaultBlocks(this.registry);
  }
  
  // Le schéma est automatiquement récupéré
  selectedBlockSchema = computed(() => {
    const block = this.selectedBlock();
    return block ? this.registry.getSchema(block.type) : null;
  });
}
```

### 2. Back-end (API)

```typescript
import { BlockCompilerService } from '@server/services/compiler';
import { defaultBlocks } from '@common/blocks';

// Créer le service de compilation
const compiler = new BlockCompilerService();

// Générer des blocs via IA
const blocks = await compiler.generateBlocks(
  "Show a welcome message and add 100 gold",
  existingBlocks,
  llmProvider
);

// Résultat : Blocs validés et prêts à utiliser
```

### 3. Génération IA (Event Pipeline)

```typescript
import { blockGenerationModel } from '@server/ai/config';
import { defaultBlocks } from '@common/blocks';

// Préparer les définitions pour l'IA
const blockDefinitions = defaultBlocks.map(block => ({
  type: block.type,
  label: block.label,
  description: block.description,
  schema: block.schema,
  requiredFields: block.schema?.required || []
}));

// Générer le prompt système
const systemPrompt = blockGenerationModel.systemPrompt(
  JSON.stringify(blockDefinitions, null, 2)
);

// Configurer l'appel OpenAI
const config = blockGenerationModel.getConfig();
const response = await openai.chat.completions.create({
  model: config.model,
  temperature: config.temperature,
  max_tokens: config.max_tokens,
  response_format: config.response_format,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userRequest }
  ]
});

// Parser et valider la réponse
const validatedBlocks = parseAndValidate(response);
```

### 4. Validation

```typescript
import { findBlockByType } from '@common/blocks';

function validateBlock(block: any): boolean {
  // 1. Vérifier que le type existe
  const definition = findBlockByType(block.type);
  if (!definition) return false;
  
  // 2. Vérifier les propriétés requises
  if (definition.schema?.required) {
    for (const required of definition.schema.required) {
      if (!block.data || !(required in block.data)) {
        return false;
      }
    }
  }
  
  // 3. Valider les types et enums
  // ... (voir BlockCompilerService pour la validation complète)
  
  return true;
}
```

## Ajouter un Nouveau Bloc

Ce guide explique comment ajouter un nouveau bloc de bout en bout, de la définition à l'exécution dans le moteur de jeu.

### Étape 1 : Définir les Types TypeScript

Éditer [`types.ts`](./types.ts) pour ajouter les types de paramètres :

```typescript
// Dans l'interface BlockParamsMap
export interface BlockParamsMap {
  // ... autres blocs
  my_new_block: MyNewBlockParams;
}

// Définir l'interface des paramètres
export interface MyNewBlockParams {
  parameter1: string;
  parameter2?: number;
  // ... autres paramètres
}
```

### Étape 2 : Définir le Bloc

Éditer [`definitions.ts`](./definitions.ts) pour ajouter la définition du bloc :

```typescript
export const defaultBlocks: AnyBlockDefinition[] = [
  // ... blocs existants
  {
    type: 'my_new_block',
    label: 'My New Block',
    description: 'Does something awesome',
    category: 'system',
    icon: '✨',
    schema: {
      type: 'object',
      properties: {
        parameter1: {
          type: 'string',
          title: 'Parameter 1',
          description: 'Description for the AI'
        },
        parameter2: {
          type: 'number',
          title: 'Parameter 2',
          minimum: 0,
          default: 10
        }
      },
      required: ['parameter1']
    }
  }
];
```

**Important :** Le schéma JSON doit correspondre exactement à l'interface TypeScript définie dans `BlockParamsMap`.

### Étape 3 : Implémenter l'Exécuteur

Éditer [`executors.ts`](./executors.ts) pour ajouter la logique d'exécution :

```typescript
export const defaultExecutors: BlockExecutorRegistry<BlockType> = {
  // ... autres exécuteurs
  
  /**
   * Executes the my_new_block block
   * 
   * @param context - The game execution context
   * @param params - Typed parameters from BlockParamsMap['my_new_block']
   */
  my_new_block: async (context, params) => {
    // Accéder au joueur (typé comme RpgPlayer)
    const player = context.player;
    
    // Accéder à l'événement (typé comme RpgEvent)
    const event = context.event;
    
    // Utiliser les paramètres typés
    const value1 = params.parameter1;
    const value2 = params.parameter2 ?? 10; // Valeur par défaut
    
    // Implémenter la logique du bloc
    // Exemple : modifier l'or du joueur
    player.gold += value2;
    
    // Ou utiliser les méthodes du contexte
    context.setVariable('lastAction', value1);
    
    // Les méthodes disponibles dans context :
    // - context.player : RpgPlayer instance
    // - context.event : RpgEvent instance
    // - context.getVariable(variableId): unknown
    // - context.setVariable(variableId, value): void
    // - context.getSwitch(switchId): boolean
    // - context.setSwitch(switchId, value): void
    // - context.callEvent(eventId, params): Promise<void>
    // - context.executeScript(code): Promise<void>
  }
};
```

**Points importants :**
- Les paramètres `params` sont **automatiquement typés** selon `BlockParamsMap['my_new_block']`
- Le `context` est typé comme `GameExecutionContext` avec `player` de type `RpgPlayer`
- Tous les exécuteurs sont asynchrones et peuvent retourner `Promise<void>` ou `void`

### Étape 4 : Utilisation dans le Moteur de Jeu

Le bloc est automatiquement disponible dans le moteur de jeu via `BlockExecutionService` :

```typescript
// Dans rpgjs/src/modules/studio-map/server.ts
import { BlockExecutionService } from "./block-executor";
import type { AnyBlockInstance } from "@common/blocks";

// Le service est créé automatiquement lors de l'exécution d'un événement
eventObj.executeBlocks = async function(player: RpgPlayer, triggerType: string, event: RpgEvent) {
  const blockExecutor = new BlockExecutionService(player, event);
  const trigger = object.triggers.find((t: EventTrigger) => t.type === triggerType);
  if (trigger && trigger.blocks) {
    // Exécute tous les blocs de la séquence, y compris votre nouveau bloc
    await blockExecutor.executeBlockSequence(trigger.blocks);
  }
};
```

**Flux d'exécution :**
1. L'événement RPGJS appelle `executeBlocks()` avec les blocs définis
2. `BlockExecutionService` crée un contexte d'exécution typé
3. Chaque bloc est exécuté via son exécuteur correspondant dans `defaultExecutors`
4. Les paramètres sont automatiquement validés et typés

### Résultat

Une fois ces étapes complétées, votre bloc est :
- ✅ **Typé** : TypeScript garantit la cohérence des types
- ✅ **Disponible dans l'UI** : Apparaît automatiquement dans l'Event Builder
- ✅ **Générable par l'IA** : L'IA peut créer des instances de ce bloc
- ✅ **Validé** : Les paramètres sont validés contre le schéma JSON
- ✅ **Exécutable** : Fonctionne dans le moteur de jeu RPGJS

### Exemple Complet : Bloc "Add Experience"

```typescript
// 1. types.ts
export interface BlockParamsMap {
  // ...
  add_experience: AddExperienceParams;
}

export interface AddExperienceParams {
  type: 'constant' | 'variable';
  amount?: number;
  amountVariableId?: string;
}

// 2. definitions.ts
{
  type: 'add_experience',
  label: 'Add Experience',
  description: 'Add experience points to the player',
  category: 'variable',
  icon: '⭐',
  schema: createVariableModificationSchema(
    OPERATION_SETS.ADDITIVE,
    'Experience Amount',
    'Constant amount of experience to add',
    'Experience Variable',
    'Variable containing the experience amount'
  )
}

// 3. executors.ts
add_experience: async (context, params) => {
  const amount = params.type === 'constant'
    ? (params.amount ?? 0)
    : (() => {
        const v = context.getVariable(params.amountVariableId ?? '');
        return typeof v === 'number' ? v : 0;
      })();
  
  // Utiliser l'API RPGJS pour ajouter de l'expérience
  if (context.player.addExperience) {
    context.player.addExperience(amount);
  } else {
    // Fallback : utiliser une variable
    const currentExp = context.getVariable('player_experience') as number ?? 0;
    context.setVariable('player_experience', currentExp + amount);
  }
}
```

### Tester et Déboguer un Nouveau Bloc

#### 1. Vérifier la Compilation TypeScript

```bash
# Vérifier que les types sont corrects
npm run build
# ou
npx tsc --noEmit
```

#### 2. Tester dans l'UI

1. Démarrer le serveur de développement :
   ```bash
   npm run dev
   ```

2. Ouvrir l'Event Builder dans le navigateur
3. Vérifier que votre bloc apparaît dans la bibliothèque de blocs
4. Créer un événement avec votre bloc et tester l'exécution

#### 3. Tester l'Exécution dans le Moteur

```typescript
// Créer un test manuel dans le moteur
import { BlockExecutionService } from '@rpgjs/modules/studio-map/block-executor';
import { createBlockInstance } from '@common/blocks';

// Créer une instance de votre bloc
const testBlock = createBlockInstance('my_new_block', 'test-1', {
  parameter1: 'test value',
  parameter2: 42
});

// Créer un contexte de test
const blockExecutor = new BlockExecutionService(mockPlayer, mockEvent);

// Exécuter le bloc
await blockExecutor.executeBlockSequence([testBlock]);
```

#### 4. Déboguer les Erreurs

**Erreur : "No executor found for block type"**
- Vérifier que l'exécuteur est bien exporté dans `defaultExecutors`
- Vérifier que le type du bloc correspond exactement dans `BlockParamsMap`

**Erreur : "Property X is missing"**
- Vérifier que le schéma JSON correspond à l'interface TypeScript
- Vérifier que les propriétés requises sont bien définies dans le schéma

**Erreur de type TypeScript**
- Vérifier que `BlockParamsMap` contient bien votre bloc
- Vérifier que l'interface des paramètres correspond au schéma JSON

#### 5. Logs et Debugging

```typescript
// Dans votre exécuteur, ajouter des logs
my_new_block: async (context, params) => {
  console.log('[MyNewBlock] Executing with params:', params);
  console.log('[MyNewBlock] Player:', context.player);
  console.log('[MyNewBlock] Event:', context.event);
  
  // Votre logique ici
  
  console.log('[MyNewBlock] Execution complete');
}
```

## Catégories de Blocs

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| `message` | Dialogues et messages | show_text, show_choices |
| `control` | Flux de contrôle | conditional_branch, loop, wait |
| `variable` | Gestion des variables | set_variable, change_gold, change_item |
| `character` | Actions sur personnages | move_character, change_graphic |
| `scene` | Gestion de scène | transfer_player, camera_follow, change_screen_tone |
| `audio` | Sons et musiques | play_bgm, play_se |
| `system` | Actions système | call_common_event, script |

## Schémas JSON Avancés

### Propriétés Conditionnelles

```typescript
schema: {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['constant', 'variable'],
      default: 'constant'
    }
  },
  allOf: [
    {
      if: { properties: { type: { const: 'constant' } } },
      then: {
        properties: {
          value: { type: 'number', title: 'Value' }
        },
        required: ['value']
      },
      else: {
        properties: {
          variableId: { type: 'string', title: 'Variable', $ref: '#/functions/variable' }
        },
        required: ['variableId']
      }
    }
  ]
}
```

### Helpers pour Schémas Réutilisables

```typescript
import { createVariableModificationSchema, OPERATION_SETS } from '@common/blocks/definitions';

// Créer un schéma de modification de variable
const goldSchema = createVariableModificationSchema(
  OPERATION_SETS.CURRENCY,
  'Amount',
  'Constant amount of gold',
  'Amount Variable',
  'Variable containing the gold amount'
);

// Utiliser dans un bloc
{
  type: 'change_gold',
  label: 'Change Gold',
  schema: goldSchema
}
```

### Formats Personnalisés

Les chaînes visibles par le joueur peuvent utiliser les templates Studio :

```text
Bonjour {{ variable:player.name | label:Player name }}
Client : {{ variable:variable.customer.firstName | label:Customer first name }}
```

- `player.<path>` lit une propriété du joueur courant.
- `variable.<id>[.<path>]` lit une variable persistante, puis éventuellement
  une propriété imbriquée dans sa valeur.
- `label` est optionnel et sert uniquement à l'éditeur Studio.
- Un token inconnu ou une valeur `null`/`undefined` reste inchangé dans le texte.
- `{hp}` et `{level}` restent acceptés pour les anciens projets.

Le parseur et le résolveur sont disponibles depuis `@rpgjs/studio/runtime` :

```typescript
import {
  parseStringTemplate,
  resolveStringTemplate,
} from '@rpgjs/studio/runtime'

const tokens = parseStringTemplate(message)
const rendered = resolveStringTemplate(message, { player })
```

Un champ compatible expose le helper dans son format JSON Schema :

```typescript
import { studioStringTemplateFormat } from '@rpgjs/studio/runtime'

const messageSchema = {
  type: 'string',
  format: studioStringTemplateFormat,
}
```

```typescript
properties: {
  text: {
    type: 'string',
    title: 'Message',
    format: 'textarea'        // Affiche un textarea au lieu d'un input
  },
  image: {
    type: 'string',
    title: 'Image',
    format: {                 // Format personnalisé
      name: 'media',
      type: 'image',
      buttonLabel: 'Select Image',
      useUpload: {
        accept: 'image/*'
      }
    }
  },
  icon: {
    type: 'string',
    title: 'Icon',
    format: {
      name: 'media',
      type: 'icon',
      buttonLabel: 'Select Icon',
      useUpload: {
        accept: 'image/*'
      }
    }
  },
  sound: {
    type: 'string',
    title: 'Sound',
    format: {
      name: 'media',
      type: 'sound',
      buttonLabel: 'Select Sound Effect',
      useUpload: {
        accept: 'audio/*'
      }
    }
  },
  face: {
    type: 'string',
    title: 'Face',
    format: { name: 'faceset-expression' }
  },
  itemId: {
    type: 'string',
    title: 'Item',
    $ref: '#/functions/item',
    format: {
      add: {
        schema: itemSchema
      }
    }
  }
}
```

## API Endpoints

```
GET    /api/blocks/definitions           → Récupère les définitions de blocs
POST   /api/blocks/generate              → Génère des blocs via IA
GET    /api/blocks/:collectionId         → Récupère une collection
PUT    /api/blocks/:collectionId         → Met à jour une collection
POST   /api/blocks/:collectionId/blocks  → Ajoute un bloc
PUT    /api/blocks/:collectionId/blocks/:blockId → Met à jour un bloc
DELETE /api/blocks/:collectionId/blocks/:blockId → Supprime un bloc
GET    /api/blocks/:collectionId/validate → Valide une collection
POST   /api/blocks/suggestions           → Obtient des suggestions de blocs
POST   /api/blocks/validate-blocks       → Valide un ensemble de blocs
```

## Helpers et Utilitaires

```typescript
import {
  defaultBlocks,
  findBlockByType,
  getBlocksByCategory,
  getCategorizedBlocks,
  createVariableModificationSchema,
  createConditionSchema,
  OPERATION_SETS,
  CONDITION_TYPE_SETS
} from '@common/blocks';

// Trouver un bloc par type
const showTextBlock = findBlockByType('show_text');

// Récupérer tous les blocs d'une catégorie
const messageBlocks = getBlocksByCategory('message');

// Récupérer tous les blocs groupés par catégorie
const allCategories = getCategorizedBlocks();

// Créer un schéma de modification de variable
const customSchema = createVariableModificationSchema(
  OPERATION_SETS.ARITHMETIC,
  'Custom Value',
  'Description'
);

// Créer un schéma de condition
const conditionSchema = createConditionSchema(
  CONDITION_TYPE_SETS.BASIC,
  'Condition Title',
  'Condition Description'
);
```

## Documentation Complète

Pour plus de détails sur l'architecture, voir :

📖 **[Block System Architecture](../../docs/block-system-architecture.md)**

Cette documentation couvre :
- Architecture complète du système
- Flux de données détaillé
- Prévention des hallucinations
- Exemples d'utilisation complets
- Guide d'extension

## Tests

```typescript
import { validateBlock } from '@server/services/compiler';
import { defaultBlocks } from '@common/blocks';

describe('Block Validation', () => {
  it('should validate a correct block', () => {
    const block = {
      id: 'test_123',
      type: 'show_text',
      data: {
        text: 'Hello World',
        position: 'bottom'
      }
    };
    
    expect(validateBlock(block)).toBe(true);
  });
  
  it('should reject a block with missing required field', () => {
    const block = {
      id: 'test_123',
      type: 'show_text',
      data: {
        position: 'bottom'
        // 'text' manquant (requis)
      }
    };
    
    expect(validateBlock(block)).toBe(false);
  });
  
  it('should reject unknown block type', () => {
    const block = {
      id: 'test_123',
      type: 'unknown_block',  // Type non défini
      data: {}
    };
    
    expect(validateBlock(block)).toBe(false);
  });
});
```

## Best Practices

### ✅ DO

- Utiliser `defaultBlocks` comme source de vérité unique
- Valider tous les blocs avant de les sauvegarder
- Utiliser les helpers pour créer des schémas réutilisables
- Documenter les nouveaux blocs avec JSDoc
- Tester la validation des nouveaux blocs

### ❌ DON'T

- Ne pas dupliquer les définitions de blocs
- Ne pas modifier les blocs sans mettre à jour les schémas
- Ne pas ignorer les erreurs de validation
- Ne pas créer de types de blocs en dehors de `definitions.ts`
- Ne pas contourner la validation de l'IA

## Troubleshooting

### L'IA génère des blocs invalides

**Cause :** Le prompt système n'a pas reçu les schémas complets

**Solution :**
```typescript
// S'assurer d'utiliser blockGenerationModel.systemPrompt()
const systemPrompt = blockGenerationModel.systemPrompt(
  JSON.stringify(blockDefinitions, null, 2)
);
```

### Les blocs ne s'affichent pas dans l'UI

**Cause :** Les blocs ne sont pas enregistrés dans le registry

**Solution :**
```typescript
import { registerDefaultBlocks } from './blocks';

constructor(public registry: BlockRegistryService) {
  registerDefaultBlocks(this.registry);
}
```

### Validation échoue pour un bloc valide

**Cause :** Schéma mal défini ou propriétés supplémentaires non autorisées

**Solution :**
- Vérifier que le schéma dans `definitions.ts` est correct
- Vérifier que toutes les propriétés sont définies dans le schéma
- Vérifier les types de données

## Support

Pour toute question ou problème :
1. Consulter la [documentation complète](../../docs/block-system-architecture.md)
2. Vérifier les exemples dans [`definitions.ts`](./definitions.ts)
3. Consulter les tests dans [`server/tests/`](../../server/tests/)

## License

Ce système de blocs fait partie du projet RPGJS Studio.
