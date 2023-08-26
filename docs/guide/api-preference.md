# API preference

## Module

The Module API preference in RPGJS allows you to create a clear separation between the server and client components of your game. You declare explicit module classes using the `RpgModule` decorator. This approach is ideal if you want more control over your game's structure and architecture. Modules are especially useful when you want to develop shareable plugins or components.

To use the Module API, follow these steps:

1. Define a module class using the `RpgModule` decorator.
2. Separate your game logic into different modules based on their functionalities.
3. Explicitly import and manage module interactions within your codebase.

Example:

`main/server/index.ts`:

```ts
import { RpgServer, RpgModule } from '@rpgjs/server'

@RpgModule<RpgServer>({
    engine: {
        onStart(server: RpgServerEngine) {
           console.log('start !')
        }
    }
})
export default class RpgServerModuleEngine { }
```

### Autoload

The Autoload API preference simplifies the structure of your RPGJS game by automatically loading modules from the defined file structure. Each file is autoloaded, and the module is created in the background. This approach is suitable for projects where you prefer a streamlined development process and don't need intricate control over the structure.

To use the Autoload API, follow these steps:

1. Organize your game's logic into files according to the autoload structure.
2. RPGJS will automatically load and manage these modules without explicit imports.

Example:

`main/server.ts`:

```ts
const engine = {
    onStart(server: RpgServerEngine) {
        console.log('start !')
    }
}

export default engine
```


## Choosing Between Module and Autoload

Choose the API preference that aligns with your project's requirements:

- **Module:** Use this approach for greater control over your game's architecture and when developing shareable plugins.
- **Autoload:** Opt for this approach to simplify your project's structure and streamline development.

Feel free to mix and match these preferences within your RPGJS project based on the specific needs of different components.