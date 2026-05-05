import "../src/index.css"
import "../theme-default/theme.css"
import "./themes.css"
import "./storybook.css"

export const globalTypes = {
  theme: {
    name: "Theme",
    description: "RPG UI theme",
    defaultValue: "default",
    toolbar: {
      icon: "paintbrush",
      items: [
        { value: "default", title: "Default" },
        { value: "forest", title: "Forest" },
        { value: "ember", title: "Ember" },
        { value: "arcane", title: "Arcane" }
      ],
      dynamicTitle: true
    }
  }
}

export const decorators = [
  (Story, context) => {
    document.documentElement.dataset.rpgTheme = context.globals.theme || "default"

    const shell = document.createElement("div")
    shell.className = "rpg-ui-root rpg-story-root"
    shell.setAttribute("data-rpg-ui-root", "")

    const story = Story()
    if (typeof story === "string") {
      shell.innerHTML = story
    }
    else if (story instanceof Node) {
      shell.appendChild(story)
    }

    return shell
  }
]

export const parameters = {
  layout: "fullscreen",
  options: {
    storySort: {
      order: ["Overview", "Primitives", "Constructions", "Patterns"]
    }
  },
  controls: {
    expanded: true
  }
}
