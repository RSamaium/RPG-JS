import { afterEach, expect, test } from "vitest";
import { defineModule, TIME_MANAGER_SYNC_KEY, withTimeManager } from "@rpgjs/common";
import { testing } from "@rpgjs/testing";
import { inject as diInject } from "@signe/di";
import { ClientTimeManager, RpgClient } from "../../client/src";
import { RpgPlayer, RpgServer, TimeManager, inject as injectServer } from "../src";

const serverModule = defineModule<RpgServer>({
  maps: [
    {
      id: "map1",
      file: "",
    },
    {
      id: "map2",
      file: "",
    },
  ],
  player: {
    async onConnected(player: RpgPlayer) {
      await player.changeMap("map1", { x: 100, y: 100 });
    },
  },
});

const clientModule = defineModule<RpgClient>({});

let fixture: any;

afterEach(() => {
  fixture?.clear();
});

test("withTimeManager syncs map time snapshots and lets the client infer current time", async () => {
  const module = withTimeManager({
    start: "0001-01-01 08:00",
    scale: 10,
    calendar: {
      months: 12,
      daysPerMonth: 30,
      daysPerWeek: 7,
      seasons: ["spring", "summer", "autumn", "winter"],
    },
  });

  fixture = await testing([
    module,
    {
      server: serverModule,
      client: clientModule,
    },
  ]);

  const client = await fixture.createClient();
  let player = await client.waitForMapChange("map1");
  await fixture.wait(0);
  await fixture.applySyncToClient();

  const serverTime = injectServer(TimeManager);
  const clientTime = diInject<ClientTimeManager>(client.client.context, ClientTimeManager);
  const map = player.getCurrentMap() as any;

  expect(map[TIME_MANAGER_SYNC_KEY]()).toMatchObject({
    scale: 10,
    paused: false,
  });
  expect(map[TIME_MANAGER_SYNC_KEY]().elapsedMinutes).toBeCloseTo(480, 0);
  expect(clientTime.state()).toMatchObject({
    year: 1,
    month: 1,
    day: 1,
    hour: 8,
    minute: 0,
    weekday: 0,
    season: "spring",
  });

  serverTime.set({ hour: 22, minute: 30 });
  await fixture.applySyncToClient();

  expect(clientTime.state()).toMatchObject({
    hour: 22,
    minute: 30,
  });

  serverTime.advance({ hours: 2 });
  await fixture.applySyncToClient();

  expect(clientTime.state()).toMatchObject({
    day: 2,
    hour: 0,
    minute: 30,
  });

  serverTime.pause();
  await fixture.applySyncToClient();
  const pausedState = clientTime.state(Date.now())!;
  const laterPausedState = clientTime.state(Date.now() + 60_000)!;
  expect(laterPausedState.elapsedMinutes).toBe(pausedState.elapsedMinutes);

  serverTime.resume();
  serverTime.setScale(30);
  await fixture.applySyncToClient();
  const projectedState = clientTime.state(Date.now() + 60_000)!;
  expect(Math.floor(projectedState.elapsedMinutes - clientTime.state()!.elapsedMinutes)).toBe(30);

  await player.changeMap("map2", { x: 10, y: 10 });
  player = await client.waitForMapChange("map2");
  await fixture.wait(0);
  await fixture.applySyncToClient();

  expect(player.getCurrentMap()?.id).toBe("map2");
  expect(clientTime.state()).toMatchObject({
    scale: 30,
  });
});
