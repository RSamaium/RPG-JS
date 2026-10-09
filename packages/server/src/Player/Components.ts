/**
 * Component definitions for player UI elements
 * 
 * This module provides factory functions to create component definitions
 * that can be displayed above or below player graphics. Components are
 * synchronized from server to client and rendered using CanvasEngine.
 * 
 * ## Design
 * 
 * Components are defined as data structures that describe UI elements
 * (text, bars, shapes) with their properties and layout options. The
 * server creates these definitions and they are automatically synchronized
 * to all clients on the map.
 * 
 * @example
 * ```ts
 * import { Components } from '@rpgjs/server';
 * 
 * // Create a text component
 * const nameComponent = Components.text('{name}');
 * 
 * // Create an HP bar
 * const hpBar = Components.hpBar();
 * 
 * // Set components on player
 * player.setComponentsTop([nameComponent, hpBar]);
 * ```
 */

export interface ComponentLayout {
  /** Width of the component block in pixels */
  width?: number;
  /** Height of the component block in pixels */
  height?: number;
  /** Vertical offset from the top anchor in pixels */
  marginTop?: number;
  /** Vertical offset from the bottom anchor in pixels */
  marginBottom?: number;
  /** Horizontal offset from the left anchor in pixels */
  marginLeft?: number;
  /** Horizontal offset from the right anchor in pixels */
  marginRight?: number;
}

export interface TextComponentOptions {
  /** Text color in hexadecimal format (e.g., '#000000') */
  fill?: string;
  /** Font size in pixels */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Font style: 'normal', 'italic', 'oblique' */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /** Font weight: 'normal', 'bold', 'bolder', 'lighter', or numeric values */
  fontWeight?: 'normal' | 'bold' | 'bolder' | 'lighter' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | number;
  /** Stroke color in hexadecimal format */
  stroke?: string;
  /** Opacity between 0 and 1 */
  opacity?: number;
  /** Word wrap */
  wordWrap?: boolean;
  /** Text alignment */
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface BarComponentOptions {
  /** Background color in hexadecimal format */
  bgColor?: string;
  /** Fill color in hexadecimal format */
  fillColor?: string;
  /** Border color in hexadecimal format */
  borderColor?: string;
  /** Text color in hexadecimal format */
  textColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Height of the bar in pixels */
  height?: number;
  /** Width of the bar in pixels */
  width?: number;
  /** Text font size in pixels */
  fontSize?: number;
  /** Border radius */
  borderRadius?: number;
  /** Opacity between 0 and 1 */
  opacity?: number;
}

export interface ShapeComponentOptions {
  /** Fill color in hexadecimal format */
  fill: string;
  /** Type of shape */
  type: 'circle' | 'rect' | 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'rounded-rectangle';
  /** Radius (for circle) */
  radius?: number | string;
  /** Width (for rectangle, ellipse) */
  width?: number | string;
  /** Height (for rectangle, ellipse) */
  height?: number | string;
  /** X1 position (for line) */
  x1?: number | string;
  /** Y1 position (for line) */
  y1?: number | string;
  /** X2 position (for line) */
  x2?: number | string;
  /** Y2 position (for line) */
  y2?: number | string;
  /** Points array (for polygon) */
  points?: number[];
  /** Opacity between 0 and 1 */
  opacity?: number | string;
  /** Line/border style */
  line?: {
    color?: string;
    width?: number;
    alpha?: number;
  };
}

export type ComponentDefinition = 
  | { type: 'custom'; id: string; props?: Record<string, unknown> }
  | { type: 'text'; id: 'rpg:text'; value: string; props: { value: string; style?: TextComponentOptions }; style?: TextComponentOptions }
  | { type: 'hpBar'; id: 'rpg:hpBar'; props: { current: string; max: string; style?: BarComponentOptions; text?: string | null }; style?: BarComponentOptions; text?: string | null }
  | { type: 'spBar'; id: 'rpg:spBar'; props: { current: string; max: string; style?: BarComponentOptions; text?: string | null }; style?: BarComponentOptions; text?: string | null }
  | { type: 'bar'; id: 'rpg:bar'; current: string; max: string; props: { current: string; max: string; style?: BarComponentOptions; text?: string | null }; style?: BarComponentOptions; text?: string | null }
  | { type: 'shape'; id: 'rpg:shape'; value: ShapeComponentOptions; props: ShapeComponentOptions }
  | { type: 'image'; id: 'rpg:image'; value: string; props: { value: string } }
  | { type: 'tile'; id: 'rpg:tile'; value: number | string; props: { value: number | string } };

export type ComponentInput = ComponentDefinition | ComponentDefinition[] | ComponentDefinition[][];

const toTemplatePath = (value: string) => value.includes('{') ? value : `{${value}}`;
const DEFAULT_HP_BAR_STYLE: BarComponentOptions = { fillColor: '#ef4444' };
const DEFAULT_SP_BAR_STYLE: BarComponentOptions = { fillColor: '#3b82f6' };

/**
 * Components factory for creating component definitions
 * 
 * Provides factory methods to create various UI components that can be
 * displayed above or below player graphics. Components support template
 * strings with placeholders like {name}, {hp}, etc. that are replaced
 * with actual player property values on the client.
 * 
 * @example
 * ```ts
 * // Create a text component
 * Components.text('Player: {name}');
 * 
 * // Create an HP bar with custom text
 * Components.hpBar({}, '{$percent}%');
 * 
 * // Create a custom bar
 * Components.bar('wood', 'param.maxWood');
 * ```
 */
export const Components = {
  /**
   * Use a client-registered sprite component
   *
   * The server only sends a stable component id and serializable props. The
   * matching CanvasEngine component must be registered on the client.
   *
   * @param id - Client-side component id
   * @param props - Serializable props passed to the component
   * @returns Component definition for a custom component
   *
   * @example
   * ```ts
   * Components.custom('guildBadge', {
   *   guildName: '{guild.name}',
   *   color: '{guild.color}'
   * });
   * ```
   */
  custom(id: string, props: Record<string, unknown> = {}): ComponentDefinition {
    return {
      type: 'custom',
      id,
      props
    };
  },

  /**
   * Create a text component
   * 
   * Creates a text component that displays text with optional styling.
   * Supports template strings with placeholders like {name}, {hp}, etc.
   * that are replaced with actual player property values.
   * 
   * ## Design
   * 
   * Text components use template strings to allow dynamic content without
   * resending the entire component structure when values change. Only the
   * property values are synchronized, reducing bandwidth usage.
   * 
   * @param text - Text to display, can include placeholders like {name}, {hp}
   * @param options - Text styling options
   * @returns Component definition for text
   * 
   * @example
   * ```ts
   * // Simple text
   * Components.text('Player Name');
   * 
   * // Text with placeholder
   * Components.text('{name}');
   * 
   * // Text with styling
   * Components.text('{name}', {
   *   fill: '#000000',
   *   fontSize: 20
   * });
   * ```
   */
  text(value: string, style?: TextComponentOptions): ComponentDefinition {
    return {
      type: 'text',
      id: 'rpg:text',
      value,
      props: {
        value,
        style
      },
      style
    };
  },

  /**
   * Create an HP bar component
   * 
   * Creates a health point bar that automatically displays the player's
   * current HP relative to their maximum HP. The bar updates automatically
   * as HP changes.
   * 
   * ## Design
   * 
   * HP bars read from the player's hp and param.maxHp properties. The
   * bar uses a red fill by default and can optionally display text above it
   * showing current, max, or percentage values.
   * 
   * @param options - Bar styling options. `fillColor` overrides the default red fill.
   * @param text - Optional left-aligned text to display above the bar. Can use player placeholders like `{name}` and:
   *   - {$current} - Current HP value
   *   - {$max} - Maximum HP value
   *   - {$percent} - Percentage value
   *   Set to null to hide text
   * @returns Component definition for HP bar
   * 
   * @example
   * ```ts
   * // Simple HP bar
   * Components.hpBar();
   * 
   * // HP bar with percentage text
   * Components.hpBar({}, '{$percent}%');
   * 
   * // HP bar with custom styling
   * Components.hpBar({
   *   fillColor: '#ff0000',
   *   height: 8
   * });
   * ```
   */
  hpBar(style?: BarComponentOptions, text?: string | null): ComponentDefinition {
    const barStyle = { ...DEFAULT_HP_BAR_STYLE, ...style };
    return {
      type: 'hpBar',
      id: 'rpg:hpBar',
      props: {
        current: '{hp}',
        max: '{param.maxHp}',
        style: barStyle,
        text: text ?? undefined
      },
      style: barStyle,
      text: text ?? undefined
    };
  },

  /**
   * Create an SP bar component
   * 
   * Creates a skill point bar that automatically displays the player's
   * current SP relative to their maximum SP. The bar uses a blue fill by
   * default and updates automatically as SP changes.
   * 
   * @param style - Bar styling options. `fillColor` overrides the default blue fill.
   * @param text - Optional left-aligned text to display above the bar. Can use player placeholders like `{name}` and:
   *   - {$current} - Current SP value
   *   - {$max} - Maximum SP value
   *   - {$percent} - Percentage value
   *   Set to null to hide text
   * @returns Component definition for SP bar
   * 
   * @example
   * ```ts
   * // Simple SP bar
   * Components.spBar();
   * 
   * // SP bar with text
   * Components.spBar({}, 'SP: {$current}/{$max}');
   * ```
   */
  spBar(style?: BarComponentOptions, text?: string | null): ComponentDefinition {
    const barStyle = { ...DEFAULT_SP_BAR_STYLE, ...style };
    return {
      type: 'spBar',
      id: 'rpg:spBar',
      props: {
        current: '{sp}',
        max: '{param.maxSp}',
        style: barStyle,
        text: text ?? undefined
      },
      style: barStyle,
      text: text ?? undefined
    };
  },

  /**
   * Create a custom bar component
   * 
   * Creates a bar that displays a custom property value relative to a maximum.
   * Useful for displaying custom resources like wood, mana, energy, etc.
   * 
   * @param current - Property path for current value (e.g., 'wood', 'mana')
   * @param max - Property path for maximum value (e.g., 'param.maxWood', 'param.maxMana')
   * @param style - Bar styling options
   * @param text - Optional left-aligned text to display above the bar. Can use player placeholders like `{name}` and:
   *   - {$current} - Current value
   *   - {$max} - Maximum value
   *   - {$percent} - Percentage value
   *   Set to null to hide text
   * @returns Component definition for custom bar
   * 
   * @example
   * ```ts
   * // Bar for custom property
   * Components.bar('wood', 'param.maxWood');
   * 
   * // Bar with text
   * Components.bar('mana', 'param.maxMana', {}, 'Mana: {$current}/{$max}');
   * ```
   */
  bar(current: string, max: string, style?: BarComponentOptions, text?: string | null): ComponentDefinition {
    return {
      type: 'bar',
      id: 'rpg:bar',
      current,
      max,
      props: {
        current: toTemplatePath(current),
        max: toTemplatePath(max),
        style,
        text: text ?? undefined
      },
      style,
      text: text ?? undefined
    };
  },

  /**
   * Create a shape component
   * 
   * Creates a geometric shape that can be displayed above or below the player.
   * Useful for visual indicators, backgrounds, or decorative elements.
   * 
   * @param value - Shape configuration options
   * @returns Component definition for shape
   * 
   * @example
   * ```ts
   * // Circle shape
   * Components.shape({
   *   fill: '#ffffff',
   *   type: 'circle',
   *   radius: 10
   * });
   * 
   * // Rectangle shape
   * Components.shape({
   *   fill: '#ff0000',
   *   type: 'rectangle',
   *   width: 32,
   *   height: 32
   * });
   * 
   * // Using parameters
   * Components.shape({
   *   fill: '#ffffff',
   *   type: 'circle',
   *   radius: 'hp' // radius will be the same as hp value
   * });
   * ```
   */
  shape(value: ShapeComponentOptions): ComponentDefinition {
    return {
      type: 'shape',
      id: 'rpg:shape',
      props: value,
      value
    };
  },

  /**
   * Create an image component
   * 
   * Displays an image from a URL or spritesheet identifier.
   * 
   * @param value - Image source URL or spritesheet identifier
   * @returns Component definition for image
   * 
   * @example
   * ```ts
   * Components.image('mygraphic.png');
   * ```
   */
  image(value: string): ComponentDefinition {
    return {
      type: 'image',
      id: 'rpg:image',
      props: { value },
      value
    };
  },

  /**
   * Create a tile component
   * 
   * Displays a tile from a tileset by ID.
   * 
   * @param value - Tile ID in the tileset
   * @returns Component definition for tile
   * 
   * @example
   * ```ts
   * Components.tile(3); // Use tile #3
   * ```
   */
  tile(value: number | string): ComponentDefinition {
    return {
      type: 'tile',
      id: 'rpg:tile',
      props: { value },
      value
    };
  }
}; 
