// Import required modules
import * as childProcess from 'child_process';
import { addToToml } from './addToToml.js';
import { warn, error, info } from '../logs/warning.js';

/**
 * 1. Install module with NPM
 * 2. Add to rpg.toml in the current project. Use addToToml(moduleName) from ./addToToml.js
 *
 * @param moduleName name of the module to add
 */
export function add(moduleName: string): void {
  // Install the module using NPM
  installModule(moduleName)
    .then(() => {
      // Add the module to rpg.toml
      addToToml(moduleName);
      info(`Module '${moduleName}' has been successfully added to rpg.toml and installed.`);
    })
    .catch((error) => {
      error(`Failed to install '${moduleName}': ${error.message}`);
    });
}

/**
 * Install the module using NPM and display the progress bar
 *
 * @param moduleName name of the module to install
 */
function installModule(moduleName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const installProcess = childProcess.spawn('npm', ['install', moduleName]);

    // Listen to stdout data events and display the progress bar
    installProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    // Listen to stderr data events and display any error messages
    installProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    // Handle the close event
    installProcess.on('close', (code) => {
      if (code === 0) {
        info(`Module '${moduleName}' has been successfully installed.`);
        resolve();
      } else {
        reject(new Error(`NPM install process exited with code ${code}`));
      }
    });

    // Handle the error event
    installProcess.on('error', (error) => {
      reject(error);
    });
  });
}
