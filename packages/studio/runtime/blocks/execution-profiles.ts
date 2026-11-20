import type { EventBuilderExecutionProfile } from './types';

export const eventBuilderProfiles = {
  eventPage: {
    source: 'event_page',
    capabilities: [
      'map',
      'player',
      'event',
      'variables',
      'inventory',
      'equipment',
      'skills',
      'ui',
      'audio',
    ],
  },
  mapLoad: {
    source: 'map_load',
    capabilities: [
      'map',
      'player',
      'variables',
      'inventory',
      'equipment',
      'skills',
      'ui',
      'audio',
    ],
    fields: {
      excludeTargets: ['this_event'],
      excludeConditionTypes: ['self_switch'],
    },
  },
  guiInteraction: {
    source: 'gui_interaction',
    capabilities: [
      'player',
      'variables',
      'inventory',
      'equipment',
      'skills',
      'ui',
      'audio',
      'guiInteraction',
    ],
    fields: {
      excludeTargets: ['this_event'],
      excludeConditionTypes: ['self_switch'],
    },
  },
  guiInteractionMap: {
    source: 'gui_interaction',
    capabilities: [
      'map',
      'player',
      'variables',
      'inventory',
      'equipment',
      'skills',
      'ui',
      'audio',
      'guiInteraction',
    ],
    fields: {
      excludeTargets: ['this_event'],
      excludeConditionTypes: ['self_switch'],
    },
  },
} satisfies Record<string, EventBuilderExecutionProfile>;
