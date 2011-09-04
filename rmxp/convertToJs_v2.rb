=begin
Visit http://rpgjs.com for documentation, updates and examples.

Copyright (C) 2011 by Samuel Ronce

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
=end

PATH_MAPS = "RpgJs/Data/Maps"
PATH_EVENTS = "RpgJs/Data/Events"
PATH_DATABASE = "RpgJs/Database"

module DirJs
  class << self
    def recursiveCreate(path)
      dir = path.split('/')
      path_dir = ""
      for i in 0...dir.size
         path_dir += dir[i]
         if not File.directory?(path_dir)
          Dir::mkdir(path_dir, 0777)
         end
         path_dir += "/"
      end # for
    end # def
  end # class
end # module

class RpgJs
  
  def initialize
    @prop = "{"
    @array_prop = []
    @map = "{\"map\": ["
    @map_i = @map_j = -1
    @map_infos = load_data("Data/MapInfos.rxdata")
  end
  
  def exportEvent(map_id)

    map = load_data(sprintf("Data/Map%03d.rxdata", map_id))
    map_infos = load_data("Data/MapInfos.rxdata")
    for i in map.events.keys
      event = map.events[i]
      event_txt = <<-CODE
[
    {
      "x": #{event.x},
      "y": #{event.y},
      "id": "#{event.id}",
      "name": "#{event.name}"
    },
    [
CODE

  for j in 0...event.pages.size
    event_p = event.pages[j]
    direction = event_p.graphic.direction
    case direction
      when 2
        direction = 'bottom'
      when 4
        direction = 'left'
      when 6
        direction = 'right'
      when 8
        direction = 'up'
      end
      
    type = event_p.move_type
    case type
      when 0
        type = 'fixed'
      when 1
        type = 'random'
      when 2
        type = 'approach'
      when 3
        type = 'custom'
      end 
      
    trigger = event_p.trigger
     case trigger
      when 0
        trigger = 'action_button'
      when 1
        trigger = 'contact'
      when 2
        trigger = 'event_contact'
      when 3
        trigger = 'auto'
      when 4
        trigger = 'parallel_process'
      end 
      
      condition = event_p.condition
      condition_txt = ""
      if condition.self_switch_valid 
         condition_txt += "\"self_switch\": \"" + condition.self_switch_ch + "\","
      end
      if condition.switch1_valid or condition.switch2_valid 
         condition_txt += "\"switches\": ["
         if condition.switch1_valid
           condition_txt += condition.switch1_id.to_s
         end
         if condition.switch2_valid
           condition_txt += ", " + condition.switch2_id.to_s
         end
        condition_txt += "]"
      end
      condition_txt = condition_txt.gsub(/,$/, "")
      if condition_txt != ""
        condition_txt = "\"conditions\": {" + condition_txt + "},"
      end
      
      speed = 6 - event_p.move_speed + 1
      frequency = (6 - event_p.move_frequency + 1) * 4
      
      graphic = ''
      if event_p.graphic.character_name != ""
         graphic += '"character_hue": "' + event_p.graphic.character_name + '.png",'
         graphic += '"pattern": ' + event_p.graphic.pattern.to_s + ','
      end
     
      walk_anime = !event_p.walk_anime
       
event_txt += <<-CODE
        {
            #{condition_txt}
            #{graphic}
            "trigger": "#{trigger}",
            "direction": "#{direction}",
            "frequence": #{frequency},
            "type": "#{type}",
            "through": #{event_p.through},
            "stop_animation": #{event_p.step_anime},
            "no_animation": #{walk_anime},
            "direction_fix": #{event_p.direction_fix},
            "alwaysOnTop": #{event_p.always_on_top},
            "speed": #{speed},
            "commands": [
CODE

        cmd_txt = ""
        for k in 0...event_p.list.size-1
          cmd = event_p.list[k]
          param = cmd.parameters
          cmd_txt += "\""
           
           case cmd.code
            when 101  # Show Text
              cmd_txt += "SHOW_TEXT: {'text': '" + param[0] + "'}"
            when 102  # Show Choices
            when 402  # When [**]
            when 403  # When Cancel
            when 103  # Input Number
            when 104  # Change Text Options
            when 105  # Button Input Processing
            when 106  # Wait
              cmd_txt += "WAIT: {'frame': " + param[0].to_s + ", 'block': true}"
            when 111  # Conditional Branch
            when 411  # Else
            when 112  # Loop
            when 413  # Repeat Above
            when 113  # Break Loop
            when 115  # Exit Event Processing
            when 116  # Erase Event
              cmd_txt += "ERASE_EVENT: true"
            when 121  # Control Switches
              if param[2] == 0
                cmd_txt += "SWITCHES_ON"
              else
                cmd_txt += "SWITCHES_OFF"
              end
              tab = ""
              for i in param[0]..param[1]
                tab += i.to_s + ","
              end
              tab =  tab.gsub(/,$/, "")
              cmd_txt += ": [" + tab + "]"
            when 122  # Control Variables
                id = ""
                operation = ""
                operand = ""
                for l in param[0]..param[1]
                  id += l.to_s
                end
                case param[2]
                  when 0
                      operation = "set"
                  when 1
                      operation = "add"
                  when 2
                      operation = "sub"
                  when 3
                      operation = "mul"
                  when 4
                      operation = "div"
                  when 5
                      operation = "mod"
                end
                cmd_txt += "VARIABLE: {'id': [" + id + "], 'operation': '" + operation + "', "
                cmd_txt += "'operand': "
                val = param[4].to_s
                case param[3]
                  when 0
                    operand += val
                  when 1
                    operand += "{'variable': " + val + "}"
                  when 2
                    operand += "[" + val + ", " + param[5].to_s + "]"
                end
                  cmd_txt += operand + "}"
            when 123  # Control Self Switch
              if param[1]
                cmd_txt += "SELF_SWITCH_ON"
              else
                cmd_txt += "SELF_SWITCH_OFF"
              end
              cmd_txt += ": '" + param[0] + "'"
            when 124  # Control Timer
            when 125  # Change Gold
              cmd_txt += "CHANGE_GOLD: "
              if not param[0]
                cmd_txt += "-"
              end
              cmd_txt += param[2].to_s
            when 126, 127, 128  # Change Item, Weapon, Armor
               cmd_txt += "CHANGE_ITEMS: {'name': '" + $data_items[param[0]].name + "',"
               val = param[3].to_i
               if param[1] == 1
                 val = -val
               end
               if param[2] == 1 # if variable
                  cmd_txt += "'variable'"
               else
                  cmd_txt += "'constant'"
                end
                cmd_txt += ": " + val.to_s + "}"
            when 131  # Change Windowskin
                cmd_txt += "CHANGE_WINDOWSKIN: '" + param[0] + "'"
            when 201  # Transfer Player
              cmd_txt += "TRANSFERT_PLAYER: {'name': '" + map_infos[param[1]].name + "', 'x': " + param[2].to_s + ",'y': " + param[3].to_s + "}"
            when 202  # Set Event Location
              cmd_txt += "SET_EVENT_LOCATION: {"
              if param[0] != 0
                cmd_txt += "'event': '" + map.events[param[0]].name + "',"
              end
              if param[1] == 0
                 cmd_txt += "'appointement'"
              else
                 cmd_txt += "'variables'"
              end
              cmd_txt += ": [" + param[2].to_s + ", " + param[3].to_s + "]"
              if param[4] != 0
                 cmd_txt += ", 'direction': '"
                 case param[4]
                   when 2
                       cmd_txt += "down"
                   when 4
                       cmd_txt += "left"
                   when 6
                       cmd_txt += "right"
                   when 8
                       cmd_txt += "up"
                    end
                  cmd_txt += "'"
               end
               cmd_txt += "}"
            when 203  # Scroll Map
               data = map.events[event.id]
               x = data.x
               y = data.y
               c = param[1]
               case param[0]
                 when 2
                   y += c
                 when 4
                   x -= c
                 when 6
                   x += c
                 when 8
                   y -= c
               end
               cmd_txt += "SCROLL_MAP: {'x': " + x.to_s + ", 'y': " + y.to_s + "}" 
            when 205  # Change Fog Color Tone
            when 206  # Change Fog Opacity
            when 207  # Show Animation
              cmd_txt += "SHOW_ANIMATION: {"
              if param[0] != 0
                cmd_txt += "'target': '"
                if param[0] == -1
                  cmd_txt += "Player"
                else
                  cmd_txt += map.events[param[0]].name
                end
                cmd_txt += "', "
              end
              cmd_txt += "'name': '" + $data_animations[param[1]].name + "'}"
            when 208  # Change Transparent Flag
            when 209  # Set Move Route
              cmd_txt += "MOVE_ROUTE: ["
              move_txt = ""
              cmd_move = param[1].list
              for l in 0...cmd_move.size
                cmd_m = cmd_move[l]
                case cmd_m.code
                  when 1  # Move down
                    move_txt += "'bottom',"
                  when 2  # Move left
                    move_txt += "'left',"
                  when 3  # Move right
                    move_txt += "'right',"
                  when 4  # Move up
                     move_txt += "'up',"
                  when 5  # Move lower left
                  when 6  # Move lower right
                  when 7  # Move upper left
                  when 8  # Move upper right
                  when 9  # Move at random
                  when 10  # Move toward player
                  when 11  # Move away from player
                  when 12  # 1 step forward
                  when 13  # 1 step backward
                    move_txt += "'step_backward',"
                  when 14  # Jump
                  when 15
                  when 16  # Turn down
                  when 17  # Turn left
                  when 18  # Turn right
                  when 19  # Turn up
                  when 20  # Turn 90° right
                  when 21  # Turn 90° left
                  when 22  # Turn 180°
                  when 23  # Turn 90° right or left
                  when 24  # Turn at Random
                  when 25  # Turn toward player
                  when 26  # Turn away from player
                end
              end
              move_txt =  move_txt.gsub(/,$/, "")
              cmd_txt += move_txt + "]"
            when 221  # Prepare for Transition
            when 222  # Execute Transition
            when 223  # Change Screen Color Tone
                cmd_txt += "SCREEN_TONE_COLOR:"
            when 224  # Screen Flash
                cmd_txt += "SCREEN_FLASH: {'color': '" + rgbToHexa(param[0]) + "', 'speed': " + (param[1] * 2).to_s + "}"
            when 225  # Screen Shake
                cmd_txt += "SCREEN_SHAKE: {'power': " + param[0].to_s + ", 'speed': " + param[1].to_s + ", 'duration': " + param[2].to_s + "}"
            when 231, 232  # Show Picture, Move Picture
                if cmd.code == 231
                  cmd_txt += "SHOW_PICTURE: {'filename': '" + param[1].to_s + ".png'"
                else
                  cmd_txt += "MOVE_PICTURE: {'duration': " + param[1].to_s
                end
                cmd_txt += ", 'id': " + param[0].to_s + ", "
                if param[2] == 1
                  cmd_txt += "'reg': 'center',"
                end
                if param[3] == 0
                  cmd_txt += "'constants':"
                else
                  cmd_txt += "'variables':"
                end
                 cmd_txt += "{'x':" + param[4].to_s + ", 'y': " + param[5].to_s + "}, 'zoom_x': " + param[6].to_s 
                 cmd_txt += ", 'zoom_y': " + param[7].to_s + "'opacity': " + (param[8] / 255).to_s + "}"
            when 233  # Rotate Picture
                 cmd_txt += "ROTATE_PICTURE: {'id': " + param[0].to_s + ", 'duration': " + param[1].to_s + ", 'value': 'loop'}"
            when 234  # Change Picture Color Tone
            when 235  # Erase Picture
                 cmd_txt += "ERASE_PICTURE: " + param[0].to_s
            when 236  # Set Weather Effects
            when 241  # Play BGM
                cmd_txt += "PLAY_BGM: " + param[0].to_s
            when 242  # Fade Out BGM
            when 245  # Play BGS
            when 246  # Fade Out BGS
            when 247  # Memorize BGM/BGS
            when 248  # Restore BGM/BGS
            when 249  # Play ME
            when 250  # Play SE
              cmd_txt += "PLAY_SE: {'filename': '" + param[0].name + ".ogg'}"
            when 251  # Stop SE
            when 313, 318  # Change State, Change Skills
                if cmd.code == 313
                 cmd_txt += "CHANGE_STATE"
               else 
                 cmd_txt += "CHANGE_SKILLS"
               end
               cmd_txt += ": {'event': 'Player', 'operation': '"
               if param[1] == 0
                 cmd_txt += cmd.code == 313 ? "add" : "learn"
               else
                 cmd_txt += cmd.code == 313 ? "remove" : "forget"
               end
               data = cmd.code == 313 ? $data_states : $data_skills
               cmd_txt += "', 'name': '" + data[param[2]].name + "'}"
            when 315, 316  # Change EXP, Change Level
              if cmd.code == 315
                 cmd_txt += "CHANGE_LEVEL"
              else 
                 cmd_txt += "CHANGE_EXP"
              end
              cmd_txt += ": {'event': 'Player',"
              val = param[3]
              if param[1] == 1
                val = -val
              end
              if param[2] == 0
                cmd_txt += "'constant'"
              else
                 cmd_txt += "'variable'"
              end
              cmd_txt += ": " + val.to_s + "}"
            when 321  # Change Actor Class
               cmd_txt += "CHANGE_CLASS: {'event': 'Player', 'name': '" + $data_classes[param[1]].name + "'}"
               
            end 
            cmd_txt += "\",\n\t\t\t  "
          end
          cmd_txt =  cmd_txt.gsub(/\{\}(,\n\t\t\t  )?/, "")
          cmd_txt =  cmd_txt.gsub(/,\n\t\t\t  $/, "")
event_txt += <<-CODE
              #{cmd_txt}
            ]
        },
CODE
    end
    event_txt =  event_txt.gsub(/,\n$/, "")
event_txt += <<-CODE

    ]
]
CODE
    path = PATH_EVENTS + "/" + currentMapName
    DirJs.recursiveCreate(path)
    File.open(path + "/" + event.name + ".json", "w") do |f|
      f.write event_txt
    end
    $rpgjs_history.push({"color" => "normal", "text" => "Event '" + event.name + "' created"})
    
    end
  end
  
  def rgbToHexa(rgb)
    return sprintf("%02x", rgb.red).upcase + sprintf("%02x", rgb.green).upcase + sprintf("%02x", rgb.blue).upcase
  end
  
  def currentMapName
    return @map_infos[$game_map.map_id].name
  end
  
  def exportMap(i)
        map_data = $game_map.data
      #  for i in 0...map_data.xsize
            if i != @map_i
              @map += "["
            end
            for j in 0...map_data.ysize
              @map += "["
              for k in 0...map_data.zsize
                id = map_data[i, j, k]
                @map += (id != 0 ? (id).to_s : "null") + ","
                if not @array_prop.include?(id) and id != 0
                  @prop += "\"" + (id).to_s + "\": [" + $game_map.priorities[id].to_s + ", " + $game_map.passages[id].to_s + "],"
                  @array_prop.push(id)
                end
              end # k
              @map = @map.gsub(/,$/, "")
              @map += "],"
            end # j
            if i != @map_i
               @map = @map.gsub(/,$/, "")
              @map += "],"
              @map_i = i
            end
      #    end # i
        if i != map_data.xsize-1 
          return
        end
        @map = @map.gsub(/,$/, "")
        @prop = @prop.gsub(/,$/, "")
        @map += "], \"propreties\": " + @prop + "}}"
        
       exportEvent($game_map.map_id)
        
       $rpgjs_history.push({"color" => "normal", "text" => "Map '" + currentMapName + "' created"})
        
       File.open(PATH_MAPS + "/" + currentMapName + ".json", "w") do |f|
          f.write @map
       end
        
      end
      
      
    def exportDatabaseAnimation
       anim = <<-CODE
/**
* Module Database
* Generated : #{Time.new.ctime}
*
* Use the following manner :
*
* var rpg = new Rpg("canvas_tag");
* rpg.addAnimation(Database.animation[NAME]);
*
* NAME is the name of the animation
* ---------------------------------
*/

Database.animation = {

CODE
    $data_animations.each do |animation|
        if animation != nil
          frame = "[\n"
          for i in 0...animation.frame_max
             frame += "\t\t["
             for j in 0...animation.frames[i].cell_max
                cell_data = animation.frames[i].cell_data
                frame += "{"
                frame += "pattern: " + (cell_data[j, 0]+1).to_s + ", "
                frame += "x: " + cell_data[j, 1].to_s + ", "
                frame += "y: " + cell_data[j, 2].to_s + ", "
                frame += "zoom: " + cell_data[j, 3].to_s + ", "
                frame += "rotation: " + cell_data[j, 4].to_s + ", "
                frame += "opacity: " + cell_data[j, 6].to_s
                frame += "}, "
              end 
              frame = frame.gsub(/, $/, "")
              frame += "],\n"
            end
          frame = frame.gsub(/,\n$/, "")
          frame += "\n\t]"
          
          sound = "";
          for i in 0...animation.timings.size
            if (animation.timings[i].se.name != "") 
              sound = animation.timings[i].se.name + ".ogg"
              break
            end
          end

          anim += <<-CODE
          
/* ----------------------------------------------------------
* Animation ##{animation.id}
* Name : #{animation.name}
* Number of frames : #{animation.frame_max}
* ----------------------------------------------------------- */
'#{animation.name}': {
    name: '#{animation.name}',
    graphic: '#{animation.animation_name}.png',
    sound: '#{sound}',
    frames: #{frame}
},
CODE
end

      
    end
    anim = anim.gsub(/,\n$/, "")
    anim += "\n}"
    
     File.open(PATH_DATABASE + "/Animation.js", "w") do |f|
        f.write anim
      end
      
     $rpgjs_history.push({"color" => "green", "text" => "The files were successfully generated"})
    end
    
  end


class Scene_RPGJS
  def main
    s1 = "Export Map"
    s2 = "Export All Animations"
    s3 = "Exit"
    x = 280
    @command_window = Window_Command.new(x, [s1, s2, s3])
    @rpgjs = RpgJs.new
    @i = @j = 0
    @info_window = Window_RPGJS_Info.new(x)
    @info_window.x = x
    @help_window = Window_Help.new
    $rpgjs_history = @history_window = Window_RPGJS_History.new(x)
    @info_window.y = @command_window.y = 64
    @history_window.y  = @info_window.height + @info_window.y
    @history_window.x = @command_window.width
    @init = true
    @export_map = false
    Graphics.transition
    loop do
      Graphics.update
      Input.update
      update
      if $scene != self
        break
      end
    end
    Graphics.freeze
    @command_window.dispose
    @info_window.dispose
    @help_window.dispose
    @history_window.dispose
  end

  def update
    @command_window.update
    @info_window.update
    @help_window.update
    export_map_update
    if @command_window.active
      update_command
      return
    end

  end
  
  def export_map_update
    if @export_map
     @rpgjs.exportMap(@i)
     pourcent = (@i.to_f / $game_map.width.to_f * 100).to_i
     @info_window.set_text(pourcent.to_s + " %")
     @i += 1
     if @i == $game_map.width
        @export_map = false
        @command_window.active = true
        @i = 0
        @info_window.set_text("100 %")
        $rpgjs_history.push({"color" => "green", "text" => "The files were successfully generated"})
      end
      if Input.trigger?(Input::B)
        $game_system.se_play($data_system.buzzer_se)
      end
    end
  end
  
  def update_command
    if Input.trigger?(Input::B)
      close
      return
    end
    if Input.trigger?(Input::UP) or Input.trigger?(Input::DOWN) or @init
      case @command_window.index
      when 0 
        @help_window.set_text("Generate the current map in 'Data/Maps'")
      when 1 
        @help_window.set_text("Generate all the animations of the database in 'Data/Database'")
      when 2
        @help_window.set_text("Back to the game")
      end # case
    end #if
    if Input.trigger?(Input::C)
      @info_window.set_text("-- %")
      @history_window.clear
      case @command_window.index
      when 0 
        DirJs.recursiveCreate(PATH_MAPS)
        DirJs.recursiveCreate(PATH_EVENTS)
        @export_map = true
        @command_window.active = false
        @history_window.clear
      when 1 
        DirJs.recursiveCreate(PATH_DATABASE)
        @rpgjs.exportDatabaseAnimation
      when 2
        close
      end # case
    end #if
    @init = false
  end #def 
  
  def close
    $game_system.se_play($data_system.cancel_se)
    $scene = Scene_Map.new
  end
  
end #class

class Scene_Map
  alias new_update update
  def update
    if (Input.press?(Input::F8))
      $scene = Scene_RPGJS.new
    end
    new_update
  end
end

class Window_RPGJS_Info < Window_Base
  def initialize(w)
    super(0, 0, 640 - w, 70) # 426 y
    self.contents = Bitmap.new(width - 32, height - 32)
    @progress = "-- %"
  end
  def update
    self.contents.clear
    self.contents.font.color = normal_color
    self.contents.draw_text(0, 0, 350, 32, "Progress : " + @progress)
  end
  def set_text(text) 
    @progress = text
  end
end

class Window_RPGJS_History < Window_Base
  def initialize(w)
    super(0, 0, 640 - w, 345) 
    self.contents = Bitmap.new(width - 32, height - 32)
    @history = []
  end
  def update
    self.contents.clear
    for i in 0...@history.size
      case @history[i]["color"]
        when "normal"
            self.contents.font.color = normal_color
        when "blue"
            self.contents.font.color = text_color(1)
        when "green"
            self.contents.font.color = text_color(3)
        when "red"
            self.contents.font.color = text_color(2)
      end
      self.contents.draw_text(0, i*32, 350, 32, @history[i]["text"])
    end
  end
  def push(history)
    @history.push(history)
    update
  end
  def clear
     @history.clear
     self.contents.clear
  end
end