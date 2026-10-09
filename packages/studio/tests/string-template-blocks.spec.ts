import { describe, expect, test, vi } from 'vitest';
import { call_shop } from '../runtime/blocks/executors/call-shop';
import { show_choices } from '../runtime/blocks/executors/show-choices';
import { show_input } from '../runtime/blocks/executors/show-input';
import { show_notification } from '../runtime/blocks/executors/show-notification';
import { show_text } from '../runtime/blocks/executors/show-text';
import { show_up_animation } from '../runtime/blocks/executors/show-up-animation';

const template = (path: string, label = 'Label') => `{{ variable:${path} | label:${label} }}`;

describe('Studio string templates in player-visible blocks', () => {
  test('resolves dialog text and embedded input labels', async () => {
    const showText = vi.fn(async () => null);
    const context = {
      player: { hp: 25, showText },
      event: undefined,
      getVariable: (id: string) => id === 'name' ? 'Ada' : undefined,
      setVariable: vi.fn(),
    } as any;

    await show_text(context, {
      text: `Hello ${template('variable.name')}`,
      inputEnabled: true,
      inputVariableId: 'answer',
      inputPlaceholder: template('player.hp'),
      inputConfirmText: `Confirm ${template('variable.name')}`,
    });

    expect(showText).toHaveBeenCalledWith('Hello Ada', expect.objectContaining({
      input: expect.objectContaining({ placeholder: '25', confirmText: 'Confirm Ada' }),
    }));
  });

  test('resolves notifications and overhead animations', async () => {
    const showNotification = vi.fn();
    const showComponentAnimation = vi.fn();
    const context = {
      player: { hp: 25, showNotification, showComponentAnimation },
      getVariable: () => undefined,
    } as any;

    await show_notification(context, { message: `HP ${template('player.hp')}` });
    await show_up_animation(context, { text: `+${template('player.hp')}` });

    expect(showNotification).toHaveBeenCalledWith('HP 25', expect.any(Object));
    expect(showComponentAnimation).toHaveBeenCalledWith('up', { text: '+25', icon: undefined });
  });

  test('resolves choice questions and option labels', async () => {
    const showChoices = vi.fn(async () => ({ value: 0 }));
    const setVariable = vi.fn();
    const context = {
      player: { name: 'Ada', showChoices },
      getVariable: () => undefined,
      setVariable,
    } as any;

    await show_choices(context, {
      question: `Who is ${template('player.name')}?`,
      choices: [{ text: template('player.name') }, { text: 'Nobody' }],
    });

    expect(showChoices).toHaveBeenCalledWith('Who is Ada?', [
      { text: 'Ada', value: 0 },
      { text: 'Nobody', value: 1 },
    ]);
    expect(setVariable).toHaveBeenCalledWith('lastChoice', { value: 0 });
  });

  test('resolves standalone input copy', async () => {
    const showInput = vi.fn(async () => 'answer');
    const setVariable = vi.fn();
    const context = {
      player: { name: 'Ada', showInput },
      getVariable: () => undefined,
      setVariable,
    } as any;

    await show_input(context, {
      message: `Name: ${template('player.name')}`,
      title: `Profile ${template('player.name')}`,
      placeholder: template('player.name'),
      variableId: 'answer',
    });

    expect(showInput).toHaveBeenCalledWith('Name: Ada', expect.objectContaining({
      title: 'Profile Ada',
      placeholder: 'Ada',
    }));
    expect(setVariable).toHaveBeenCalledWith('answer', 'answer');
  });

  test('resolves the shop message without changing item identifiers', async () => {
    const callShop = vi.fn();
    const database = vi.fn(() => ({ potion: { id: 'potion' } }));
    const context = {
      player: {
        name: 'Ada',
        getCurrentMap: () => ({ database }),
        callShop,
      },
      getVariable: () => undefined,
    } as any;

    await call_shop(context, {
      items: ['potion'],
      message: `Welcome ${template('player.name')}`,
    });

    expect(callShop).toHaveBeenCalledWith(expect.objectContaining({
      items: [{ id: 'potion' }],
      message: 'Welcome Ada',
    }));
    expect(database).toHaveBeenCalled();
  });
});
