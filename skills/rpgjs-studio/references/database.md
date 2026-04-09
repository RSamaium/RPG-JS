# Database API

Use this reference for CRUD on game database entities such as items, enemies, and variables.

Current active types in this repo:

- `variables`
- `items`
- `enemies`

## Endpoint pattern

- Search: `GET /api/database/:type?query=<search>`
- List: `GET /api/database/:type`
- Create: `POST /api/database/:type`
- Read one: `GET /api/database/:type/:id`
- Update: `PUT /api/database/:type/:id`
- Delete: `DELETE /api/database/:type/:id`

`:type` is the database resource path, for example `items`, `enemies`, or `variables`.

## Headers

```bash
-H "x-api-key:$RPGSTUDIO_API_KEY"
-H "Content-Type: application/json"
```

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
- `reward?: { exp?: number, gold?: number, items?: Array<{ itemId: string, amount: number, chance: number }> }`

Notes:

- `graphic` and `faceset` are media `_id`s. Search `/api/media?query=<search>` first.
- `weaponId`, `armorId`, and `itemId` are item `_id`s. Search `/api/database/items?query=<search>` first.

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
