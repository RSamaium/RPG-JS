# Customize GUIs

SCSS variables must be found in the <PathTo to="themeFile" /> file.

These variables are used by the GUIs of your game. You can change the color of a window, the font, etc.

```scss
/*
    Window StyleSheet
*/
$window-background: linear-gradient(148deg, rgba(79, 82, 136, 0.7) 0%, rgba(42, 43, 73, 0.7) 100%);
$window-border: 2.5px solid white;
$window-border-radius: 5px;
$window-arrow-color: white;
$window-font-size: 25px;
$window-font-color: white;
$window-font-family: 'Arial';

$cursor-background: #7782ab;
$cursor-border: 1px solid #9db0c6;

$hero-face: url('@/config/client/assets/face.png');

@mixin window-content {
    // add extra style stylesheet
}
```

## Create your own variable

Imagine that you create a GUI, you can put your own variable:

In `*.vue` file:

```vue
<style lang="scss">
$my-var: #fff !default;

.my-element {
    color: $my-var;
}
</style>
```

So that the game creator can put in <PathTo to="themeFile" /> file:

```scss
$my-var: red;
// ... others variables
```

## Link to images

If you put paths to images, start the path with "@":

```scss
$hero-face: url('@/config/client/assets/face.png');
```