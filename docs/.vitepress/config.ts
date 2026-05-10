const guideMenu = [{
  text: 'Guide',
  collapsed: false,
  items: [
    { text: "Getting Started", link: "/guide/get-started" },
    { text: "Create Module", link: "/guide/create-module" },
    { text: "Create Shape", link: "/guide/create-shape" },
    { text: "Display Animations", link: "/guide/display-animations" },
    { text: "Create Movement", link: "/guide/create-movement" },
    { text: "Sprite Components", link: "/guide/sprite-components" },
    { text: "Spritesheets", link: "/guide/spritesheets" },
    { text: "World Maps", link: "/guide/world-maps" },
    { text: "Items", link: "/guide/items" },
    { text: "Sounds", link: "/guide/sounds" },
    { text: "Weather", link: "/guide/weather" },
    { text: "Synchronization", link: "/guide/synchronization" },
    { text: "Battle AI", link: "/guide/battle-ai" },
    { text: "Event Modes", link: "/guide/event-modes" },
    { text: "Testing", link: "/guide/testing" },
    { text: "V4 Compatibility", link: "/guide/v4-compatibility" },
    { text: "Attach GUI", link: "/guide/gui/attach-gui" }
  ]
}]

const prebuiltComponentsMenu = [{
  text: 'Prebuilt Components',
  collapsed: false,
  items: [
    { text: "Overview", link: "/guide/prebuilt-components/" },
    { text: "Light Halo", link: "/guide/prebuilt-components/light-halo" }
  ]
}]

const guiMenu = [{
  text: 'GUI',
  collapsed: false,
  items: [
    { text: "Engine Injection", link: "/gui/engine-injection" },
    { text: "Dialog Box", link: "/gui/dialog-box" },
    { text: "Vue Integration", link: "/gui/vue-integration" },
    { text: "Optimistic Actions", link: "/gui/optimistic-actions" }
  ]
}]

const advancedMenu = [{
  text: 'Advanced',
  collapsed: false,
  items: [
    { text: "Provide Load Map", link: "/advanced/provide-load-map" },
    { text: "Latency Simulation", link: "/advanced/latency-simulation" },
    { text: "Packet Loss Simulation", link: "/advanced/packet-loss-simulation" }
  ]
}]

const hooksMenu = [{
  text: 'Client Hooks',
  collapsed: false,
  items: [
    { text: "Client Engine Hooks", link: "/hooks/client-engine-hooks" },
    { text: "Client Physics Hooks", link: "/hooks/client-physics-hooks" },
    { text: "Client Scene Hooks", link: "/hooks/client-scene-hooks" },
    { text: "Client Sprite Hooks", link: "/hooks/client-sprite-hooks" }
  ]
},
{
  text: 'Server Hooks',
  collapsed: false,
  items: [
    { text: "Server Engine Hooks", link: "/hooks/server-engine-hooks" },
    { text: "Server Map Hooks", link: "/hooks/server-map-hooks" },
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
      '/guide/prebuilt-components/': prebuiltComponentsMenu,
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
      '/guide/': [
        guideMenu[0],
        prebuiltComponentsMenu[0]
      ],
      '/guide/prebuilt-components/': prebuiltComponentsMenu,
      '/gui/': guiMenu,
      '/advanced/': advancedMenu,
      '/hooks/': hooksMenu,
      '/tiled/': tiledMenu,
    }
  },
};
