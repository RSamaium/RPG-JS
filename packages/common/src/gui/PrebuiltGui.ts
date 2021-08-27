 /** 
 * 
 * Pre-made GUIs already exist. For example, the command `player.showText()` displays the rpg-dialog component. It is up to you to customize the component or take advantage of the `@rpgjs/default-gui` module which already contains ready-made components
 * 
 * @title Prebuilt GUI
 * @enum {string}
 * 
 * PrebuiltGui.Dialog | rpg-dialog
 * PrebuiltGui.MainMenu | rpg-main-menu
 * PrebuiltGui.Shop | rpg-shop
 * PrebuiltGui.Disconnect | rpg-disconnect
 * PrebuiltGui.Gameover | rpg-gameover
 * PrebuiltGui.Save | rpg-save
 * PrebuiltGui.Controls | rpg-controls
 * PrebuiltGui.Notification | rpg-notification
 * @memberof PrebuiltGui
 * */
export enum PrebuiltGui {
    Dialog = 'rpg-dialog',
    MainMenu = 'rpg-main-menu',
    Shop = 'rpg-shop',
    Disconnect = 'rpg-disconnect',
    Gameover = 'rpg-gameover',
    Save = 'rpg-save',
    Controls = 'rpg-controls',
    Notification = 'rpg-notification'
}