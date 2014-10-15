#!/usr/bin/env node

var SCENE_ROOT = "https://cdn.rawgit.com/RSamaium/RPG-JS/master/core/scene/";

var program = require('commander'),
    inquirer = require("inquirer"),
    http = require('https'),
    colors = require('colors'),
    fs = require('fs');

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

program
  .version('0.0.1');

function writeData(path, data_default) {

   if (fs.existsSync(path)) {
      data_default = JSON.parse(fs.readFileSync(path));
   }
  else {
      fs.writeFileSync(path, JSON.stringify(data_default));
   }

   return data_default;
}

function getDatabase() {
  
   return writeData("Data/Database.json", {
        actors: {},
        classes: {},
        weapons: {},
        armors: {},
        elements: {},
        states: {},
        items: {},
        skills: {},
        switches: {},
        variables: {},
        tilesets: {},
        autotiles: {},
        dynamic_events: {},
        animations: {},
        system: {},
        map_infos: {}
    });
}

function writeDatabase(type, key, value) {
    var db = getDatabase();
    if (value == undefined) {
       db[type] = key;
    }
    else {
       db[type][key] = value;
    }
    
    fs.writeFileSync("Data/Database.json", JSON.stringify(db));

}

function getMaterials() {

  return writeData("Data/Materials.json", {
        tilesets: {},
        characters: {},
        animations: {},
        faces: {},
        windowskins: { },
        autotiles: {},
        battlers: { },
        fonts: {},
        gameovers: {},
        icons: {},
        pictures: { },
        titles: {}
    });
}

function addMap() {

     var db = getDatabase();
   
}

function getNewId(data) {
   var nid = 1;
   for (var id in data) {
      if (nid <= id) {
         nid = +id+1;
      }
   }
   return nid;
}

function syncGraphics(name, files, dir) {
   
   var materials = getMaterials(), nid;
   
   for (var i=0 ; i < dir.length ; i++) {
     console.log("-> Remove `" + dir[i].name + "` in `Data/Materials.json`");
     delete materials[name][dir[i].id];

   }  
   for (var i=0 ; i < files.length ; i++) {
      nid = getNewId(materials[name]);
      console.log("-> Add `" + files[i] + "` in `Data/Materials.json` with ID:" + nid);
      materials[name][nid] = files[i];
   }  

   fs.writeFileSync("Data/Materials.json", JSON.stringify(materials));
}

function listGraphics(name, display_log) {
    if (display_log) console.log("Search graphics `" + name + "`")

    name = name.toLowerCase();
   
    var materials_file = getMaterials()[name],
        the_graphic, in_not_dir = [], in_not_file = [], graphic_name, found,
        path = "Graphics/" + toFirstUppercase(name),
        materials_dir = fs.readdirSync(path);

    for (var i=0 ; i < materials_dir.length ; i++) {
        the_graphic = materials_dir[i];
        found = false;
        for (var graphic_id in materials_file) {
            graphic_name = materials_file[graphic_id];
            if (graphic_name == the_graphic) {
                 found = true;
                 break;
            }
        }
        if (!found) {
            in_not_dir.push(the_graphic);
            if (display_log) console.log("->" + " Warning : `%s` is not present in `Data/Materials.json`".warn, path + "/" + the_graphic);
        }
    }

    var log;

    for (var graphic_id in materials_file) {
       graphic_name = materials_file[graphic_id];
       found = false;
       log = "-> [ID:" + graphic_id + "] " + graphic_name;
       for (var i=0 ; i < materials_dir.length ; i++) {
          the_graphic = materials_dir[i];
          if (graphic_name == the_graphic) {
             found = true;
             break;
          } 
       }
       if (!found) {
          if (display_log) console.log(log + " Warning : `%s` does not exist".warn, path + "/" + graphic_name);
          in_not_file.push({id: graphic_id, name:  graphic_name});
       }
       else {
          if (display_log) console.log(log);
       }
    }
    return {
       in_not_dir: in_not_dir,
       in_not_file: in_not_file
    }
}

function toFirstUppercase(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}


program
  .command('list-graphics <name>')
  .description('create a project')
  .action(function(name) {

      var ret = listGraphics(name, true);

      if (ret.in_not_dir.length > 0 || ret.in_not_file.length > 0) {
           inquirer.prompt([ 
          {
            type: "confirm",
            name: "sync",
            message: "Want to synchronize files with the database?",
            default: "y"
          }
          ], function( result ) {
           
            if (result.sync) syncGraphics(name, ret.in_not_dir, ret.in_not_file);
        
        });
      }
        
  });

program
  .command('sync-graphics [name]')
  .description('create a project')
  .action(function(name) {

        var ret;

        if (name) {
          graphics = [name];
        }
        else {
          graphics = ["tilesets", "characters", "animations", "faces", "windowskins", "autotiles", "battlers", "fonts", "gameovers", "icons", "pictures", "titles"];
        }

        for (var i=0 ; i < graphics.length ; i++) {
          console.log("----- Synchronization " + graphics[i] + "-----");
          ret = listGraphics(graphics[i], false);
          if (ret.in_not_dir.length > 0 || ret.in_not_file.length > 0) {
              syncGraphics(graphics[i], ret.in_not_dir, ret.in_not_file);
          }
          else {
            console.log("No file sync !".info);
          }
        }
  });

program
  .command('create')
  .description('create a project')
  .action(function() {

   

    var root = ["Audio", "Graphics", "core", "plugins", "Data", "src"],
        data = ["Maps", "Events"],
        audio = ["BGM", "BGS", "ME", "SE"],
        scenes = ["Scene_Map", "Scene_Gameover", "Scene_Load", "Scene_Menu", "Scene_Title", "Scene_Window"];
        graphics = ["Animations", "Autotiles", "Battlers", "Characters", "Faces", "Fonts", "Icons", "Pictures", "Tilesets", "Titles", "Windowskins", "Gameovers"];

        function createDir(array, path) {
          for (var i=0 ; i < array.length ; i++) {
             console.log("-> Create `" + path + array[i] + "` directory");
             fs.mkdirSync(path + array[i]);
          }
        }

        createDir(root, "");
        createDir(data, "Data/");
        createDir(audio, "Audio/");
        createDir(graphics, "Graphics/");
        fs.mkdirSync("core/scene");


        function getScene(name) {
           console.log("Download `" + name + "` : " + SCENE_ROOT + name + ".js");
           var file = fs.createWriteStream("core/scene/" + name + ".js");
           var request = http.get(SCENE_ROOT + name + ".js", function(response) {
              response.pipe(file);
              console.log("Get `" + name + "` successful");
           });
        }

        for (var i=0 ; i < scenes.length ; i++) {
           getScene(scenes[i]);
        }

        getDatabase();
        getMaterials();
       
         inquirer.prompt([ 
          {
            type: "input",
            name: "title",
            message: "Name of your game",
            default: "Untitled"
          },
           {
            type: "input",
            name: "screen_width",
            message: "Screen Width (pixels)",
            default: 640
          },
          {
            type: "input",
            name: "screen_height",
            message: "Screen Height (pixels)",
            default: 480
          },
          
          ], function( result ) {

              writeDatabase("system", {
                  title:  result.title,
                  screen_width:  result.screen_width,
                  screen_height:  result.screen_height
              });

               var template = {
                    index: '<!DOCTYPE html>\n\r' +
            '<title>' + result.title + '</title>' +
            '<script src="https://cdn.rawgit.com/RSamaium/CanvasEngine/master/canvasengine-1.3.2.all.min.js"></script>\n\r' +
            '<script src="https://cdn.rawgit.com/RSamaium/RPG-JS/master/rpgjs-2.0.0.min.js"></script>\n\r' +
            '<script src="./src/main.js"></script>\n\r' +
            '<canvas id="rpg_canvas" width="' + result.screen_width + '" height="' + result.screen_height + '"></canvas>',

                  js: 'RPGJS.defines({\n\r' +
                    'canvas: "rpg_canvas",\n\r' +
                    'tiled: true\n\r' +
                  '}).ready(function() {\n\r' +
                    'RPGJS.Scene.map();\n\r' +
                 '});'
                };

               fs.writeFileSync("./index.html", template.index);
               fs.writeFileSync("./src/main.js", template.js);
 
        });

      
});

program
  .command('create-event [bundle]')
  .description('create an event in a map')
  .action(function(bundle){




    var event = [
        {
            "id": "1",
            "x": "0",
            "y": "0",
            "name": ""
        },
        [
            {
                "trigger": "action_button",
                "frequence": "2",
                "type": "fixed",
                "speed": "4",
                "switch_1": 0,
                "switch_2": 0,
                "switch_3": 0,
                "commands": [
                ],
                "graphic": "2"
            }
        ]
    ]

    inquirer.prompt([ 
      {
        type: "input",
        name: "name",
        message: "Event name"
      },
       {
        type: "input",
        name: "id",
        message: "MAP ID",
        default: 1
      },
      {
        type: "input",
        name: "x",
        message: "Position X",
        default: 0
      },
       {
        type: "input",
        name: "y",
        message: "Position Y",
        default: 0
      },
      {
        type: "list",
        name: "trigger",
        message: "How commands are triggered?",
        default: 'action_button',
        choices: [
          {name: "Press the Enter key", value: "action_button"}, 
          {name: "Contact with this event", value: "contact"}, 
          {name: "Automatically loop", value: "auto"},
          {name: "Automatically only once", value: "auto_one_time"},
          {name: "Automatically, without blocking the movement", value: "parallel_process"}
        ],
      },
       {
        type: "list",
        name: "type",
        message: "Movement Type ?",
        default: 'fixed',
        choices: [
          {name: "Do not move", value: "fixed"}, 
          {name: "Random motiont", value: "random"}, 
          {name: "Approaches to the hero", value: "approach"}
        ],
      },
       {
        type: "input",
        name: "speed",
        message: "Speed (1-6)",
        default: 4
      },
       {
        type: "input",
        name: "frequence",
        message: "Frequence (0-5)",
        default: 2
      },
       {
        type: "checkbox",
        name: "options",
        message: "Options (Choices with Space)",
        default: 'action_button',
        choices: [
          {name: "move_animation", value: "move_animation"}, 
          {name: "stop_animation", value: "stop_animation"}, 
          {name: "direction_fix", value: "direction_fix"},
          {name: "through", value: "through"},
          {name: "alwaysOnTop", value: "alwaysOnTop"}
        ],
      }
      ], function( result ) {
       
       var path = "Data/Events/MAP-" + result.id;
       if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
       }

       var events = fs.readdirSync(path), obj = {}, nid;

       for (var i=0 ; i < events.length ; i++) {
          obj[/[0-9]+/.exec(events[i])[0]] = events[i];
       }

       nid = getNewId(obj);


       event[0].name = result.name == "" ? "EV-" + nid : result.name;
       event[0].id = nid;
       event[0].x = result.x;
       event[0].y = result.y;
       var page = event[1][0];

       var prop = ["trigger", "option", "type", "speed", "frequence"];
       for (var i=0 ; i < prop.length ; i++) {
         page[prop[i]] = result[prop[i]];
       }

       fs.writeFileSync(path + "/EV-" + nid + ".json", JSON.stringify(event));

       console.log("new event created successfully : `%s`".info, path + "/EV-" + nid + ".json");

    });

		
});

program
  .command('*')
  .action(function(env){
    console.log('Enter a Valid command');
    terminate(true);
});

program.parse(process.argv);