# RPGJS Standalone Mode Package

This package allows you to easily transform the RPGJS engine into standalone mode, making it a breeze to integrate into your web applications. To get started, follow the simple steps below:

## Installation

Add the following CDN links and code to your HTML file:

```html
<!-- Include Vue.js (required for RPGJS) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/vue/3.3.4/vue.global.min.js"
    integrity="sha512-Wbf9QOX8TxnLykSrNGmAc5mDntbpyXjOw9zgnKql3DgQ7Iyr5TCSPWpvpwDuo+jikYoSNMD9tRRH854VfPpL9A=="
    crossorigin="anonymous" referrerpolicy="no-referrer"></script>

<!-- Include RPGJS runtime -->
<script src="browser/rpg.runtime.umd.js"></script>

<!-- Create a container for the RPGJS game -->
<div id="rpg"></div>

<script>
    RPG.run([
        {
            server: {
                engine: {
                    onStart() {
                        console.log('RPG engine started')
                    }
                },
                player: {
                    onConnected(player) {
                        console.log('Player connected', player.id)
                    }
                }
            },
            client: {
                // Add your client-side configuration here
            }
        }
    ])
</script>
```

## Usage

The `RPG.run()` method is used to configure and start the RPGJS engine in standalone mode. It accepts an array of objects, where each object represents a module configuration with both server and client settings.

- `server`: This section is for server-side configurations.
- `client`: This section is for client-side configurations. You can add your client-specific settings here.

Feel free to customize these configurations to suit your RPGJS project's needs.

With these simple steps, you can easily transform the RPGJS engine into standalone mode for your web applications. Happy gaming! 🎮

## Development mode

to create the file:

```bash
npm run build
```