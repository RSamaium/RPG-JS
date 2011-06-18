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
  
  def exportMap
    prop = "{"
        array_prop = []
        map = "{map: ["
        map_data = $game_map.data
        for i in 0...map_data.xsize
            map += "["
            for j in 0...map_data.ysize
              map += "["
              for k in 0...map_data.zsize
                id = map_data[i, j, k]
                map += (id != 0 ? (id).to_s : "null") + ","
                if not array_prop.include?(id) and id != 0
                  prop += (id).to_s + ": [" + $game_map.priorities[id].to_s + ", " + $game_map.passages[id].to_s + "],"
                  array_prop.push(id)
                end
              end # k
              map = map.gsub(/,$/, "")
              map += "],"
            end # j
            map = map.gsub(/,$/, "")
            map += "],"
          end # i
        map = map.gsub(/,$/, "")
        prop = prop.gsub(/,$/, "")
        map += "], propreties: " + prop + "}}"
        
        
       File.open(PATH_MAPS + "/Map" + $game_map.map_id.to_s + ".js", "w") do |f|
          f.write map
        end
        
        p('The file was successfully generated')
        exit
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
      
      p('The file was successfully generated')
      exit
    end
    
  end
  
#-------------------------------------------------
#   Scene_Title
#-------------------------------------------------
class Scene_Title
  
   def main
    # If battle test
    if $BTEST
      battle_test
      return
    end
    # Load database
    $data_actors        = load_data("Data/Actors.rxdata")
    $data_classes       = load_data("Data/Classes.rxdata")
    $data_skills        = load_data("Data/Skills.rxdata")
    $data_items         = load_data("Data/Items.rxdata")
    $data_weapons       = load_data("Data/Weapons.rxdata")
    $data_armors        = load_data("Data/Armors.rxdata")
    $data_enemies       = load_data("Data/Enemies.rxdata")
    $data_troops        = load_data("Data/Troops.rxdata")
    $data_states        = load_data("Data/States.rxdata")
    $data_animations    = load_data("Data/Animations.rxdata")
    $data_tilesets      = load_data("Data/Tilesets.rxdata")
    $data_common_events = load_data("Data/CommonEvents.rxdata")
    $data_system        = load_data("Data/System.rxdata")

    # Make system object
    $game_system = Game_System.new
    # Make title graphic
    @sprite = Sprite.new
    @sprite.bitmap = RPG::Cache.title($data_system.title_name)
    # Make command window
    s1 = "New Game"
    s2 = "Continue"
    s3 = "Shutdown"
    s4 = "--- RPGJS ---"
    s5 = "Export Map"
    s6 = "Export All Animations"
    @rpgjs = RpgJs.new
    @command_window = Window_Command.new(250, [s1, s2, s3, s4, s5, s6])
    @command_window.back_opacity = 160
    @command_window.x = 320 - @command_window.width / 2
    @command_window.y = 250
    # Continue enabled determinant
    # Check if at least one save file exists
    # If enabled, make @continue_enabled true; if disabled, make it false
    @continue_enabled = false
    for i in 0..3
      if FileTest.exist?("Save#{i+1}.rxdata")
        @continue_enabled = true
      end
    end
    # If continue is enabled, move cursor to "Continue"
    # If disabled, display "Continue" text in gray
    if @continue_enabled
      @command_window.index = 1
    else
      @command_window.disable_item(1)
    end
    # Play title BGM
    $game_system.bgm_play($data_system.title_bgm)
    # Stop playing ME and BGS
    Audio.me_stop
    Audio.bgs_stop
    # Execute transition
    Graphics.transition
    # Main loop
    loop do
      # Update game screen
      Graphics.update
      # Update input information
      Input.update
      # Frame update
      update
      # Abort loop if screen is changed
      if $scene != self
        break
      end
    end
    # Prepare for transition
    Graphics.freeze
    # Dispose of command window
    @command_window.dispose
    # Dispose of title graphic
    @sprite.bitmap.dispose
    @sprite.dispose
  end
  
  
  
  def update
    # Update command window
    @command_window.update
    # If C button was pressed
    if Input.trigger?(Input::C)
      
      if [4,5].include?(@command_window.index)
        DirJs.recursiveCreate(PATH_MAPS)
        DirJs.recursiveCreate(PATH_DATABASE)
      end
      
      case @command_window.index
      when 0  # New game
        command_new_game
      when 1  # Continue
        command_continue
      when 2  # Shutdown
        command_shutdown
      when 4
        command_map_html5
      when 5
        command_animation_html5
      end
    end
  end
  
  def command_map_html5
    # Play decision SE
    $game_system.se_play($data_system.decision_se)
    # Stop BGM
    Audio.bgm_stop
    # Reset frame count for measuring play time
    Graphics.frame_count = 0
    # Make each type of game object
    $game_temp          = Game_Temp.new
    $game_system        = Game_System.new
    $game_switches      = Game_Switches.new
    $game_variables     = Game_Variables.new
    $game_self_switches = Game_SelfSwitches.new
    $game_screen        = Game_Screen.new
    $game_actors        = Game_Actors.new
    $game_party         = Game_Party.new
    $game_troop         = Game_Troop.new
    $game_map           = Game_Map.new
    $game_player        = Game_Player.new
    # Set up initial party
    $game_party.setup_starting_members
    # Set up initial map position
    $game_map.setup($data_system.start_map_id)
    # Move player to initial position
    $game_player.moveto($data_system.start_x, $data_system.start_y)
    $game_player.refresh
    $game_map.autoplay
    $game_map.update
    
    @rpgjs.exportMap
  end
  
  def command_animation_html5 
    @rpgjs.exportDatabaseAnimation
  end
end