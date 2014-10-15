# Goal #

Generate the RPG project structure and content quickly

# Installation #

    npm install rpgjs -g

# Create an empty project #

Create an empty directory and go inside

    mkdir my_project
    cd ./my_project

Create the project structure

    rpgjs create

Give the name of the game and dimensions

# Create an event #

    rpgjs create-event

# List the graphic resources #

    rpgjs list-graphics name

`name` :

- animations
- autotiles
- battlers
- characters
- faces
- fonts
- icons
- pictures
- tilesets
- titles
- windowskins
- gameovers

# Synchronize graphics resources #

For the json file and folder resources either identical

    rpgjs sync-graphics [name]

Synchronizes all directories if `name` is not defined