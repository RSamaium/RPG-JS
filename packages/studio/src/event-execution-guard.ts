// A player can only interact with one event at a time. Parallel/map workflows
// remain independent, and another player may use the same event concurrently.
const runningPlayers = new WeakSet<object>();

export async function runPlayerEventOnce(player: object, run: () => Promise<void>): Promise<void> {
  if (runningPlayers.has(player)) return;
  runningPlayers.add(player);
  try {
    await run();
  } finally {
    runningPlayers.delete(player);
  }
}
