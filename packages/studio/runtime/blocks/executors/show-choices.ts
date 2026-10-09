import { excludeTriggers } from '../context-helpers';
import type {
  GameExecutionContext,
  BlockExecutor,
  ShowChoicesParams
} from '../types';
import { executeBlocksRecursively, getExecutorsFromContext } from './execution';
import { resolveStringTemplate, studioStringTemplateFormat } from '../resolve-text';

export const schemaShowChoices = {
  type: 'show_choices',
  label: 'Show Choices',
  description: 'Present multiple choice options to the player',
  category: 'message',
  icon: '🔀',
  requiredCapabilities: ['player', 'ui'],
  outputs: ['choice1', 'choice2', 'choice3', 'choice4'],
  canHaveChildren: true,
  contextCondition: excludeTriggers('onInit'),
  schema: {
    type: 'object',
    properties: {
      question: { 
        type: 'string', 
        title: 'Question Text',
        description: 'The question to ask the player',
        format: studioStringTemplateFormat
      },
      choices: {
        type: 'array',
        title: 'Choice Options',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', title: 'Choice Text', format: studioStringTemplateFormat },
            condition: { type: 'string', title: 'Show Condition (optional)' }
          }
        },
        minItems: 2,
        maxItems: 4
      }
    },
    required: ['question', 'choices']
  }
} as const;

/**
 * Presents multiple choice options to the player
 * 
 * This executor displays a question with multiple choice options to the player,
 * waits for their selection, and then executes the blocks associated with
 * the selected choice. The choice result is stored in context for potential
 * use in subsequent blocks.
 * 
 * @param context - The execution context containing player references
 * @param params - Parameters containing the question, choices, and child blocks
 * 
 * @example
 * ```typescript
 * await showChoicesExecutor(context, {
 *   question: 'What will you do?',
 *   choices: [
 *     { text: 'Attack' },
 *     { text: 'Defend' },
 *     { text: 'Run away' }
 *   ],
 *   choiceChildren: [
 *     [attackBlock1, attackBlock2],
 *     [defendBlock1],
 *     [runAwayBlock1]
 *   ]
 * });
 * ```
 */
export const show_choices: BlockExecutor<'show_choices'> = async (context, params) => {
  const choice = await context.player.showChoices(
    resolveStringTemplate(params.question, context),
    params.choices.map((c, index) => ({
      text: resolveStringTemplate(c.text, context),
      value: index
    }))
  );
  
  // Set the choice result in context for branching
  context.setVariable('lastChoice', choice);
  
  // Execute the blocks associated with the selected choice recursively
  if (params.choiceChildren && Array.isArray(params.choiceChildren)) {
    const choiceIndex = choice.value;
    const selectedChoiceBlocks = params.choiceChildren[choiceIndex];
    
    if (Array.isArray(selectedChoiceBlocks) && selectedChoiceBlocks.length > 0) {
      const executors = getExecutorsFromContext(context);
      await executeBlocksRecursively(selectedChoiceBlocks, context, executors);
    }
  }
};
