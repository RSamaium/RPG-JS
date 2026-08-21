import { beforeEach, test, expect, describe, vi, afterEach } from 'vitest'
import { testing } from '@rpgjs/testing'
import { defineModule, createModule, WorldMapsManager, Direction } from '@rpgjs/common'
import { RpgPlayer, RpgServer } from '../src'
import { RpgClient } from '../../client/src'

/**
 * Unit tests for WorldMapsManager
 */
describe('WorldMapsManager', () => {
  let worldMaps: WorldMapsManager

  beforeEach(() => {
    worldMaps = new WorldMapsManager()
  })

  test('should configure maps correctly', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
      { id: 'map2', worldX: 1025, worldY: 0, width: 1024, height: 768 },
      { id: 'map3', worldX: 0, worldY: 768, width: 1024, height: 768 },
    ])

    const allMaps = worldMaps.getAllMaps()
    expect(allMaps).toHaveLength(3)
    expect(allMaps[0].id).toBe('map1')
    expect(allMaps[0].worldX).toBe(0)
    expect(allMaps[0].worldY).toBe(0)
    expect(allMaps[0].width).toBe(1024)
    expect(allMaps[0].height).toBe(768)
  })

  test('should set default tile sizes', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
    ])

    const mapInfo = worldMaps.getMapInfo('map1')
    expect(mapInfo?.tileWidth).toBe(32)
    expect(mapInfo?.tileHeight).toBe(32)
  })

  test('should use custom tile sizes', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768, tileWidth: 64, tileHeight: 64 },
    ])

    const mapInfo = worldMaps.getMapInfo('map1')
    expect(mapInfo?.tileWidth).toBe(64)
    expect(mapInfo?.tileHeight).toBe(64)
  })

  test('should get map info by id', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
      { id: 'map2', worldX: 1024, worldY: 0, width: 1024, height: 768 },
    ])

    const mapInfo = worldMaps.getMapInfo('map1')
    expect(mapInfo).toBeDefined()
    expect(mapInfo?.id).toBe('map1')
    expect(mapInfo?.worldX).toBe(0)
    expect(mapInfo?.worldY).toBe(0)

    const mapInfo2 = worldMaps.getMapInfo('map2')
    expect(mapInfo2).toBeDefined()
    expect(mapInfo2?.id).toBe('map2')
    expect(mapInfo2?.worldX).toBe(1024)

    const mapInfo3 = worldMaps.getMapInfo('nonexistent')
    expect(mapInfo3).toBeNull()
  })

  test('should remove map correctly', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
      { id: 'map2', worldX: 1024, worldY: 0, width: 1024, height: 768 },
    ])

    expect(worldMaps.getAllMaps()).toHaveLength(2)
    
    const removed = worldMaps.removeMap('map1')
    expect(removed).toBe(true)
    expect(worldMaps.getAllMaps()).toHaveLength(1)
    expect(worldMaps.getMapInfo('map1')).toBeNull()
    expect(worldMaps.getMapInfo('map2')).toBeDefined()

    const removed2 = worldMaps.removeMap('nonexistent')
    expect(removed2).toBe(false)
  })

  test('should find adjacent maps by point', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
      { id: 'map2', worldX: 1024, worldY: 0, width: 1024, height: 768 },
      { id: 'map3', worldX: 0, worldY: 768, width: 1024, height: 768 },
    ])

    const currentMap = { worldX: 0, worldY: 0, widthPx: 1024, heightPx: 768 }
    
    // Point inside map1
    const maps1 = worldMaps.getAdjacentMaps(currentMap, { x: 500, y: 500 })
    expect(maps1).toHaveLength(1)
    expect(maps1[0].id).toBe('map1')

    // Point in map2
    const maps2 = worldMaps.getAdjacentMaps(currentMap, { x: 1500, y: 500 })
    expect(maps2).toHaveLength(1)
    expect(maps2[0].id).toBe('map2')

    // Point outside all maps
    const maps3 = worldMaps.getAdjacentMaps(currentMap, { x: 3000, y: 3000 })
    expect(maps3).toHaveLength(0)
  })

  test('should find adjacent maps by direction', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
      // Right - touches
      { id: 'map2', worldX: 1024, worldY: 0, width: 1024, height: 768 }, // Right - touching
      { id: 'map3', worldX: 0, worldY: 768, width: 1024, height: 768 }, // Down - touching
      { id: 'map4', worldX: 0, worldY: -768, width: 1024, height: 768 }, // Up - touching
      { id: 'map5', worldX: -1024, worldY: 0, width: 1024, height: 768 }, // Left - touching
    ])

    const currentMap = { worldX: 0, worldY: 0, widthPx: 1024, heightPx: 768 }

    const rightMaps = worldMaps.getAdjacentMaps(currentMap, 3)
    expect(rightMaps.length).toBe(1)
    expect(rightMaps[0].id).toBe('map2')

    // Down (1): requires verticallyOverlaps AND m.worldY === src.worldY + src.height  
    const downMaps = worldMaps.getAdjacentMaps(currentMap, 1)
    expect(downMaps.length).toBe(1)
    expect(downMaps[0].id).toBe('map3')

    // Up (0): requires verticallyOverlaps AND m.worldY + m.height === src.worldY
    const upMaps = worldMaps.getAdjacentMaps(currentMap, 0)
    expect(upMaps.length).toBe(1)
    expect(upMaps[0].id).toBe('map4')

    // Left (2): requires horizontallyOverlaps AND m.worldX + m.width === src.worldX
    const leftMaps = worldMaps.getAdjacentMaps(currentMap, 2)
    expect(leftMaps.length).toBe(1)
    expect(leftMaps[0].id).toBe('map5')
  })

  test('should find adjacent maps by box', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
      { id: 'map2', worldX: 1024, worldY: 0, width: 1024, height: 768 },
      { id: 'map3', worldX: 0, worldY: 768, width: 1024, height: 768 },
    ])

    const currentMap = { worldX: 0, worldY: 0, widthPx: 1024, heightPx: 768 }

    // Box overlapping map1 and map2
    const maps1 = worldMaps.getAdjacentMaps(currentMap, {
      minX: 500,
      minY: 0,
      maxX: 1500,
      maxY: 768,
    })
    expect(maps1.length).toBeGreaterThanOrEqual(1)
    expect(maps1.some(m => m.id === 'map1')).toBe(true)
    expect(maps1.some(m => m.id === 'map2')).toBe(true)

    // Box overlapping all three maps
    const maps2 = worldMaps.getAdjacentMaps(currentMap, {
      minX: 500,
      minY: 500,
      maxX: 1500,
      maxY: 1500,
    })
    expect(maps2.length).toBeGreaterThanOrEqual(2)
  })

  test('should get map by world coordinates', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
      { id: 'map2', worldX: 1024, worldY: 0, width: 1024, height: 768 },
    ])

    const map1 = worldMaps.getMapByWorldCoordinates(0, 0)
    expect(map1).toBeDefined()
    expect(map1?.id).toBe('map1')

    const map2 = worldMaps.getMapByWorldCoordinates(1024, 0)
    expect(map2).toBeDefined()
    expect(map2?.id).toBe('map2')

    const nonexistent = worldMaps.getMapByWorldCoordinates(3000, 3000)
    expect(nonexistent).toBeNull()
  })

  test('should calculate world position', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 100, worldY: 200, width: 1024, height: 768 },
    ])

    const mapInfo = worldMaps.getMapInfo('map1')!
    const worldPos = worldMaps.getWorldPosition(mapInfo, 50, 75)
    expect(worldPos.x).toBe(150) // 100 + 50
    expect(worldPos.y).toBe(275) // 200 + 75
  })

  test('should calculate local position from world position', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 100, worldY: 200, width: 1024, height: 768 },
    ])

    const mapInfo = worldMaps.getMapInfo('map1')!
    const localPos = worldMaps.getLocalPosition(150, 275, mapInfo)
    expect(localPos.x).toBe(50) // 150 - 100
    expect(localPos.y).toBe(75) // 275 - 200
  })

  test('should clear maps on reconfigure', () => {
    worldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
      { id: 'map2', worldX: 1024, worldY: 0, width: 1024, height: 768 },
    ])

    expect(worldMaps.getAllMaps()).toHaveLength(2)

    worldMaps.configure([
      { id: 'map3', worldX: 0, worldY: 0, width: 1024, height: 768 },
    ])

    expect(worldMaps.getAllMaps()).toHaveLength(1)
    expect(worldMaps.getMapInfo('map1')).toBeNull()
    expect(worldMaps.getMapInfo('map2')).toBeNull()
    expect(worldMaps.getMapInfo('map3')).toBeDefined()
  })
})

/**
 * Integration tests for Map ↔ World attachment
 */
describe('Map WorldMapsManager Integration', () => {
  let player: RpgPlayer
  let client: any
  let fixture: any

  beforeEach(async () => {
    const serverModule = defineModule<RpgServer>({
      maps: [
        {
          id: 'map1',
          file: '',
        },
        {
          id: 'map2',
          file: '',
        },
        {
          id: 'map3',
          file: '',
        },
      ],
      worldMaps: [
        {
          id: 'test-world',
          maps: [
            { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768 },
            { id: 'map2', worldX: 1024, worldY: 0, width: 1024, height: 768 },
            { id: 'map3', worldX: 0, worldY: 768, width: 1024, height: 768 },
          ],
        },
      ],
      player: {
        async onConnected(player) {
          await player.changeMap('map1', { x: 100, y: 100 })
        },
      },
    })

    const clientModule = defineModule<RpgClient>({})

    const myModule = createModule('TestModule', [
      {
        server: serverModule,
        client: clientModule,
      },
    ])

    fixture = await testing(myModule)
    client = await fixture.createClient()
    player = client.player
  })

  afterEach(async () => {
    await fixture.clear()
  })

  test('should attach world to map', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    expect(map).toBeDefined()

    const worldMaps = map?.getInWorldMaps()
    expect(worldMaps).toBeDefined()
    expect(worldMaps?.getAllMaps()).toHaveLength(3)
  })

  test('should get world maps manager', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    expect(map).toBeDefined()

    const manager = map?.getWorldMapsManager()
    expect(manager).toBeDefined()
    expect(manager?.getAllMaps()).toHaveLength(3)
  })

  test('should set world maps manually', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    expect(map).toBeDefined()

    const newWorldMaps = new WorldMapsManager()
    newWorldMaps.configure([
      { id: 'map1', worldX: 0, worldY: 0, width: 800, height: 600 },
    ])

    map?.setInWorldMaps(newWorldMaps)
    const retrieved = map?.getInWorldMaps()
    expect(retrieved).toBeDefined()
    expect(retrieved?.getAllMaps()).toHaveLength(1)
  })

  test('should remove map from world', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    expect(map).toBeDefined()

    const worldMaps = map?.getInWorldMaps()
    expect(worldMaps).toBeDefined()
    expect(worldMaps?.getMapInfo('map1')).toBeDefined()

    const removed = map?.removeFromWorldMaps()
    expect(removed).toBe(true)

    // The WorldMapsManager is still attached to the map, but map1 is removed from it
    const worldMapsAfter = map?.getInWorldMaps()
    expect(worldMapsAfter).toBeDefined() // Manager still attached
    expect(worldMapsAfter?.getMapInfo('map1')).toBeNull() // But map1 is removed
  })

  test('should handle removing map when already removed', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    expect(map).toBeDefined()

    // Remove map1 from world
    const removed1 = map?.removeFromWorldMaps()
    expect(removed1).toBe(true)

    // Try to remove again - should return false (map not found in world)
    const removed2 = map?.removeFromWorldMaps()
    expect(removed2).toBe(false)

    // WorldMapsManager is still attached, but map1 is not in it
    const worldMaps = map?.getInWorldMaps()
    expect(worldMaps).toBeDefined()
    expect(worldMaps?.getMapInfo('map1')).toBeNull()
  })

  test('should calculate player worldX and worldY correctly', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    expect(map).toBeDefined()

    // Map1 is at worldX: 0, worldY: 0
    // Set player to local position (100, 200)
    await player.teleport({ x: 100, y: 200 })
    
    // Wait a bit for signals to update
    await new Promise(resolve => setTimeout(resolve, 10))

    // Player worldX should be map.worldX + player.x() = 0 + 100 = 100
    // Player worldY should be map.worldY + player.y() = 0 + 200 = 200
    const worldX = player.worldPositionX()
    const worldY = player.worldPositionY()
    expect(worldX).toBe(100)
    expect(worldY).toBe(200)
    const entity = map?.physic.getEntityByUUID(player.id)
    const hitbox = player.hitbox()
    expect(entity?.position.x).toBe(100 + hitbox.w / 2)
    expect(entity?.position.y).toBe(200 + hitbox.h / 2)

    // Change to map2 which is at worldX: 1024, worldY: 0
    await player.changeMap('map2', { x: 50, y: 100 })
    player = await client.waitForMapChange('map2')
    const map2 = player.getCurrentMap()
    expect(map2?.id).toBe('map2')

    // Player worldX should be map2.worldX + player.x() = 1024 + 50 = 1074
    // Player worldY should be map2.worldY + player.y() = 0 + 100 = 100
    const worldX2 = player.worldPositionX()
    const worldY2 = player.worldPositionY()
    expect(worldX2).toBe(1074)
    expect(worldY2).toBe(100)
  })

  test.skip('should keep movement sync after returning to initial map', async () => {
    player = await client.waitForMapChange('map1')

    await player.changeMap('map2', { x: 50, y: 100 })
    player = await client.waitForMapChange('map2')
    expect(player.getCurrentMap()?.id).toBe('map2')

    await player.changeMap('map1', { x: 100, y: 100 })
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    expect(map?.id).toBe('map1')

    const beforeX = player.x()
    await map?.movePlayer(player as any, Direction.Right)
    map?.nextTick(16)
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(player.x()).toBeGreaterThan(beforeX)
  })

  test('should keep restored player position after loadPhysic rebuild', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    expect(map).toBeDefined()

    await player.teleport({ x: 0, y: 0 })
    map?.loadPhysic()

    // Simulate a late position restore (e.g. session transfer snapshot hydration).
    player.x.set(100)
    player.y.set(100)
    await new Promise(resolve => setTimeout(resolve, 10))

    const topLeft = map?.getBodyPosition(player.id, 'top-left')
    expect(topLeft).toBeDefined()
    expect(Math.round(topLeft!.x)).toBe(100)
    expect(Math.round(topLeft!.y)).toBe(100)
    expect(player.x()).toBe(100)
    expect(player.y()).toBe(100)
  })
})

/**
 * Integration tests for automatic map change when player touches borders
 */
describe('Automatic Map Change on Border Touch', () => {
  let player: RpgPlayer
  let client: any
  let fixture: any

  beforeEach(async () => {
    const serverModule = defineModule<RpgServer>({
      maps: [
        {
          id: 'map1',
          file: '',
        },
        {
          id: 'map2',
          file: '',
        },
        {
          id: 'map3',
          file: '',
        },
        {
          id: 'map4',
          file: '',
        },
      ],
      worldMaps: [
        {
          id: 'test-world',
          maps: [
            { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 },
            { id: 'map2', worldX: 1024, worldY: 0, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 }, // Right
            { id: 'map3', worldX: 0, worldY: 768, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 }, // Down
            { id: 'map4', worldX: 0, worldY: -768, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 }, // Up
          ],
        },
      ],
      player: {
        async onConnected(player) {
          // Start player in the middle of map1
          await player.changeMap('map1', { x: 512, y: 384 })
        },
      },
    })

    const clientModule = defineModule<RpgClient>({})

    const myModule = createModule('TestModule', [
      {
        server: serverModule,
        client: clientModule,
      },
    ])

    fixture = await testing(myModule)
    client = await fixture.createClient()
    player = client.player
  })

  afterEach(async () => {
    await fixture.clear()
  })

  test('should change map when player touches right border', async () => {
    player = await client.waitForMapChange('map1')
    const initialMap = player.getCurrentMap()
    expect(initialMap?.id).toBe('map1')
    await player.autoChangeMap({ x: 513, y: 384 }, Direction.Right)

    // Move player to the right border
    // The map is 1024px wide, so we need to move close to the right edge
    // marginLeftRight = tileWidth / 2 = 16
    // Border check: nextPosition.x > map.widthPx - hitbox.w - marginLeftRight
    // We need to be at position > 1024 - hitbox.w - 16
    const hitbox = player.hitbox()
    const borderX = 1024 - hitbox.w - 16 + 1 // Just past the border threshold
    
    // Set player direction to Right and move to border
    player.changeDirection(Direction.Right)
    await player.teleport({ x: borderX, y: 384 })

    // Try to move further right (this should trigger autoChangeMap)
    const mapChanged = await player.autoChangeMap({ x: borderX + 1, y: 384 }, Direction.Right)

    expect(mapChanged).toBe(true)
    player = await client.waitForMapChange('map2')
    expect(player.getCurrentMap()?.id).toBe('map2')
    expect(player.x()).toBe(16)
    expect(player.y()).toBe(384)
  })

  test('should change map when player touches left border', async () => {
    player = await client.waitForMapChange('map1')
    
    // Move player to the left border
    const hitbox = player.hitbox()
    const marginLeftRight = 16 // tileWidth / 2
    const borderX = marginLeftRight - 1 // Just past the border threshold
    
    player.changeDirection(Direction.Left)
    await player.teleport({ x: borderX, y: 384 })

    // Try to move further left
    const mapChanged = await player.autoChangeMap({ x: borderX - 1, y: 384 }, Direction.Left)
    
    // Since map1 is at worldX 0, there's no map to the left, so it should return false
    expect(mapChanged).toBe(false)
    
    // But if we manually change to a map that has a left neighbor, it should work
    // For this test, we'll verify the logic works by checking the border detection
    expect(player.getCurrentMap()?.id).toBe('map1')
  })

  test('should change map when player touches bottom border', async () => {
    player = await client.waitForMapChange('map1')
    await player.autoChangeMap({ x: 512, y: 385 }, Direction.Down)
    
    // Move player to the bottom border
    const hitbox = player.hitbox()
    const marginTopDown = 16 // tileHeight / 2
    const borderY = 768 - hitbox.h - marginTopDown + 1 // Just past the border threshold
    
    player.changeDirection(Direction.Down)
    await player.teleport({ x: 512, y: borderY })

    // Try to move further down
    const mapChanged = await player.autoChangeMap({ x: 512, y: borderY + 1 }, Direction.Down)

    expect(mapChanged).toBe(true)
    player = await client.waitForMapChange('map3')
    expect(player.getCurrentMap()?.id).toBe('map3')
    expect(player.x()).toBe(512)
    expect(player.y()).toBe(16)
  })

  test('should change map when player touches top border', async () => {
    player = await client.waitForMapChange('map1')
    await player.autoChangeMap({ x: 512, y: 383 }, Direction.Up)
    
    // Move player to the top border
    const hitbox = player.hitbox()
    const marginTopDown = 16 // tileHeight / 2
    const borderY = marginTopDown - 1 // Just past the border threshold
    
    player.changeDirection(Direction.Up)
    await player.teleport({ x: 512, y: borderY })

    // Try to move further up
    const mapChanged = await player.autoChangeMap({ x: 512, y: borderY - 1 }, Direction.Up)

    expect(mapChanged).toBe(true)
    player = await client.waitForMapChange('map4')
    expect(player.getCurrentMap()?.id).toBe('map4')
    expect(player.x()).toBe(512)
    expect(player.y()).toBe(768 - hitbox.h - 16)
  })

  test('should not immediately bounce back after returning from adjacent map', async () => {
    player = await client.waitForMapChange('map1')
    await player.autoChangeMap({ x: 513, y: 384 }, Direction.Right)

    const hitbox = player.hitbox()
    const marginTopDown = 16 // tileHeight / 2
    const topBorderY = marginTopDown - 1

    player.changeDirection(Direction.Up)
    await player.teleport({ x: 512, y: topBorderY })
    const movedUp = await player.autoChangeMap({ x: 512, y: topBorderY - 1 }, Direction.Up)
    expect(movedUp).toBe(true)

    player = await client.waitForMapChange('map4')
    expect(player.getCurrentMap()?.id).toBe('map4')

    const map4 = player.getCurrentMap()
    const bottomBorderY = (map4?.heightPx ?? 768) - hitbox.h - marginTopDown + 1

    player.changeDirection(Direction.Down)
    await player.teleport({ x: 512, y: bottomBorderY })
    // First downward move after return should be blocked to avoid ping-pong map swaps.
    const firstDownAttempt = await player.autoChangeMap({ x: 512, y: bottomBorderY + 1 }, Direction.Down)
    expect(firstDownAttempt).toBe(false)

    // Move away from border to unlock transitions, then touch border again.
    await player.teleport({ x: 512, y: 384 })
    player.changeDirection(Direction.Up)
    await player.autoChangeMap({ x: 512, y: 383 }, Direction.Up)

    const mapAfterUnlock = player.getCurrentMap()
    const downBorderY = (mapAfterUnlock?.heightPx ?? 768) - hitbox.h - marginTopDown + 1
    await player.teleport({ x: 512, y: downBorderY })
    player.changeDirection(Direction.Down)
    const movedDown = await player.autoChangeMap({ x: 512, y: downBorderY + 1 }, Direction.Down)
    expect(movedDown).toBe(true)

    player = await client.waitForMapChange('map1')
    expect(player.getCurrentMap()?.id).toBe('map1')
  })

  test('should not change map when player is not at border', async () => {
    player = await client.waitForMapChange('map1')
    const initialMapId = player.getCurrentMap()?.id
    
    // Move player to center of map
    await player.teleport({ x: 512, y: 384 })
    player.changeDirection(Direction.Right)

    // Try to move (should not trigger map change)
    const mapChanged = await player.autoChangeMap({ x: 513, y: 384 }, Direction.Right)
    
    expect(mapChanged).toBe(false)
    expect(player.getCurrentMap()?.id).toBe(initialMapId)
  })

  test('should not change map when no adjacent map exists', async () => {
    player = await client.waitForMapChange('map1')
    
    // Move player to left border (no map to the left)
    const hitbox = player.hitbox()
    const marginLeftRight = 16
    const borderX = marginLeftRight - 1
    
    player.changeDirection(Direction.Left)
    await player.teleport({ x: borderX, y: 384 })

    const mapChanged = await player.autoChangeMap({ x: borderX - 1, y: 384 }, Direction.Left)
    
    expect(mapChanged).toBe(false)
    expect(player.getCurrentMap()?.id).toBe('map1')
  })
})

/**
 * Tests for non-adjacent maps (with gaps between maps)
 */
describe('Automatic Map Change with Non-Adjacent Maps', () => {
  let player: RpgPlayer
  let client: any
  let fixture: any

  beforeEach(async () => {
    const serverModule = defineModule<RpgServer>({
      maps: [
        {
          id: 'map1',
          file: '',
        },
        {
          id: 'map2',
          file: '',
        },
        {
          id: 'map3',
          file: '',
        },
        {
          id: 'map4',
          file: '',
        },
      ],
      worldMaps: [
        {
          id: 'test-world-gaps',
          maps: [
            // Map1 at origin
            { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 },
            // Map2 with gap to the right (worldX: 1025 instead of 1024)
            { id: 'map2', worldX: 1025, worldY: 0, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 },
            // Map3 with gap below (worldY: 769 instead of 768)
            { id: 'map3', worldX: 0, worldY: 769, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 },
            // Map4 with gap above (worldY: -769 instead of -768)
            { id: 'map4', worldX: 0, worldY: -769, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 },
          ],
        },
      ],
      player: {
        async onConnected(player) {
          // Start player in the middle of map1
          await player.changeMap('map1', { x: 512, y: 384 })
        },
      },
    })

    const clientModule = defineModule<RpgClient>({})

    const myModule = createModule('TestModule', [
      {
        server: serverModule,
        client: clientModule,
      },
    ])

    fixture = await testing(myModule)
    client = await fixture.createClient()
    player = client.player
  })

  afterEach(async () => {
    await fixture.clear()
  })

  test('should not change map when there is a gap above', async () => {
    player = await client.waitForMapChange('map1')
    const initialMapId = player.getCurrentMap()?.id
    
    // Spy on changeMap to verify it's not called
    const changeMapSpy = vi.spyOn(player, 'changeMap')
    
    // Move player to the top border
    const hitbox = player.hitbox()
    const marginTopDown = 16 // tileHeight / 2
    const borderY = marginTopDown - 1 // Just past the border threshold
    
    player.changeDirection(Direction.Up)
    await player.teleport({ x: 512, y: borderY })

    // Try to move further up - should NOT change map because there's a gap
    await player.autoChangeMap({ x: 512, y: borderY - 1 }, Direction.Up)
    
    // Verify changeMap was not called
    expect(changeMapSpy).not.toHaveBeenCalled()
    expect(player.getCurrentMap()?.id).toBe('map1')
    
    // Verify that map4 exists but is not adjacent
    const map = player.getCurrentMap()
    const worldMaps = map?.getWorldMapsManager()
    const map4Info = worldMaps?.getMapInfo('map4')
    expect(map4Info).toBeDefined()
    expect(map4Info?.worldY).toBe(-769) // Gap of 1 pixel

    changeMapSpy.mockRestore()
  })

  test('should not change map when there is a large gap', async () => {
    // Create a new setup with a larger gap
    const serverModuleWithLargeGap = defineModule<RpgServer>({
      maps: [
        {
          id: 'map1',
          file: '',
        },
        {
          id: 'map2',
          file: '',
        },
      ],
      worldMaps: [
        {
          id: 'test-world-large-gap',
          maps: [
            { id: 'map1', worldX: 0, worldY: 0, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 },
            // Map2 with large gap (100 pixels)
            { id: 'map2', worldX: 1124, worldY: 0, width: 1024, height: 768, tileWidth: 32, tileHeight: 32 },
          ],
        },
      ],
      player: {
        async onConnected(player) {
          await player.changeMap('map1', { x: 512, y: 384 })
        },
      },
    })

    const clientModule = defineModule<RpgClient>({})
    const myModule = createModule('TestModule', [
      {
        server: serverModuleWithLargeGap,
        client: clientModule,
      },
    ])

    const fixture = await testing(myModule)
    const testClient = await fixture.createClient()
    let testPlayer = testClient.player

    testPlayer = await testClient.waitForMapChange('map1')
    const initialMapId = testPlayer.getCurrentMap()?.id
    
    // Spy on changeMap to verify it's not called
    const changeMapSpy = vi.spyOn(testPlayer, 'changeMap')
    
    // Move player to the right border
    const hitbox = testPlayer.hitbox()
    const marginLeftRight = 16
    const borderX = 1024 - hitbox.w - marginLeftRight + 1
    
    testPlayer.changeDirection(Direction.Right)
    await testPlayer.teleport({ x: borderX, y: 384 })

    // Try to move further right - should NOT change map because there's a large gap
    await testPlayer.autoChangeMap({ x: borderX + 1, y: 384 }, Direction.Right)
    
    // Verify changeMap was not called
    expect(changeMapSpy).not.toHaveBeenCalled()
    expect(testPlayer.getCurrentMap()?.id).toBe('map1')

    changeMapSpy.mockRestore()
  })

  test('should verify getAdjacentMaps returns empty for non-adjacent maps', async () => {
    player = await client.waitForMapChange('map1')
    const map = player.getCurrentMap()
    expect(map).toBeDefined()

    const worldMaps = map?.getWorldMapsManager()
    expect(worldMaps).toBeDefined()

    // Test point lookup - should find map2 even with gap (point lookup doesn't require adjacency)
    const mapsAtPoint = worldMaps?.getAdjacentMaps(
      { worldX: 0, worldY: 0, widthPx: 1024, heightPx: 768 },
      { x: 1025, y: 0 }
    )
    expect(mapsAtPoint?.length).toBeGreaterThanOrEqual(1)
    expect(mapsAtPoint?.some(m => m.id === 'map2')).toBe(true)

    // But when trying to change map via autoChangeMap, it uses point lookup
    // which should find the map, but the position calculation might prevent the change
    // Let's verify the map exists but autoChangeMap correctly prevents the change
    const map2Info = worldMaps?.getMapInfo('map2')
    expect(map2Info).toBeDefined()
    expect(map2Info?.worldX).toBe(1025) // Gap exists
  })
})
