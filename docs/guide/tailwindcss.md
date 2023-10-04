# Adding TailwindCSS to RPGJS Project

If you're using an RPGJS project and would like to harness the utility-first CSS framework, TailwindCSS, this guide will help you integrate it smoothly. Below are the steps to follow:

## Step 1: Installation

Start by installing the necessary dependencies:

```bash
npm install -D tailwindcss postcss autoprefixer
```

This will install `tailwindcss`, `postcss`, and `autoprefixer` as development dependencies.

## Step 2: Initialization

Initialize the configuration files for both TailwindCSS and PostCSS:

```bash
npx tailwindcss init -p
```

Executing this command will generate two files: `tailwind.config.js` and `postcss.config.js`.

## Step 3: Configure TailwindCSS

Edit the generated `tailwind.config.js` to specify the content files (so that unused styles can be purged) and any theme customizations or plugins you may need.

Here's a base configuration to start with:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./{!(dist|node_modules)/**/*,*}.{vue,js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
```

This configuration tells Tailwind to look for class usage in all `.vue`, `.js`, `.ts`, `.jsx`, and `.tsx` files outside the `dist` and `node_modules` directories, as well as the `index.html` file. The styles not used within these files will be purged from the final CSS build.

## Step 4: Import Tailwind's Directives

In your main CSS (let's call it `style.css`), you will need to import Tailwind's base, components, and utilities directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

When building for production, these directives will be replaced with the actual TailwindCSS styles.

---

That's it! Now, you can start using TailwindCSS classes in your RPGJS project. As you develop, remember to consult the [TailwindCSS documentation](https://tailwindcss.com/docs) for available utility classes and more advanced features.