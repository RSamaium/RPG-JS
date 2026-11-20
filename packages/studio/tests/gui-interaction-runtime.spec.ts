import { afterEach, describe, expect, test, vi } from 'vitest';
import { createModule, defineModule } from '@rpgjs/common';
import type { RpgPlayer, RpgServer } from '@rpgjs/server';
import { testing, type TestingFixture } from '@rpgjs/testing';
import { defaultBlocks } from '../runtime/blocks/blocks';
import { defaultExecutors } from '../runtime/blocks/executors';
import { eventBuilderProfiles } from '../runtime/blocks/execution-profiles';
import { schemaUseHotbarSlot, use_hotbar_slot } from '../runtime/blocks/executors/use-hotbar-slot';
import { findStudioGuiWorkflow, runStudioGuiInteraction } from '../src/gui-workflow';

/** The GUIs of a project as the Studio publishes them: a hotbar GUI with one workflow that uses the selected slot. */
const publishedGuis = (blocks: unknown[] = [{ id: 'b1', type: 'use_hotbar_slot', data: {} }]) => [
  {
    _id: 'gui-hotbar',
    target: 'hotbar',
    runtimeId: 'rpg-hotbar',
    blockCollections: [{ _id: 'use-slot', projectId: 'p', blocks }],
  },
  { _id: 'gui-menu', target: 'mainMenu', runtimeId: 'rpg-main-menu', blockCollections: [{ _id: 'menu-only', projectId: 'p', blocks: [] }] },
];

describe('GUI interaction workflows: profiles and the use_hotbar_slot block', () => {
  test('the profiles of a GUI interaction have the source and the capability of the Studio', () => {
    expect(eventBuilderProfiles.guiInteraction.source).toBe('gui_interaction');
    expect(eventBuilderProfiles.guiInteraction.capabilities).toContain('guiInteraction');
    expect(eventBuilderProfiles.guiInteraction.capabilities).not.toContain('map');
    expect(eventBuilderProfiles.guiInteractionMap.source).toBe('gui_interaction');
    expect(eventBuilderProfiles.guiInteractionMap.capabilities).toEqual(expect.arrayContaining(['map', 'guiInteraction']));
    // The workflows of event pages and of map loads are unchanged
    expect(eventBuilderProfiles.eventPage.source).toBe('event_page');
    expect(eventBuilderProfiles.mapLoad.source).toBe('map_load');
  });

  test('use_hotbar_slot is a block of GUI workflows only, with its executor', () => {
    expect(defaultBlocks.find((block) => block.type === 'use_hotbar_slot')).toBe(schemaUseHotbarSlot);
    expect(defaultExecutors.use_hotbar_slot).toBe(use_hotbar_slot);
    expect(schemaUseHotbarSlot.requiredCapabilities).toEqual(['player', 'ui', 'guiInteraction']);
    const gui = { trigger: null, executionProfile: eventBuilderProfiles.guiInteraction } as any;
    const page = { trigger: null, executionProfile: eventBuilderProfiles.eventPage } as any;
    expect(schemaUseHotbarSlot.contextCondition(gui)).toBe(true);
    expect(schemaUseHotbarSlot.contextCondition(page)).toBe(false);
  });

  test('uses the slot of the index the GUI sent', async () => {
    const useHotbarSlot = vi.fn();
    await use_hotbar_slot({ player: { useHotbarSlot }, guiInteraction: { blockCollectionId: 'c', data: { index: 3 } } } as any, {} as never);
    expect(useHotbarSlot).toHaveBeenCalledWith(3);
  });

  test.each([
    ['missing', {}],
    ['below 0', { index: -1 }],
    ['above 9', { index: 10 }],
    ['not an integer', { index: 1.5 }],
    ['a string', { index: '3' }],
    ['an item id', { index: 'potion' }],
  ])('throws and uses nothing when the index is %s', async (_label, data) => {
    const useHotbarSlot = vi.fn();
    await expect(use_hotbar_slot({ player: { useHotbarSlot }, guiInteraction: { blockCollectionId: 'c', data } } as any, {} as never)).rejects.toThrow(/index from 0 to 9/);
    expect(useHotbarSlot).not.toHaveBeenCalled();
  });

  test('throws outside of a GUI interaction', async () => {
    const useHotbarSlot = vi.fn();
    await expect(use_hotbar_slot({ player: { useHotbarSlot } } as any, {} as never)).rejects.toThrow(/index from 0 to 9/);
    expect(useHotbarSlot).not.toHaveBeenCalled();
  });
});

describe('finding the workflow of a GUI interaction', () => {
  const config = { guis: publishedGuis() };

  test('finds the collection a GUI names, by the runtime id or the Studio id of the GUI', () => {
    expect(findStudioGuiWorkflow(config, 'rpg-hotbar', 'use-slot')).toMatchObject({ gui: 'rpg-hotbar', blockCollectionId: 'use-slot' });
    expect(findStudioGuiWorkflow(config, 'gui-hotbar', 'use-slot')?.blocks).toHaveLength(1);
  });

  test('runs only a collection attached to that GUI', () => {
    // The collection of another GUI, an unknown one, an unknown GUI, a project without GUIs
    expect(findStudioGuiWorkflow(config, 'rpg-hotbar', 'menu-only')).toBeUndefined();
    expect(findStudioGuiWorkflow(config, 'rpg-hotbar', 'nothing')).toBeUndefined();
    expect(findStudioGuiWorkflow(config, 'rpg-shop', 'use-slot')).toBeUndefined();
    expect(findStudioGuiWorkflow({}, 'rpg-hotbar', 'use-slot')).toBeUndefined();
    expect(findStudioGuiWorkflow(undefined, 'rpg-hotbar', 'use-slot')).toBeUndefined();
  });
});

describe('a GUI interaction in a real game', () => {
  let fixture: TestingFixture | undefined;
  afterEach(async () => {
    await fixture?.clear();
    fixture = undefined;
    vi.restoreAllMocks();
  });

  /** A player with 3 potions in slot 2 of its hotbar, on a map whose project publishes the GUIs. */
  async function start(guis = publishedGuis()) {
    const server = defineModule<RpgServer>({
      maps: [{ id: 'gui-map', file: '' }],
      database: { potion: { id: 'potion', _type: 'item', name: 'Potion', consumable: true, hitRate: 1 } },
      player: {
        async onConnected(player: RpgPlayer) {
          await player.changeMap('gui-map', { x: 100, y: 100 });
        },
        // As the Studio server module does
        onGuiInteraction: (player: RpgPlayer, interaction: { guiId: string; name: string; data: unknown }) =>
          runStudioGuiInteraction(player, interaction),
      },
    });
    fixture = await testing(createModule('GuiInteraction', [{ server }]));
    const client = await fixture.createClient();
    const player = await client.waitForMapChange('gui-map');
    const map = player.getCurrentMap() as any;
    map.globalConfig = { ...(map.globalConfig ?? {}), guis };
    player.addItem('potion', 3);
    player.assignHotbarSlot(2, { type: 'item', id: 'potion' });
    return { player, map };
  }

  test('the workflow of the GUI uses the slot the interaction selected', async () => {
    const { player, map } = await start();

    // What the server receives when the GUI calls interaction('use-slot', { index: 2 })
    await map.guiInteraction(player, { guiId: 'rpg-hotbar', name: 'use-slot', data: { index: 2 } });

    await vi.waitFor(() => expect(player.getItem('potion')?.quantity()).toBe(2));
  });

  test('runs nothing for a collection that is not attached to the GUI, or an index out of 0 to 9', async () => {
    const { player, map } = await start();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await map.guiInteraction(player, { guiId: 'rpg-hotbar', name: 'menu-only', data: { index: 2 } });
    await map.guiInteraction(player, { guiId: 'rpg-hotbar', name: 'use-slot', data: { index: 12 } });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(player.getItem('potion')?.quantity()).toBe(3);
    // The out of range index is reported, and the game goes on
    expect(error.mock.calls.some((call) => String(call[0]).includes('GUI workflow "use-slot"'))).toBe(true);
  });

  test('gives the workflow the GUI interaction in its context', async () => {
    const seen: unknown[] = [];
    const { player, map } = await start(publishedGuis([{ id: 'b1', type: 'probe_context', data: {} }]));
    const { configureStudioBlockExecutors } = await import('../src/block-executor');
    configureStudioBlockExecutors({ probe_context: (context) => { seen.push(context.guiInteraction); } });

    await map.guiInteraction(player, { guiId: 'rpg-hotbar', name: 'use-slot', data: { index: 4, label: 'x' } });

    await vi.waitFor(() => expect(seen).toEqual([{ blockCollectionId: 'use-slot', data: { index: 4, label: 'x' }, gui: 'rpg-hotbar' }]));
    configureStudioBlockExecutors(undefined);
  });
});
