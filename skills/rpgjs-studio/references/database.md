# Database API

Use this reference for CRUD on game database entities such as items, enemies, and variables.

Current active types in this repo:

- `variables`
- `items`
- `enemies`
- `skills`
- `common-events`

## Endpoint pattern

- Search: `GET /api/database/:type?query=<search>`
- List: `GET /api/database/:type`
- Create: `POST /api/database/:type`
- Read one: `GET /api/database/:type/:id`
- Update: `PUT /api/database/:type/:id`
- Delete: `DELETE /api/database/:type/:id`

`:type` is the database resource path, for example `items`, `enemies`, `skills`, `variables`, or `common-events`.

## Headers

```bash
-H "x-api-key:$RPGSTUDIO_API_KEY"
-H "Content-Type: application/json"
```

## Read one record by id

When the user gives a database `_id`, retrieve that exact record with:

```bash
curl -sS "$BASE_URL/api/database/:type/:id" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json"
```

Replace `:type` with the collection path (`items`, `enemies`, `skills`, `variables`, or `common-events`) and `:id` with the record `_id`.

Before updating, deleting, or explaining the record content, read the current record first and use the returned payload as the source of truth. Do not infer field names or values from the id alone.

## Dependency resolution workflow

Use this whenever another API needs an item or database ID:

1. Search first with `GET /api/database/:type?query=<search>`.
2. If a matching record exists, use its `_id`.
3. If not found, create the record with `POST /api/database/:type`.
4. Reuse the `_id` from the create response in the original request.

This is required for flows like:

- Hero starting equipment: `weaponId`, `armorId`
- Hero starting inventory: `itemId`
- Enemy rewards: `reward.items[].itemId`
- Event or page conditions that refer to items

## Payloads from schemas

### `POST /api/database/skills`

Supported fields from `skillSchema`:

- `name: string`
- `description?: string`
- `icon?: string`
- `animation?: string`
- `sound?: string`
- `spCost: number`
- `power: number`
- `element?: "none" | "fire" | "water" | "earth" | "wind" | "light" | "dark"`
- `skillType?: "physical" | "magical" | "support" | "healing"`
- `target?: "single" | "all" | "self" | "ally" | "enemy"`
- `range?: number`
- `successRate?: number`

Notes:

- `name`, `spCost`, and `power` are the required fields from the schema.
- `icon`, `animation`, and `sound` must be media `_id`s. Search `/api/media?query=<search>` first.
- Use media type `icon` for `icon`, media type `animation` for `animation`, and media type `sound` for `sound`.

### `POST /api/database/items`

Supported fields from `itemSchema`:

- `name: string`
- `description?: string`
- `icon?: string`
- `itemType: "item" | "weapon" | "armor"`
- `price?: number`
- `atk?: number`
- `element?: "none" | "fire" | "water" | "earth" | "wind" | "light" | "dark"`
- `weaponType?: "sword" | "axe" | "spear" | "bow" | "staff" | "dagger"`
- `pdef?: number`
- `armorType?: "helmet" | "chest" | "gloves" | "boots" | "shield"`

Notes:

- `name` and `itemType` are the required fields from the schema.
- `icon` must be a media `_id`. Search `/api/media?query=<search>` first.
- For `weapon`, use weapon-oriented fields.
- For `armor`, use armor-oriented fields.

## Example: create a generic item

```bash
curl -sS -X POST "$BASE_URL/api/database/items" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "dazddzd",
    "icon": "",
    "itemType": "item",
    "name": "tzest",
    "price": 10
  }'
```

## Example: create a weapon

```bash
curl -sS -X POST "$BASE_URL/api/database/items" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bronze Sword",
    "description": "Starter sword",
    "itemType": "weapon",
    "price": 25,
    "atk": 8,
    "element": "none",
    "weaponType": "sword",
    "icon": "'"$ICON_MEDIA_ID"'"
  }'
```

## Example: create an armor

```bash
curl -sS -X POST "$BASE_URL/api/database/items" \
  -H "x-api-key:$RPGSTUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Leather Armor",
    "itemType": "armor",
    "price": 20,
    "pdef": 6,
    "armorType": "chest",
    "icon": "'"$ICON_MEDIA_ID"'"
  }'
```

### `POST /api/database/enemies`

Supported fields from `enemySchema`:

- `name: string`
- `graphic?: string`
- `faceset?: string`
- `initialLevel?: number`
- `finalLevel?: number`
- `expCurve?: { basis, extra, accelerationA, accelerationB }`
- `parameters?: { maxHp, maxSp, str, agi, int, dex }`
- `startingEquipment?: { weaponId?: string, armorId?: string }`
- `startingInventory?: Array<{ itemId: string, amount: number }>`
- `animations?: { attack?: string, hurt?: string, die?: string, castSpell?: string }`
- `behavior?: { enemyType?: "aggressive" | "defensive" | "ranged" | "tank" | "berserker", attackCooldown?: number, visionRange?: number, attackRange?: number, dodgeChance?: number, dodgeCooldown?: number, fleeThreshold?: number, attackPatterns?: Array<"melee" | "combo" | "charged" | "zone" | "dashAttack">, patrolWaypoints?: Array<{ x: number, y: number }>, groupBehavior?: boolean }`
- `skills?: Array<{ skillId: string, level: number }>`
- `reward?: { exp?: number, gold?: number, items?: Array<{ itemId: string, amount: number, chance: number }> }`

Notes:

- `graphic` and `faceset` are media `_id`s. Search `/api/media?query=<search>` first.
- `animations.attack`, `animations.hurt`, `animations.die`, and `animations.castSpell` are spritesheet media `_id`s. Search `/api/media?query=<search>` first.
- `weaponId`, `armorId`, and `itemId` are item `_id`s. Search `/api/database/items?query=<search>` first.
- `skills[].skillId` is a skill `_id`. Search `/api/database/skills?query=<search>` first.
- `skills[].level` is the minimum enemy level required to acquire the skill.
- `behavior.dodgeChance` and `behavior.fleeThreshold` use ratios between `0` and `1`.

### `POST /api/database/variables`

Supported fields from `variableSchema`:

- `name: string`
- `description?: string`

### `POST /api/database/common-events`

Supported fields from `commonEventSchema`:

- `name: string`
- `description?: string`
- `triggers?: Array<object>`
- `pages?: Array<object>`
- `parameters?: Array<{ key: string, defaultValue?: unknown }>`

Notes:

- The URL segment is `common-events`; the stored database type is `commonEvent`.
- Common events reuse the same event page trigger model as placed map events.
- Prefer writing runtime pages to `triggers[]`.
- Trigger fields include `type`, `blockCollectionId`, `enabled`, `conditions`, `typeData`, `graphic`, `faceset`, `direction`, `pattern`, `movement`, and `options`.
- `graphic` and `faceset` must be media `_id`s when set.
- Use common event `_id`s in block params as `commonEventId`.

## Notes

- The server derives the internal `type` from the URL segment.
- Creation requires a non-empty `name`.
- The API generates a slug-like `id` automatically from the name.
- For updates, send only the fields to change.
- If the user only knows a record name, search the collection first and match the returned `_id`.
