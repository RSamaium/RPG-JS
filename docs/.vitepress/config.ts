const guideMenu = [{
  text: 'Quick Start',
  collapsed: false,
  items: [
    { text: "Getting Started", link: "/guide/get-started" },
    { text: "Create Module", link: "/guide/create-module" },
    { text: "Create Shape", link: "/guide/create-shape" },
    { text: "Display Animations", link: "/guide/display-animations" },
    { text: "Create Movement", link: "/guide/create-movement" },
    { text: "Sprite Components", link: "/guide/sprite-components" },
    { text: "Battle AI", link: "/guide/battle-ai" },
    { text: "Notifications", link: "/guide/notifications" }
  ]
}]

const guiMenu = [{
  text: 'GUI',
  collapsed: false,
  items: [
    { text: "Engine Injection", link: "/gui/engine-injection" }
  ]
}]

const advancedMenu = [{
  text: 'Advanced',
  collapsed: false,
  items: [
    { text: "Provide Load Map", link: "/advanced/provide-load-map" }
  ]
}]

const hooksMenu = [{
  text: 'Client Hooks',
  collapsed: false,
  items: [
    { text: "Client Engine Hooks", link: "/hooks/client-engine-hooks" },
    { text: "Client Scene Hooks", link: "/hooks/client-scene-hooks" },
    { text: "Client Sprite Hooks", link: "/hooks/client-sprite-hooks" }
  ]
},
{
  text: 'Server Hooks',
  collapsed: false,
  items: [
    { text: "Server Engine Hooks", link: "/hooks/server-engine-hooks" },
    { text: "Server Event Hooks", link: "/hooks/server-event-hooks" },
    { text: "Server Player Hooks", link: "/hooks/server-player-hooks" }
  ]
}]

const tiledMenu = [{
  text: 'Tiled',
  collapsed: false,
  items: [
    { text: "Tiled Integration", link: "/tiled/" }
  ]
}]

export default {
  //extends: baseConfig,
  title: "RPGJS v5 Documentation",
  description: "Create your RPG or MMORPG in Javascript",
  ignoreDeadLinks: true,
  themeConfig: {
    search: {
      '/guide/': guideMenu,
      '/gui/': guiMenu,
      '/advanced/': advancedMenu,
      '/hooks/': hooksMenu,
      '/tiled/': tiledMenu,
    },
    repo: "https://github.com/RSamaium/RPG-JS",
    nav: [
      {
        text: "Home",
        link: "/",
      },
      {
        text: "Guide",
        items: guideMenu[0].items
      },
      {
        text: "GUI",
        items: guiMenu[0].items
      },
      {
        text: "Advanced",
        items: advancedMenu[0].items
      },
      {
        text: "Hooks",
        items: [
          ...hooksMenu[0].items,
          ...hooksMenu[1].items
        ]
      },
      {
        text: "Tiled",
        items: tiledMenu[0].items
      },
      {
        text: "GitHub",
        link: "https://github.com/RSamaium/RPG-JS",
      },
    ],
    sidebar: {
      '/guide/': guideMenu,
      '/gui/': guiMenu,
      '/advanced/': advancedMenu,
      '/hooks/': hooksMenu,
      '/tiled/': tiledMenu,
    }
  },
};
