[en] The script "convertToJs_v2" can import maps, events and animations RPG RPG Maker XP to JS. Here are the steps to perform:

1) Open the script "convertToJs_2" present in the same folder with a text editor
2) Copy and paste in the script editor for RPG Maker XP above the Main Script
3) Run the game
4) During the game, press the F8 key
- Export Map: Export the map and events. The map is the map will be generated where there is the hero. The files will then in "RpgJs/Data/ Maps/MapX.js.
- Export All Animations: Export all animations from the database. The file will then be in "RpgJs/ Database/Animation.js. You can then integrate the animations into your game: <script src="Database/Animation.js"> </ script>. Read the header file for its use (or documentation)

------------------------------------------------------------------------------------------------------------------------------------------------

[fr] Le script "convertToJs_v2" permet d'importer les cartes, évènements et animations de RPG Maker XP vers RPG JS. Voici les étapes à effectuer :

1) Ouvrez le script "convertToJs_v2" présent dans le même dossier avec un éditeur de texte
2) Copiez et collez le dans l'éditeur de scripts de RPG Maker XP au dessus du script Main
3) Lancez le jeu
4) Durant le jeu, appuyez sur la touche F8
	- Export Map : Exporter la carte et les évènements. La carte qui sera généré est la carte où il y a le héros. Les fichiers se trouveront alors dans "RpgJs/Data/".
	- Export All Animations : Exporter toutes les animations de la base de données. Le fichier se trouvera alors dans "RpgJs/Database/Animation.js". Vous pouvez ensuite intégrer les animations dans votre jeu : <script src="Database/Animation.js"></script>. Lisez l'entête du fichier pour son utilisation (ou la documentation)