/** CSS of the tactical battle (kept as a string so that it is installed by `installTacticalStyles`). */
export default `/*
 * Panels and buttons of the battle drawn like the other interfaces of the game (\`@rpgjs/ui-css\`): the same surface, border, radius, shadow
 * and font tokens as \`.rpg-ui-panel\` and the controls, so the chat, the menus and the HUD of a battle look like one interface and a theme
 * restyles them all. It comes last: it replaces the look of the surfaces of the older sheets and keeps their layout.
 */
.t-shell :is(.t-panel, .t-modal, .t-skill-menu, .t-unit-menu, .t-dock-card, .t-item-menu) {
  background: var(--rpg-ui-panel-background, linear-gradient(180deg, rgba(15, 23, 42, 0.88), #0f172a));
  border-color: var(--rpg-ui-border, rgba(148, 163, 184, 0.3));
  border-radius: var(--rpg-ui-radius-lg, 8px);
  box-shadow: var(--rpg-ui-panel-shadow, 0 24px 60px rgba(2, 6, 23, 0.45));
  backdrop-filter: var(--rpg-ui-backdrop-blur, none);
  color: var(--rpg-ui-text, #f8fafc);
}
.t-shell :is(.t-options button, .t-controls button, .t-action-buttons button, .t-skill-choice, .t-phase .t-timer) {
  background: var(--rpg-ui-control-background, linear-gradient(180deg, rgba(15, 23, 42, 0.88), #0f172a));
  border-color: var(--rpg-ui-control-border, rgba(148, 163, 184, 0.3));
  border-radius: var(--rpg-ui-control-radius, 4px);
  box-shadow: var(--rpg-ui-control-shadow, none);
  font-family: var(--rpg-ui-control-font, var(--rpg-ui-font, system-ui, sans-serif));
}
.t-shell :is(.t-options button, .t-controls button) {
  border-radius: 50%;
}
.t-shell :is(.t-options button, .t-controls button, .t-action-buttons button, .t-skill-choice):is(:hover, .active, .focused, [aria-pressed="true"]) {
  background: var(--rpg-ui-selected-background, color-mix(in srgb, var(--rpg-ui-selection, #f59e0b) 22%, var(--rpg-ui-bg, #0f172a)));
  border-color: var(--rpg-ui-selection, #f59e0b);
  color: var(--rpg-ui-selection, #f59e0b);
}
/* The main button of a screen (enter the battle, end the phase) is the primary control of the theme. */
.t-shell :is(.t-gold-button, .t-phase-button) {
  background: var(--rpg-ui-primary-background, linear-gradient(180deg, #fbbf24, #f59e0b));
  border-color: var(--rpg-ui-selection, #f59e0b);
  border-radius: var(--rpg-ui-control-radius, 4px);
  box-shadow: var(--rpg-ui-control-shadow, none);
  color: var(--rpg-ui-primary-color, #0f172a) !important;
  font-family: var(--rpg-ui-control-font, var(--rpg-ui-font, system-ui, sans-serif));
}
`;
