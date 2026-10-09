import { expect, it, vi } from 'vitest';
import { runPlayerEventOnce } from '../src/event-execution-guard';

it('ignores overlapping touch/action executions, but releases the player after completion or failure', async () => {
  const player = {};
  let finish!: () => void;
  const run = vi.fn(() => new Promise<void>(resolve => finish = resolve));
  const pending = runPlayerEventOnce(player, run);
  await runPlayerEventOnce(player, run);
  expect(run).toHaveBeenCalledOnce();
  const other = vi.fn(async () => {});
  await runPlayerEventOnce({}, other);
  expect(other).toHaveBeenCalledOnce();
  finish();
  await pending;
  await expect(runPlayerEventOnce(player, async () => { throw new Error('failed'); })).rejects.toThrow('failed');
  await runPlayerEventOnce(player, other);
  expect(other).toHaveBeenCalledTimes(2);
});
