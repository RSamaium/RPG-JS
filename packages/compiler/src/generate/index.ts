import * as fs from 'fs';
import * as path from 'path';
import { addToToml } from '../add/addToToml.js';
import colors from 'picocolors'

const __dirname = path.dirname(new URL(import.meta.url).pathname);

/**
 * Generate the specified RPG module files and structure.
 *
 * @param type module type
 * @param directory directory name
 */
export function generate(type: string, directory: string): void {
    const configJsonContent = JSON.stringify({ namespace : directory, server: {}, client: {}, "*": {} }, null, 2);

    // Ensure new directory exists
    const newDirPath = path.join(directory);
    if (!fs.existsSync(newDirPath)) {
        fs.mkdirSync(newDirPath, { recursive: true });
    }

    // Create config.json file
    const configJsonPath = path.join(newDirPath, 'config.json');
    fs.writeFileSync(configJsonPath, configJsonContent);

    // Create index.ts
    const indexTsContent = `import client from 'client!./client'
import server from 'server!./server'

export default {
    client,
    server
}`;
    fs.writeFileSync(path.join(newDirPath, 'index.ts'), indexTsContent);

    // Create server directory and index.ts
    const serverDirPath = path.join(newDirPath, 'server');
    fs.mkdirSync(serverDirPath, { recursive: true });
    const serverIndexTsContent = `import { RpgServer, RpgModule } from '@rpgjs/server';

@RpgModule<RpgServer>({ })
export default class RpgServerModuleEngine {}`;
    fs.writeFileSync(path.join(serverDirPath, 'index.ts'), serverIndexTsContent);

    // Create client directory and index.ts
    const clientDirPath = path.join(newDirPath, 'client');
    fs.mkdirSync(clientDirPath, { recursive: true });
    const clientIndexTsContent = `import { RpgClient, RpgModule } from '@rpgjs/client';

@RpgModule<RpgClient>({ })
export default class RpgClientModuleEngine {}`;
    fs.writeFileSync(path.join(clientDirPath, 'index.ts'), clientIndexTsContent);

    const versionCompiler = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')).version;

    const packageJsonContent = `
{
    "name": "rpgjs-${directory}",
    "version": "1.0.0",
    "description": "",
    "main": "index.ts",
    "types": "index.d.ts",
    "keywords": [],
    "author": "",
    "license": "MIT",
    "dependencies": {
      "@rpgjs/client": "^${versionCompiler}",
      "@rpgjs/server": "^${versionCompiler}"
    }
  }
`

    // Create package.json file
    const packageJsonPath = path.join(newDirPath, 'package.json');
    fs.writeFileSync(packageJsonPath, packageJsonContent);

    // Add readme.md
    const readmeMdContent = `# RPG JS Plugin
    
## Description
    
...
    
## Features
    
...
    
## Installation
    
You can easily install the RPG JS Plugin using npm. Open your terminal and run the following command:

\`\`\`bash
npx rpgjs add rpgjs-${directory}
\`\`\`

## Usage

...

## License

...
`

    const readmeMdPath = path.join(newDirPath, 'readme.md');
    fs.writeFileSync(readmeMdPath, readmeMdContent);

    addToToml(`./${directory}`);

    console.log(colors.green(`\n${directory} module created successfully!\n`));
}
