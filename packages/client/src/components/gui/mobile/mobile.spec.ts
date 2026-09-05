import { afterEach, describe, expect, it, vi } from 'vitest';
import { Container, h, signal, JoystickControls } from 'canvasengine';
import { TestBed } from 'canvasengine/testing';
import Mobile from './mobile.ce';

const state = vi.hoisted(() => ({ engine: null as any }));
vi.mock('../../../core/inject', () => ({ inject: () => state.engine }));

let root: any;
afterEach(() => {
  root?.destroy();
  vi.useRealTimers();
});

async function setup() {
  document.body.innerHTML = '<div id="root"></div>';
  const controls = new JoystickControls();
  const move = vi.fn();
  const release = vi.fn();
  controls.setInputs({
    down: { bind: 'down', repeat: true, keyDown: move, keyUp: release },
    right: { bind: 'right', repeat: true, keyDown: move, keyUp: release },
  });
  state.engine = { activeKeyboardControls: signal({ joystick: controls }) };
  let joystick: any;
  root = await TestBed.createComponent(Mobile, { data: signal({
    components: { joystick: (props: any) => { joystick = props; return h(Container); } },
    buttons: { action: false, back: false },
  }) });
  await vi.waitFor(() => expect(joystick).toBeDefined());
  vi.useFakeTimers();
  return { controls, move, release, joystick };
}

describe('held mobile joystick', () => {
  it('continues moving for 30 seconds without new pointer changes', async () => {
    const { move, release, joystick } = await setup();
    joystick.onChange({ direction: 'bottom', power: 0.8, angle: 270 });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(move).toHaveBeenCalledTimes(601);
    expect(move.mock.calls.every(([, payload]) => payload.power === 0.8)).toBe(true);
    joystick.onEnd();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(move).toHaveBeenCalledTimes(601);
    expect(release).toHaveBeenCalledOnce();
  });

  it('preserves power when changing direction and then holding still', async () => {
    const { move, joystick } = await setup();
    joystick.onChange({ direction: 'bottom', power: 0.8, angle: 270 });
    await vi.advanceTimersByTimeAsync(3_000);
    joystick.onChange({ direction: 'right', power: 0.6, angle: 0 });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(move.mock.lastCall?.[1]).toEqual({ power: 0.6 });
  });

  it('stops repeating when the joystick returns to its dead zone', async () => {
    const { move, release, joystick } = await setup();
    joystick.onChange({ direction: 'bottom', power: 0.8, angle: 270 });
    await vi.advanceTimersByTimeAsync(3_000);
    joystick.onChange({ direction: 'bottom', power: 0.05, angle: 270 });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(move).toHaveBeenCalledTimes(61);
    expect(release).toHaveBeenCalledOnce();
  });

  it('keeps repeating on replacement controls without another pointer change', async () => {
    const { controls, move, joystick } = await setup();
    joystick.onChange({ direction: 'bottom', power: 0.8, angle: 270 });
    await vi.advanceTimersByTimeAsync(3_000);
    controls.destroy();
    const replacement = new JoystickControls();
    const replacementMove = vi.fn();
    replacement.setInputs({ down: { bind: 'down', repeat: true, keyDown: replacementMove } });
    state.engine.activeKeyboardControls.set({ joystick: replacement });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(move).toHaveBeenCalledTimes(61);
    expect(replacementMove).toHaveBeenCalledTimes(600);
    expect(replacementMove.mock.lastCall?.[1]).toEqual({ power: 0.8 });
    joystick.onEnd();
    replacement.destroy();
  });
});
