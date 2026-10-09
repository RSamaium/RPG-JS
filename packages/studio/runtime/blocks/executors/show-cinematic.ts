import type { BlockExecutor, BlockParamsMap, GameExecutionContext } from '../types';

export const STUDIO_CINEMATIC_GUI_ID = 'studio-cinematic';

export const schemaShowCinematic = {
  type: 'show_cinematic',
  label: 'block.show cinematic.label',
  description: 'block.show cinematic.description',
  category: 'scene',
  icon: '🎬',
  requiredCapabilities: ['player', 'ui'],
  schema: {
    type: 'object',
    properties: {
      video: {
        type: 'string',
        title: 'block.show cinematic.video',
        description: 'block.show cinematic.video description',
        format: {
          name: 'cinematic-media',
          type: 'video',
          buttonLabel: 'block.show cinematic.select video',
        },
      },
      allowSkip: {
        type: 'boolean',
        title: 'block.show cinematic.allow skip',
        description: 'block.show cinematic.allow skip description',
        default: true,
      },
      bgm: {
        type: 'string',
        title: 'block.show cinematic.bgm',
        enum: ['duck', 'pause'],
        format: { labels: ['block.show cinematic.bgm duck', 'block.show cinematic.bgm pause'] },
        default: 'duck',
      },
      preload: {
        type: 'boolean',
        title: 'block.show cinematic.preload',
        description: 'block.show cinematic.preload description',
        default: true,
      },
    },
    required: ['video'],
  },
} as const;

export async function playCinematicSequence(context: GameExecutionContext, videos: BlockParamsMap['show_cinematic'][]): Promise<void> {
  const [first, ...following] = videos;
  if (!first) return;
  const toClip = (params: BlockParamsMap['show_cinematic']) => ({
    mediaId: params.video,
    allowSkip: params.allowSkip !== false,
    bgm: params.bgm ?? 'duck',
  });
  await context.player.gui(STUDIO_CINEMATIC_GUI_ID).open(
    { ...toClip(first), ...(following.length ? { clips: following.map(toClip) } : {}) },
    { waitingAction: true, blockPlayerInput: true },
  );
}

export const show_cinematic: BlockExecutor<'show_cinematic'> = async (context, params) => {
  if (!context.player?.gui) throw new Error('Cinematic playback requires a player GUI context');
  await playCinematicSequence(context, [params]);
};
