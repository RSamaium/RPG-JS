// Import required modules
import * as childProcess from 'child_process';
import { addToToml } from './addToToml.js';
import { error, info } from '../logs/warning.js';
import ora from 'ora'; 

/**
 * 1. Install module with NPM
 * 2. Add to rpg.toml in the current project. Use addToToml(moduleName) from ./addToToml.js
 *
 * @param moduleName name of the module to add
 */
export function add(moduleName: string): void {
  // Display spinner
  const spinner = ora(`Installing ${moduleName}...`).start();

  // Install the module using NPM
  installModule(moduleName)
    .then(() => {
      // Add the module to rpg.toml
      addToToml(moduleName);
      spinner.succeed(`Module '${moduleName}' has been successfully added to rpg.toml and installed.`);
    })
    .catch((err) => {
      spinner.fail(`Failed to install '${moduleName}'`);
      error(err);
      info(`
You can install it differently: install the plugin: 
1. npm install ${moduleName}
2. add to rpg.roml:

modules = [
  ${moduleName}
]
      `)
    });
}

/**
 * Install the module using NPM and display the progress bar
 *
 * @param moduleName name of the module to install
 */
function installModule(moduleName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const installProcess = childProcess.spawn(npmCommand, ['install', moduleName]);

    installProcess.on('close', (code) => {
      if (code === 0) {
        info(`Module '${moduleName}' has been successfully installed.`);
        resolve();
      } else {
        reject(new Error(`NPM install process exited with code ${code}`));
      }
    });

    installProcess.on('error', (error) => {
      reject(error);
    });
  });
}