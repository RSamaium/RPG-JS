# Database API

Use this reference for CRUD on game database entities such as actors, items, enemies, and variables.

Current active types in this repo:

- `variables`
- `items`
- `enemies`
- `actors`

## Endpoint pattern

- Search: `GET /api/database/:type?query=<search>`
- List: `GET /api/database/:type`
- Create: `POST /api/database/:type`
- Read one: `GET /api/database/:type/:id`
- Update: `PUT /api/database/:type/:id`
- Delete: `DELETE /api/database/:type/:id`
- Enemy previews: `GET /api/database/enemies/preview?ids=<id1,id2>`
- Main actor: `GET /api/database/actors/main`
- Assign main actor: `PUT /api/database/actors/:id/main`

`:type` is the database resource path, for example `actors`, `items`, `enemies`, or `variables`.

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

Replace `:type` with the collection path (`actors`, `items`, `enemies`, or `variables`) and `:id` with the record `_id`.

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

### `POST /api/database/actors`

Supported fields from `actorSchema`:

- `name: string`
- `graphic?: string`
- `faceset?: string`
- `hitbox?: { width: number, height: number }`
- `initialLevel?: number`
- `finalLevel?: number`
- `expCurve?: { basis, extra, accelerationA, accelerationB }`
- `parameters?: { maxHp, maxSp, str, agi, int, dex }`
- `startingEquipment?: { weaponId?: string, armorId?: string }`
- `startingInventory?: Array<{ itemId: string, amount: number }>`
- `animations?: { attack?: string, hurt?: string, die?: string, castSpell?: string }`
- `skills?: Array<{ skillId: string, level: number }>`

The first actor is assigned automatically when the project has no main actor.
Use `PUT /api/database/actors/:id/main` to assign another actor. The actor must
belong to the API key project. Deleting the current main actor returns `409`, so
assign a replacement first.

`graphic`, `faceset`, and animation fields are media `_id`s. Equipment,
inventory, and skills reference the corresponding database record `_id`s.
Actor hitbox dimensions are positive RPGJS pixels and are not scaled with the
graphic.

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

### `GET /api/database/enemies/preview?ids=<id1,id2>`

Use this endpoint when a UI or agent only needs lightweight enemy display data for known enemy `_id`s.

Response items contain only:

- `_id: string`
- `name?: string`
- `graphic?: string`

Notes:

- `ids` is a comma-separated list of enemy `_id`s.
- Send at most 100 distinct ids per request. Larger requests return `400`.
- The endpoint is scoped to the API key project and ignores ids outside the project.
- It only returns records with `type: "enemy"`.
- It avoids loading full enemy payloads such as behavior, rewards, inventory, and skills.

### `POST /api/database/variables`

Supported fields from `variableSchema`:

- `name: string`
- `description?: string`

## Notes

- The server derives the internal `type` from the URL segment.
- Creation requires a non-empty `name`.
- The API generates a slug-like `id` automatically from the name.
- For updates, send only the fields to change.
- If the user only knows a record name, search the collection first and match the returned `_id`.
# Semantic search

`GET /api/database/:type` accepts `query` and optional `minScore` (`0..1`, default `0.40`). Results are restricted to the requested database type and the API key project.
