import { signal } from "canvasengine";

// State shared by the lab panel (a GUI above the game) and the map it drops enemies on.
export const dragging = signal(false);
export const selectedEnemy = signal("brute");
export const behavior = signal("aggressive");
export const faction = signal("monsters");
export const targets = signal("players");
