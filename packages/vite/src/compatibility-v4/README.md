# RPG-JS V4 Compatibility Plugin

This plugin provides backward compatibility for RPG-JS v4 projects using Vite. It allows auto-loading of files based on a specific directory structure.

## Directory Structure

The plugin scans for the following structure in your modules:

```
[module-name]
    * spritesheets
        * [directory-name]
            * [spritesheet-name].(png|jpeg|gif)
            * [spritesheet-name].ts
    * sounds
        * [sound-name].(mp3|ogg)
        * [sound-name].ts (optional)
    * gui
        * [gui-name].(vue)
    * database
        * [item-name].ts
    * events
        * [event-name].ts
    * maps
        * [map-name].tmx
        * [map-name].ts (optional)
        * [tileset-name].tsx
        * [tileset-name].png
    * worlds
        * [maps-directory]
            * [map-name].tsx
            * [tileset-name].tmx
            * [tileset-name].png
        * [world-name].world
    * player.ts
    * sprite.ts
    * server.ts
    * client.ts
    * scene-map.ts
```

## Usage

This plugin is automatically used when you configure your RPG-JS project with the compatibility mode enabled or when using the legacy configuration structure.

## Features

- **Auto-import**: Automatically imports files from standard directories.
- **Virtual Modules**: Creates virtual modules for client and server configurations.
- **Spritesheet Loading**: Automatically loads and configures spritesheets.
- **Map Loading**: Handles TMX map files and their associated TypeScript configurations.
