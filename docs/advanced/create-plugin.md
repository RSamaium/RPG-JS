# Creating and Sharing a Plugin with the RPGJS Community

## Step 1: Generate a Plugin Module

Generate a new plugin module by running the following command in your terminal:

```bash
npx rpgjs generate module myplugin
```

This will create a new directory named `myplugin` with the following structure:

```
myplugin
    ├── client
    │   └── index.ts
    ├── server
    │   └── index.ts
    ├── index.ts
    ├── config.json
    └── package.json
```

## Step 2: Naming Your Plugin
Make sure the name of your plugin package starts with `rpgjs-`. For example, you might name your plugin `rpgjs-myplugin`.

## Step 3: Understanding Autoload
The creation of the plugin does not utilize an autoload file, but instead, you will be required to create a module.

## Step 4: Configuring the Plugin

The `config.json` file at the root of your plugin directory will indicate what developers must or can put into their `rpg.toml` configuration file. You can then retrieve a configuration for server-side, client-side, or both from the module.

Here's an example of what the `config.json` file might look like:

```json
{
  "namespace": "myplugin",
  "server": {
    "type": "object",
    "properties": {
        "provider": {
            "type": "string"
        }
    },
    "required": [
        "provider"
    ]
  },
  "client": {},
  "*": {}
}
```

::: tip
To write properties, use [JSON Schema](https://json-schema.org/). If you're not familiar, use an AI like ChatGPT :)

Example: https://chat.openai.com/share/e0fbf66d-2f1f-4445-b176-3915cce1ebf2
:::

You can set configuration options for your plugin within the `rpg.toml` file, using the structure defined in your `config.json` file. Based on the above example, you might add the following to `rpg.toml`:

```toml
[myplugin]
   provider = '...'
```

In code, you can find the configuration with: [/api/RpgClientEngine.html#globalconfig](/api/RpgClientEngine.html#globalconfig). Example:

In `myplugin/server/index.ts`
```ts
import { RpgServerEngine } from '@rpgjs/server';
import { RpgServer, RpgModule } from '@rpgjs/server';

@RpgModule<RpgServer>({
    engine: {
        onStart(server: RpgServerEngine) {
            console.log(server.globalConfig.myplugin.provider)
        }
    }
 })
export default class RpgServerModuleEngine {}
```


## Step 6: Sharing with the Community

Once you've created and tested your plugin, you can share it with the RPGJS community by publishing it to a package repository like npm.

```bash
cd myplugin
npm publish
```

::: tip
Feel free to make a pull request on the RPGJS repository to share your plugin.
Or tell us about it on the forum!
:::