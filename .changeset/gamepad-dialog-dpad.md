---
"@rpgjs/client": patch
---

Gamepad in the menus: B and Start open, go back from and close the GUIs (they were mapped to a `back` control that the menus, which name it `escape`, never received); A advances dialog boxes; the d-pad navigates menus, the item confirmation popup and the hotbar slot picker; L/R (shoulder buttons) switch tabs in the main menu; the Options menu can be driven with the gamepad; the cursor stays on the entry you came from when leaving a submenu; the stick no longer races through entries.

Closed GUIs no longer keep answering to the gamepad (a patch unsubscribes the CanvasEngine `GamepadControls` directive from joypad.js on destroy), which fixed A saving several slots at once and B/A acting on a GUI that was already closed.
