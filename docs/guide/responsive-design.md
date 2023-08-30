# Running on smartphone 

![Smartphone](/assets/smartphone.png)

You should know that the game works on a smartphone. But for a good user experience, several criteria must be met

1. The game must be Responsive Design. Depending on the size of the screen, the game remains playable.
2. We have controls to make the character move or do an action.
3. The game can be installed on the smartphone and can be played offline (in the case of an RPG).

## Responsive Design

the notion of Responsive is done with CSS. Here is a complete example of an HTML page: 

```html
<!doctype html>
<html>

<head>
    <meta charset="utf-8">
    <title>RPG Game</title>
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, minimum-scale=1, width=device-width, height=device-height">
</head>

<body>
    <div id="rpg"></div>
    
    <style>
        body,
        html {
            height: 100%;
            overflow: hidden;
        }

        body {
            margin: 0;
            background-color: black; 
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #rpg {
            position: relative;   
        }

        @media (min-width: 800px) {
            #rpg {
                width: 816px;
                height: 624px;
            }
        }

        @media (max-width: 800px) {
            #rpg {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
            }
        }
    </style>
</body>

</html>
```

Note that the Canvas and the GUIs all take the size of the main selector (`#rpg`)

## Controls

To put controls (as in the picture above), you have to create a GUI and open it as soon as the card is ready. You are free to create a GUI named `rpg-controls`.
Then, you can inject [rpgScene](/classes/vue-inject.html#services) into the component and take advantage of the [applyControl()]((/classes/scene-map.html#rpgscene)) method to apply controls when a GUI location is pressed.

If you don't want to create by yourself, You can add the plugin for the mobile

`npx rpgjs add @rpgjs/mobile-gui`

As soon as the map is opened, display the GUI for controls
