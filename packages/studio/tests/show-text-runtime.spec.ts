import { describe, expect, test, vi } from 'vitest';
import {
  buildShowTextInputOptions,
  schemaShowText,
  show_text,
} from '../runtime/blocks/executors/show-text';

const createContext = (result: string | number | null | void = undefined) => {
  const showText = vi.fn(async () => result);
  const setVariable = vi.fn();
  return {
    context: { player: { showText }, event: undefined, setVariable } as any,
    showText,
    setVariable,
  };
};

describe('Studio show_text input runtime', () => {
  test('requires a database variable when input is enabled', () => {
    const inputBranch = schemaShowText.schema.allOf[0].then;
    expect(inputBranch.required).toContain('inputVariableId');
    expect(inputBranch.properties.inputVariableId.$ref).toBe('#/functions/variable');
    expect(inputBranch.properties.inputVariableId.format.add.schema).toBeDefined();
  });

  test('keeps dialogs without input unchanged', async () => {
    const { context, showText, setVariable } = createContext();
    await show_text(context, { text: 'Welcome' });
    expect(showText).toHaveBeenCalledWith('Welcome', {
      talkWith: undefined,
      position: undefined,
      face: undefined,
    });
    expect(setVariable).not.toHaveBeenCalled();
  });

  test('stores text, number, and cancellation results in the selected variable', async () => {
    const text = createContext('Samuel');
    await show_text(text.context, {
      text: 'Name?', inputEnabled: true, inputVariableId: 'name', inputRequired: true,
    });
    expect(text.showText).toHaveBeenCalledWith('Name?', expect.objectContaining({
      input: expect.objectContaining({ type: 'text', required: true }),
    }));
    expect(text.setVariable).toHaveBeenCalledWith('name', 'Samuel');

    const number = createContext(42);
    await show_text(number.context, {
      text: 'Age?', inputEnabled: true, inputVariableId: 'age', inputType: 'number', inputMin: 1,
    });
    expect(number.setVariable).toHaveBeenCalledWith('age', 42);

    const cancelled = createContext(null);
    await show_text(cancelled.context, {
      text: 'Biography?', inputEnabled: true, inputVariableId: 'bio', inputControl: 'textarea', inputRows: 6,
    });
    expect(buildShowTextInputOptions({ text: 'Biography?', inputControl: 'textarea', inputRows: 6 }))
      .toMatchObject({ control: 'textarea', type: 'text', rows: 6 });
    expect(cancelled.setVariable).toHaveBeenCalledWith('bio', null);
  });

  test('uses player variable storage in reduced event-hook contexts', async () => {
    const setVariable = vi.fn();
    const showText = vi.fn(async () => 'Alex');

    await show_text({ player: { showText, setVariable }, event: undefined }, {
      text: 'Name?', inputEnabled: true, inputVariableId: 'name',
    });

    expect(setVariable).toHaveBeenCalledWith('name', 'Alex');
  });
});
