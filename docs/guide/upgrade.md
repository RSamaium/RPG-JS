# Upgrade RPGJS

## Update All Packages

To keep the RPGJS framework up-to-date with the latest features, bug fixes, and improvements, it's essential to periodically update all the packages it relies on. Here's a step-by-step guide on how to achieve that:

### Step 1: Install `npm-check-updates` (if not already installed)

If you haven't installed `npm-check-updates` globally on your system, you can do so using the following command:

```bash
npm install -g npm-check-updates
```

### Step 2: Update RPGJS Packages

Once `npm-check-updates` is installed, you can use it to update all the RPGJS-related packages. These packages are usually scoped under the `@rpgjs` namespace. Run the following command to update them:

```bash
ncu -u @rpgjs*
```

This command will check for available updates for RPGJS packages and modify your `package.json` file to reflect the latest versions.

### Step 3: Install Updated Packages

After updating the package versions in your `package.json` file, you need to install the updated packages. Run the following command to install the latest versions:

```bash
npm install
```

This command will fetch and install the updated packages specified in your `package.json` file.

### Step 4: Test and Validate

With the packages updated and installed, it's crucial to thoroughly test your RPGJS application to ensure that everything works as expected. Test various functionalities, gameplay scenarios, and interactions to identify any potential issues that might have arisen due to the updates.

Happy gaming and developing! 🎮🚀