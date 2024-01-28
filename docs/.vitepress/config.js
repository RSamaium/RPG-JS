const apiMenu = [
  {
    text: 'Functions',
    collapsed: false,
    sidebarDepth: 2,
    items: [
      { text: "inject()", link: "/functions/inject" },
    ]

  },
  {
    text: 'Classes Server-Side',
    collapsed: false,
    sidebarDepth: 2,
    items: [
      { text: "Server Engine Class", link: "/classes/server-engine" },
      { text: "Server Class", link: "/classes/server" },
      { text: "Player Class", link: "/classes/player" },
      { text: "Scene Map Server Class", link: "/classes/scene-map-server" },
      { text: "Map Class", link: "/classes/map" },
      { text: "World Maps Class", link: "/classes/world-maps" },
      { text: "Event Class", link: "/classes/event" },
      { text: "Shape Class", link: "/classes/shape" },
      { text: "World Class", link: "/classes/world" }
    ]

  },
  {
    text: 'Classes Client-Side',
    collapsed: false,
    sidebarDepth: 2,
    items: [
      { text: "Client Class", link: "/classes/client" },
      { text: "Client Engine Class", link: "/classes/client-engine" },
      { text: "Sprite Class", link: "/classes/sprite" },
      { text: "Spritesheet Class", link: "/classes/spritesheet" },
      { text: "Scene Map Class", link: "/classes/scene-map" },
      { text: "GUI Class", link: "/classes/gui" },
      { text: "Sound Class", link: "/classes/sound" },
      { text: "Resource Class", link: "/classes/resource" },
      { text: "Keyboard Class", link: "/classes/keyboard" }
    ]

  },
  {
    text: 'VueJS',
    collapsed: false,
    sidebarDepth: 2,
    items: [
      { text: "Vue Inject Class", link: "/classes/vue-inject" },
      { text: "Vue directives", link: "/api-gui/vue-directive" }
    ]
  },
  {
    text: 'React',
    collapsed: false,
    sidebarDepth: 2,
    items: [
      { text: "React Hooks", link: "/api-gui/react" }
    ]
  },
  {
    text: 'Testing',
    collapsed: false,
    sidebarDepth: 2,
    items: [
      { text: "Testing Class", link: "/classes/tests" },
    ]
  },
  {
    text: 'Player Commands Server-Side',
    collapsed: false,
    sidebarDepth: 2,
    items: [
      { text: "Common Commands", link: "/commands/common" },
      { text: "Components", link: "/commands/components" },
      { text: "Parameter Commands", link: "/commands/parameter" },
      { text: "Class Commands", link: "/commands/class" },
      { text: "Gold Commands", link: "/commands/gold" },
      { text: "State Commands", link: "/commands/state" },
      { text: "Element Commands", link: "/commands/element" },
      { text: "Item Commands", link: "/commands/item" },
      { text: "Skill Commands", link: "/commands/skill" },
      { text: "Variable Commands", link: "/commands/variable" },
      { text: "Move Commands", link: "/commands/move" },
      { text: "GUI Commands", link: "/commands/gui" },
      { text: "Effect Commands", link: "/commands/effect" },
      { text: "Battle Commands", link: "/commands/battle" }
    ]

  },
  {
    text: 'RPG Database',
    collapsed: false,
    sidebarDepth: 2,
    items: [
      { text: "Item Database", link: "/database/item" },
      { text: "Weapon Database", link: "/database/weapon" },
      { text: "Armor Database", link: "/database/armor" },
      { text: "Actor Database", link: "/database/actor" },
      { text: "Class Database", link: "/database/class" },
      { text: "Skill Database", link: "/database/skill" },
      { text: "State Database", link: "/database/state" },
      { text: "Element Database", link: "/database/element" },
      { text: "Effect Database", link: "/database/effect" }
    ]

  },
  /*{
    text: 'Testing',
    collapsed: false,
    sidebarDepth: 2,
    items: [
      { text: "Unit Testing Class", link: "/classes/tests" }
    ]    
  }*/
]

const migrationMenu = [{
  text: 'Migration',
  collapsed: false,
  items: [
    { text: "v3 to v4", link: "/migration/to-v4" }
  ]
}]

const web3Menu = [{
  text: 'Web3',
  collapsed: false,
  items: [
    { text: "Authentification with wallet", link: "/web3/auth" }
  ]
}]

const guideMenu = [{
  text: 'Quick Start',
  collapsed: false,
  items: [
    { text: "Getting Started", link: "/guide/get-started" },
    { text: "Structure", link: "/guide/autoload" },
    { text: "Create your first map", link: "/guide/create-map" },
    { text: "Create hero in map", link: "/guide/create-sprite" }
  ]
},
{
  text: 'Go further',
  collapsed: false,
  items: [
    { text: "Create World", link: "/guide/create-world-maps" },
    { text: "Add life bar, text or other above the player", link: "/guide/component" },
    { text: "Create event (NPC)", link: "/guide/create-event" },
    { text: "Create items", link: "/guide/create-database" },
    { text: "Create shape", link: "/guide/create-shape" },
    { text: "Add music in map", link: "/guide/create-sound" },
    { text: "Create animated tile", link: "/guide/animation-tile" },
    { text: "Save the player's progress", link: "/guide/save" },
    { text: "Production", link: "/guide/production" },
  ]
},
{
  text: 'GUI',
  collapsed: false,
  items: [
    { text: "Customizing Your Theme", link: "/gui/theme" },
    { text: "Reusing GUI Components", link: "/gui/reuse-gui" },
    { text: "Creating Notifications in Your GUI", link: "/gui/notification-gui" },
  ]
},
{
  text: 'Create GUI with VueJS',
  collapsed: false,
  items: [
    { text: "Creating Your Own GUI", link: "/guide/create-gui" },
    { text: "Adding Tooltips to Your GUI", link: "/gui/tooltip" }
  ]
},
{
  text: 'Create GUI with React',
  collapsed: false,
  items: [
    { text: "Create Gui with React", link: "/gui/react" },
    { text: "Adding Tooltips to Your GUI", link: "/gui/react-tooltip" },
    { text: "Integrate in React App", link: "/gui/react-app"}
  ]
},
{
  text: 'Technical',
  collapsed: false,
  items: [
    { text: "Environment Variables", link: "/guide/env" },
    { text: "All configuration in rpg.toml", link: "/guide/configuration" },
    { text: "Working with User Inputs", link: "/guide/inputs" },
    { text: "Supporting Gamepad Input", link: "/guide/gamepad" },
    { text: "Creating Responsive Game Design", link: "/guide/responsive-design" },
    { text: "Create Progressive Web Apps (PWA)", link: "/guide/pwa" },
    { text: "Add TailwindCSS", link: "/guide/tailwindcss" },
    { text: "Upgrade/Update RPGJS", link: "/guide/upgrade" }
  ]

},
{
  text: 'Advanced',
  collapsed: false,
  items: [
    { text: "Create Authentication System", link: "/advanced/auth" },
    { text: "Synchronization between Server and Client", link: "/guide/synchronization" },
    { text: "Creating a plugin", link: "/advanced/create-plugin" },
    { text: "Using Agones for Game Server Hosting", link: "/advanced/agones" },
    { text: "Optimizing Performance", link: "/guide/performance" },
    { text: "Create Unit Tests", link: "/guide/unit-test" },
  ]
},
...web3Menu,
...migrationMenu
]

const pluginMenu = [{
  text: 'Plugins',
  collapsed: false,
  items: [
    { text: "Adding Chat Functionality", link: "/plugins/chat" },
    { text: "Saving and Loading Game Data", link: "/plugins/save" },
    { text: "Creating a Title Screen Plugin", link: "/plugins/title-screen" },
    { text: "Displaying Emotion Bubbles for Characters", link: "/plugins/emotion-bubble" }
  ]
}, 
{
  text: 'Unofficial Plugins',
  collapsed: false,
  items: [
    { text: "Character Select", link: "/plugins/character-select" },
    { text: "Inventory GUI Plugin", link: "/plugins/inventory-plugin" },
  ]
}]

const GA_ID = 'G-VCPFWQS1BJ'

module.exports = {
  //extends: baseConfig,
  title: 'RPGJS v4 Documentation',
  description: 'Create your RPG or MMORPG in Javascript',
  ignoreDeadLinks: true,
  themeConfig: {
    search: {
      provider: 'local'
    },
    repo: 'https://github.com/RSamaium/RPG-JS',
    nav: [{
      text: 'Home',
      link: 'https://rpgjs.dev'
    },
    {
      text: 'Guide',
      link: '/guide/get-started'
    },
    {
      text: 'API',
      link: '/commands/common'
    },
    {
      text: 'Plugins',
      link: '/plugins/chat'
    },
    {
      text: 'Lean more',
      items: [
        { text: 'Change Log', link: '/others/changelog' }
      ]
    },
    {
      text: 'Community',
      link: 'https://community.rpgjs.dev'
    }
    ],
    sidebar: {
      '/functions/': apiMenu,
      '/classes/': apiMenu,
      '/commands/': apiMenu,
      '/database/': apiMenu,
      '/api/': apiMenu,
      '/api-gui/': apiMenu,
      '/guide/': guideMenu,
      '/gui/': guideMenu,
      '/advanced/': guideMenu,
      '/plugins/': pluginMenu,
      '/migration/': guideMenu,
      '/web3/': guideMenu,
    },
    plugins: ['@vuepress/active-header-links'],
    head: [
      [
        'script',
        { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID }
      ],
      [
        'script',
        {},
        `window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}');`
      ]
    ]
  }
}