# Create Progressive Web Apps (PWA)

## 1. Introduction

RPGJS allows you to create PWAs for your game, which enhances user engagement and accessibility. This guide explains how to enable or disable the PWA feature and customize its information.

> Works only when building the game and not during development

## 2. Disabling PWA

To disable the PWA feature, modify your `rpg.toml` file as follows:

```toml
[compilerOptions.build]
  pwaEnabled = false
```

By setting `pwaEnabled` to `false`, the PWA feature will be turned off during the build process.

## 3. Enabling PWA

By default, the PWA feature is enabled in RPGJS. To enable it, no additional steps are required.

## 4. PWA Minimal Requirements
When the PWA feature is enabled, you can customize the PWA information that will be displayed when users install and use the app. Modify the following fields in your `rpg.toml`:

```toml
name = "My Game"
shortName = "Game"
description = "Beautiful Game"
themeColor = "#ffffff"

[[icons]]
  src = "icon.png"
  sizes = [96, 128, 192, 256]
```

- `name`: The name of your game.
- `shortName`: A shorter name for your game.
- `description`: A brief description of your game.
- `themeColor`: The theme color for the browser UI.

## 5. Overriding Vite PWA Plugin Option

You can further customize the PWA behavior by overriding the Vite PWA plugin options. To do this, add the desired options under the `[pwa]` section in your `rpg.toml` file. Refer to the [Vite PWA plugin documentation](https://vite-pwa-org.netlify.app) for a list of available options.

Here's an example of how to override some options:

```toml
[pwa]
  includeAssets = ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg']
  # Add more Vite PWA plugin options here
```

# Generate Game APK (TWA)

Since 2020, Google has launch [Trusted Web Activity (TWA)](https://developer.chrome.com/docs/android/trusted-web-activity/overview/) a way to switch Progressive Web App (PWA) to an Android application.

For this tutorial, we use PwaBuilder but if you want make it by your own with [Google integration Guide](https://developer.chrome.com/docs/android/trusted-web-activity/integration-guide/)

 1. Go on [pwabuilder.com](https://www.pwabuilder.com/)
    - Enter your url game server

 2. Wait and click on Build My PWA
 3. Select Android    
 4. Click on Download     
 5. Follow instruction : [Next-steps.md](https://github.com/pwa-builder/CloudAPK/blob/master/Next-steps.md)