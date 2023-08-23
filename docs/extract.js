const { parse } = require('comment-parser')
const fs = require('fs')
const { compareVersions } = require("compare-versions")

const baseUrl = __dirname + '/../'
const destination  = __dirname + '/api/'
const changelog = __dirname + '/others/'

const open = function(path) {
    return fs
        .readdirSync(baseUrl + path)
        .map(file => `${baseUrl}${path}/${file}`)
        .filter(file => {
            const isDir = fs.lstatSync(file).isDirectory()
            return !isDir
        })
}

const files = [
    ...open('packages/database/src'),
    ...open('packages/database/src/interfaces'),
    ...open('packages/server/src/Player'),
    ...open('packages/common/src'),
    ...open('packages/server/src'),
    ...open('packages/server/src/decorators'),
    ...open('packages/server/src/Scenes'),
    ...open('packages/server/src/Game'),
    ...open('packages/client/src/Sprite'),
    ...open('packages/client/src/Sound'),
    ...open('packages/client/src/Scene'),
    ...open('packages/client/src/Effects'),
    ...open('packages/client/src'),
    ...open('packages/tiled/src/classes'),
    ...open('packages/common/src/gui'),
    ...open('packages/testing/src'),
    ...open('packages/plugins/title-screen')
]

const types = [
    [ 'Effect', '/database/effect.html' ],
    [ 'Element', '/database/element.html' ],
    [ 'StateClass', '/database/state.html' ],
    [ 'ItemClass', '/database/item.html' ],
    [ 'SkillClass', '/database/skill.html' ],
    [ 'WeaponClass', '/database/weapon.html' ],
    [ 'ArmorClass', '/database/armor.html' ],
    [ 'ActorClass', '/database/actor.html' ],
    [ 'ClassClass', '/database/class.html' ],
    [ 'Move', '/commands/move.html#move' ],
    [ 'RpgPlayer', '/commands/common.html' ],
    [ 'RpgMap', '/classes/map.html' ],
    [ 'RpgEvent', '/classes/event.html' ],
    [ 'RpgServerEngine', '/classes/server-engine.html' ],
    [ 'RpgServer', '/classes/server.html' ],
    [ 'RpgClientEngine', '/classes/client-engine.html#rpgclientengine' ],
    [ 'RpgClient', '/classes/client.html' ],
    [ 'RpgSprite', '/classes/sprite.html' ],
    [ 'RpgGui', '/classes/gui.html' ],
    [ 'RpgSceneMap', '/classes/scene-map.html' ],
    [ 'RpgScene', '/classes/scene-map.html' ],
    [ 'Sound', '/classes/sound.html' ],
    [ 'RpgShape', '/classes/shape.html' ],
    [ 'RpgWorldMaps', '/classes/world-maps.html' ],
    [
      'Timeline',
      '/classes/spritesheet.html#create-animation-with-timeline-system'
    ],
    [ 'SpriteSheet', '/classes/spritesheet.html' ],
    [
      'PIXI.Container',
      'https://pixijs.download/dev/docs/PIXI.Container.html'
    ],
    [
      'PIXI.Sprite',
      'https://pixijs.download/dev/docs/PIXI.Sprite.html'
    ],
    [ 'PIXI.Viewport', 'https://github.com/davidfig/pixi-viewport' ],
    [ 'Observable', 'https://rxjs.dev/guide/observable.html' ],
    [ 'KeyboardControls', '/classes/keyboard.html' ]
  ]

function toLink(type) {
    type = type.replace(/>/g, '&gt;')
    type = type.replace(/</g, '&lt;')
    for (let [list, link] of types) {
        let regexp = new RegExp(`([^>](${list}))|(^${list})`, 'g')
        type = type.replace(regexp, ` <a href="${link}">${list}</a>`)
    }
   
    return `<Type type='${type}' />`
}

function createSummary(summary) {
    let text = '::: tip Summary\n'
    for (let title of summary) {
        if (!title) continue
        text += `- [${title}](#${title.toLowerCase().trim().replace(/[ \/]/g, '-')})\n`
    }
    text += ':::'
    return text
}

function removeLeadingNewlines(text) {
    // Find the first position of a non-newline character
    let firstNonNewlineChar = 0;
    while (firstNonNewlineChar < text.length && text[firstNonNewlineChar] === '\n') {
        firstNonNewlineChar++;
    }
    
    // Extract the text from the first non-newline position
    return text.substring(firstNonNewlineChar);
}

let md = {}
let summary = {}
let byVersion = {}
for (let file of files) {
    const code = fs.readFileSync(file, 'utf-8')
    const comments = parse(code, {
        trim: false,
        spacing: 'preserve'
    })
    
    for (let comment of comments) {
        const { tags, description } = comment
        const tag = name => tags.find(tag => tag.tag == name)
        const memberofs = tags.filter(tag => tag.tag == 'memberof')
        const enums = tags.filter(tag => tag.tag == 'enum')
        const version = tag('since')?.name
        if (!byVersion[version]) byVersion[version] = `
## Version ${version}

`
        for (let memberof of memberofs) {  
            if (!md[memberof.name]) md[memberof.name] = ''
            md[memberof.name] += `
---
`
        const title = tag('title') ? `${tag('title').name} ${tag('title').description}` : tag('prop')?.name
        if (!summary[memberof.name]) summary[memberof.name] = []
        summary[memberof.name].push(title)

        byVersion[version] += `- [${title}](/api/${memberof.name}.html): ${description}`

md[memberof.name] += 
`### ${title}`

        if (tag('todo')) {
    md[memberof.name] += `
::: warning
The realization of this property or method has not been completed.
:::
`
        }

        const stability = tag('stability')

        if (stability) {
            switch (+stability.name) {
                case 0:
                    md[memberof.name] += `
::: danger
Stability: 0 - Deprecated
This feature is known to be problematic, and changes are
planned.  Do not rely on it.  Use of the feature may cause warnings.  Backwards
compatibility should not be expected.
:::
`
                    break;
                    case 1:
                    md[memberof.name] += `
::: warning
Stability: 1 - Experimental
This feature is subject to change, and is gated by a command line flag.
It may change or be removed in future versions.
:::
    `
    break;
            }
        }

        if (tag('since')) {
            md[memberof.name] += `
- **Since**: ${tag('since').name}`
        }
        
        for (let _enum of enums) {
            md[memberof.name] += `
- **Enum**: \`${_enum.type}\` ${_enum.name}

| Tag           | Description |
| ------------- |------------:|`
            const description = removeLeadingNewlines(_enum.description)
            const lines = description.split('\n')
            for (let line of lines) {
                md[memberof.name] += `
| ${line} |`
            }   
        }

        if (tag('prop')) {
            md[memberof.name] += 
`
- **Property**: \`${tag('prop').name}\`
- **Type**: ${toLink(tag('prop').type)}
- **Optional**: \`${tag('prop').optional}\``
        }

        if (tag('readonly')) {
            md[memberof.name] += 
`
- **Read Only**`
        }

        if (tag('method')) {
            md[memberof.name] += 
`
- **Method**: \`${tag('method').name}\``
        }

        if (tag('param')) {
            md[memberof.name] += 
`
- **Arguments**:`
            for(let tag of tags) {
                if (tag.tag != 'param') continue
                md[memberof.name] += 
`
    - {${toLink(tag.type)}} \`${tag.name}\`. ${tag.description} (Optional: \`${tag.optional}\`)`
            }
        }

        if (tag('throws')) {
            md[memberof.name] += 
`
- **Throws**:
`
            for(let tag of tags) {
                if (tag.tag != 'throws') continue
                md[memberof.name] += 
`
${tag.description}
---`
            }
        }

        if (tag('returns')) {
md[memberof.name] += `
- **Return**: ${toLink(tag('returns').type)}  ${tag('returns').description}`          
        }

        if (tag('example')) {
            md[memberof.name] += `
- **Example**: ${tag('example').name}
${tag('example').description}`          
        }

       if (tag('default')) {
        md[memberof.name] += `
- **Default**: \`${tag('default').name}\``
       }
       md[memberof.name] += 
` 
- **Usage**:

${description}
`


        }
    }
}

for (let key in md) {
    const text = createSummary(summary[key]) + md[key]
    fs.writeFileSync(destination + key + '.md', text, 'utf-8')
}

let textVersion = `# AI ChangeLog
`

textVersion += Object.keys(byVersion)
    .filter(v => v !== 'undefined')
    .sort((a, b) => compareVersions(b, a))
    .reduce((prevStr, currentStr) => {
        const content = byVersion[currentStr]
        return prevStr + content
    }, '')

fs.writeFileSync(changelog + 'changelog.md', textVersion, 'utf-8')