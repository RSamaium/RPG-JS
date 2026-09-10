import { describe, expect, it, vi } from 'vitest';
import { ensureLatestTag } from './tag-latest';

function createNpmClient(latestVersions: Array<string | undefined>) {
  const versions = [...latestVersions];
  const getLatest = vi.fn(async () => versions.shift());
  const addLatest = vi.fn(async () => undefined);

  return {
    client: { getLatest, addLatest },
    getLatest,
    addLatest,
  };
}

describe('ensureLatestTag', () => {
  it('skips npm writes when latest already matches', async () => {
    const { client, addLatest } = createNpmClient(['5.0.0-beta.30']);

    await ensureLatestTag('@rpgjs/studio', '5.0.0-beta.30', {
      npmClient: client,
    });

    expect(addLatest).not.toHaveBeenCalled();
  });

  it('writes and verifies the latest tag', async () => {
    const { client, addLatest } = createNpmClient([
      '5.0.0-beta.29',
      '5.0.0-beta.30',
    ]);

    await ensureLatestTag('@rpgjs/studio', '5.0.0-beta.30', {
      npmClient: client,
    });

    expect(addLatest).toHaveBeenCalledOnce();
    expect(addLatest).toHaveBeenCalledWith('@rpgjs/studio@5.0.0-beta.30');
  });

  it('retries when npm acknowledges a tag that is not visible', async () => {
    const { client, addLatest } = createNpmClient([
      '5.0.0-beta.29',
      '5.0.0-beta.29',
      '5.0.0-beta.29',
      '5.0.0-beta.30',
    ]);
    const sleep = vi.fn(async () => undefined);

    await ensureLatestTag('@rpgjs/studio', '5.0.0-beta.30', {
      maxAttempts: 2,
      retryDelayMs: 1,
      npmClient: client,
      sleep,
    });

    expect(addLatest).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(sleep).toHaveBeenCalledWith(1);
  });

  it('fails the release when the latest tag never converges', async () => {
    const { client, addLatest } = createNpmClient([
      '5.0.0-beta.29',
      '5.0.0-beta.29',
      '5.0.0-beta.29',
      '5.0.0-beta.29',
    ]);

    await expect(
      ensureLatestTag('@rpgjs/studio', '5.0.0-beta.30', {
        maxAttempts: 2,
        retryDelayMs: 0,
        npmClient: client,
        sleep: async () => undefined,
      }),
    ).rejects.toThrow(
      'Failed to verify @rpgjs/studio@latest as 5.0.0-beta.30 after 2 attempts',
    );

    expect(addLatest).toHaveBeenCalledTimes(2);
  });
});
