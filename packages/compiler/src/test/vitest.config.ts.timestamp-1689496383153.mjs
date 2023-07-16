// packages/compiler/src/test/vitest.config.ts
import { defineConfig } from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/vite/dist/node/index.js";

// packages/compiler/src/build/client-config.ts
import { splitVendorChunkPlugin } from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/vite/dist/node/index.js";
import { VitePWA } from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/vite-plugin-pwa/dist/index.mjs";
import toml from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/@iarna/toml/toml.js";
import nodePolyfills from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/rollup-plugin-node-polyfills/dist/index.js";
import { NodeModulesPolyfillPlugin } from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/@esbuild-plugins/node-modules-polyfill/dist/index.js";
import { resolve as resolve2, join as join2 } from "path";

// packages/compiler/src/build/vite-plugin-require.ts
import * as parser from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/@babel/parser/lib/index.js";
import _traverse from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/@babel/traverse/lib/index.js";
import _generate from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/@babel/generator/lib/index.js";
import { importDeclaration, importDefaultSpecifier, stringLiteral, identifier, newExpression, expressionStatement, memberExpression } from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/@babel/types/lib/index.js";
var traverse = _traverse.default;
var generate = _generate.default;
function vitePluginRequire(opts) {
  const { fileRegex = /(.jsx?|.tsx?)(\?v=[0-9a-f]+)?$/, log, translateType = "import" } = opts || {};
  return {
    name: "vite-plugin-require",
    async transform(code, id) {
      let newCode = code;
      const regex = /^(?!.*node_modules(?:\/|\\)(?!rpgjs-|@rpgjs)).*$/;
      if (fileRegex.test(id) && regex.test(id)) {
        const ast = parser.parse(code, {
          sourceType: "module",
          plugins: []
        });
        traverse(ast, {
          enter(path9) {
            var _a, _b;
            if (path9.isIdentifier({ name: "require" })) {
              const arg = (_b = (_a = path9.container) == null ? void 0 : _a.arguments) == null ? void 0 : _b[0];
              if (arg) {
                let stringVal = "";
                switch (arg == null ? void 0 : arg.type) {
                  case "StringLiteral":
                    stringVal = arg.value;
                    break;
                  case "Identifier":
                    const IdentifierName = arg.name;
                    traverse(ast, {
                      Identifier: (path10) => {
                        var _a2;
                        if (path10.node.name === IdentifierName) {
                          if (!Array.isArray(path10.container) && ((_a2 = path10.container.init) == null ? void 0 : _a2.type) === "StringLiteral") {
                            stringVal = path10.container.init.value;
                          }
                        }
                      }
                    });
                    break;
                  case "BinaryExpression":
                    const binaryExpressionLoopFn = (lOr) => {
                      if (lOr.type === "BinaryExpression") {
                        binaryExpressionLoopFn(lOr.left);
                        binaryExpressionLoopFn(lOr.right);
                      } else {
                        if (lOr.type === "StringLiteral") {
                          stringVal += lOr.value;
                        } else if (lOr.type === "Identifier") {
                          const IdentifierName2 = lOr.name;
                          traverse(ast, {
                            Identifier: (path10) => {
                              var _a2;
                              if (path10.node.name === IdentifierName2) {
                                if (!Array.isArray(path10.container) && ((_a2 = path10.container.init) == null ? void 0 : _a2.type) === "StringLiteral") {
                                  stringVal += path10.container.init.value;
                                }
                              }
                            }
                          });
                        } else {
                          throw `\u4E0D\u652F\u6301\u7684: BinaryExpression \u7EC4\u6210\u7C7B\u578B ${lOr.type}`;
                        }
                      }
                    };
                    binaryExpressionLoopFn(arg.left);
                    binaryExpressionLoopFn(arg.right);
                    break;
                  case "MemberExpression":
                    break;
                  default:
                    throw `Unsupported type: ${arg == null ? void 0 : arg.type}`;
                }
                path9.node.name = "";
                if (stringVal) {
                  let realPath = `vitePluginRequire_${(/* @__PURE__ */ new Date()).getTime()}_${parseInt(Math.random() * 1e8 + 100 + "")}`;
                  if (translateType === "import") {
                    const importAst = importDeclaration([importDefaultSpecifier(identifier(realPath))], stringLiteral(stringVal));
                    ast.program.body.unshift(importAst);
                    switch (arg == null ? void 0 : arg.type) {
                      case "StringLiteral":
                        path9.container.arguments[0].value = realPath;
                        if (path9.container.arguments[0].extra) {
                          path9.container.arguments[0].extra.raw = realPath;
                          path9.container.arguments[0].extra.rawValue = realPath;
                        }
                        break;
                      case "Identifier":
                        path9.container.arguments[0].name = realPath;
                        break;
                      case "BinaryExpression":
                        path9.container.arguments[0] = identifier(realPath);
                        break;
                      default:
                        throw `Unsupported type: ${arg == null ? void 0 : arg.type}`;
                    }
                  } else if (translateType === "importMetaUrl") {
                    const metaObj = memberExpression(memberExpression(identifier("import"), identifier("meta")), identifier("url"));
                    const importAst = newExpression(identifier("URL"), [stringLiteral(stringVal), metaObj]);
                    const hrefObj = expressionStatement(memberExpression(importAst, identifier("href")));
                    const strCode = generate(hrefObj, {}).code.replace(/\;$/, "");
                    switch (arg == null ? void 0 : arg.type) {
                      case "StringLiteral":
                        path9.container.arguments[0].value = strCode;
                        if (path9.container.arguments[0].extra) {
                          path9.container.arguments[0].extra.raw = strCode;
                          path9.container.arguments[0].extra.rawValue = strCode;
                        }
                        break;
                      case "Identifier":
                        path9.container.arguments[0].name = strCode;
                        break;
                      case "BinaryExpression":
                        path9.container.arguments[0] = identifier(strCode);
                        break;
                      default:
                        throw `Unsupported type: ${arg == null ? void 0 : arg.type}`;
                    }
                  }
                }
              }
            }
          }
        });
        const output = generate(ast, {});
        newCode = output.code;
      }
      return {
        code: newCode,
        map: null
      };
    }
  };
}

// packages/compiler/src/build/vite-plugin-flag-transform.ts
function flagTransform(options = {}) {
  const { side = "client", mode = "development", type = "mmorpg" } = options;
  async function resolveId(source, importer, options2) {
    const flags = [`client!`, `server!`, `rpg!`, `mmorpg!`, `production!`, `development!`];
    for (const flag of flags) {
      if (source.startsWith(flag)) {
        const path9 = source.replace(flag, "");
        const resolution = await this.resolve(path9, importer, {
          skipSelf: true,
          ...options2
        });
        return {
          ...resolution,
          id: resolution.id + `?${flag.replace("!", "")}`
        };
      }
    }
  }
  async function transform(source, id) {
    let code = source;
    if (mode === "test") {
      return {
        code,
        map: null
      };
    }
    if (id.endsWith(side === "client" ? "?server" : "?client") && type !== "rpg") {
      code = "export default null;";
    } else if (id.endsWith("?production") && mode !== "production" || id.endsWith("?development") && mode !== "development" || id.endsWith("?rpg") && type !== "rpg" || id.endsWith("?mmorpg") && type !== "mmorpg") {
      code = "export default null;";
    }
    return {
      code,
      map: null
    };
  }
  return {
    name: "transform-flag",
    resolveId,
    transform
  };
}

// packages/compiler/src/build/client-config.ts
import vue from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/@vitejs/plugin-vue/dist/index.mjs";

// packages/compiler/src/build/vite-plugin-world-transform.ts
import path2 from "path";

// packages/compiler/src/build/utils.ts
import path from "path";
import fs from "fs";
import * as glob from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/glob/dist/mjs/index.js";
var entryPointServer = (entryPointPath) => {
  const entryPoint = entryPointPath || path.resolve(process.cwd(), "src/server.ts");
  if (fs.existsSync(entryPoint)) {
    return path.resolve(entryPoint);
  }
  return "virtual-server.ts";
};
var globFiles = (extension) => {
  return [
    ...glob.sync("**/*." + extension, { nodir: true, ignore: ["node_modules/**", "dist/**"] }),
    ...glob.sync("node_modules/rpgjs-*/*." + extension, { nodir: true }),
    ...glob.sync("node_modules/@rpgjs/**/*." + extension, { nodir: true })
  ];
};
var assetsFolder = (outputDir) => {
  return path.join("dist", outputDir, "assets");
};
var createDistFolder = async (outputDir) => {
  const assetDir = assetsFolder(outputDir);
  fs.mkdirSync(assetDir, { recursive: true });
  return assetDir;
};
function toPosix(path9) {
  return path9.replace(/\\/g, "/");
}

// packages/compiler/src/build/vite-plugin-world-transform.ts
import crypto from "crypto";

// packages/compiler/src/logs/warning.ts
import colors from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/picocolors/picocolors.js";
function warn(message) {
  console.log(colors.yellow(`\u26A0\uFE0F  Warning - ${message}`));
}
function info(message) {
  console.log(colors.blue(`\u2139\uFE0F  Info - ${message}`));
}
function error(message) {
  console.log(colors.red(`\u274C  Error - ${message}`));
}
var errorApi = (err) => {
  error(`${err.response.status} - ${err.response.data.error}`);
};

// packages/compiler/src/build/vite-plugin-world-transform.ts
import fs2 from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/fs-extra/lib/index.js";

// packages/compiler/src/serve/api.ts
import axios from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/axios/index.js";
axios.interceptors.request.use(function(config) {
  config.url += "?dev=1";
  return config;
}, function(error3) {
  return Promise.reject(error3);
});
var api_default = axios;

// packages/compiler/src/build/vite-plugin-world-transform.ts
function worldTransformPlugin(serverUrl) {
  function extendsWorld(world, filePath) {
    const relativePath = toPosix(filePath).replace(toPosix(process.cwd()) + "/", "");
    const directory = path2.dirname(relativePath);
    const worldId = crypto.createHash("md5").update(relativePath).digest("hex");
    world.basePath = directory;
    world.id = worldId;
    return world;
  }
  return {
    name: "transform-world",
    transform(source, id) {
      if (id.endsWith(".world")) {
        const world = extendsWorld(JSON.parse(source), id);
        return {
          code: `export default ${JSON.stringify(world)}`,
          map: null
        };
      }
    },
    configureServer(server) {
      server.watcher.add(globFiles("world"));
      server.watcher.on("change", async (file) => {
        if (file.endsWith("world")) {
          info(`File ${file} changed, updating world...`);
          const data = await fs2.readFile(file, "utf-8");
          const world = extendsWorld(JSON.parse(data), file);
          api_default.put(serverUrl + "/api/worlds", {
            worldId: world.id,
            data: world
          }).catch(errorApi);
        }
      });
    }
  };
}

// packages/compiler/src/build/client-config.ts
import fs10 from "fs/promises";
import _fs from "fs";
import { NodeGlobalsPolyfillPlugin } from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/@esbuild-plugins/node-globals-polyfill/dist/index.js";
import { createRequire } from "module";

// packages/compiler/src/build/vite-plugin-map-extract.ts
import fs3 from "fs";
import path3 from "path";
import { parseStringPromise } from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/xml2js/lib/xml2js.js";
async function processTsxFile(tsxFile, output) {
  const content = fs3.readFileSync(tsxFile, "utf-8");
  const result = await parseStringPromise(content);
  const imagePath = path3.join(path3.dirname(tsxFile), result.tileset.image[0].$.source);
  copyImageToOutput(imagePath, output);
}
async function processTmxFile(tmxFile, output) {
  const content = fs3.readFileSync(tmxFile, "utf-8");
  const result = await parseStringPromise(content);
  const processImageSource = (source) => {
    const imagePath = path3.join(path3.dirname(tmxFile), source);
    copyImageToOutput(imagePath, output);
  };
  if (result.map.imagelayer) {
    for (const imagelayer of result.map.imagelayer) {
      processImageSource(imagelayer.image[0].$.source);
    }
  }
  if (result.map.objectgroup) {
    for (const objectgroup of result.map.objectgroup) {
      if (objectgroup.properties && objectgroup.properties[0].property) {
        for (const property of objectgroup.properties[0].property) {
          if (property.$.name === "image" && property.$.type === "file") {
            processImageSource(property.$.value);
          }
        }
      }
    }
  }
}
function copyImageToOutput(imagePath, output) {
  const imageName = path3.basename(imagePath);
  const destPath = path3.join("dist", output, "assets", imageName);
  if (!fs3.existsSync(path3.dirname(destPath))) {
    fs3.mkdirSync(path3.dirname(destPath), { recursive: true });
  }
  try {
    fs3.copyFileSync(imagePath, destPath);
  } catch (err) {
    console.error(`Error copying image ${imagePath} to ${destPath}: ${err}`);
    throw err;
  }
}
function mapExtractPlugin(output = "client") {
  return {
    name: "map-extract",
    async buildStart() {
      for (const tsxFile of globFiles("tsx")) {
        await processTsxFile(tsxFile, output);
      }
      for (const tmxFile of globFiles("tmx")) {
        await processTmxFile(tmxFile, output);
      }
    }
  };
}

// packages/compiler/src/build/vite-plugin-tsx-xml.ts
import fs4 from "fs";
import path4 from "path";
var tsxXmlPlugin = () => {
  return {
    name: "tsx-xml-loader",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.endsWith(".tsx")) {
          const publicPath = server.config.root;
          const filePath = path4.join(publicPath, req.url);
          if (fs4.existsSync(filePath)) {
            const xmlContent = fs4.readFileSync(filePath, "utf-8");
            res.setHeader("Content-Type", "application/xml");
            res.end(xmlContent);
            return;
          }
        }
        next();
      });
    }
  };
};

// packages/compiler/src/build/vite-plugin-tmx-tsx-mover.ts
import * as fs5 from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/fs-extra/lib/index.js";
import * as path5 from "path";
var moveTMXTSXFiles = async (outputDir) => {
  const assetDir = await createDistFolder(outputDir);
  const files = globFiles("@(tmx|tsx)");
  for (const file of files) {
    const target = path5.join(assetDir, path5.basename(file));
    await fs5.copy(file, target, { overwrite: true });
  }
};
function tmxTsxMoverPlugin(outputDir) {
  return {
    name: "vite-plugin-tmx-tsx-mover",
    writeBundle: async () => {
      await moveTMXTSXFiles(outputDir);
    }
  };
}

// packages/compiler/src/build/vite-plugin-code-injector.ts
var scriptInjection = `
  <script>
    var global = global || window
  </script>
`;
function codeInjectorPlugin() {
  return {
    name: "html-transform",
    transformIndexHtml: {
      enforce: "pre",
      transform(html) {
        return html.replace("<head>", `<head>${scriptInjection}`);
      }
    }
  };
}

// packages/compiler/src/utils/log.ts
import colors2 from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/picocolors/picocolors.js";
var HELPS = {
  [0 /* IndexNotFound */]: `The error message "ENOENT: no such file or directory, stat 'index.html'" indicates that the program or script is attempting to access a file named "index.html", but that file does not exist in the specified directory or location.

    The error message specifically indicates that the program is unable to locate the file or directory that it is trying to access. This can happen for a number of reasons, such as the file or directory being deleted or moved, a typo in the file or directory name, or the file or directory not being created yet.
    
    To resolve this error, you should check the path and name of the file or directory that the program is trying to access, and make sure that it exists in the correct location. If the file or directory has been moved or renamed, you may need to update the program's code to point to the correct location.`
};
function error2(error3, help) {
  console.log(colors2.red(error3.message));
  if (help !== void 0) {
    console.log(`  ${colors2.dim("\u279C")}  ${colors2.dim(HELPS[help])}`);
  }
  process.exit();
}

// packages/compiler/src/build/vite-plugin-config.toml.ts
import fs7 from "fs";
import path7 from "path";
import sizeOf from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/image-size/dist/index.js";

// packages/compiler/src/utils/json-schema.ts
import Ajv from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/ajv/dist/ajv.js";
import addFormats from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/ajv-formats/dist/index.js";
function parseNamespace(inputData, properties) {
  const data = {};
  for (const [key] of Object.entries(properties || {})) {
    data[key] = inputData[key];
  }
  return data;
}
function parseJsonSchema(jsonSchema, inputData) {
  var _a, _b, _c;
  let server = {};
  let client = {};
  const namespace = jsonSchema.namespace || "";
  const getObjectByNamespace = () => {
    return namespace ? inputData[namespace] || {} : inputData;
  };
  function toPathAsObject(instancePath) {
    return instancePath.replace(/^\//, "").replace(/\//g, ".");
  }
  const validate = (jsonSchema2, side) => {
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    addFormats(ajv);
    const ajvValidate = ajv.compile(jsonSchema2);
    const valid = ajvValidate(getObjectByNamespace());
    if (!valid) {
      const errors = ajvValidate.errors;
      if (!errors) {
        throw new Error("Unknown error");
      }
      const firstError = errors[0];
      const error3 = new Error(firstError.message);
      error3.namespace = namespace;
      error3.params = firstError.params;
      error3.property = firstError.params.missingProperty ?? toPathAsObject(firstError.instancePath);
      throw error3;
    }
  };
  if (jsonSchema.server && Object.keys(jsonSchema.server).length > 0) {
    try {
      validate(jsonSchema.server, "server");
    } catch (e) {
      throw e;
    }
    const object = parseNamespace(getObjectByNamespace(), jsonSchema.server.properties);
    if (namespace) {
      server[namespace] = object;
    } else {
      server = object;
    }
  }
  if (jsonSchema.client && Object.keys(jsonSchema.client).length > 0) {
    try {
      validate(jsonSchema.client, "client");
    } catch (e) {
      throw e;
    }
    const object = parseNamespace(getObjectByNamespace(), jsonSchema.client.properties);
    if (namespace) {
      client[namespace] = object;
    } else {
      client = object;
    }
  }
  if (jsonSchema["*"] && Object.keys(jsonSchema["*"]).length > 0) {
    const commonData = parseNamespace(getObjectByNamespace(), jsonSchema["*"].properties);
    try {
      validate(jsonSchema["*"], "both");
    } catch (e) {
      throw e;
    }
    if (namespace) {
      server[namespace] = { ...server[namespace], ...commonData };
      client[namespace] = { ...client[namespace], ...commonData };
    } else {
      server = { ...server, ...commonData };
      client = { ...client, ...commonData };
    }
  }
  function addAdditionalProperties(schema) {
    if (schema.type === "object") {
      if (!("additionalProperties" in schema)) {
        schema.additionalProperties = false;
      }
      if (schema.properties) {
        for (const key in schema.properties) {
          schema.properties[key] = addAdditionalProperties(schema.properties[key]);
        }
      }
    }
    return schema;
  }
  function check(jsonSchema2, obj) {
    var _a2;
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    addFormats(ajv);
    const validate2 = ajv.compile(addAdditionalProperties(jsonSchema2));
    const valid = validate2(obj);
    if (!valid) {
      const extraProps2 = [];
      (_a2 = validate2.errors) == null ? void 0 : _a2.forEach((error3) => {
        var _a3;
        if (error3.keyword === "additionalProperties") {
          const root = toPathAsObject(error3.instancePath);
          const propPath = root + (root ? "." : "") + ((_a3 = error3.params) == null ? void 0 : _a3.additionalProperty);
          extraProps2.push(propPath);
        }
      });
      return extraProps2;
    } else {
      return [];
    }
  }
  const allProperties = {
    ...((_a = jsonSchema.server) == null ? void 0 : _a.properties) || {},
    ...((_b = jsonSchema.client) == null ? void 0 : _b.properties) || {},
    ...((_c = jsonSchema["*"]) == null ? void 0 : _c.properties) || {}
  };
  const extraProps = check({ type: "object", properties: allProperties }, getObjectByNamespace()).filter((prop) => prop !== "modules").map((prop) => namespace ? `${namespace}.${prop}` : prop);
  return { server, client, namespace, extraProps };
}

// packages/compiler/src/build/load-global-config.ts
import colors3 from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/picocolors/picocolors.js";

// packages/compiler/src/build/default-config.ts
var canvasOptions = {
  "canvas": {
    "type": "object",
    "properties": {
      "transparent": {
        "type": "boolean"
      },
      "autoDensity": {
        "type": "boolean"
      },
      "antialias": {
        "type": "boolean"
      },
      "resolution": {
        "type": "number"
      },
      "preserveDrawingBuffer": {
        "type": "boolean"
      },
      "backgroundColor": {
        "type": "number"
      }
    }
  },
  "selector": {
    "type": "string"
  },
  "selectorGui": {
    "type": "string"
  },
  "selectorCanvas": {
    "type": "string"
  },
  "standalone": {
    "type": "boolean"
  },
  "drawMap": {
    "type": "boolean"
  },
  "maxFps": {
    "type": "number"
  },
  "serverFps": {
    "type": "number"
  }
};
var default_config_default = {
  "server": {
    "type": "object",
    "properties": {
      "startMap": {
        "type": "string"
      },
      "start": {
        "type": "object",
        "properties": {
          "map": {
            "type": "string"
          },
          "graphic": {
            "type": "string"
          },
          "hitbox": {
            "type": "array",
            "items": [
              { "type": "integer" },
              { "type": "integer" }
            ],
            "additionalItems": false,
            "minItems": 2,
            "maxItems": 2
          }
        }
      },
      "spritesheetDirectories": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "api": {
        "type": "object",
        "properties": {
          "enabled": {
            "type": "boolean"
          },
          "authSecret": {
            "type": "string"
          }
        },
        "required": ["enabled", "authSecret"]
      }
    }
  },
  "client": {
    "type": "object",
    "properties": {
      "shortName": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "themeColor": {
        "type": "string"
      },
      "icons": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "src": {
              "type": "string"
            },
            "sizes": {
              "type": "array",
              "items": {
                "type": "number",
                "minimum": 0
              }
            },
            "type": {
              "type": "string"
            }
          }
        }
      },
      "themeCss": {
        "type": "string"
      },
      "matchMakerService": {
        "type": "string"
      },
      ...canvasOptions
    }
  },
  "*": {
    "type": "object",
    "properties": {
      "inputs": {
        "type": "object",
        "additionalProperties": {
          "oneOf": [
            {
              "type": "object",
              "properties": {
                "repeat": {
                  "type": "boolean",
                  "default": false
                },
                "bind": {
                  "type": [
                    "string",
                    "array"
                  ]
                },
                "delay": {
                  "type": "object",
                  "properties": {
                    "duration": {
                      "type": "number",
                      "minimum": 0
                    },
                    "otherControls": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
                  },
                  "required": [
                    "duration"
                  ]
                }
              },
              "required": [
                "bind"
              ]
            }
          ]
        }
      },
      "name": {
        "type": "string"
      }
    }
  }
};

// packages/compiler/src/build/load-global-config.ts
import fs6 from "fs";
import path6 from "path";
import { loadEnv } from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/vite/dist/node/index.js";
function loadGlobalConfig(modules, config, options) {
  let configClient = {};
  let configServer = {};
  let allExtraProps = [];
  const displayError = options.side == "server";
  const mode = options.mode || "development";
  const parseSchema = (configFile, moduleName) => {
    try {
      const value = parseJsonSchema(configFile, config);
      if (value.server) {
        configServer = { ...configServer, ...value.server };
      }
      if (value.client) {
        configClient = { ...configClient, ...value.client };
      }
      if (value.extraProps) {
        allExtraProps = [...allExtraProps, ...value.extraProps];
      }
    } catch (err) {
      if (!err.property) {
        console.log(err);
        throw err;
      }
      if (!displayError) {
        return false;
      }
      let message = colors3.red(`Invalidate "${moduleName}" module: ${err.message}`);
      let helpMessage = `[${err.namespace}]
  ${err.property} = YOUR_VALUE`;
      if (!moduleName) {
        message = colors3.red(`Invalidate config: ${err.message}`);
        helpMessage = `${err.property} = YOUR_VALUE`;
      }
      console.log("----------");
      console.log(message);
      if (err.params.allowedValues) {
        console.log(`
${colors3.dim("\u279C Authorize values:")} ${colors3.dim(err.params.allowedValues.join(", "))}`);
      }
      console.log(`${colors3.dim("\u279C")} ${colors3.dim(`you need to put the following configuration in rpg.toml:

${helpMessage}`)}`);
      console.log("----------");
      throw err;
    }
  };
  parseSchema(default_config_default);
  let namespaces = [];
  for (let module of modules) {
    let modulePath = module;
    if (modulePath[0] != ".") {
      modulePath = path6.join("node_modules", modulePath);
    }
    const configPath = path6.resolve(process.cwd(), modulePath, "config.json");
    if (fs6.existsSync(configPath)) {
      const configFile = fs6.readFileSync(configPath, "utf-8");
      const jsonFile = JSON.parse(configFile);
      if (jsonFile.namespace)
        namespaces.push(jsonFile.namespace);
      parseSchema(jsonFile, module);
    }
  }
  if (displayError) {
    const filterExtraProps = allExtraProps.filter((prop) => namespaces.indexOf(prop) == -1);
    if (filterExtraProps.length > 0) {
      warn("In rpg.toml, you put the following properties, but they are not used by the modules. Check the names of the properties.");
      for (let extraProp of filterExtraProps) {
        console.log(`  - ${colors3.yellow(extraProp)}`);
      }
    }
  }
  function replaceEnvVars(obj, envs2) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(replaceEnvVars);
    }
    return Object.entries(obj).reduce((acc, [key, value]) => {
      if (value !== null && typeof value === "object") {
        value = replaceEnvVars(value, envs2);
      } else if (typeof value === "string" && value.startsWith("$ENV:")) {
        const envVar = value.slice(5);
        value = envs2[envVar];
      }
      acc[key] = value;
      return acc;
    }, {});
  }
  const envs = loadEnv(mode, process.cwd());
  return {
    configClient: replaceEnvVars(configClient, envs),
    configServer: replaceEnvVars(configServer, envs)
  };
}

// packages/compiler/src/build/vite-plugin-config.toml.ts
var MODULE_NAME = "virtual-modules";
var GLOBAL_CONFIG_CLIENT = "virtual-config-client";
var GLOBAL_CONFIG_SERVER = "virtual-config-server";
function formatVariableName(packageName) {
  packageName = packageName.replace(/\./g, "");
  return packageName.replace(/[.@\/ -]/g, "_");
}
function transformPathIfModule(moduleName) {
  if (moduleName.startsWith("@rpgjs") || moduleName.startsWith("rpgjs")) {
    return "node_modules/" + moduleName;
  }
  return moduleName;
}
function getAllFiles(dirPath) {
  const files = [];
  const dirents = fs7.readdirSync(dirPath, { withFileTypes: true });
  for (const dirent of dirents) {
    const fullPath = path7.join(dirPath, dirent.name);
    if (dirent.isDirectory()) {
      const nestedFiles = getAllFiles(fullPath);
      files.push(...nestedFiles);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}
function searchFolderAndTransformToImportString(folderPath, modulePath, extensionFilter, returnCb, options) {
  let importString2 = "";
  const folder = path7.resolve(modulePath, folderPath);
  if (fs7.existsSync(folder)) {
    const files = getAllFiles(folder);
    return {
      variablesString: files.filter((file) => {
        if (typeof extensionFilter === "string") {
          return file.endsWith(extensionFilter);
        } else {
          return extensionFilter.some((ext) => file.endsWith(ext));
        }
      }).filter((file) => {
        if (options == null ? void 0 : options.customFilter) {
          return options.customFilter(file);
        }
        return true;
      }).map((file) => {
        const relativePath = toPosix(file.replace(process.cwd(), "."));
        const variableName = formatVariableName(relativePath);
        importString2 = importString2 + `
import ${variableName} from '${relativePath}'`;
        return returnCb ? returnCb(relativePath, variableName) : variableName;
      }).join(","),
      importString: importString2,
      folder
    };
  }
  return {
    variablesString: "",
    importString: "",
    folder: ""
  };
}
function importString(modulePath, fileName, variableName) {
  const playerFile = path7.resolve(process.cwd(), transformPathIfModule(modulePath), fileName + ".ts");
  let importString2 = "";
  if (fs7.existsSync(playerFile)) {
    importString2 = `import ${variableName || fileName} from '${modulePath}/${fileName}.ts'`;
  }
  return importString2;
}
function loadServerFiles(modulePath, options, config) {
  var _a, _b, _c, _d;
  let onceCreatePlayerCommand = false;
  const { modulesCreated } = options;
  if (!modulesCreated.includes(modulePath))
    modulesCreated.push(modulePath);
  const importPlayer = importString(modulePath, "player");
  const importEngine = importString(modulePath, "server");
  const mapStandaloneFilesString = searchFolderAndTransformToImportString("maps", modulePath, ".ts");
  const mapFilesString = searchFolderAndTransformToImportString("maps", modulePath, ".tmx", (file, variableName) => {
    return `
            {
                id: '${file.replace(".tmx", "")}',
                file: ${variableName}
            }
        `;
  }, {
    customFilter: (file) => {
      const tsFile = file.replace(".tmx", ".ts");
      if (fs7.existsSync(tsFile)) {
        return false;
      }
      return true;
    }
  });
  const hasMaps = !!(mapFilesString == null ? void 0 : mapFilesString.variablesString);
  const worldFilesString = searchFolderAndTransformToImportString("worlds", modulePath, ".world");
  const databaseFilesString = searchFolderAndTransformToImportString("database", modulePath, ".ts");
  const eventsFilesString = searchFolderAndTransformToImportString("events", modulePath, ".ts");
  const code = `
        import { RpgServer, RpgModule } from '@rpgjs/server'
        ${mapFilesString == null ? void 0 : mapFilesString.importString}
        ${mapStandaloneFilesString == null ? void 0 : mapStandaloneFilesString.importString}
        ${worldFilesString == null ? void 0 : worldFilesString.importString}
        ${importPlayer ? importPlayer : "const player = {}"}
        ${eventsFilesString == null ? void 0 : eventsFilesString.importString}
        ${databaseFilesString == null ? void 0 : databaseFilesString.importString}
        ${importEngine}

        ${modulesCreated.length == 1 ? `const _lastConnectedCb = player.onConnected
            player.onConnected = async (player) => {
                if (_lastConnectedCb) await _lastConnectedCb(player)
                ${((_a = config.start) == null ? void 0 : _a.graphic) ? `player.setGraphic('${(_b = config.start) == null ? void 0 : _b.graphic}')` : ""}
                ${((_c = config.start) == null ? void 0 : _c.hitbox) ? `player.setHitbox(${(_d = config.start) == null ? void 0 : _d.hitbox})` : ""}
                ${config.startMap ? `await player.changeMap('${config.startMap}')` : ""}
            }` : ""}
           
        @RpgModule<RpgServer>({ 
            player,
            events: [${eventsFilesString == null ? void 0 : eventsFilesString.variablesString}],
            ${importEngine ? `engine: server,` : ""}
            database: [${databaseFilesString == null ? void 0 : databaseFilesString.variablesString}],
            maps: [${mapFilesString == null ? void 0 : mapFilesString.variablesString}${hasMaps ? "," : ""}${mapStandaloneFilesString == null ? void 0 : mapStandaloneFilesString.variablesString}],
            worldMaps: [${worldFilesString == null ? void 0 : worldFilesString.variablesString}] 
        })
        export default class RpgServerModuleEngine {} 
    `;
  return code;
}
function loadSpriteSheet(directoryName, modulePath, options, warning = true) {
  const importSprites = searchFolderAndTransformToImportString(directoryName, modulePath, ".ts");
  let propImagesString = "";
  if (importSprites == null ? void 0 : importSprites.importString) {
    const folder = importSprites.folder;
    let objectString = "";
    let lastImagePath = "";
    const projectPath = folder.replace(process.cwd(), "/");
    getAllFiles(folder).filter((file) => {
      const ext = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"];
      return ext.some((e) => file.toLowerCase().endsWith(e));
    }).forEach(async (file) => {
      const filename = path7.basename(file);
      const basename2 = filename.replace(path7.extname(file), "");
      if (options.serveMode === false) {
        const dest = path7.join(assetsFolder(options.type === "rpg" ? "standalone" : "client"), filename);
        fs7.copyFileSync(file, dest);
      }
      lastImagePath = file;
      objectString += `"${basename2}": "${toPosix(path7.join(projectPath, filename)).replace(/^\/+/, "")}",
`;
    });
    const dimensions = sizeOf(lastImagePath);
    propImagesString = `
            ${importSprites == null ? void 0 : importSprites.variablesString}.images = {
                ${objectString}
            }
            ${importSprites == null ? void 0 : importSprites.variablesString}.prototype.width = ${dimensions.width}
            ${importSprites == null ? void 0 : importSprites.variablesString}.prototype.height = ${dimensions.height}
        `;
  } else if (warning) {
    warn(`No spritesheet folder found in ${directoryName} folder`);
  }
  return {
    ...importSprites,
    propImagesString
  };
}
function loadClientFiles(modulePath, options, config) {
  const importSceneMapString = importString(modulePath, "scene-map", "sceneMap");
  const importSpriteString = importString(modulePath, "sprite");
  const importEngine = importString(modulePath, "client", "engine");
  const guiFilesString = searchFolderAndTransformToImportString("gui", modulePath, ".vue");
  const soundFilesString = searchFolderAndTransformToImportString("sounds", modulePath, [".mp3", ".ogg"]);
  let importSpritesheets = [];
  if (config.spritesheetDirectories) {
    importSpritesheets = config.spritesheetDirectories.map((directory) => loadSpriteSheet(directory, modulePath, options));
  }
  if (!(config.spritesheetDirectories ?? []).some((dir) => dir === "characters")) {
    importSpritesheets.push(loadSpriteSheet("characters", modulePath, options, false));
  }
  importSpritesheets = importSpritesheets.filter((importSpritesheet) => importSpritesheet.importString);
  return `
        import { RpgClient, RpgModule } from '@rpgjs/client'
        ${importSpriteString}
        ${importSceneMapString}
        ${importEngine}
        ${importSpritesheets.map((importSpritesheet) => importSpritesheet.importString).join("\n")}
        ${guiFilesString == null ? void 0 : guiFilesString.importString}
        ${soundFilesString == null ? void 0 : soundFilesString.importString}

        ${importSpritesheets.map((importSpritesheet) => importSpritesheet.propImagesString).join("\n")}
        
        @RpgModule<RpgClient>({ 
            spritesheets: [ ${importSpritesheets.map((importSpritesheet) => importSpritesheet.variablesString).join(",\n")} ],
            sprite: ${importSpriteString ? "sprite" : "{}"},
            ${importEngine ? `engine,` : ""}
            scenes: { ${importSceneMapString ? "map: sceneMap" : ""} },
            gui: [${guiFilesString == null ? void 0 : guiFilesString.variablesString}],
            sounds: [${soundFilesString == null ? void 0 : soundFilesString.variablesString}]
        })
        export default class RpgClientModuleEngine {}
    `;
}
function createModuleLoad(id, variableName, modulePath, options, config) {
  const clientFile = `virtual-${variableName}-client.ts`;
  const serverFile = `virtual-${variableName}-server.ts`;
  if (id.endsWith(serverFile + "?server")) {
    return loadServerFiles(modulePath, options, config);
  } else if (id.endsWith(clientFile + "?client")) {
    return loadClientFiles(modulePath, options, config);
  }
  return `
        import client from 'client!./${clientFile}'
        import server from 'server!./${serverFile}'
        
        export default {
            client,
            server
        } 
    `;
}
function createConfigFiles(id, configServer, configClient) {
  if (id.endsWith(GLOBAL_CONFIG_SERVER)) {
    return `
            export default ${JSON.stringify(configServer)}
        `;
  }
  if (id.endsWith(GLOBAL_CONFIG_CLIENT)) {
    return `
            export default ${JSON.stringify(configClient)}
        `;
  }
  return null;
}
function resolveModule(name) {
  return name.replace(/^.\//, "");
}
function configTomlPlugin(options = {}, config) {
  var _a;
  let modules = [];
  let modulesCreated = [];
  if (config.modules) {
    modules = config.modules;
  }
  config.startMap = config.startMap || ((_a = config.start) == null ? void 0 : _a.map);
  let ret;
  try {
    ret = loadGlobalConfig(modules, config, options);
  } catch (err) {
    if (options.side == "server")
      process.exit();
  }
  if (!ret)
    return;
  const { configClient, configServer } = ret;
  return {
    name: "vite-plugin-config-toml",
    transformIndexHtml: {
      enforce: "pre",
      transform(html) {
        const clientFile = path7.resolve(process.cwd(), "src", "client.ts");
        const importStr = fs7.existsSync(clientFile) ? "mmorpg!./src/client.ts" : "mmorpg!virtual-client.ts";
        const standaloneFile = path7.resolve(process.cwd(), "src", "standalone.ts");
        const importStrStandalone = fs7.existsSync(standaloneFile) ? "rpg!./src/standalone.ts" : "rpg!virtual-standalone.ts";
        return html.replace("<head>", `
                <head>
                <script type="module">
                    import '${importStr}'
                    import '${importStrStandalone}'
                </script>`);
      }
    },
    handleHotUpdate() {
      modulesCreated = [];
    },
    async resolveId(source, importer) {
      if (source.endsWith(MODULE_NAME) || source.endsWith(GLOBAL_CONFIG_CLIENT) || source.endsWith(GLOBAL_CONFIG_SERVER)) {
        return source;
      }
      for (let module of modules) {
        if (source === resolveModule(module)) {
          return source;
        }
      }
      if (source.includes("virtual") && (!source.endsWith("virtual-server.ts") && options.serveMode) || source.includes("virtual") && !options.serveMode) {
        return source;
      }
    },
    async load(id) {
      const serverUrl = process.env.VITE_SERVER_URL;
      const envsString = `{
                VITE_BUILT: ${process.env.VITE_BUILT},
                VITE_SERVER_URL: ${serverUrl ? "'" + serverUrl + "'" : "undefined"}
            }`;
      if (id.endsWith(MODULE_NAME)) {
        const modulesToImport = modules.reduce((acc, module) => {
          const variableName = formatVariableName(module);
          acc[variableName] = module;
          return acc;
        }, {});
        return `
                ${Object.keys(modulesToImport).map((variableName) => `import ${variableName} from '${resolveModule(modulesToImport[variableName])}'`).join("\n")}

                export default [
                   ${Object.keys(modulesToImport).join(",\n")}
                ]
                `;
      } else if (id.endsWith("virtual-client.ts?mmorpg")) {
        const codeToTransform = `
                import { entryPoint } from '@rpgjs/client'
                import io from 'socket.io-client'
                import modules from './${MODULE_NAME}'
                import globalConfig from './${GLOBAL_CONFIG_CLIENT}'

                document.addEventListener('DOMContentLoaded', function(e) { 
                    entryPoint(modules, { 
                        io,
                        globalConfig,
                        envs: ${envsString}
                    }).start()
                });
              `;
        return codeToTransform;
      } else if (id.endsWith("virtual-standalone.ts?rpg")) {
        const codeToTransform = `
                import { entryPoint } from '@rpgjs/standalone'
                import globalConfigClient from './${GLOBAL_CONFIG_CLIENT}'
                import globalConfigServer from './${GLOBAL_CONFIG_SERVER}'
                import modules from './${MODULE_NAME}'

                document.addEventListener('DOMContentLoaded', function() { 
                    entryPoint(modules, {
                        globalConfigClient,
                        globalConfigServer,
                        envs: ${envsString}
                    }).start() 
                })
              `;
        return codeToTransform;
      } else if (id.endsWith("virtual-server.ts")) {
        const codeToTransform = `
                import { expressServer } from '@rpgjs/server/express'
                import * as url from 'url'
                import modules from './${MODULE_NAME}'
                import globalConfig from './${GLOBAL_CONFIG_SERVER}'

                const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

                expressServer(modules, {
                    globalConfig,
                    basePath: __dirname,
                    envs: ${envsString}
                })
              `;
        return codeToTransform;
      }
      const str = createConfigFiles(id, configClient, configServer);
      if (str)
        return str;
      for (let module of modules) {
        let moduleName = resolveModule(module);
        let variableName = formatVariableName(moduleName);
        if (id.endsWith(moduleName) || id.includes("virtual-" + variableName)) {
          return createModuleLoad(id, variableName, module, {
            ...options,
            modulesCreated
          }, config);
        }
      }
    }
  };
}

// packages/compiler/src/build/vite-plugin-css.ts
import { resolve } from "path";
import fs8 from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/fs-extra/lib/index.js";
var DEFAULT_THEME = `
    $window-background: linear-gradient(148deg, rgba(79,82,136,0.7) 0%, rgba(42,43,73,0.7) 100%);
    $window-border: 2.5px solid white;
    $window-border-radius: 5px;
    $window-arrow-color: white;
    $window-font-size: 25px;
    $window-font-color: white;
    $window-font-family: 'Arial';
    $cursor-background: #7782ab;
    $cursor-border: 1px solid #9db0c6;

    @mixin window-content {}
`;
function cssPlugin(config) {
  return {
    name: "vite-plugin-css",
    config(config2) {
      let additionalData = "";
      const themeCss = resolve(process.cwd(), "src/config/client/theme.scss");
      const themeCssRoot = resolve(process.cwd(), "theme.scss");
      if (fs8.existsSync(themeCss)) {
        additionalData += `@import "${themeCss}";`;
      } else if (fs8.existsSync(themeCssRoot)) {
        additionalData += `@import "${themeCssRoot}";`;
      } else if (config2.themeCss) {
        if (!fs8.existsSync(resolve(process.cwd(), config2.themeCss))) {
          throw new Error(`File ${config2.themeCss} not found`);
        }
        additionalData += `@import "@/${config2.themeCss}";`;
      } else {
        additionalData += DEFAULT_THEME;
      }
      config2.css = {
        preprocessorOptions: {
          scss: {
            additionalData
          }
        }
      };
      return config2;
    }
  };
}

// packages/compiler/src/build/vite-plugin-rpgjs-loader.ts
function rpgjsPluginLoader(output = "client", isBuild = false) {
  return {
    name: "rpgjs-assets-loader",
    enforce: "pre",
    transform: async (code, id) => {
      const regex = /^(?!.*node_modules(?:\/|\\)(?!rpgjs-|@rpgjs)).*$/;
      if (regex.test(id) && id.endsWith(".ts")) {
        return {
          code: `import '${id}';
${code}`,
          map: null
        };
      }
    }
  };
}

// packages/compiler/src/build/vite-plugin-map-update.ts
import fs9 from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/fs-extra/lib/index.js";
import xml2js from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/xml2js/lib/xml2js.js";
function mapUpdatePlugin(_serverUrl) {
  return {
    name: "vite-plugin-map-update",
    configureServer(server) {
      var _a;
      const serverUrl = _serverUrl || ((_a = server.httpServer) == null ? void 0 : _a.address()).port;
      server.watcher.add(globFiles("@(tmx|tsx)"));
      server.watcher.on("change", async (file) => {
        if (file.endsWith("tmx")) {
          info(`File ${file} changed, updating map...`);
          const data = await fs9.readFile(file, "utf-8");
          api_default.put(serverUrl + "/api/maps", {
            mapFile: file,
            data
          }).catch(errorApi);
        } else if (file.endsWith("tsx")) {
          info(`File ${file} changed, updating tileset...`);
          const data = await fs9.readFile(file, "utf-8");
          const parser2 = new xml2js.Parser();
          const result = await parser2.parseStringPromise(data);
          api_default.put(serverUrl + "/api/tilesets", {
            tilesetId: result.tileset.$.name,
            data
          }).catch(errorApi);
        }
      });
    }
  };
}

// packages/compiler/src/build/client-config.ts
var __vite_injected_original_import_meta_url = "file:///home/samuel/www/RPG-JS-v4/packages/compiler/src/build/client-config.ts";
var require2 = createRequire(__vite_injected_original_import_meta_url);
async function clientBuildConfig(dirname, options = {}) {
  var _a, _b;
  const isServer = options.side === "server";
  const isTest = options.mode === "test";
  const isRpg = options.type === "rpg";
  const isBuild = options.serveMode === false;
  const dirOutputName = isRpg ? "standalone" : "client";
  const plugin = options.plugin;
  const serverUrl = "http://" + process.env.VITE_SERVER_URL;
  let config = {};
  const envType = process.env.RPG_TYPE;
  if (envType && !["rpg", "mmorpg"].includes(envType)) {
    throw new Error("Invalid type. Choice between rpg or mmorpg");
  }
  const tomlFile = resolve2(process.cwd(), "rpg.toml");
  const jsonFile = resolve2(process.cwd(), "rpg.json");
  if (_fs.existsSync(tomlFile)) {
    config = toml.parse(await fs10.readFile(tomlFile, "utf8"));
  } else if (_fs.existsSync(jsonFile)) {
    config = JSON.parse(await fs10.readFile(jsonFile, "utf8"));
  }
  if (options.mode != "test" && !plugin) {
    try {
      await fs10.stat(resolve2(dirname, "index.html"));
    } catch (e) {
      error2(e, 0 /* IndexNotFound */);
      return;
    }
  }
  process.env.VITE_RPG_TYPE = envType;
  if (isBuild && !isTest) {
    await createDistFolder(dirOutputName);
  }
  let plugins = [
    rpgjsPluginLoader(dirOutputName, options.serveMode),
    flagTransform(options),
    configTomlPlugin(options, config),
    // after flagTransform
    vitePluginRequire(),
    worldTransformPlugin(isRpg ? void 0 : serverUrl),
    tsxXmlPlugin(),
    ...options.plugins || []
  ];
  if (!isServer) {
    plugins = [
      ...plugins,
      vue(),
      cssPlugin(config),
      codeInjectorPlugin(),
      NodeModulesPolyfillPlugin(),
      NodeGlobalsPolyfillPlugin({
        process: true,
        buffer: true
      }),
      splitVendorChunkPlugin()
    ];
    if (isBuild) {
      plugins.push(
        VitePWA({
          manifest: {
            name: config.name,
            short_name: config.shortName || config.short_name,
            description: config.description,
            theme_color: config.themeColor || config.background_color,
            icons: config.icons
          }
        })
      );
    }
  } else {
    if (!isBuild) {
      plugins.push(
        mapUpdatePlugin(isRpg ? void 0 : serverUrl)
      );
    }
  }
  if (isBuild && !isTest) {
    plugins.push(
      tmxTsxMoverPlugin(isRpg ? "standalone" : "server"),
      mapExtractPlugin(dirOutputName)
    );
  }
  let moreBuildOptions = {};
  let outputOptions = {};
  if (options.buildEnd) {
    plugins.push(options.buildEnd);
  }
  if (options.serveMode) {
    if (!isServer) {
      moreBuildOptions = {
        watch: {},
        minify: false
      };
    }
  }
  let configFile;
  try {
    const config2 = await fs10.stat(resolve2(dirname, "vite.config.js"));
    if (config2.isFile()) {
      configFile = resolve2(dirname, "vite.config.js");
    }
  } catch (e) {
  }
  let aliasTransform = {};
  if (!isBuild) {
    aliasTransform["vue"] = "vue/dist/vue.esm-bundler.js";
  }
  if (!isServer) {
    const aliasPolyfills = {
      util: "rollup-plugin-node-polyfills/polyfills/util",
      sys: "util",
      events: "rollup-plugin-node-polyfills/polyfills/events",
      stream: "rollup-plugin-node-polyfills/polyfills/stream",
      path: "rollup-plugin-node-polyfills/polyfills/path",
      querystring: "rollup-plugin-node-polyfills/polyfills/qs",
      punycode: "rollup-plugin-node-polyfills/polyfills/punycode",
      url: "rollup-plugin-node-polyfills/polyfills/url",
      string_decoder: "rollup-plugin-node-polyfills/polyfills/string-decoder",
      http: "rollup-plugin-node-polyfills/polyfills/http",
      https: "rollup-plugin-node-polyfills/polyfills/http",
      os: "rollup-plugin-node-polyfills/polyfills/os",
      assert: "rollup-plugin-node-polyfills/polyfills/assert",
      constants: "rollup-plugin-node-polyfills/polyfills/constants",
      _stream_duplex: "rollup-plugin-node-polyfills/polyfills/readable-stream/duplex",
      _stream_passthrough: "rollup-plugin-node-polyfills/polyfills/readable-stream/passthrough",
      _stream_readable: "rollup-plugin-node-polyfills/polyfills/readable-stream/readable",
      _stream_writable: "rollup-plugin-node-polyfills/polyfills/readable-stream/writable",
      _stream_transform: "rollup-plugin-node-polyfills/polyfills/readable-stream/transform",
      timers: "rollup-plugin-node-polyfills/polyfills/timers",
      console: "rollup-plugin-node-polyfills/polyfills/console",
      vm: "rollup-plugin-node-polyfills/polyfills/vm",
      zlib: "rollup-plugin-node-polyfills/polyfills/zlib",
      tty: "rollup-plugin-node-polyfills/polyfills/tty",
      domain: "rollup-plugin-node-polyfills/polyfills/domain",
      process: "rollup-plugin-node-polyfills/polyfills/process-es6",
      ...options.mode != "test" ? {
        buffer: "rollup-plugin-node-polyfills/polyfills/buffer-es6"
      } : {}
    };
    for (const [key, value] of Object.entries(aliasPolyfills)) {
      aliasTransform[key] = require2.resolve(value);
    }
    options.overrideOptions = {
      ...options.overrideOptions,
      define: {
        "process.env": {}
        //global: {},
      },
      publicDir: resolve2(dirname, "public")
    };
  } else {
    moreBuildOptions = {
      minify: false,
      ssr: {
        //  format: 'cjs'
      },
      ...moreBuildOptions
    };
    if (!options.serveMode) {
      outputOptions = {
        // format: 'cjs',
      };
    }
  }
  if (isBuild) {
    moreBuildOptions = {
      minify: false,
      ...moreBuildOptions
    };
  }
  const outputPath = isRpg ? resolve2(dirname, "dist", dirOutputName) : resolve2(dirname, "dist", isServer ? "server" : dirOutputName);
  const viteConfig = {
    mode: options.mode || "development",
    root: ".",
    configFile,
    resolve: {
      alias: {
        "@": join2(process.cwd(), "src"),
        ...aliasTransform
      },
      extensions: [".ts", ".js", ".jsx", ".json", ".vue", ".css", ".scss", ".sass", ".html", "tmx", "tsx", ".toml"]
    },
    assetsInclude: ["**/*.tmx", "**/*.tsx"],
    server: options.server,
    logLevel: (_a = options.server) == null ? void 0 : _a.loglevel,
    debug: (_b = options.server) == null ? void 0 : _b.debug,
    build: {
      manifest: true,
      outDir: outputPath,
      chunkSizeWarningLimit: 1e4,
      assetsInlineLimit: 0,
      emptyOutDir: false,
      rollupOptions: {
        output: {
          dir: outputPath,
          assetFileNames: (assetInfo) => {
            let extType = assetInfo.name.split(".").at(1);
            if (/tmx|tsx/i.test(extType)) {
              return `assets/[name][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          ...outputOptions
        },
        input: {
          main: plugin ? plugin.entry : !isServer ? resolve2(dirname, "index.html") : entryPointServer()
        },
        plugins: [
          !isServer ? nodePolyfills() : null
        ]
      },
      ...moreBuildOptions
    },
    plugins,
    ...options.overrideOptions || {}
  };
  const packageJSON = JSON.parse(await fs10.readFile(resolve2(process.cwd(), "package.json"), "utf8"));
  const dependencies = Object.keys(packageJSON.dependencies || {});
  const excludeDependencies = [];
  const except = ["@rpgjs/server", "@rpgjs/client", "@rpgjs/common", "@rpgjs/database", "@rpgjs/tiled", "@rpgjs/types", "@rpgjs/standalone"];
  for (const dep of dependencies) {
    if (except.includes(dep))
      continue;
    if (dep.startsWith("@rpgjs")) {
      excludeDependencies.push(dep);
    }
  }
  viteConfig.optimizeDeps = {
    ...viteConfig.optimizeDeps,
    exclude: [
      ...options.optimizeDepsExclude || [],
      ...excludeDependencies
    ]
  };
  return viteConfig;
}

// packages/compiler/src/test/vitest.config.ts
import { configDefaults } from "file:///home/samuel/www/RPG-JS-v4/packages/compiler/node_modules/vitest/dist/config.js";
import path8 from "path";
var __vite_injected_original_dirname = "/home/samuel/www/RPG-JS-v4/packages/compiler/src/test";
var vitest_config_default = defineConfig(async () => {
  process.env.NODE_ENV = "test";
  let config = await clientBuildConfig(process.cwd(), {
    mode: "test",
    serveMode: false
  });
  const packages = ["client", "server", "database", "testing", "common", "standalone", "types"];
  let configResolveAlias = {};
  for (const pkg of packages) {
    configResolveAlias[`@rpgjs/${pkg}`] = path8.resolve(__vite_injected_original_dirname, `../../../${pkg}/src/index.ts`);
  }
  config = {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        ...configResolveAlias
      },
      mainFields: []
    }
  };
  return {
    ...config,
    test: {
      environment: "jsdom",
      threads: false,
      setupFiles: [
        "packages/compiler/src/setupFiles/canvas.ts"
      ],
      exclude: [
        ...configDefaults.exclude,
        "packages/compiler/**/*"
      ]
    }
  };
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicGFja2FnZXMvY29tcGlsZXIvc3JjL3Rlc3Qvdml0ZXN0LmNvbmZpZy50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvY2xpZW50LWNvbmZpZy50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tcmVxdWlyZS50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tZmxhZy10cmFuc2Zvcm0udHMiLCAicGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLXdvcmxkLXRyYW5zZm9ybS50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdXRpbHMudHMiLCAicGFja2FnZXMvY29tcGlsZXIvc3JjL2xvZ3Mvd2FybmluZy50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvc2VydmUvYXBpLnRzIiwgInBhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi1tYXAtZXh0cmFjdC50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tdHN4LXhtbC50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tdG14LXRzeC1tb3Zlci50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tY29kZS1pbmplY3Rvci50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvdXRpbHMvbG9nLnRzIiwgInBhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi1jb25maWcudG9tbC50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvdXRpbHMvanNvbi1zY2hlbWEudHMiLCAicGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL2xvYWQtZ2xvYmFsLWNvbmZpZy50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvZGVmYXVsdC1jb25maWcudHMiLCAicGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLWNzcy50cyIsICJwYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tcnBnanMtbG9hZGVyLnRzIiwgInBhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi1tYXAtdXBkYXRlLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL3Rlc3RcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy90ZXN0L3ZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL3Rlc3Qvdml0ZXN0LmNvbmZpZy50c1wiOy8vLyA8cmVmZXJlbmNlIHR5cGVzPVwidml0ZXN0XCIgLz5cbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgeyBjbGllbnRCdWlsZENvbmZpZyB9IGZyb20gJy4uL2J1aWxkL2NsaWVudC1jb25maWcuanMnXG5pbXBvcnQgeyBjb25maWdEZWZhdWx0cyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoYXN5bmMgKCkgPT4ge1xuICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID0gJ3Rlc3QnXG5cbiAgICBsZXQgY29uZmlnID0gYXdhaXQgY2xpZW50QnVpbGRDb25maWcocHJvY2Vzcy5jd2QoKSwge1xuICAgICAgICBtb2RlOiAndGVzdCcsXG4gICAgICAgIHNlcnZlTW9kZTogZmFsc2UsXG4gICAgfSlcbiAgICBjb25zdCBwYWNrYWdlcyA9IFsnY2xpZW50JywgJ3NlcnZlcicsICdkYXRhYmFzZScsICd0ZXN0aW5nJywgJ2NvbW1vbicsICdzdGFuZGFsb25lJywgJ3R5cGVzJ11cbiAgICBsZXQgY29uZmlnUmVzb2x2ZUFsaWFzID0ge31cbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlcykge1xuICAgICAgICBjb25maWdSZXNvbHZlQWxpYXNbYEBycGdqcy8ke3BrZ31gXSA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGAuLi8uLi8uLi8ke3BrZ30vc3JjL2luZGV4LnRzYClcbiAgICB9XG4gICAgY29uZmlnID0ge1xuICAgICAgICAuLi5jb25maWcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIC4uLmNvbmZpZy5yZXNvbHZlLFxuICAgICAgICAgICAgYWxpYXM6IHtcbiAgICAgICAgICAgICAgICAuLi5jb25maWcucmVzb2x2ZS5hbGlhcyxcbiAgICAgICAgICAgICAgICAuLi5jb25maWdSZXNvbHZlQWxpYXNcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBtYWluRmllbGRzOiBbXSwgXG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgLi4uY29uZmlnLFxuICAgICAgICB0ZXN0OiB7XG4gICAgICAgICAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICAgICAgICAgIHRocmVhZHM6IGZhbHNlLFxuICAgICAgICAgICAgc2V0dXBGaWxlczogW1xuICAgICAgICAgICAgICAgICdwYWNrYWdlcy9jb21waWxlci9zcmMvc2V0dXBGaWxlcy9jYW52YXMudHMnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhjbHVkZTogW1xuICAgICAgICAgICAgICAgIC4uLmNvbmZpZ0RlZmF1bHRzLmV4Y2x1ZGUsIFxuICAgICAgICAgICAgICAgICdwYWNrYWdlcy9jb21waWxlci8qKi8qJ1xuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgfVxufSkiLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL2NsaWVudC1jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL2NsaWVudC1jb25maWcudHNcIjtpbXBvcnQgeyBzcGxpdFZlbmRvckNodW5rUGx1Z2luIH0gZnJvbSAndml0ZSdcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnXG5pbXBvcnQgdG9tbCBmcm9tICdAaWFybmEvdG9tbCc7XG5pbXBvcnQgbm9kZVBvbHlmaWxscyBmcm9tICdyb2xsdXAtcGx1Z2luLW5vZGUtcG9seWZpbGxzJ1xuaW1wb3J0IHsgTm9kZU1vZHVsZXNQb2x5ZmlsbFBsdWdpbiB9IGZyb20gJ0Blc2J1aWxkLXBsdWdpbnMvbm9kZS1tb2R1bGVzLXBvbHlmaWxsJ1xuaW1wb3J0IHsgcmVzb2x2ZSwgam9pbiB9IGZyb20gJ3BhdGgnXG5pbXBvcnQgcmVxdWlyZVRyYW5zZm9ybSBmcm9tICcuL3ZpdGUtcGx1Z2luLXJlcXVpcmUuanMnO1xuaW1wb3J0IHsgZmxhZ1RyYW5zZm9ybSB9IGZyb20gJy4vdml0ZS1wbHVnaW4tZmxhZy10cmFuc2Zvcm0uanMnO1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgeyB3b3JsZFRyYW5zZm9ybVBsdWdpbiB9IGZyb20gJy4vdml0ZS1wbHVnaW4td29ybGQtdHJhbnNmb3JtLmpzJztcbmltcG9ydCBmcyBmcm9tICdmcy9wcm9taXNlcydcbmltcG9ydCBfZnMgZnJvbSAnZnMnXG5pbXBvcnQgeyBOb2RlR2xvYmFsc1BvbHlmaWxsUGx1Z2luIH0gZnJvbSAnQGVzYnVpbGQtcGx1Z2lucy9ub2RlLWdsb2JhbHMtcG9seWZpbGwnO1xuaW1wb3J0IHsgY3JlYXRlUmVxdWlyZSB9IGZyb20gJ21vZHVsZSc7XG5pbXBvcnQgeyBtYXBFeHRyYWN0UGx1Z2luIH0gZnJvbSAnLi92aXRlLXBsdWdpbi1tYXAtZXh0cmFjdC5qcyc7XG5pbXBvcnQgeyB0c3hYbWxQbHVnaW4gfSBmcm9tICcuL3ZpdGUtcGx1Z2luLXRzeC14bWwuanMnO1xuaW1wb3J0IHsgdG14VHN4TW92ZXJQbHVnaW4gfSBmcm9tICcuL3ZpdGUtcGx1Z2luLXRteC10c3gtbW92ZXIuanMnO1xuaW1wb3J0IHsgRGV2T3B0aW9ucyB9IGZyb20gJy4uL3NlcnZlL2luZGV4LmpzJztcbmltcG9ydCB7IGNvZGVJbmplY3RvclBsdWdpbiB9IGZyb20gJy4vdml0ZS1wbHVnaW4tY29kZS1pbmplY3Rvci5qcyc7XG5pbXBvcnQgeyBlcnJvciwgRXJyb3JDb2RlcyB9IGZyb20gJy4uL3V0aWxzL2xvZy5qcyc7XG5pbXBvcnQgY29uZmlnVG9tbFBsdWdpbiBmcm9tICcuL3ZpdGUtcGx1Z2luLWNvbmZpZy50b21sLmpzJ1xuaW1wb3J0IHsgY3JlYXRlRGlzdEZvbGRlciwgZW50cnlQb2ludFNlcnZlciB9IGZyb20gJy4vdXRpbHMuanMnXG5pbXBvcnQgY3NzUGx1Z2luIGZyb20gJy4vdml0ZS1wbHVnaW4tY3NzLmpzJztcbmltcG9ydCB7IHJwZ2pzUGx1Z2luTG9hZGVyIH0gZnJvbSAnLi92aXRlLXBsdWdpbi1ycGdqcy1sb2FkZXIuanMnO1xuaW1wb3J0IHsgbWFwVXBkYXRlUGx1Z2luIH0gZnJvbSAnLi92aXRlLXBsdWdpbi1tYXAtdXBkYXRlLmpzJztcblxuY29uc3QgcmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUoaW1wb3J0Lm1ldGEudXJsKTtcblxuZXhwb3J0IGludGVyZmFjZSBDb25maWcge1xuICAgIG1vZHVsZXM/OiBzdHJpbmdbXVxuICAgIHN0YXJ0TWFwPzogc3RyaW5nXG4gICAgbmFtZT86IHN0cmluZ1xuICAgIHNob3J0TmFtZT86IHN0cmluZyxcbiAgICBzaG9ydF9uYW1lPzogc3RyaW5nIC8vIG9sZCB2YWx1ZVxuICAgIGRlc2NyaXB0aW9uPzogc3RyaW5nLFxuICAgIHRoZW1lQ29sb3I/OiBzdHJpbmcsXG4gICAgYmFja2dyb3VuZF9jb2xvcj86IHN0cmluZyAvLyBvbGQgdmFsdWVcbiAgICBpY29ucz86IHtcbiAgICAgICAgc3JjOiBzdHJpbmcsXG4gICAgICAgIHNpemVzOiBudW1iZXJbXSxcbiAgICAgICAgdHlwZTogc3RyaW5nXG4gICAgfVtdXG4gICAgdGhlbWVDc3M/OiBzdHJpbmdcbiAgICBpbnB1dHM/OiBhbnlcbiAgICBzdGFydD86IHtcbiAgICAgICAgbWFwPzogc3RyaW5nLFxuICAgICAgICBncmFwaGljPzogc3RyaW5nXG4gICAgICAgIGhpdGJveD86IFtudW1iZXIsIG51bWJlcl1cbiAgICB9XG4gICAgc3ByaXRlc2hlZXREaXJlY3Rvcmllcz86IHN0cmluZ1tdXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpZW50QnVpbGRDb25maWdPcHRpb25zIHtcbiAgICBidWlsZEVuZD86ICgpID0+IHZvaWQsXG4gICAgc2VydmVNb2RlPzogYm9vbGVhbixcbiAgICBwbHVnaW5zPzogYW55W10sXG4gICAgb3ZlcnJpZGVPcHRpb25zPzogYW55LFxuICAgIHNpZGU/OiAnY2xpZW50JyB8ICdzZXJ2ZXInLFxuICAgIG1vZGU/OiAnZGV2ZWxvcG1lbnQnIHwgJ3Byb2R1Y3Rpb24nIHwgJ3Rlc3QnLFxuICAgIHR5cGU/OiAnbW1vcnBnJyB8ICdycGcnLFxuICAgIHNlcnZlcj86IERldk9wdGlvbnMsXG4gICAgcGx1Z2luPzoge1xuICAgICAgICBlbnRyeTogc3RyaW5nLFxuICAgIH0sXG4gICAgb3B0aW1pemVEZXBzRXhjbHVkZT86IHN0cmluZ1tdXG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGllbnRCdWlsZENvbmZpZyhkaXJuYW1lOiBzdHJpbmcsIG9wdGlvbnM6IENsaWVudEJ1aWxkQ29uZmlnT3B0aW9ucyA9IHt9KSB7XG4gICAgY29uc3QgaXNTZXJ2ZXIgPSBvcHRpb25zLnNpZGUgPT09ICdzZXJ2ZXInXG4gICAgY29uc3QgaXNUZXN0ID0gb3B0aW9ucy5tb2RlID09PSAndGVzdCdcbiAgICBjb25zdCBpc1JwZyA9IG9wdGlvbnMudHlwZSA9PT0gJ3JwZydcbiAgICBjb25zdCBpc0J1aWxkID0gb3B0aW9ucy5zZXJ2ZU1vZGUgPT09IGZhbHNlXG4gICAgY29uc3QgZGlyT3V0cHV0TmFtZSA9IGlzUnBnID8gJ3N0YW5kYWxvbmUnIDogJ2NsaWVudCdcbiAgICBjb25zdCBwbHVnaW4gPSBvcHRpb25zLnBsdWdpblxuICAgIGNvbnN0IHNlcnZlclVybCA9ICdodHRwOi8vJyArIHByb2Nlc3MuZW52LlZJVEVfU0VSVkVSX1VSTFxuICAgIGxldCBjb25maWc6IENvbmZpZyA9IHt9XG5cbiAgICBjb25zdCBlbnZUeXBlID0gcHJvY2Vzcy5lbnYuUlBHX1RZUEVcbiAgICBpZiAoZW52VHlwZSAmJiAhWydycGcnLCAnbW1vcnBnJ10uaW5jbHVkZXMoZW52VHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHR5cGUuIENob2ljZSBiZXR3ZWVuIHJwZyBvciBtbW9ycGcnKVxuICAgIH1cblxuICAgIGNvbnN0IHRvbWxGaWxlID0gcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAncnBnLnRvbWwnKVxuICAgIGNvbnN0IGpzb25GaWxlID0gcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAncnBnLmpzb24nKVxuICAgIC8vIGlmIGZpbGUgZXhpc3RzXG4gICAgaWYgKF9mcy5leGlzdHNTeW5jKHRvbWxGaWxlKSkge1xuICAgICAgICBjb25maWcgPSB0b21sLnBhcnNlKGF3YWl0IGZzLnJlYWRGaWxlKHRvbWxGaWxlLCAndXRmOCcpKTtcbiAgICB9XG4gICAgZWxzZSBpZiAoX2ZzLmV4aXN0c1N5bmMoanNvbkZpbGUpKSB7XG4gICAgICAgIGNvbmZpZyA9IEpTT04ucGFyc2UoYXdhaXQgZnMucmVhZEZpbGUoanNvbkZpbGUsICd1dGY4JykpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLm1vZGUgIT0gJ3Rlc3QnICYmICFwbHVnaW4pIHtcbiAgICAgICAgLy8gaWYgaW5kZXguaHRtbCBpcyBub3QgZm91bmQsIGRpc3BsYXkgYW4gZXJyb3JcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IGZzLnN0YXQocmVzb2x2ZShkaXJuYW1lLCAnaW5kZXguaHRtbCcpKVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlOiBhbnkpIHtcbiAgICAgICAgICAgIGVycm9yKGUsIEVycm9yQ29kZXMuSW5kZXhOb3RGb3VuZClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gYWxpYXMgZm9yIGNsaWVudFxuICAgIHByb2Nlc3MuZW52LlZJVEVfUlBHX1RZUEUgPSBlbnZUeXBlXG5cbiAgICBpZiAoaXNCdWlsZCAmJiAhaXNUZXN0KSB7XG4gICAgICAgIGF3YWl0IGNyZWF0ZURpc3RGb2xkZXIoZGlyT3V0cHV0TmFtZSlcbiAgICB9XG5cbiAgICBsZXQgcGx1Z2luczogYW55W10gPSBbXG4gICAgICAgIHJwZ2pzUGx1Z2luTG9hZGVyKGRpck91dHB1dE5hbWUsIG9wdGlvbnMuc2VydmVNb2RlKSxcbiAgICAgICAgZmxhZ1RyYW5zZm9ybShvcHRpb25zKSxcbiAgICAgICAgY29uZmlnVG9tbFBsdWdpbihvcHRpb25zLCBjb25maWcpLCAvLyBhZnRlciBmbGFnVHJhbnNmb3JtXG4gICAgICAgIChyZXF1aXJlVHJhbnNmb3JtIGFzIGFueSkoKSxcbiAgICAgICAgd29ybGRUcmFuc2Zvcm1QbHVnaW4oaXNScGcgPyB1bmRlZmluZWQgOiBzZXJ2ZXJVcmwpLFxuICAgICAgICB0c3hYbWxQbHVnaW4oKSxcbiAgICAgICAgLi4uKG9wdGlvbnMucGx1Z2lucyB8fCBbXSlcbiAgICBdXG5cbiAgICBpZiAoIWlzU2VydmVyKSB7XG4gICAgICAgIHBsdWdpbnMgPSBbXG4gICAgICAgICAgICAuLi5wbHVnaW5zLFxuICAgICAgICAgICAgdnVlKCksXG4gICAgICAgICAgICBjc3NQbHVnaW4oY29uZmlnKSxcbiAgICAgICAgICAgIGNvZGVJbmplY3RvclBsdWdpbigpLFxuICAgICAgICAgICAgTm9kZU1vZHVsZXNQb2x5ZmlsbFBsdWdpbigpLFxuICAgICAgICAgICAgTm9kZUdsb2JhbHNQb2x5ZmlsbFBsdWdpbih7XG4gICAgICAgICAgICAgICAgcHJvY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBidWZmZXI6IHRydWUsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHNwbGl0VmVuZG9yQ2h1bmtQbHVnaW4oKSxcbiAgICAgICAgXVxuICAgICAgICBpZiAoaXNCdWlsZCkge1xuICAgICAgICAgICAgcGx1Z2lucy5wdXNoKFxuICAgICAgICAgICAgICAgIFZpdGVQV0Eoe1xuICAgICAgICAgICAgICAgICAgICBtYW5pZmVzdDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaG9ydF9uYW1lOiBjb25maWcuc2hvcnROYW1lIHx8IGNvbmZpZy5zaG9ydF9uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGNvbmZpZy5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoZW1lX2NvbG9yOiBjb25maWcudGhlbWVDb2xvciB8fCBjb25maWcuYmFja2dyb3VuZF9jb2xvcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb25zOiBjb25maWcuaWNvbnNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApXG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGlmICghaXNCdWlsZCkge1xuICAgICAgICAgICAgcGx1Z2lucy5wdXNoKFxuICAgICAgICAgICAgICAgIG1hcFVwZGF0ZVBsdWdpbihpc1JwZyA/IHVuZGVmaW5lZCA6IHNlcnZlclVybClcbiAgICAgICAgICAgIClcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc0J1aWxkICYmICFpc1Rlc3QpIHtcbiAgICAgICAgcGx1Z2lucy5wdXNoKFxuICAgICAgICAgICAgdG14VHN4TW92ZXJQbHVnaW4oaXNScGcgPyAnc3RhbmRhbG9uZScgOiAnc2VydmVyJyksXG4gICAgICAgICAgICBtYXBFeHRyYWN0UGx1Z2luKGRpck91dHB1dE5hbWUpXG4gICAgICAgIClcbiAgICB9XG5cbiAgICBsZXQgbW9yZUJ1aWxkT3B0aW9ucyA9IHt9XG4gICAgbGV0IG91dHB1dE9wdGlvbnMgPSB7fVxuXG4gICAgaWYgKG9wdGlvbnMuYnVpbGRFbmQpIHtcbiAgICAgICAgcGx1Z2lucy5wdXNoKG9wdGlvbnMuYnVpbGRFbmQpXG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMuc2VydmVNb2RlKSB7XG4gICAgICAgIGlmICghaXNTZXJ2ZXIpIHtcbiAgICAgICAgICAgIG1vcmVCdWlsZE9wdGlvbnMgPSB7XG4gICAgICAgICAgICAgICAgd2F0Y2g6IHt9LFxuICAgICAgICAgICAgICAgIG1pbmlmeTogZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGxldCBjb25maWdGaWxlXG4gICAgLy8gaWYgZm91bmQgYSB2aXRlLmNvbmZpZy5qcyBmaWxlLCB1c2UgaXRcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBjb25maWcgPSBhd2FpdCBmcy5zdGF0KHJlc29sdmUoZGlybmFtZSwgJ3ZpdGUuY29uZmlnLmpzJykpXG4gICAgICAgIGlmIChjb25maWcuaXNGaWxlKCkpIHtcbiAgICAgICAgICAgIGNvbmZpZ0ZpbGUgPSByZXNvbHZlKGRpcm5hbWUsICd2aXRlLmNvbmZpZy5qcycpXG4gICAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gZG8gbm90aGluZ1xuICAgIH1cblxuICAgIGxldCBhbGlhc1RyYW5zZm9ybSA9IHt9XG5cbiAgICBpZiAoIWlzQnVpbGQpIHtcbiAgICAgICAgYWxpYXNUcmFuc2Zvcm1bJ3Z1ZSddID0gJ3Z1ZS9kaXN0L3Z1ZS5lc20tYnVuZGxlci5qcydcbiAgICB9XG5cbiAgICBpZiAoIWlzU2VydmVyKSB7XG4gICAgICAgIGNvbnN0IGFsaWFzUG9seWZpbGxzID0ge1xuICAgICAgICAgICAgdXRpbDogJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL3V0aWwnLFxuICAgICAgICAgICAgc3lzOiAndXRpbCcsXG4gICAgICAgICAgICBldmVudHM6ICdyb2xsdXAtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3BvbHlmaWxscy9ldmVudHMnLFxuICAgICAgICAgICAgc3RyZWFtOiAncm9sbHVwLXBsdWdpbi1ub2RlLXBvbHlmaWxscy9wb2x5ZmlsbHMvc3RyZWFtJyxcbiAgICAgICAgICAgIHBhdGg6ICdyb2xsdXAtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3BvbHlmaWxscy9wYXRoJyxcbiAgICAgICAgICAgIHF1ZXJ5c3RyaW5nOiAncm9sbHVwLXBsdWdpbi1ub2RlLXBvbHlmaWxscy9wb2x5ZmlsbHMvcXMnLFxuICAgICAgICAgICAgcHVueWNvZGU6ICdyb2xsdXAtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3BvbHlmaWxscy9wdW55Y29kZScsXG4gICAgICAgICAgICB1cmw6ICdyb2xsdXAtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3BvbHlmaWxscy91cmwnLFxuICAgICAgICAgICAgc3RyaW5nX2RlY29kZXI6XG4gICAgICAgICAgICAgICAgJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL3N0cmluZy1kZWNvZGVyJyxcbiAgICAgICAgICAgIGh0dHA6ICdyb2xsdXAtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3BvbHlmaWxscy9odHRwJyxcbiAgICAgICAgICAgIGh0dHBzOiAncm9sbHVwLXBsdWdpbi1ub2RlLXBvbHlmaWxscy9wb2x5ZmlsbHMvaHR0cCcsXG4gICAgICAgICAgICBvczogJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL29zJyxcbiAgICAgICAgICAgIGFzc2VydDogJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL2Fzc2VydCcsXG4gICAgICAgICAgICBjb25zdGFudHM6ICdyb2xsdXAtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3BvbHlmaWxscy9jb25zdGFudHMnLFxuICAgICAgICAgICAgX3N0cmVhbV9kdXBsZXg6XG4gICAgICAgICAgICAgICAgJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL3JlYWRhYmxlLXN0cmVhbS9kdXBsZXgnLFxuICAgICAgICAgICAgX3N0cmVhbV9wYXNzdGhyb3VnaDpcbiAgICAgICAgICAgICAgICAncm9sbHVwLXBsdWdpbi1ub2RlLXBvbHlmaWxscy9wb2x5ZmlsbHMvcmVhZGFibGUtc3RyZWFtL3Bhc3N0aHJvdWdoJyxcbiAgICAgICAgICAgIF9zdHJlYW1fcmVhZGFibGU6XG4gICAgICAgICAgICAgICAgJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL3JlYWRhYmxlLXN0cmVhbS9yZWFkYWJsZScsXG4gICAgICAgICAgICBfc3RyZWFtX3dyaXRhYmxlOlxuICAgICAgICAgICAgICAgICdyb2xsdXAtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3BvbHlmaWxscy9yZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUnLFxuICAgICAgICAgICAgX3N0cmVhbV90cmFuc2Zvcm06XG4gICAgICAgICAgICAgICAgJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL3JlYWRhYmxlLXN0cmVhbS90cmFuc2Zvcm0nLFxuICAgICAgICAgICAgdGltZXJzOiAncm9sbHVwLXBsdWdpbi1ub2RlLXBvbHlmaWxscy9wb2x5ZmlsbHMvdGltZXJzJyxcbiAgICAgICAgICAgIGNvbnNvbGU6ICdyb2xsdXAtcGx1Z2luLW5vZGUtcG9seWZpbGxzL3BvbHlmaWxscy9jb25zb2xlJyxcbiAgICAgICAgICAgIHZtOiAncm9sbHVwLXBsdWdpbi1ub2RlLXBvbHlmaWxscy9wb2x5ZmlsbHMvdm0nLFxuICAgICAgICAgICAgemxpYjogJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL3psaWInLFxuICAgICAgICAgICAgdHR5OiAncm9sbHVwLXBsdWdpbi1ub2RlLXBvbHlmaWxscy9wb2x5ZmlsbHMvdHR5JyxcbiAgICAgICAgICAgIGRvbWFpbjogJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL2RvbWFpbicsXG4gICAgICAgICAgICBwcm9jZXNzOiAncm9sbHVwLXBsdWdpbi1ub2RlLXBvbHlmaWxscy9wb2x5ZmlsbHMvcHJvY2Vzcy1lczYnLFxuICAgICAgICAgICAgLi4uKFxuICAgICAgICAgICAgICAgIG9wdGlvbnMubW9kZSAhPSAndGVzdCcgPyB7XG4gICAgICAgICAgICAgICAgICAgIGJ1ZmZlcjogJ3JvbGx1cC1wbHVnaW4tbm9kZS1wb2x5ZmlsbHMvcG9seWZpbGxzL2J1ZmZlci1lczYnXG4gICAgICAgICAgICAgICAgfSA6IHt9XG4gICAgICAgICAgICApXG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhhbGlhc1BvbHlmaWxscykpIHtcbiAgICAgICAgICAgIGFsaWFzVHJhbnNmb3JtW2tleV0gPSByZXF1aXJlLnJlc29sdmUodmFsdWUpXG4gICAgICAgIH1cblxuICAgICAgICBvcHRpb25zLm92ZXJyaWRlT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIC4uLm9wdGlvbnMub3ZlcnJpZGVPcHRpb25zLFxuICAgICAgICAgICAgZGVmaW5lOiB7XG4gICAgICAgICAgICAgICAgJ3Byb2Nlc3MuZW52Jzoge30sXG4gICAgICAgICAgICAgICAgLy9nbG9iYWw6IHt9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHB1YmxpY0RpcjogcmVzb2x2ZShkaXJuYW1lLCAncHVibGljJyksXG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIG1vcmVCdWlsZE9wdGlvbnMgPSB7XG4gICAgICAgICAgICBtaW5pZnk6IGZhbHNlLFxuICAgICAgICAgICAgc3NyOiB7XG4gICAgICAgICAgICAgIC8vICBmb3JtYXQ6ICdjanMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLi4ubW9yZUJ1aWxkT3B0aW9ucyxcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW9wdGlvbnMuc2VydmVNb2RlKSB7XG4gICAgICAgICAgICBvdXRwdXRPcHRpb25zID0ge1xuICAgICAgICAgICAgICAgLy8gZm9ybWF0OiAnY2pzJyxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE8sIG1pbmlmeSBpcyBycGcgbW9kZSBidXQgY3VycmVudGx5IG5vdCB3b3JraW5nXG4gICAgaWYgKGlzQnVpbGQpIHtcbiAgICAgICAgbW9yZUJ1aWxkT3B0aW9ucyA9IHtcbiAgICAgICAgICAgIG1pbmlmeTogZmFsc2UsXG4gICAgICAgICAgICAuLi5tb3JlQnVpbGRPcHRpb25zLFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgb3V0cHV0UGF0aCA9IGlzUnBnID9cbiAgICAgICAgcmVzb2x2ZShkaXJuYW1lLCAnZGlzdCcsIGRpck91dHB1dE5hbWUpIDpcbiAgICAgICAgcmVzb2x2ZShkaXJuYW1lLCAnZGlzdCcsIGlzU2VydmVyID8gJ3NlcnZlcicgOiBkaXJPdXRwdXROYW1lKVxuICAgIGNvbnN0IHZpdGVDb25maWcgPSB7XG4gICAgICAgIG1vZGU6IG9wdGlvbnMubW9kZSB8fCAnZGV2ZWxvcG1lbnQnLFxuICAgICAgICByb290OiAnLicsXG4gICAgICAgIGNvbmZpZ0ZpbGUsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIGFsaWFzOiB7XG4gICAgICAgICAgICAgICAgJ0AnOiBqb2luKHByb2Nlc3MuY3dkKCksICdzcmMnKSxcbiAgICAgICAgICAgICAgICAuLi5hbGlhc1RyYW5zZm9ybVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGV4dGVuc2lvbnM6IFsnLnRzJywgJy5qcycsICcuanN4JywgJy5qc29uJywgJy52dWUnLCAnLmNzcycsICcuc2NzcycsICcuc2FzcycsICcuaHRtbCcsICd0bXgnLCAndHN4JywgJy50b21sJ10sXG4gICAgICAgIH0sXG4gICAgICAgIGFzc2V0c0luY2x1ZGU6IFsnKiovKi50bXgnLCAnKiovKi50c3gnXSxcbiAgICAgICAgc2VydmVyOiBvcHRpb25zLnNlcnZlcixcbiAgICAgICAgbG9nTGV2ZWw6IG9wdGlvbnMuc2VydmVyPy5sb2dsZXZlbCxcbiAgICAgICAgZGVidWc6IG9wdGlvbnMuc2VydmVyPy5kZWJ1ZyxcbiAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIG1hbmlmZXN0OiB0cnVlLFxuICAgICAgICAgICAgb3V0RGlyOiBvdXRwdXRQYXRoLFxuICAgICAgICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwMCxcbiAgICAgICAgICAgIGFzc2V0c0lubGluZUxpbWl0OiAwLFxuICAgICAgICAgICAgZW1wdHlPdXREaXI6IGZhbHNlLFxuICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgICAgIG91dHB1dDoge1xuICAgICAgICAgICAgICAgICAgICBkaXI6IG91dHB1dFBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgZXh0VHlwZSA9IGFzc2V0SW5mby5uYW1lLnNwbGl0KCcuJykuYXQoMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoL3RteHx0c3gvaS50ZXN0KGV4dFR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvW25hbWVdW2V4dG5hbWVdYDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV1gO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAuLi5vdXRwdXRPcHRpb25zXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgICAgICAgICBtYWluOiBwbHVnaW4gPyBwbHVnaW4uZW50cnkgOlxuICAgICAgICAgICAgICAgICAgICAgICAgIWlzU2VydmVyID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGRpcm5hbWUsICdpbmRleC5odG1sJykgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudHJ5UG9pbnRTZXJ2ZXIoKVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGx1Z2luczogW1xuICAgICAgICAgICAgICAgICAgICAhaXNTZXJ2ZXIgPyBub2RlUG9seWZpbGxzKCkgYXMgYW55IDogbnVsbFxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAuLi5tb3JlQnVpbGRPcHRpb25zXG4gICAgICAgIH0sXG4gICAgICAgIHBsdWdpbnMsXG4gICAgICAgIC4uLihvcHRpb25zLm92ZXJyaWRlT3B0aW9ucyB8fCB7fSksXG4gICAgfVxuXG4gICAgY29uc3QgcGFja2FnZUpTT04gPSBKU09OLnBhcnNlKGF3YWl0IGZzLnJlYWRGaWxlKHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpKTtcbiAgICBjb25zdCBkZXBlbmRlbmNpZXMgPSBPYmplY3Qua2V5cyhwYWNrYWdlSlNPTi5kZXBlbmRlbmNpZXMgfHwge30pO1xuICAgIGNvbnN0IGV4Y2x1ZGVEZXBlbmRlbmNpZXM6IHN0cmluZ1tdID0gW11cbiAgICBjb25zdCBleGNlcHQgPSBbJ0BycGdqcy9zZXJ2ZXInLCAnQHJwZ2pzL2NsaWVudCcsICdAcnBnanMvY29tbW9uJywgJ0BycGdqcy9kYXRhYmFzZScsICdAcnBnanMvdGlsZWQnLCAnQHJwZ2pzL3R5cGVzJywgJ0BycGdqcy9zdGFuZGFsb25lJ11cbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBkZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgaWYgKGV4Y2VwdC5pbmNsdWRlcyhkZXApKSBjb250aW51ZVxuICAgICAgICBpZiAoZGVwLnN0YXJ0c1dpdGgoJ0BycGdqcycgfHwgZGVwLnN0YXJ0c1dpdGgoJ3JwZ2pzLScpKSkge1xuICAgICAgICAgICAgZXhjbHVkZURlcGVuZGVuY2llcy5wdXNoKGRlcClcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICB2aXRlQ29uZmlnLm9wdGltaXplRGVwcyA9IHtcbiAgICAgICAgLi4udml0ZUNvbmZpZy5vcHRpbWl6ZURlcHMsXG4gICAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgICAgIC4uLihvcHRpb25zLm9wdGltaXplRGVwc0V4Y2x1ZGUgfHwgW10pLFxuICAgICAgICAgICAgLi4uZXhjbHVkZURlcGVuZGVuY2llc1xuICAgICAgICBdXG4gICAgfVxuXG4gICAgcmV0dXJuIHZpdGVDb25maWdcbn0iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLXJlcXVpcmUudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLXJlcXVpcmUudHNcIjsvLyBmb3JrIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS93YW5nem9uZ21pbmcvdml0ZS1wbHVnaW4tcmVxdWlyZVxuXG5pbXBvcnQgKiBhcyBwYXJzZXIgZnJvbSBcIkBiYWJlbC9wYXJzZXJcIjtcbmltcG9ydCBfdHJhdmVyc2UgZnJvbSBcIkBiYWJlbC90cmF2ZXJzZVwiO1xuaW1wb3J0IF9nZW5lcmF0ZSBmcm9tIFwiQGJhYmVsL2dlbmVyYXRvclwiO1xuaW1wb3J0IHsgUGx1Z2luIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCB7IGltcG9ydERlY2xhcmF0aW9uLCBpbXBvcnREZWZhdWx0U3BlY2lmaWVyLCBzdHJpbmdMaXRlcmFsLCBpZGVudGlmaWVyLCBuZXdFeHByZXNzaW9uLCBleHByZXNzaW9uU3RhdGVtZW50LCBtZW1iZXJFeHByZXNzaW9uLCBCaW5hcnlFeHByZXNzaW9uLCBFeHByZXNzaW9uU3RhdGVtZW50IH0gZnJvbSBcIkBiYWJlbC90eXBlc1wiO1xuXG5jb25zdCB0cmF2ZXJzZSA9IF90cmF2ZXJzZS5kZWZhdWx0O1xuY29uc3QgZ2VuZXJhdGUgPSBfZ2VuZXJhdGUuZGVmYXVsdDtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdml0ZVBsdWdpblJlcXVpcmUob3B0cz86IHtcblx0ZmlsZVJlZ2V4PzogUmVnRXhwO1xuXHRsb2c/OiAoLi4uYXJnOiBhbnlbXSkgPT4gdm9pZDtcblx0dHJhbnNsYXRlVHlwZT86IFwiaW1wb3J0TWV0YVVybFwiIHwgXCJpbXBvcnRcIjtcbn0pOiBQbHVnaW4ge1xuXHRjb25zdCB7IGZpbGVSZWdleCA9IC8oLmpzeD98LnRzeD8pKFxcP3Y9WzAtOWEtZl0rKT8kLywgbG9nLCB0cmFuc2xhdGVUeXBlID0gXCJpbXBvcnRcIiB9ID0gb3B0cyB8fCB7fTtcblx0cmV0dXJuIHtcblx0XHRuYW1lOiBcInZpdGUtcGx1Z2luLXJlcXVpcmVcIixcblx0XHRhc3luYyB0cmFuc2Zvcm0oY29kZTogc3RyaW5nLCBpZDogc3RyaW5nKSB7XG5cdFx0XHRsZXQgbmV3Q29kZSA9IGNvZGU7XG5cdFx0XHQvLyBpZiBtb2R1bGUgbmFtZSBiZWdpbnMgYnkgcnBnanMtIG9yIEBycGdqcywgc28gdHJhdmVyc2UgaXQuIEVsc2UsIGlnbm9yZSBub2RlX21vZHVsZXNcblx0XHRcdGNvbnN0IHJlZ2V4ID0gL14oPyEuKm5vZGVfbW9kdWxlcyg/OlxcL3xcXFxcKSg/IXJwZ2pzLXxAcnBnanMpKS4qJC87XG5cdFx0XHRpZiAoZmlsZVJlZ2V4LnRlc3QoaWQpICYmIHJlZ2V4LnRlc3QoaWQpKSB7XG5cdFx0XHRcdGNvbnN0IGFzdCA9IHBhcnNlci5wYXJzZShjb2RlLCB7XG5cdFx0XHRcdFx0c291cmNlVHlwZTogXCJtb2R1bGVcIixcblx0XHRcdFx0XHRwbHVnaW5zOiBbXSBhcyBhbnksXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHRyYXZlcnNlKGFzdCwge1xuXHRcdFx0XHRcdGVudGVyKHBhdGgpIHtcblx0XHRcdFx0XHRcdGlmIChwYXRoLmlzSWRlbnRpZmllcih7IG5hbWU6IFwicmVxdWlyZVwiIH0pKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IGFyZyA9IChwYXRoLmNvbnRhaW5lciBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+KT8uYXJndW1lbnRzPy5bMF07XG5cdFx0XHRcdFx0XHRcdGlmIChhcmcpIHtcblx0XHRcdFx0XHRcdFx0XHRsZXQgc3RyaW5nVmFsOiBzdHJpbmcgPSBcIlwiO1xuXHRcdFx0XHRcdFx0XHRcdHN3aXRjaCAoYXJnPy50eXBlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjYXNlIFwiU3RyaW5nTGl0ZXJhbFwiOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJpbmdWYWwgPSBhcmcudmFsdWU7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSBcIklkZW50aWZpZXJcIjpcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgSWRlbnRpZmllck5hbWUgPSBhcmcubmFtZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHJhdmVyc2UoYXN0LCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0SWRlbnRpZmllcjogKHBhdGgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChwYXRoLm5vZGUubmFtZSA9PT0gSWRlbnRpZmllck5hbWUpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHBhdGguY29udGFpbmVyKSAmJiAocGF0aC5jb250YWluZXIgYXMgYW55KS5pbml0Py50eXBlID09PSBcIlN0cmluZ0xpdGVyYWxcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN0cmluZ1ZhbCA9IChwYXRoLmNvbnRhaW5lciBhcyBhbnkpLmluaXQudmFsdWU7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRjYXNlIFwiQmluYXJ5RXhwcmVzc2lvblwiOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBiaW5hcnlFeHByZXNzaW9uTG9vcEZuID0gKGxPcjogQmluYXJ5RXhwcmVzc2lvbltcInJpZ2h0XCJdIHwgQmluYXJ5RXhwcmVzc2lvbltcImxlZnRcIl0pID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAobE9yLnR5cGUgPT09IFwiQmluYXJ5RXhwcmVzc2lvblwiKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRiaW5hcnlFeHByZXNzaW9uTG9vcEZuKGxPci5sZWZ0KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJpbmFyeUV4cHJlc3Npb25Mb29wRm4obE9yLnJpZ2h0KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKGxPci50eXBlID09PSBcIlN0cmluZ0xpdGVyYWxcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJpbmdWYWwgKz0gbE9yLnZhbHVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIGlmIChsT3IudHlwZSA9PT0gXCJJZGVudGlmaWVyXCIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgSWRlbnRpZmllck5hbWUgPSBsT3IubmFtZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHJhdmVyc2UoYXN0LCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0SWRlbnRpZmllcjogKHBhdGgpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChwYXRoLm5vZGUubmFtZSA9PT0gSWRlbnRpZmllck5hbWUpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKCFBcnJheS5pc0FycmF5KHBhdGguY29udGFpbmVyKSAmJiAocGF0aC5jb250YWluZXIgYXMgYW55KS5pbml0Py50eXBlID09PSBcIlN0cmluZ0xpdGVyYWxcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIGxvZygocGF0aC5jb250YWluZXIgYXMgYW55KS5pbml0LnZhbHVlKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzdHJpbmdWYWwgKz0gKHBhdGguY29udGFpbmVyIGFzIGFueSkuaW5pdC52YWx1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhyb3cgYFx1NEUwRFx1NjUyRlx1NjMwMVx1NzY4NDogQmluYXJ5RXhwcmVzc2lvbiBcdTdFQzRcdTYyMTBcdTdDN0JcdTU3OEIgJHtsT3IudHlwZX1gO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YmluYXJ5RXhwcmVzc2lvbkxvb3BGbihhcmcubGVmdCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJpbmFyeUV4cHJlc3Npb25Mb29wRm4oYXJnLnJpZ2h0KTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRjYXNlIFwiTWVtYmVyRXhwcmVzc2lvblwiOlxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyByZXF1cmUobmV3IFVybCgpKVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRocm93IGBVbnN1cHBvcnRlZCB0eXBlOiAke2FyZz8udHlwZX1gO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRwYXRoLm5vZGUubmFtZSA9IFwiXCI7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKHN0cmluZ1ZhbCkge1xuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gSW5zZXJ0IGltcG9ydCBhdCB0aGUgdG9wIHRvIHBhY2sgcmVzb3VyY2VzIHdoZW4gdml0ZSBwYWNrc1xuXHRcdFx0XHRcdFx0XHRcdFx0bGV0IHJlYWxQYXRoOiBzdHJpbmcgfCBFeHByZXNzaW9uU3RhdGVtZW50ID0gYHZpdGVQbHVnaW5SZXF1aXJlXyR7bmV3IERhdGUoKS5nZXRUaW1lKCl9XyR7cGFyc2VJbnQoTWF0aC5yYW5kb20oKSAqIDEwMDAwMDAwMCArIDEwMCArIFwiXCIpfWA7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAodHJhbnNsYXRlVHlwZSA9PT0gXCJpbXBvcnRcIikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBpbXBvcnRBc3QgPSBpbXBvcnREZWNsYXJhdGlvbihbaW1wb3J0RGVmYXVsdFNwZWNpZmllcihpZGVudGlmaWVyKHJlYWxQYXRoKSldLCBzdHJpbmdMaXRlcmFsKHN0cmluZ1ZhbCBhcyBzdHJpbmcpKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YXN0LnByb2dyYW0uYm9keS51bnNoaWZ0KGltcG9ydEFzdCBhcyBhbnkpO1xuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN3aXRjaCAoYXJnPy50eXBlKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSBcIlN0cmluZ0xpdGVyYWxcIjpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdChwYXRoLmNvbnRhaW5lciBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+KS5hcmd1bWVudHNbMF0udmFsdWUgPSByZWFsUGF0aDtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmICgocGF0aC5jb250YWluZXIgYXMgUmVjb3JkPHN0cmluZywgYW55PikuYXJndW1lbnRzWzBdLmV4dHJhKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdChwYXRoLmNvbnRhaW5lciBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+KS5hcmd1bWVudHNbMF0uZXh0cmEucmF3ID0gcmVhbFBhdGg7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdChwYXRoLmNvbnRhaW5lciBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+KS5hcmd1bWVudHNbMF0uZXh0cmEucmF3VmFsdWUgPSByZWFsUGF0aDtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJJZGVudGlmaWVyXCI6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQocGF0aC5jb250YWluZXIgYXMgUmVjb3JkPHN0cmluZywgYW55PikuYXJndW1lbnRzWzBdLm5hbWUgPSByZWFsUGF0aDtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJCaW5hcnlFeHByZXNzaW9uXCI6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQocGF0aC5jb250YWluZXIgYXMgUmVjb3JkPHN0cmluZywgYW55PikuYXJndW1lbnRzWzBdID0gaWRlbnRpZmllcihyZWFsUGF0aCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0dGhyb3cgYFVuc3VwcG9ydGVkIHR5cGU6ICR7YXJnPy50eXBlfWA7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAodHJhbnNsYXRlVHlwZSA9PT0gXCJpbXBvcnRNZXRhVXJsXCIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgbWV0YU9iaiA9IG1lbWJlckV4cHJlc3Npb24obWVtYmVyRXhwcmVzc2lvbihpZGVudGlmaWVyKFwiaW1wb3J0XCIpLCBpZGVudGlmaWVyKFwibWV0YVwiKSksIGlkZW50aWZpZXIoXCJ1cmxcIikpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBpbXBvcnRBc3QgPSBuZXdFeHByZXNzaW9uKGlkZW50aWZpZXIoXCJVUkxcIiksIFtzdHJpbmdMaXRlcmFsKHN0cmluZ1ZhbCksIG1ldGFPYmpdKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgaHJlZk9iaiA9IGV4cHJlc3Npb25TdGF0ZW1lbnQobWVtYmVyRXhwcmVzc2lvbihpbXBvcnRBc3QsIGlkZW50aWZpZXIoXCJocmVmXCIpKSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHN0ckNvZGUgPSBnZW5lcmF0ZShocmVmT2JqIGFzIGFueSwge30pLmNvZGUucmVwbGFjZSgvXFw7JC8sICcnKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3dpdGNoIChhcmc/LnR5cGUpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjYXNlIFwiU3RyaW5nTGl0ZXJhbFwiOiBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdChwYXRoLmNvbnRhaW5lciBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+KS5hcmd1bWVudHNbMF0udmFsdWUgPSBzdHJDb2RlO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKChwYXRoLmNvbnRhaW5lciBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+KS5hcmd1bWVudHNbMF0uZXh0cmEpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0KHBhdGguY29udGFpbmVyIGFzIFJlY29yZDxzdHJpbmcsIGFueT4pLmFyZ3VtZW50c1swXS5leHRyYS5yYXcgPSBzdHJDb2RlO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQocGF0aC5jb250YWluZXIgYXMgUmVjb3JkPHN0cmluZywgYW55PikuYXJndW1lbnRzWzBdLmV4dHJhLnJhd1ZhbHVlID0gc3RyQ29kZTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNhc2UgXCJJZGVudGlmaWVyXCI6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQocGF0aC5jb250YWluZXIgYXMgUmVjb3JkPHN0cmluZywgYW55PikuYXJndW1lbnRzWzBdLm5hbWUgPSBzdHJDb2RlO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2FzZSBcIkJpbmFyeUV4cHJlc3Npb25cIjpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdChwYXRoLmNvbnRhaW5lciBhcyBSZWNvcmQ8c3RyaW5nLCBhbnk+KS5hcmd1bWVudHNbMF0gPSBpZGVudGlmaWVyKHN0ckNvZGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHRocm93IGBVbnN1cHBvcnRlZCB0eXBlOiAke2FyZz8udHlwZX1gO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRjb25zdCBvdXRwdXQgPSBnZW5lcmF0ZShhc3QsIHt9KTtcblx0XHRcdFx0bmV3Q29kZSA9IG91dHB1dC5jb2RlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y29kZTogbmV3Q29kZSxcblx0XHRcdFx0bWFwOiBudWxsLFxuXHRcdFx0fTtcblx0XHR9LFxuXHR9O1xufSIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tZmxhZy10cmFuc2Zvcm0udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLWZsYWctdHJhbnNmb3JtLnRzXCI7LyoqXG4gKiBUcmFuc2Zvcm1zIHNvdXJjZSBjb2RlIGJhc2VkIG9uIHNwZWNpZmllZCBmbGFncyBhbmQgb3B0aW9uc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9ucz17fV0gLSBPcHRpb25zIGZvciBmbGFnIHRyYW5zZm9ybWF0aW9uXG4gKiBAcGFyYW0geydjbGllbnQnIHwgJ3NlcnZlcid9IFtvcHRpb25zLnNpZGU9Y2xpZW50XSAtIFNwZWNpZmllcyB3aGV0aGVyIHRvIHRyYW5zZm9ybSBmb3IgY2xpZW50IG9yIHNlcnZlci1zaWRlXG4gKiBAcGFyYW0geydkZXZlbG9wbWVudCcgfCAncHJvZHVjdGlvbicgfCAndGVzdCd9IFtvcHRpb25zLm1vZGU9ZGV2ZWxvcG1lbnRdIC0gU3BlY2lmaWVzIHRoZSBlbnZpcm9ubWVudCBtb2RlIHRvIHRyYW5zZm9ybSBmb3JcbiAqIEBwYXJhbSB7J21tb3JwZycgfCAncnBnJ30gW29wdGlvbnMudHlwZT1tbW9ycGddIC0gU3BlY2lmaWVzIHRoZSB0eXBlIG9mIGdhbWUgdG8gdHJhbnNmb3JtIGZvclxuICpcbiAqIEByZXR1cm5zIHtPYmplY3R9IC0gT2JqZWN0IGNvbnRhaW5pbmcgdHdvIG1ldGhvZHMgZm9yIHJlc29sdmluZyBhbmQgdHJhbnNmb3JtaW5nIHNvdXJjZSBjb2RlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmbGFnVHJhbnNmb3JtKG9wdGlvbnM6IGFueSA9IHt9KSB7XG4gIGNvbnN0IHsgc2lkZSA9ICdjbGllbnQnLCBtb2RlID0gJ2RldmVsb3BtZW50JywgdHlwZSA9ICdtbW9ycGcnIH0gPSBvcHRpb25zO1xuXG4gIC8qKlxuICAgKiBSZXNvbHZlcyBpbXBvcnQgc3RhdGVtZW50cyBiYXNlZCBvbiBzcGVjaWZpZWQgZmxhZ3MgYW5kIG9wdGlvbnNcbiAgICpcbiAgICogQHBhcmFtIHtzdHJpbmd9IHNvdXJjZSAtIFRoZSBzb3VyY2UgY29kZSBvZiB0aGUgaW1wb3J0IHN0YXRlbWVudFxuICAgKiBAcGFyYW0ge3N0cmluZ30gaW1wb3J0ZXIgLSBUaGUgcGF0aCBvZiB0aGUgZmlsZSBpbXBvcnRpbmcgdGhlIG1vZHVsZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyAtIE9wdGlvbnMgZm9yIHJlc29sdmluZyB0aGUgaW1wb3J0IHN0YXRlbWVudFxuICAgKlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxPYmplY3Q+fSAtIE9iamVjdCBjb250YWluaW5nIHRoZSByZXNvbHZlZCBwYXRoIGFuZCBJRCB3aXRoIGZsYWcgaW5mb3JtYXRpb25cbiAgICovXG4gIGFzeW5jIGZ1bmN0aW9uIHJlc29sdmVJZChzb3VyY2UsIGltcG9ydGVyLCBvcHRpb25zKSB7XG4gICAgY29uc3QgZmxhZ3MgPSBbYGNsaWVudCFgLCBgc2VydmVyIWAsIGBycGchYCwgYG1tb3JwZyFgLCBgcHJvZHVjdGlvbiFgLCBgZGV2ZWxvcG1lbnQhYF07XG4gICAgZm9yIChjb25zdCBmbGFnIG9mIGZsYWdzKSB7XG4gICAgICBpZiAoc291cmNlLnN0YXJ0c1dpdGgoZmxhZykpIHtcbiAgICAgICAgY29uc3QgcGF0aCA9IHNvdXJjZS5yZXBsYWNlKGZsYWcsICcnKTtcbiAgICAgICAgY29uc3QgcmVzb2x1dGlvbiA9IGF3YWl0IHRoaXMucmVzb2x2ZShwYXRoLCBpbXBvcnRlciwge1xuICAgICAgICAgIHNraXBTZWxmOiB0cnVlLFxuICAgICAgICAgIC4uLm9wdGlvbnMsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIC4uLnJlc29sdXRpb24sXG4gICAgICAgICAgaWQ6IHJlc29sdXRpb24uaWQgKyBgPyR7ZmxhZy5yZXBsYWNlKCchJywgJycpfWAsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRyYW5zZm9ybXMgc291cmNlIGNvZGUgYmFzZWQgb24gc3BlY2lmaWVkIGZsYWdzIGFuZCBvcHRpb25zXG4gICAqXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBzb3VyY2UgLSBUaGUgc291cmNlIGNvZGUgdG8gdHJhbnNmb3JtXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFRoZSBJRCBvZiB0aGUgc291cmNlIGNvZGVcbiAgICpcbiAgICogQHJldHVybnMge1Byb21pc2U8T2JqZWN0Pn0gLSBPYmplY3QgY29udGFpbmluZyB0aGUgdHJhbnNmb3JtZWQgY29kZSBhbmQgc291cmNlIG1hcFxuICAgKi9cbiAgYXN5bmMgZnVuY3Rpb24gdHJhbnNmb3JtKHNvdXJjZSwgaWQpIHtcbiAgICBsZXQgY29kZSA9IHNvdXJjZTtcblxuICAgIGlmIChtb2RlID09PSAndGVzdCcpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvZGUsXG4gICAgICAgIG1hcDogbnVsbFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoaWQuZW5kc1dpdGgoc2lkZSA9PT0gJ2NsaWVudCcgPyAnP3NlcnZlcicgOiAnP2NsaWVudCcpICYmIHR5cGUgIT09ICdycGcnKSB7XG4gICAgICBjb2RlID0gJ2V4cG9ydCBkZWZhdWx0IG51bGw7JztcbiAgICB9IGVsc2UgaWYgKChpZC5lbmRzV2l0aCgnP3Byb2R1Y3Rpb24nKSAmJiBtb2RlICE9PSAncHJvZHVjdGlvbicpIHx8XG4gICAgICAoaWQuZW5kc1dpdGgoJz9kZXZlbG9wbWVudCcpICYmIG1vZGUgIT09ICdkZXZlbG9wbWVudCcpIHx8XG4gICAgICAoaWQuZW5kc1dpdGgoJz9ycGcnKSAmJiB0eXBlICE9PSAncnBnJykgfHxcbiAgICAgIChpZC5lbmRzV2l0aCgnP21tb3JwZycpICYmIHR5cGUgIT09ICdtbW9ycGcnKSkge1xuICAgICAgY29kZSA9ICdleHBvcnQgZGVmYXVsdCBudWxsOyc7XG4gICAgfVxuICAgIFxuICAgIHJldHVybiB7XG4gICAgICBjb2RlLFxuICAgICAgbWFwOiBudWxsXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3RyYW5zZm9ybS1mbGFnJyxcbiAgICByZXNvbHZlSWQsXG4gICAgdHJhbnNmb3JtLFxuICB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi13b3JsZC10cmFuc2Zvcm0udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLXdvcmxkLXRyYW5zZm9ybS50c1wiO2ltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXG5pbXBvcnQgeyBnbG9iRmlsZXMsIHRvUG9zaXggfSBmcm9tICcuL3V0aWxzLmpzJ1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nXG5pbXBvcnQgeyBlcnJvckFwaSwgaW5mbyB9IGZyb20gJy4uL2xvZ3Mvd2FybmluZy5qcydcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgYXhpb3MgZnJvbSAnLi4vc2VydmUvYXBpLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmxkVHJhbnNmb3JtUGx1Z2luKHNlcnZlclVybD86IHN0cmluZykge1xuXG4gICAgZnVuY3Rpb24gZXh0ZW5kc1dvcmxkKHdvcmxkLCBmaWxlUGF0aDogc3RyaW5nKSB7XG4gICAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHRvUG9zaXgoZmlsZVBhdGgpLnJlcGxhY2UodG9Qb3NpeChwcm9jZXNzLmN3ZCgpKSArICcvJywgJycpXG4gICAgICAgIGNvbnN0IGRpcmVjdG9yeSA9IHBhdGguZGlybmFtZShyZWxhdGl2ZVBhdGgpXG4gICAgICAgIGNvbnN0IHdvcmxkSWQgPSBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1JykudXBkYXRlKHJlbGF0aXZlUGF0aCkuZGlnZXN0KCdoZXgnKVxuICAgICAgICB3b3JsZC5iYXNlUGF0aCA9IGRpcmVjdG9yeVxuICAgICAgICB3b3JsZC5pZCA9IHdvcmxkSWRcbiAgICAgICAgcmV0dXJuIHdvcmxkXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogJ3RyYW5zZm9ybS13b3JsZCcsXG4gICAgICAgIHRyYW5zZm9ybShzb3VyY2UsIGlkKSB7XG4gICAgICAgICAgICBpZiAoaWQuZW5kc1dpdGgoJy53b3JsZCcpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgd29ybGQgPSBleHRlbmRzV29ybGQoSlNPTi5wYXJzZShzb3VyY2UpLCBpZClcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiBgZXhwb3J0IGRlZmF1bHQgJHtKU09OLnN0cmluZ2lmeSh3b3JsZCl9YCxcbiAgICAgICAgICAgICAgICAgICAgbWFwOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICAgICAgICBzZXJ2ZXIud2F0Y2hlci5hZGQoZ2xvYkZpbGVzKCd3b3JsZCcpKTtcblxuICAgICAgICAgICAgc2VydmVyLndhdGNoZXIub24oJ2NoYW5nZScsIGFzeW5jIChmaWxlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZS5lbmRzV2l0aCgnd29ybGQnKSkge1xuICAgICAgICAgICAgICAgICAgICBpbmZvKGBGaWxlICR7ZmlsZX0gY2hhbmdlZCwgdXBkYXRpbmcgd29ybGQuLi5gKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgZnMucmVhZEZpbGUoZmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHdvcmxkID0gZXh0ZW5kc1dvcmxkKEpTT04ucGFyc2UoZGF0YSksIGZpbGUpXG4gICAgICAgICAgICAgICAgICAgIGF4aW9zLnB1dChzZXJ2ZXJVcmwgKyAnL2FwaS93b3JsZHMnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3b3JsZElkOiB3b3JsZC5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHdvcmxkXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGVycm9yQXBpKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH1cbiAgICB9XG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC91dGlscy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdXRpbHMudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIGdsb2IgZnJvbSAnZ2xvYidcblxuZXhwb3J0IGNvbnN0IE9VUFVUX0RJUl9DTElFTlRfQVNTRVRTID0gJ2Rpc3QvY2xpZW50L2Fzc2V0cydcblxuZXhwb3J0IGNvbnN0IGVudHJ5UG9pbnRTZXJ2ZXIgPSAoZW50cnlQb2ludFBhdGg/OiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgIC8vIGVudHJ5UG9pbnRQYXRoIG9yIHNyYy9zZXJ2ZXIudHMsIGlmIGV4aXN0cywgb3IgdmlydHVhbC1zZXJ2ZXIudHNcbiAgICBjb25zdCBlbnRyeVBvaW50ID0gZW50cnlQb2ludFBhdGggfHwgcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdzcmMvc2VydmVyLnRzJylcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhlbnRyeVBvaW50KSkge1xuICAgICAgICByZXR1cm4gcGF0aC5yZXNvbHZlKGVudHJ5UG9pbnQpXG4gICAgfVxuICAgIHJldHVybiAndmlydHVhbC1zZXJ2ZXIudHMnXG59XG5cbmV4cG9ydCBjb25zdCBnbG9iRmlsZXMgPSAoZXh0ZW5zaW9uOiBzdHJpbmcpOiBzdHJpbmdbXSA9PiB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgLi4uZ2xvYi5zeW5jKCcqKi8qLicgKyBleHRlbnNpb24sIHsgbm9kaXI6IHRydWUsIGlnbm9yZTogWydub2RlX21vZHVsZXMvKionLCAnZGlzdC8qKiddIH0pLFxuICAgICAgICAuLi5nbG9iLnN5bmMoJ25vZGVfbW9kdWxlcy9ycGdqcy0qLyouJyArIGV4dGVuc2lvbiwgeyBub2RpcjogdHJ1ZSB9KSxcbiAgICAgICAgLi4uZ2xvYi5zeW5jKCdub2RlX21vZHVsZXMvQHJwZ2pzLyoqLyouJyArIGV4dGVuc2lvbiwgeyBub2RpcjogdHJ1ZSB9KVxuICAgIF1cbn1cblxuZXhwb3J0IGNvbnN0IGFzc2V0c0ZvbGRlciA9IChvdXRwdXREaXI6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gICAgcmV0dXJuIHBhdGguam9pbignZGlzdCcsIG91dHB1dERpciwgJ2Fzc2V0cycpXG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVEaXN0Rm9sZGVyID0gYXN5bmMgIChvdXRwdXREaXI6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gICAgY29uc3QgYXNzZXREaXIgPSBhc3NldHNGb2xkZXIob3V0cHV0RGlyKVxuICAgIGZzLm1rZGlyU3luYyhhc3NldERpciwgeyByZWN1cnNpdmU6IHRydWUgfSlcbiAgICByZXR1cm4gYXNzZXREaXJcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRvUG9zaXgocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpXG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvbG9nc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2xvZ3Mvd2FybmluZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvbG9ncy93YXJuaW5nLnRzXCI7aW1wb3J0IGNvbG9ycyBmcm9tICdwaWNvY29sb3JzJ1xuXG5leHBvcnQgZnVuY3Rpb24gd2FybihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBjb25zb2xlLmxvZyhjb2xvcnMueWVsbG93KGBcdTI2QTBcdUZFMEYgIFdhcm5pbmcgLSAke21lc3NhZ2V9YCkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbmZvKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIGNvbnNvbGUubG9nKGNvbG9ycy5ibHVlKGBcdTIxMzlcdUZFMEYgIEluZm8gLSAke21lc3NhZ2V9YCkpXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJvcihtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBjb25zb2xlLmxvZyhjb2xvcnMucmVkKGBcdTI3NEMgIEVycm9yIC0gJHttZXNzYWdlfWApKVxufVxuXG5leHBvcnQgY29uc3QgZXJyb3JBcGkgPSAoZXJyKSA9PiB7XG4gICAgZXJyb3IoYCR7ZXJyLnJlc3BvbnNlLnN0YXR1c30gLSAke2Vyci5yZXNwb25zZS5kYXRhLmVycm9yfWApXG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvc2VydmVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9zZXJ2ZS9hcGkudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL3NlcnZlL2FwaS50c1wiO2ltcG9ydCBheGlvcyBmcm9tICdheGlvcyc7XG5cbmF4aW9zLmludGVyY2VwdG9ycy5yZXF1ZXN0LnVzZShmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgY29uZmlnLnVybCArPSAnP2Rldj0xJ1xuICAgIHJldHVybiBjb25maWc7XG59LCBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QoZXJyb3IpO1xufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGF4aW9zIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi1tYXAtZXh0cmFjdC50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tbWFwLWV4dHJhY3QudHNcIjtpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBwYXJzZVN0cmluZ1Byb21pc2UgfSBmcm9tICd4bWwyanMnO1xuaW1wb3J0IHsgZ2xvYkZpbGVzIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbi8vIFByb2Nlc3MgYSBUU1ggZmlsZSBhbmQgY29weSBpdHMgaW1hZ2UgdG8gdGhlIG91dHB1dCBkaXJlY3RvcnlcbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NUc3hGaWxlKHRzeEZpbGU6IHN0cmluZywgb3V0cHV0OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHRzeEZpbGUsICd1dGYtOCcpO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBhcnNlU3RyaW5nUHJvbWlzZShjb250ZW50KTtcbiAgICBjb25zdCBpbWFnZVBhdGggPSBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKHRzeEZpbGUpLCByZXN1bHQudGlsZXNldC5pbWFnZVswXS4kLnNvdXJjZSk7XG5cbiAgICBjb3B5SW1hZ2VUb091dHB1dChpbWFnZVBhdGgsIG91dHB1dCk7XG59XG5cbi8vIFByb2Nlc3MgYSBUTVggZmlsZSBhbmQgY29weSBhbGwgaXRzIGltYWdlcyB0byB0aGUgb3V0cHV0IGRpcmVjdG9yeVxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc1RteEZpbGUodG14RmlsZTogc3RyaW5nLCBvdXRwdXQ6IHN0cmluZykge1xuICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmModG14RmlsZSwgJ3V0Zi04Jyk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcGFyc2VTdHJpbmdQcm9taXNlKGNvbnRlbnQpO1xuXG4gICAgLy8gQ29weSBhbiBpbWFnZSBmcm9tIGEgZ2l2ZW4gc291cmNlIHBhdGggdG8gdGhlIG91dHB1dCBkaXJlY3RvcnlcbiAgICBjb25zdCBwcm9jZXNzSW1hZ2VTb3VyY2UgPSAoc291cmNlOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgaW1hZ2VQYXRoID0gcGF0aC5qb2luKHBhdGguZGlybmFtZSh0bXhGaWxlKSwgc291cmNlKTtcbiAgICAgICAgY29weUltYWdlVG9PdXRwdXQoaW1hZ2VQYXRoLCBvdXRwdXQpO1xuICAgIH07XG5cbiAgICAvLyBQcm9jZXNzIGltYWdlIGxheWVyc1xuICAgIGlmIChyZXN1bHQubWFwLmltYWdlbGF5ZXIpIHtcbiAgICAgICAgZm9yIChjb25zdCBpbWFnZWxheWVyIG9mIHJlc3VsdC5tYXAuaW1hZ2VsYXllcikge1xuICAgICAgICAgICAgcHJvY2Vzc0ltYWdlU291cmNlKGltYWdlbGF5ZXIuaW1hZ2VbMF0uJC5zb3VyY2UpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gUHJvY2VzcyBvYmplY3QgZ3JvdXBzIHdpdGggaW1hZ2UgcHJvcGVydGllc1xuICAgIGlmIChyZXN1bHQubWFwLm9iamVjdGdyb3VwKSB7XG4gICAgICAgIGZvciAoY29uc3Qgb2JqZWN0Z3JvdXAgb2YgcmVzdWx0Lm1hcC5vYmplY3Rncm91cCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdGdyb3VwLnByb3BlcnRpZXMgJiYgb2JqZWN0Z3JvdXAucHJvcGVydGllc1swXS5wcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgcHJvcGVydHkgb2Ygb2JqZWN0Z3JvdXAucHJvcGVydGllc1swXS5wcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydHkuJC5uYW1lID09PSAnaW1hZ2UnICYmIHByb3BlcnR5LiQudHlwZSA9PT0gJ2ZpbGUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzSW1hZ2VTb3VyY2UocHJvcGVydHkuJC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIENvcHkgYW4gaW1hZ2UgZmlsZSB0byB0aGUgb3V0cHV0IGRpcmVjdG9yeVxuZnVuY3Rpb24gY29weUltYWdlVG9PdXRwdXQoaW1hZ2VQYXRoOiBzdHJpbmcsIG91dHB1dDogc3RyaW5nKSB7XG4gICAgY29uc3QgaW1hZ2VOYW1lID0gcGF0aC5iYXNlbmFtZShpbWFnZVBhdGgpO1xuICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKCdkaXN0Jywgb3V0cHV0LCAnYXNzZXRzJywgaW1hZ2VOYW1lKTtcblxuICAgIGlmICghZnMuZXhpc3RzU3luYyhwYXRoLmRpcm5hbWUoZGVzdFBhdGgpKSkge1xuICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKGRlc3RQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgICAgZnMuY29weUZpbGVTeW5jKGltYWdlUGF0aCwgZGVzdFBhdGgpO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIFRPRE8gIC0gZGlzcGxheSBtb2R1bGVcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgY29weWluZyBpbWFnZSAke2ltYWdlUGF0aH0gdG8gJHtkZXN0UGF0aH06ICR7ZXJyfWApO1xuICAgICAgICB0aHJvdyBlcnJcbiAgICB9XG59XG5cbi8vIEV4cG9ydCB0aGUgbWFwIGV4dHJhY3QgcGx1Z2luXG5leHBvcnQgZnVuY3Rpb24gbWFwRXh0cmFjdFBsdWdpbihvdXRwdXQ6IHN0cmluZyA9ICdjbGllbnQnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogJ21hcC1leHRyYWN0JyxcbiAgICAgICAgYXN5bmMgYnVpbGRTdGFydCgpIHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgdHN4RmlsZSBvZiBnbG9iRmlsZXMoJ3RzeCcpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgcHJvY2Vzc1RzeEZpbGUodHN4RmlsZSwgb3V0cHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgdG14RmlsZSBvZiBnbG9iRmlsZXMoJ3RteCcpKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgcHJvY2Vzc1RteEZpbGUodG14RmlsZSwgb3V0cHV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi10c3gteG1sLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi10c3gteG1sLnRzXCI7aW1wb3J0IHsgUGx1Z2luIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBjb25zdCB0c3hYbWxQbHVnaW4gPSAoKTogUGx1Z2luID0+IHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAndHN4LXhtbC1sb2FkZXInLFxuICAgIGVuZm9yY2U6ICdwcmUnLFxuXG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgaWYgKHJlcS51cmwgJiYgKHJlcS51cmwuZW5kc1dpdGgoJy50c3gnKSkpIHtcbiAgICAgICAgICBjb25zdCBwdWJsaWNQYXRoID0gc2VydmVyLmNvbmZpZy5yb290O1xuICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKHB1YmxpY1BhdGgsIHJlcS51cmwpO1xuXG4gICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZVBhdGgpKSB7XG4gICAgICAgICAgICBjb25zdCB4bWxDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmLTgnKTtcbiAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi94bWwnKTtcbiAgICAgICAgICAgIHJlcy5lbmQoeG1sQ29udGVudCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH07XG59O1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi10bXgtdHN4LW1vdmVyLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi10bXgtdHN4LW1vdmVyLnRzXCI7aW1wb3J0IHsgUGx1Z2luIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgY3JlYXRlRGlzdEZvbGRlciwgZ2xvYkZpbGVzIH0gZnJvbSAnLi91dGlscy5qcyc7XG5cbmNvbnN0IG1vdmVUTVhUU1hGaWxlcyA9IGFzeW5jIChvdXRwdXREaXI6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gPT4ge1xuICBjb25zdCBhc3NldERpciA9IGF3YWl0IGNyZWF0ZURpc3RGb2xkZXIob3V0cHV0RGlyKTtcblxuICBjb25zdCBmaWxlcyA9IGdsb2JGaWxlcygnQCh0bXh8dHN4KScpXG5cbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gcGF0aC5qb2luKGFzc2V0RGlyLCBwYXRoLmJhc2VuYW1lKGZpbGUpKTtcbiAgICBhd2FpdCBmcy5jb3B5KGZpbGUsIHRhcmdldCwgeyBvdmVyd3JpdGU6IHRydWUgfSk7XG4gIH1cbn07XG5cbmV4cG9ydCBmdW5jdGlvbiB0bXhUc3hNb3ZlclBsdWdpbihvdXRwdXREaXI6IHN0cmluZyk6IFBsdWdpbiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3ZpdGUtcGx1Z2luLXRteC10c3gtbW92ZXInLFxuICAgIHdyaXRlQnVuZGxlOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBtb3ZlVE1YVFNYRmlsZXMob3V0cHV0RGlyKTtcbiAgICB9XG4gIH07XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLWNvZGUtaW5qZWN0b3IudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLWNvZGUtaW5qZWN0b3IudHNcIjtpbXBvcnQgeyBQbHVnaW4gfSBmcm9tICd2aXRlJztcblxuY29uc3Qgc2NyaXB0SW5qZWN0aW9uID0gYFxuICA8c2NyaXB0PlxuICAgIHZhciBnbG9iYWwgPSBnbG9iYWwgfHwgd2luZG93XG4gIDwvc2NyaXB0PlxuYFxuXG5leHBvcnQgZnVuY3Rpb24gY29kZUluamVjdG9yUGx1Z2luKCk6IFBsdWdpbiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2h0bWwtdHJhbnNmb3JtJyxcbiAgICB0cmFuc2Zvcm1JbmRleEh0bWw6IHtcbiAgICAgIGVuZm9yY2U6ICdwcmUnLFxuICAgICAgdHJhbnNmb3JtKGh0bWwpIHtcbiAgICAgICAgcmV0dXJuIGh0bWwucmVwbGFjZSgnPGhlYWQ+JywgYDxoZWFkPiR7c2NyaXB0SW5qZWN0aW9ufWApO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL3V0aWxzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvdXRpbHMvbG9nLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy91dGlscy9sb2cudHNcIjtpbXBvcnQgY29sb3JzIGZyb20gJ3BpY29jb2xvcnMnXG5cbmV4cG9ydCBlbnVtIEVycm9yQ29kZXMge1xuICAgIEluZGV4Tm90Rm91bmRcbn1cblxuY29uc3QgSEVMUFMgPSB7XG4gICAgW0Vycm9yQ29kZXMuSW5kZXhOb3RGb3VuZF06IGBUaGUgZXJyb3IgbWVzc2FnZSBcIkVOT0VOVDogbm8gc3VjaCBmaWxlIG9yIGRpcmVjdG9yeSwgc3RhdCAnaW5kZXguaHRtbCdcIiBpbmRpY2F0ZXMgdGhhdCB0aGUgcHJvZ3JhbSBvciBzY3JpcHQgaXMgYXR0ZW1wdGluZyB0byBhY2Nlc3MgYSBmaWxlIG5hbWVkIFwiaW5kZXguaHRtbFwiLCBidXQgdGhhdCBmaWxlIGRvZXMgbm90IGV4aXN0IGluIHRoZSBzcGVjaWZpZWQgZGlyZWN0b3J5IG9yIGxvY2F0aW9uLlxuXG4gICAgVGhlIGVycm9yIG1lc3NhZ2Ugc3BlY2lmaWNhbGx5IGluZGljYXRlcyB0aGF0IHRoZSBwcm9ncmFtIGlzIHVuYWJsZSB0byBsb2NhdGUgdGhlIGZpbGUgb3IgZGlyZWN0b3J5IHRoYXQgaXQgaXMgdHJ5aW5nIHRvIGFjY2Vzcy4gVGhpcyBjYW4gaGFwcGVuIGZvciBhIG51bWJlciBvZiByZWFzb25zLCBzdWNoIGFzIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSBiZWluZyBkZWxldGVkIG9yIG1vdmVkLCBhIHR5cG8gaW4gdGhlIGZpbGUgb3IgZGlyZWN0b3J5IG5hbWUsIG9yIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSBub3QgYmVpbmcgY3JlYXRlZCB5ZXQuXG4gICAgXG4gICAgVG8gcmVzb2x2ZSB0aGlzIGVycm9yLCB5b3Ugc2hvdWxkIGNoZWNrIHRoZSBwYXRoIGFuZCBuYW1lIG9mIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSB0aGF0IHRoZSBwcm9ncmFtIGlzIHRyeWluZyB0byBhY2Nlc3MsIGFuZCBtYWtlIHN1cmUgdGhhdCBpdCBleGlzdHMgaW4gdGhlIGNvcnJlY3QgbG9jYXRpb24uIElmIHRoZSBmaWxlIG9yIGRpcmVjdG9yeSBoYXMgYmVlbiBtb3ZlZCBvciByZW5hbWVkLCB5b3UgbWF5IG5lZWQgdG8gdXBkYXRlIHRoZSBwcm9ncmFtJ3MgY29kZSB0byBwb2ludCB0byB0aGUgY29ycmVjdCBsb2NhdGlvbi5gXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJvcihlcnJvcjogRXJyb3IsIGhlbHA/OiBFcnJvckNvZGVzKSB7XG4gICAgY29uc29sZS5sb2coY29sb3JzLnJlZChlcnJvci5tZXNzYWdlKSlcbiAgICBpZiAoaGVscCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGAgICR7Y29sb3JzLmRpbSgnXHUyNzlDJyl9ICAke2NvbG9ycy5kaW0oSEVMUFNbaGVscF0pfWApXG4gICAgfVxuICAgIHByb2Nlc3MuZXhpdCgpXG59IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi1jb25maWcudG9tbC50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tY29uZmlnLnRvbWwudHNcIjtpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBQbHVnaW4gfSBmcm9tICd2aXRlJztcbmltcG9ydCBzaXplT2YgZnJvbSAnaW1hZ2Utc2l6ZSc7XG5pbXBvcnQgeyBDbGllbnRCdWlsZENvbmZpZ09wdGlvbnMsIENvbmZpZyB9IGZyb20gJy4vY2xpZW50LWNvbmZpZyc7XG5pbXBvcnQgeyBsb2FkR2xvYmFsQ29uZmlnIH0gZnJvbSAnLi9sb2FkLWdsb2JhbC1jb25maWcuanMnO1xuaW1wb3J0IHsgd2FybiB9IGZyb20gJy4uL2xvZ3Mvd2FybmluZy5qcyc7XG5pbXBvcnQgeyBhc3NldHNGb2xkZXIsIHRvUG9zaXggfSBmcm9tICcuL3V0aWxzLmpzJztcblxuY29uc3QgTU9EVUxFX05BTUUgPSAndmlydHVhbC1tb2R1bGVzJ1xuY29uc3QgR0xPQkFMX0NPTkZJR19DTElFTlQgPSAndmlydHVhbC1jb25maWctY2xpZW50J1xuY29uc3QgR0xPQkFMX0NPTkZJR19TRVJWRVIgPSAndmlydHVhbC1jb25maWctc2VydmVyJ1xuXG50eXBlIEltcG9ydE9iamVjdCA9IHtcbiAgICBpbXBvcnRTdHJpbmc6IHN0cmluZyxcbiAgICB2YXJpYWJsZXNTdHJpbmc6IHN0cmluZyxcbiAgICBmb2xkZXI6IHN0cmluZ1xufVxuXG50eXBlIEltcG9ydEltYWdlT2JqZWN0ID0gSW1wb3J0T2JqZWN0ICYgeyBwcm9wSW1hZ2VzU3RyaW5nOiBzdHJpbmcgfVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0VmFyaWFibGVOYW1lKHBhY2thZ2VOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHBhY2thZ2VOYW1lID0gcGFja2FnZU5hbWUucmVwbGFjZSgvXFwuL2csICcnKVxuICAgIHJldHVybiBwYWNrYWdlTmFtZS5yZXBsYWNlKC9bLkBcXC8gLV0vZywgJ18nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zZm9ybVBhdGhJZk1vZHVsZShtb2R1bGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGlmIChtb2R1bGVOYW1lLnN0YXJ0c1dpdGgoJ0BycGdqcycpIHx8IG1vZHVsZU5hbWUuc3RhcnRzV2l0aCgncnBnanMnKSkge1xuICAgICAgICByZXR1cm4gJ25vZGVfbW9kdWxlcy8nICsgbW9kdWxlTmFtZVxuICAgIH1cbiAgICByZXR1cm4gbW9kdWxlTmFtZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsRmlsZXMoZGlyUGF0aDogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IGZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3QgZGlyZW50cyA9IGZzLnJlYWRkaXJTeW5jKGRpclBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KTtcblxuICAgIGZvciAoY29uc3QgZGlyZW50IG9mIGRpcmVudHMpIHtcbiAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyUGF0aCwgZGlyZW50Lm5hbWUpO1xuICAgICAgICBpZiAoZGlyZW50LmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgICAgIGNvbnN0IG5lc3RlZEZpbGVzID0gZ2V0QWxsRmlsZXMoZnVsbFBhdGgpO1xuICAgICAgICAgICAgZmlsZXMucHVzaCguLi5uZXN0ZWRGaWxlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWxlcy5wdXNoKGZ1bGxQYXRoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmaWxlcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNlYXJjaEZvbGRlckFuZFRyYW5zZm9ybVRvSW1wb3J0U3RyaW5nKFxuICAgIGZvbGRlclBhdGg6IHN0cmluZyxcbiAgICBtb2R1bGVQYXRoOiBzdHJpbmcsXG4gICAgZXh0ZW5zaW9uRmlsdGVyOiBzdHJpbmcgfCBzdHJpbmdbXSxcbiAgICByZXR1cm5DYj86IChmaWxlOiBzdHJpbmcsIHZhcmlhYmxlTmFtZTogc3RyaW5nKSA9PiBzdHJpbmcsXG4gICAgb3B0aW9ucz86IHtcbiAgICAgICAgY3VzdG9tRmlsdGVyPzogKGZpbGU6IHN0cmluZykgPT4gYm9vbGVhblxuICAgIH1cbik6IEltcG9ydE9iamVjdCB7XG4gICAgbGV0IGltcG9ydFN0cmluZyA9ICcnXG4gICAgY29uc3QgZm9sZGVyID0gcGF0aC5yZXNvbHZlKG1vZHVsZVBhdGgsIGZvbGRlclBhdGgpXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZm9sZGVyKSkge1xuICAgICAgICAvLyByZWFkIHJlY3Vyc2l2ZSBmb2xkZXIgYW5kIGdldCBhbGwgdGhlIGZpbGVzIChmbGF0IGFycmF5KVxuICAgICAgICBjb25zdCBmaWxlcyA9IGdldEFsbEZpbGVzKGZvbGRlcilcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZhcmlhYmxlc1N0cmluZzogZmlsZXNcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZpbGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGV4dGVuc2lvbkZpbHRlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWxlLmVuZHNXaXRoKGV4dGVuc2lvbkZpbHRlcilcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBleHRlbnNpb25GaWx0ZXIuc29tZShleHQgPT4gZmlsZS5lbmRzV2l0aChleHQpKVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZpbGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucz8uY3VzdG9tRmlsdGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9ucy5jdXN0b21GaWx0ZXIoZmlsZSlcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLm1hcChmaWxlID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gdG9Qb3NpeChmaWxlLnJlcGxhY2UocHJvY2Vzcy5jd2QoKSwgJy4nKSlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFyaWFibGVOYW1lID0gZm9ybWF0VmFyaWFibGVOYW1lKHJlbGF0aXZlUGF0aClcbiAgICAgICAgICAgICAgICAgICAgaW1wb3J0U3RyaW5nID0gaW1wb3J0U3RyaW5nICsgYFxcbmltcG9ydCAke3ZhcmlhYmxlTmFtZX0gZnJvbSAnJHtyZWxhdGl2ZVBhdGh9J2BcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHVybkNiID8gcmV0dXJuQ2IocmVsYXRpdmVQYXRoLCB2YXJpYWJsZU5hbWUpIDogdmFyaWFibGVOYW1lXG4gICAgICAgICAgICAgICAgfSkuam9pbignLCcpLFxuICAgICAgICAgICAgaW1wb3J0U3RyaW5nLFxuICAgICAgICAgICAgZm9sZGVyXG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgdmFyaWFibGVzU3RyaW5nOiAnJyxcbiAgICAgICAgaW1wb3J0U3RyaW5nOiAnJyxcbiAgICAgICAgZm9sZGVyOiAnJ1xuICAgIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGltcG9ydFN0cmluZyhtb2R1bGVQYXRoOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcsIHZhcmlhYmxlTmFtZT86IHN0cmluZykge1xuICAgIGNvbnN0IHBsYXllckZpbGUgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgdHJhbnNmb3JtUGF0aElmTW9kdWxlKG1vZHVsZVBhdGgpLCBmaWxlTmFtZSArICcudHMnKVxuICAgIGxldCBpbXBvcnRTdHJpbmcgPSAnJ1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBsYXllckZpbGUpKSB7XG4gICAgICAgIGltcG9ydFN0cmluZyA9IGBpbXBvcnQgJHt2YXJpYWJsZU5hbWUgfHwgZmlsZU5hbWV9IGZyb20gJyR7bW9kdWxlUGF0aH0vJHtmaWxlTmFtZX0udHMnYFxuICAgIH1cbiAgICByZXR1cm4gaW1wb3J0U3RyaW5nXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkU2VydmVyRmlsZXMobW9kdWxlUGF0aDogc3RyaW5nLCBvcHRpb25zLCBjb25maWcpIHtcbiAgICBsZXQgb25jZUNyZWF0ZVBsYXllckNvbW1hbmQgPSBmYWxzZVxuICAgIGNvbnN0IHsgbW9kdWxlc0NyZWF0ZWQgfSA9IG9wdGlvbnNcbiAgICBpZiAoIW1vZHVsZXNDcmVhdGVkLmluY2x1ZGVzKG1vZHVsZVBhdGgpKSBtb2R1bGVzQ3JlYXRlZC5wdXNoKG1vZHVsZVBhdGgpXG4gICAgY29uc3QgaW1wb3J0UGxheWVyID0gaW1wb3J0U3RyaW5nKG1vZHVsZVBhdGgsICdwbGF5ZXInKVxuICAgIGNvbnN0IGltcG9ydEVuZ2luZSA9IGltcG9ydFN0cmluZyhtb2R1bGVQYXRoLCAnc2VydmVyJylcblxuICAgIC8vIHJlYWQgbWFwcyBmb2xkZXIgYW5kIGdldCBhbGwgdGhlIG1hcCBmaWxlc1xuXG4gICAgY29uc3QgbWFwU3RhbmRhbG9uZUZpbGVzU3RyaW5nID0gc2VhcmNoRm9sZGVyQW5kVHJhbnNmb3JtVG9JbXBvcnRTdHJpbmcoJ21hcHMnLCBtb2R1bGVQYXRoLCAnLnRzJylcbiAgICBjb25zdCBtYXBGaWxlc1N0cmluZyA9IHNlYXJjaEZvbGRlckFuZFRyYW5zZm9ybVRvSW1wb3J0U3RyaW5nKCdtYXBzJywgbW9kdWxlUGF0aCwgJy50bXgnLCAoZmlsZSwgdmFyaWFibGVOYW1lKSA9PiB7XG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6ICcke2ZpbGUucmVwbGFjZSgnLnRteCcsICcnKX0nLFxuICAgICAgICAgICAgICAgIGZpbGU6ICR7dmFyaWFibGVOYW1lfVxuICAgICAgICAgICAgfVxuICAgICAgICBgXG4gICAgfSwge1xuICAgICAgICBjdXN0b21GaWx0ZXI6IChmaWxlKSA9PiB7XG4gICAgICAgICAgICAvLyBpZiAudHMgZXhpc3RzIHdpdGggc2FtZSBuYW1lLCBkbyBub3QgaW1wb3J0IHRoZSAudG14XG4gICAgICAgICAgICBjb25zdCB0c0ZpbGUgPSBmaWxlLnJlcGxhY2UoJy50bXgnLCAnLnRzJylcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRzRmlsZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICB9KVxuICAgIGNvbnN0IGhhc01hcHMgPSAhIW1hcEZpbGVzU3RyaW5nPy52YXJpYWJsZXNTdHJpbmdcblxuICAgIGNvbnN0IHdvcmxkRmlsZXNTdHJpbmcgPSBzZWFyY2hGb2xkZXJBbmRUcmFuc2Zvcm1Ub0ltcG9ydFN0cmluZygnd29ybGRzJywgbW9kdWxlUGF0aCwgJy53b3JsZCcpXG4gICAgY29uc3QgZGF0YWJhc2VGaWxlc1N0cmluZyA9IHNlYXJjaEZvbGRlckFuZFRyYW5zZm9ybVRvSW1wb3J0U3RyaW5nKCdkYXRhYmFzZScsIG1vZHVsZVBhdGgsICcudHMnKVxuICAgIGNvbnN0IGV2ZW50c0ZpbGVzU3RyaW5nID0gc2VhcmNoRm9sZGVyQW5kVHJhbnNmb3JtVG9JbXBvcnRTdHJpbmcoJ2V2ZW50cycsIG1vZHVsZVBhdGgsICcudHMnKVxuXG4gICAgY29uc3QgY29kZSA9IGBcbiAgICAgICAgaW1wb3J0IHsgUnBnU2VydmVyLCBScGdNb2R1bGUgfSBmcm9tICdAcnBnanMvc2VydmVyJ1xuICAgICAgICAke21hcEZpbGVzU3RyaW5nPy5pbXBvcnRTdHJpbmd9XG4gICAgICAgICR7bWFwU3RhbmRhbG9uZUZpbGVzU3RyaW5nPy5pbXBvcnRTdHJpbmd9XG4gICAgICAgICR7d29ybGRGaWxlc1N0cmluZz8uaW1wb3J0U3RyaW5nfVxuICAgICAgICAke2ltcG9ydFBsYXllciA/IGltcG9ydFBsYXllciA6ICdjb25zdCBwbGF5ZXIgPSB7fSd9XG4gICAgICAgICR7ZXZlbnRzRmlsZXNTdHJpbmc/LmltcG9ydFN0cmluZ31cbiAgICAgICAgJHtkYXRhYmFzZUZpbGVzU3RyaW5nPy5pbXBvcnRTdHJpbmd9XG4gICAgICAgICR7aW1wb3J0RW5naW5lfVxuXG4gICAgICAgICR7bW9kdWxlc0NyZWF0ZWQubGVuZ3RoID09IDEgPyBgY29uc3QgX2xhc3RDb25uZWN0ZWRDYiA9IHBsYXllci5vbkNvbm5lY3RlZFxuICAgICAgICAgICAgcGxheWVyLm9uQ29ubmVjdGVkID0gYXN5bmMgKHBsYXllcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChfbGFzdENvbm5lY3RlZENiKSBhd2FpdCBfbGFzdENvbm5lY3RlZENiKHBsYXllcilcbiAgICAgICAgICAgICAgICAke2NvbmZpZy5zdGFydD8uZ3JhcGhpYyA/IGBwbGF5ZXIuc2V0R3JhcGhpYygnJHtjb25maWcuc3RhcnQ/LmdyYXBoaWN9JylgIDogJyd9XG4gICAgICAgICAgICAgICAgJHtjb25maWcuc3RhcnQ/LmhpdGJveCA/IGBwbGF5ZXIuc2V0SGl0Ym94KCR7Y29uZmlnLnN0YXJ0Py5oaXRib3h9KWAgOiAnJ31cbiAgICAgICAgICAgICAgICAke2NvbmZpZy5zdGFydE1hcCA/IGBhd2FpdCBwbGF5ZXIuY2hhbmdlTWFwKCcke2NvbmZpZy5zdGFydE1hcH0nKWAgOiAnJ31cbiAgICAgICAgICAgIH1gIDogJydcbiAgICAgICAgfVxuICAgICAgICAgICBcbiAgICAgICAgQFJwZ01vZHVsZTxScGdTZXJ2ZXI+KHsgXG4gICAgICAgICAgICBwbGF5ZXIsXG4gICAgICAgICAgICBldmVudHM6IFske2V2ZW50c0ZpbGVzU3RyaW5nPy52YXJpYWJsZXNTdHJpbmd9XSxcbiAgICAgICAgICAgICR7aW1wb3J0RW5naW5lID8gYGVuZ2luZTogc2VydmVyLGAgOiAnJ31cbiAgICAgICAgICAgIGRhdGFiYXNlOiBbJHtkYXRhYmFzZUZpbGVzU3RyaW5nPy52YXJpYWJsZXNTdHJpbmd9XSxcbiAgICAgICAgICAgIG1hcHM6IFske21hcEZpbGVzU3RyaW5nPy52YXJpYWJsZXNTdHJpbmd9JHtoYXNNYXBzID8gJywnIDogJyd9JHttYXBTdGFuZGFsb25lRmlsZXNTdHJpbmc/LnZhcmlhYmxlc1N0cmluZ31dLFxuICAgICAgICAgICAgd29ybGRNYXBzOiBbJHt3b3JsZEZpbGVzU3RyaW5nPy52YXJpYWJsZXNTdHJpbmd9XSBcbiAgICAgICAgfSlcbiAgICAgICAgZXhwb3J0IGRlZmF1bHQgY2xhc3MgUnBnU2VydmVyTW9kdWxlRW5naW5lIHt9IFxuICAgIGBcbiAgICByZXR1cm4gY29kZVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbG9hZFNwcml0ZVNoZWV0KGRpcmVjdG9yeU5hbWU6IHN0cmluZywgbW9kdWxlUGF0aDogc3RyaW5nLCBvcHRpb25zLCB3YXJuaW5nID0gdHJ1ZSk6IEltcG9ydEltYWdlT2JqZWN0IHtcbiAgICBjb25zdCBpbXBvcnRTcHJpdGVzID0gc2VhcmNoRm9sZGVyQW5kVHJhbnNmb3JtVG9JbXBvcnRTdHJpbmcoZGlyZWN0b3J5TmFtZSwgbW9kdWxlUGF0aCwgJy50cycpXG4gICAgbGV0IHByb3BJbWFnZXNTdHJpbmcgPSAnJ1xuICAgIGlmIChpbXBvcnRTcHJpdGVzPy5pbXBvcnRTdHJpbmcpIHtcbiAgICAgICAgY29uc3QgZm9sZGVyID0gaW1wb3J0U3ByaXRlcy5mb2xkZXJcbiAgICAgICAgbGV0IG9iamVjdFN0cmluZyA9ICcnXG4gICAgICAgIC8vIGdldCBhbGwgaW1hZ2VzIGluIHRoZSBmb2xkZXJcbiAgICAgICAgbGV0IGxhc3RJbWFnZVBhdGggPSAnJ1xuICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IGZvbGRlci5yZXBsYWNlKHByb2Nlc3MuY3dkKCksICcvJylcbiAgICAgICAgLy9jb25zb2xlLmxvZyhtb2R1bGVQYXRoLCBmb2xkZXIpXG4gICAgICAgIGdldEFsbEZpbGVzKGZvbGRlcikuZmlsdGVyKGZpbGUgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXh0ID0gWycucG5nJywgJy5qcGcnLCAnLmpwZWcnLCAnLmdpZicsICcuYm1wJywgJy53ZWJwJywgJy5zdmcnXVxuICAgICAgICAgICAgcmV0dXJuIGV4dC5zb21lKGUgPT4gZmlsZS50b0xvd2VyQ2FzZSgpLmVuZHNXaXRoKGUpKVxuICAgICAgICB9KS5mb3JFYWNoKGFzeW5jIGZpbGUgPT4ge1xuICAgICAgICAgICAgLy8gZ2V0IGJhc2VuYW1lIHdpdGhvdXQgZXh0ZW5zaW9uXG4gICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSlcbiAgICAgICAgICAgIGNvbnN0IGJhc2VuYW1lID0gZmlsZW5hbWUucmVwbGFjZShwYXRoLmV4dG5hbWUoZmlsZSksICcnKVxuICAgICAgICAgICAgLy8gbW92ZSBpbWFnZSB0byBhc3NldHMgZm9sZGVyLCBpZiBidWlsZFxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuc2VydmVNb2RlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlc3QgPSBwYXRoLmpvaW4oYXNzZXRzRm9sZGVyKG9wdGlvbnMudHlwZSA9PT0gJ3JwZycgPyAnc3RhbmRhbG9uZScgOiAnY2xpZW50JyksIGZpbGVuYW1lKVxuICAgICAgICAgICAgICAgIGZzLmNvcHlGaWxlU3luYyhmaWxlLCBkZXN0KVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGFzdEltYWdlUGF0aCA9IGZpbGVcbiAgICAgICAgICAgIG9iamVjdFN0cmluZyArPSBgXCIke2Jhc2VuYW1lfVwiOiBcIiR7dG9Qb3NpeChwYXRoLmpvaW4ocHJvamVjdFBhdGgsIGZpbGVuYW1lKSkucmVwbGFjZSgvXlxcLysvLCAnJyl9XCIsXFxuYFxuICAgICAgICB9KVxuICAgICAgICBjb25zdCBkaW1lbnNpb25zID0gc2l6ZU9mKGxhc3RJbWFnZVBhdGgpXG4gICAgICAgIHByb3BJbWFnZXNTdHJpbmcgPSBgXG4gICAgICAgICAgICAke2ltcG9ydFNwcml0ZXM/LnZhcmlhYmxlc1N0cmluZ30uaW1hZ2VzID0ge1xuICAgICAgICAgICAgICAgICR7b2JqZWN0U3RyaW5nfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHtpbXBvcnRTcHJpdGVzPy52YXJpYWJsZXNTdHJpbmd9LnByb3RvdHlwZS53aWR0aCA9ICR7ZGltZW5zaW9ucy53aWR0aH1cbiAgICAgICAgICAgICR7aW1wb3J0U3ByaXRlcz8udmFyaWFibGVzU3RyaW5nfS5wcm90b3R5cGUuaGVpZ2h0ID0gJHtkaW1lbnNpb25zLmhlaWdodH1cbiAgICAgICAgYFxuICAgIH1cbiAgICBlbHNlIGlmICh3YXJuaW5nKSB7XG4gICAgICAgIHdhcm4oYE5vIHNwcml0ZXNoZWV0IGZvbGRlciBmb3VuZCBpbiAke2RpcmVjdG9yeU5hbWV9IGZvbGRlcmApXG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICAgIC4uLmltcG9ydFNwcml0ZXMsXG4gICAgICAgIHByb3BJbWFnZXNTdHJpbmdcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkQ2xpZW50RmlsZXMobW9kdWxlUGF0aDogc3RyaW5nLCBvcHRpb25zLCBjb25maWcpIHtcbiAgICBjb25zdCBpbXBvcnRTY2VuZU1hcFN0cmluZyA9IGltcG9ydFN0cmluZyhtb2R1bGVQYXRoLCAnc2NlbmUtbWFwJywgJ3NjZW5lTWFwJylcbiAgICBjb25zdCBpbXBvcnRTcHJpdGVTdHJpbmcgPSBpbXBvcnRTdHJpbmcobW9kdWxlUGF0aCwgJ3Nwcml0ZScpXG4gICAgY29uc3QgaW1wb3J0RW5naW5lID0gaW1wb3J0U3RyaW5nKG1vZHVsZVBhdGgsICdjbGllbnQnLCAnZW5naW5lJylcbiAgICBjb25zdCBndWlGaWxlc1N0cmluZyA9IHNlYXJjaEZvbGRlckFuZFRyYW5zZm9ybVRvSW1wb3J0U3RyaW5nKCdndWknLCBtb2R1bGVQYXRoLCAnLnZ1ZScpXG4gICAgY29uc3Qgc291bmRGaWxlc1N0cmluZyA9IHNlYXJjaEZvbGRlckFuZFRyYW5zZm9ybVRvSW1wb3J0U3RyaW5nKCdzb3VuZHMnLCBtb2R1bGVQYXRoLCBbJy5tcDMnLCAnLm9nZyddKVxuICAgIGxldCBpbXBvcnRTcHJpdGVzaGVldHM6IEltcG9ydEltYWdlT2JqZWN0W10gPSBbXVxuXG4gICAgaWYgKGNvbmZpZy5zcHJpdGVzaGVldERpcmVjdG9yaWVzKSB7XG4gICAgICAgIGltcG9ydFNwcml0ZXNoZWV0cyA9IGNvbmZpZy5zcHJpdGVzaGVldERpcmVjdG9yaWVzLm1hcChkaXJlY3RvcnkgPT4gbG9hZFNwcml0ZVNoZWV0KGRpcmVjdG9yeSwgbW9kdWxlUGF0aCwgb3B0aW9ucykpXG4gICAgfVxuXG4gICAgaWYgKCEoY29uZmlnLnNwcml0ZXNoZWV0RGlyZWN0b3JpZXMgPz8gW10pLnNvbWUoZGlyID0+IGRpciA9PT0gJ2NoYXJhY3RlcnMnKSkge1xuICAgICAgICBpbXBvcnRTcHJpdGVzaGVldHMucHVzaChsb2FkU3ByaXRlU2hlZXQoJ2NoYXJhY3RlcnMnLCBtb2R1bGVQYXRoLCBvcHRpb25zLCBmYWxzZSkpXG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGRpcmVjdG9yeSBub3QgZm91bmRcbiAgICBpbXBvcnRTcHJpdGVzaGVldHMgPSBpbXBvcnRTcHJpdGVzaGVldHMuZmlsdGVyKGltcG9ydFNwcml0ZXNoZWV0ID0+IGltcG9ydFNwcml0ZXNoZWV0LmltcG9ydFN0cmluZylcblxuICAgIHJldHVybiBgXG4gICAgICAgIGltcG9ydCB7IFJwZ0NsaWVudCwgUnBnTW9kdWxlIH0gZnJvbSAnQHJwZ2pzL2NsaWVudCdcbiAgICAgICAgJHtpbXBvcnRTcHJpdGVTdHJpbmd9XG4gICAgICAgICR7aW1wb3J0U2NlbmVNYXBTdHJpbmd9XG4gICAgICAgICR7aW1wb3J0RW5naW5lfVxuICAgICAgICAke2ltcG9ydFNwcml0ZXNoZWV0cy5tYXAoaW1wb3J0U3ByaXRlc2hlZXQgPT4gaW1wb3J0U3ByaXRlc2hlZXQuaW1wb3J0U3RyaW5nKS5qb2luKCdcXG4nKVxuICAgICAgICB9XG4gICAgICAgICR7Z3VpRmlsZXNTdHJpbmc/LmltcG9ydFN0cmluZ31cbiAgICAgICAgJHtzb3VuZEZpbGVzU3RyaW5nPy5pbXBvcnRTdHJpbmd9XG5cbiAgICAgICAgJHtpbXBvcnRTcHJpdGVzaGVldHMubWFwKGltcG9ydFNwcml0ZXNoZWV0ID0+IGltcG9ydFNwcml0ZXNoZWV0LnByb3BJbWFnZXNTdHJpbmcpLmpvaW4oJ1xcbicpfVxuICAgICAgICBcbiAgICAgICAgQFJwZ01vZHVsZTxScGdDbGllbnQ+KHsgXG4gICAgICAgICAgICBzcHJpdGVzaGVldHM6IFsgJHtpbXBvcnRTcHJpdGVzaGVldHMubWFwKGltcG9ydFNwcml0ZXNoZWV0ID0+IGltcG9ydFNwcml0ZXNoZWV0LnZhcmlhYmxlc1N0cmluZykuam9pbignLFxcbicpfSBdLFxuICAgICAgICAgICAgc3ByaXRlOiAke2ltcG9ydFNwcml0ZVN0cmluZyA/ICdzcHJpdGUnIDogJ3t9J30sXG4gICAgICAgICAgICAke2ltcG9ydEVuZ2luZSA/IGBlbmdpbmUsYCA6ICcnfVxuICAgICAgICAgICAgc2NlbmVzOiB7ICR7aW1wb3J0U2NlbmVNYXBTdHJpbmcgPyAnbWFwOiBzY2VuZU1hcCcgOiAnJ30gfSxcbiAgICAgICAgICAgIGd1aTogWyR7Z3VpRmlsZXNTdHJpbmc/LnZhcmlhYmxlc1N0cmluZ31dLFxuICAgICAgICAgICAgc291bmRzOiBbJHtzb3VuZEZpbGVzU3RyaW5nPy52YXJpYWJsZXNTdHJpbmd9XVxuICAgICAgICB9KVxuICAgICAgICBleHBvcnQgZGVmYXVsdCBjbGFzcyBScGdDbGllbnRNb2R1bGVFbmdpbmUge31cbiAgICBgXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2R1bGVMb2FkKGlkOiBzdHJpbmcsIHZhcmlhYmxlTmFtZTogc3RyaW5nLCBtb2R1bGVQYXRoOiBzdHJpbmcsIG9wdGlvbnMsIGNvbmZpZykge1xuICAgIGNvbnN0IGNsaWVudEZpbGUgPSBgdmlydHVhbC0ke3ZhcmlhYmxlTmFtZX0tY2xpZW50LnRzYFxuICAgIGNvbnN0IHNlcnZlckZpbGUgPSBgdmlydHVhbC0ke3ZhcmlhYmxlTmFtZX0tc2VydmVyLnRzYFxuXG4gICAgaWYgKGlkLmVuZHNXaXRoKHNlcnZlckZpbGUgKyAnP3NlcnZlcicpKSB7XG4gICAgICAgIHJldHVybiBsb2FkU2VydmVyRmlsZXMobW9kdWxlUGF0aCwgb3B0aW9ucywgY29uZmlnKVxuICAgIH1cbiAgICBlbHNlIGlmIChpZC5lbmRzV2l0aChjbGllbnRGaWxlICsgJz9jbGllbnQnKSkge1xuICAgICAgICByZXR1cm4gbG9hZENsaWVudEZpbGVzKG1vZHVsZVBhdGgsIG9wdGlvbnMsIGNvbmZpZylcbiAgICB9XG5cbiAgICByZXR1cm4gYFxuICAgICAgICBpbXBvcnQgY2xpZW50IGZyb20gJ2NsaWVudCEuLyR7Y2xpZW50RmlsZX0nXG4gICAgICAgIGltcG9ydCBzZXJ2ZXIgZnJvbSAnc2VydmVyIS4vJHtzZXJ2ZXJGaWxlfSdcbiAgICAgICAgXG4gICAgICAgIGV4cG9ydCBkZWZhdWx0IHtcbiAgICAgICAgICAgIGNsaWVudCxcbiAgICAgICAgICAgIHNlcnZlclxuICAgICAgICB9IFxuICAgIGBcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbmZpZ0ZpbGVzKGlkOiBzdHJpbmcsIGNvbmZpZ1NlcnZlciwgY29uZmlnQ2xpZW50KTogc3RyaW5nIHwgbnVsbCB7XG4gICAgaWYgKGlkLmVuZHNXaXRoKEdMT0JBTF9DT05GSUdfU0VSVkVSKSkge1xuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgZXhwb3J0IGRlZmF1bHQgJHtKU09OLnN0cmluZ2lmeShjb25maWdTZXJ2ZXIpfVxuICAgICAgICBgXG4gICAgfVxuICAgIGlmIChpZC5lbmRzV2l0aChHTE9CQUxfQ09ORklHX0NMSUVOVCkpIHtcbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIGV4cG9ydCBkZWZhdWx0ICR7SlNPTi5zdHJpbmdpZnkoY29uZmlnQ2xpZW50KX1cbiAgICAgICAgYFxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxufVxuXG5mdW5jdGlvbiByZXNvbHZlTW9kdWxlKG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBuYW1lLnJlcGxhY2UoL14uXFwvLywgJycpXG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNvbmZpZ1RvbWxQbHVnaW4ob3B0aW9uczogQ2xpZW50QnVpbGRDb25maWdPcHRpb25zID0ge30sIGNvbmZpZzogQ29uZmlnKTogUGx1Z2luIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgbW9kdWxlczogc3RyaW5nW10gPSBbXVxuICAgIGxldCBtb2R1bGVzQ3JlYXRlZCA9IFtdXG5cbiAgICBpZiAoY29uZmlnLm1vZHVsZXMpIHtcbiAgICAgICAgbW9kdWxlcyA9IGNvbmZpZy5tb2R1bGVzO1xuICAgIH1cblxuICAgIGNvbmZpZy5zdGFydE1hcCA9IGNvbmZpZy5zdGFydE1hcCB8fCBjb25maWcuc3RhcnQ/Lm1hcFxuXG4gICAgbGV0IHJldFxuICAgIHRyeSB7XG4gICAgICAgIHJldCA9IGxvYWRHbG9iYWxDb25maWcobW9kdWxlcywgY29uZmlnLCBvcHRpb25zKVxuICAgIH1cbiAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGlmIChvcHRpb25zLnNpZGUgPT0gJ3NlcnZlcicpIHByb2Nlc3MuZXhpdCgpXG4gICAgfVxuXG4gICAgaWYgKCFyZXQpIHJldHVyblxuXG4gICAgY29uc3QgeyBjb25maWdDbGllbnQsIGNvbmZpZ1NlcnZlciB9ID0gcmV0XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiAndml0ZS1wbHVnaW4tY29uZmlnLXRvbWwnLFxuICAgICAgICB0cmFuc2Zvcm1JbmRleEh0bWw6IHtcbiAgICAgICAgICAgIGVuZm9yY2U6ICdwcmUnLFxuICAgICAgICAgICAgdHJhbnNmb3JtKGh0bWwpIHtcbiAgICAgICAgICAgICAgICAvLyBpZiBmaW5kIHNyYy9jbGllbnQudHMsIGltcG9ydCBzcmMvY2xpZW50LnRzIGVsc2UgbW1vcnBnIXZpcnR1YWwtY2xpZW50LnRzXG4gICAgICAgICAgICAgICAgY29uc3QgY2xpZW50RmlsZSA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnc3JjJywgJ2NsaWVudC50cycpXG4gICAgICAgICAgICAgICAgY29uc3QgaW1wb3J0U3RyID0gZnMuZXhpc3RzU3luYyhjbGllbnRGaWxlKSA/ICdtbW9ycGchLi9zcmMvY2xpZW50LnRzJyA6ICdtbW9ycGchdmlydHVhbC1jbGllbnQudHMnXG5cbiAgICAgICAgICAgICAgICAvLyBpZiBmaW5kIHNyYy9zdGFuZGFsb25lLnRzLCBpbXBvcnQgc3JjL3N0YW5kYWxvbmUudHMgZWxzZSBtbW9ycGchdmlydHVhbC1zdGFuZGFsb25lLnRzXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhbmRhbG9uZUZpbGUgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3NyYycsICdzdGFuZGFsb25lLnRzJylcbiAgICAgICAgICAgICAgICBjb25zdCBpbXBvcnRTdHJTdGFuZGFsb25lID0gZnMuZXhpc3RzU3luYyhzdGFuZGFsb25lRmlsZSkgPyAncnBnIS4vc3JjL3N0YW5kYWxvbmUudHMnIDogJ3JwZyF2aXJ0dWFsLXN0YW5kYWxvbmUudHMnXG5cbiAgICAgICAgICAgICAgICByZXR1cm4gaHRtbC5yZXBsYWNlKCc8aGVhZD4nLCBgXG4gICAgICAgICAgICAgICAgPGhlYWQ+XG4gICAgICAgICAgICAgICAgPHNjcmlwdCB0eXBlPVwibW9kdWxlXCI+XG4gICAgICAgICAgICAgICAgICAgIGltcG9ydCAnJHtpbXBvcnRTdHJ9J1xuICAgICAgICAgICAgICAgICAgICBpbXBvcnQgJyR7aW1wb3J0U3RyU3RhbmRhbG9uZX0nXG4gICAgICAgICAgICAgICAgPC9zY3JpcHQ+YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGhhbmRsZUhvdFVwZGF0ZSgpIHtcbiAgICAgICAgICAgIG1vZHVsZXNDcmVhdGVkID0gW11cbiAgICAgICAgfSxcbiAgICAgICAgYXN5bmMgcmVzb2x2ZUlkKHNvdXJjZTogc3RyaW5nLCBpbXBvcnRlcikge1xuICAgICAgICAgICAgaWYgKHNvdXJjZS5lbmRzV2l0aChNT0RVTEVfTkFNRSkgfHxcbiAgICAgICAgICAgICAgICBzb3VyY2UuZW5kc1dpdGgoR0xPQkFMX0NPTkZJR19DTElFTlQpIHx8XG4gICAgICAgICAgICAgICAgc291cmNlLmVuZHNXaXRoKEdMT0JBTF9DT05GSUdfU0VSVkVSKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiBtb2R1bGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKHNvdXJjZSA9PT0gcmVzb2x2ZU1vZHVsZShtb2R1bGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzb3VyY2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgKHNvdXJjZS5pbmNsdWRlcygndmlydHVhbCcpICYmICghc291cmNlLmVuZHNXaXRoKCd2aXJ0dWFsLXNlcnZlci50cycpICYmIG9wdGlvbnMuc2VydmVNb2RlKSkgfHxcbiAgICAgICAgICAgICAgICAoc291cmNlLmluY2x1ZGVzKCd2aXJ0dWFsJykgJiYgIW9wdGlvbnMuc2VydmVNb2RlKVxuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNvdXJjZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYXN5bmMgbG9hZChpZDogc3RyaW5nKSB7XG4gICAgICAgICAgICBjb25zdCBzZXJ2ZXJVcmwgPSBwcm9jZXNzLmVudi5WSVRFX1NFUlZFUl9VUkxcbiAgICAgICAgICAgIGNvbnN0IGVudnNTdHJpbmcgPSBge1xuICAgICAgICAgICAgICAgIFZJVEVfQlVJTFQ6ICR7cHJvY2Vzcy5lbnYuVklURV9CVUlMVH0sXG4gICAgICAgICAgICAgICAgVklURV9TRVJWRVJfVVJMOiAke3NlcnZlclVybCA/IFwiJ1wiICsgc2VydmVyVXJsICsgXCInXCIgOiAndW5kZWZpbmVkJ31cbiAgICAgICAgICAgIH1gXG4gICAgICAgICAgICBpZiAoaWQuZW5kc1dpdGgoTU9EVUxFX05BTUUpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kdWxlc1RvSW1wb3J0ID0gbW9kdWxlcy5yZWR1Y2UoKGFjYywgbW9kdWxlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhcmlhYmxlTmFtZSA9IGZvcm1hdFZhcmlhYmxlTmFtZShtb2R1bGUpO1xuICAgICAgICAgICAgICAgICAgICBhY2NbdmFyaWFibGVOYW1lXSA9IG1vZHVsZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgICAgICAgICB9LCB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICAgICAgJHtPYmplY3Qua2V5cyhtb2R1bGVzVG9JbXBvcnQpLm1hcCgodmFyaWFibGVOYW1lKSA9PiBgaW1wb3J0ICR7dmFyaWFibGVOYW1lfSBmcm9tICcke3Jlc29sdmVNb2R1bGUobW9kdWxlc1RvSW1wb3J0W3ZhcmlhYmxlTmFtZV0pfSdgKS5qb2luKCdcXG4nKX1cblxuICAgICAgICAgICAgICAgIGV4cG9ydCBkZWZhdWx0IFtcbiAgICAgICAgICAgICAgICAgICAke09iamVjdC5rZXlzKG1vZHVsZXNUb0ltcG9ydCkuam9pbignLFxcbicpfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICBgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpZC5lbmRzV2l0aCgndmlydHVhbC1jbGllbnQudHM/bW1vcnBnJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb2RlVG9UcmFuc2Zvcm0gPSBgXG4gICAgICAgICAgICAgICAgaW1wb3J0IHsgZW50cnlQb2ludCB9IGZyb20gJ0BycGdqcy9jbGllbnQnXG4gICAgICAgICAgICAgICAgaW1wb3J0IGlvIGZyb20gJ3NvY2tldC5pby1jbGllbnQnXG4gICAgICAgICAgICAgICAgaW1wb3J0IG1vZHVsZXMgZnJvbSAnLi8ke01PRFVMRV9OQU1FfSdcbiAgICAgICAgICAgICAgICBpbXBvcnQgZ2xvYmFsQ29uZmlnIGZyb20gJy4vJHtHTE9CQUxfQ09ORklHX0NMSUVOVH0nXG5cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24oZSkgeyBcbiAgICAgICAgICAgICAgICAgICAgZW50cnlQb2ludChtb2R1bGVzLCB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgaW8sXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxDb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnZzOiAke2VudnNTdHJpbmd9XG4gICAgICAgICAgICAgICAgICAgIH0pLnN0YXJ0KClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29kZVRvVHJhbnNmb3JtXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpZC5lbmRzV2l0aCgndmlydHVhbC1zdGFuZGFsb25lLnRzP3JwZycpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29kZVRvVHJhbnNmb3JtID0gYFxuICAgICAgICAgICAgICAgIGltcG9ydCB7IGVudHJ5UG9pbnQgfSBmcm9tICdAcnBnanMvc3RhbmRhbG9uZSdcbiAgICAgICAgICAgICAgICBpbXBvcnQgZ2xvYmFsQ29uZmlnQ2xpZW50IGZyb20gJy4vJHtHTE9CQUxfQ09ORklHX0NMSUVOVH0nXG4gICAgICAgICAgICAgICAgaW1wb3J0IGdsb2JhbENvbmZpZ1NlcnZlciBmcm9tICcuLyR7R0xPQkFMX0NPTkZJR19TRVJWRVJ9J1xuICAgICAgICAgICAgICAgIGltcG9ydCBtb2R1bGVzIGZyb20gJy4vJHtNT0RVTEVfTkFNRX0nXG5cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24oKSB7IFxuICAgICAgICAgICAgICAgICAgICBlbnRyeVBvaW50KG1vZHVsZXMsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbENvbmZpZ0NsaWVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbENvbmZpZ1NlcnZlcixcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudnM6ICR7ZW52c1N0cmluZ31cbiAgICAgICAgICAgICAgICAgICAgfSkuc3RhcnQoKSBcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgICAgIHJldHVybiBjb2RlVG9UcmFuc2Zvcm1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2UgaWYgKGlkLmVuZHNXaXRoKCd2aXJ0dWFsLXNlcnZlci50cycpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29kZVRvVHJhbnNmb3JtID0gYFxuICAgICAgICAgICAgICAgIGltcG9ydCB7IGV4cHJlc3NTZXJ2ZXIgfSBmcm9tICdAcnBnanMvc2VydmVyL2V4cHJlc3MnXG4gICAgICAgICAgICAgICAgaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCdcbiAgICAgICAgICAgICAgICBpbXBvcnQgbW9kdWxlcyBmcm9tICcuLyR7TU9EVUxFX05BTUV9J1xuICAgICAgICAgICAgICAgIGltcG9ydCBnbG9iYWxDb25maWcgZnJvbSAnLi8ke0dMT0JBTF9DT05GSUdfU0VSVkVSfSdcblxuICAgICAgICAgICAgICAgIGNvbnN0IF9fZGlybmFtZSA9IHVybC5maWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4nLCBpbXBvcnQubWV0YS51cmwpKVxuXG4gICAgICAgICAgICAgICAgZXhwcmVzc1NlcnZlcihtb2R1bGVzLCB7XG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbENvbmZpZyxcbiAgICAgICAgICAgICAgICAgICAgYmFzZVBhdGg6IF9fZGlybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZW52czogJHtlbnZzU3RyaW5nfVxuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvZGVUb1RyYW5zZm9ybVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBzdHIgPSBjcmVhdGVDb25maWdGaWxlcyhpZCwgY29uZmlnQ2xpZW50LCBjb25maWdTZXJ2ZXIpXG4gICAgICAgICAgICBpZiAoc3RyKSByZXR1cm4gc3RyXG5cbiAgICAgICAgICAgIGZvciAobGV0IG1vZHVsZSBvZiBtb2R1bGVzKSB7XG4gICAgICAgICAgICAgICAgbGV0IG1vZHVsZU5hbWUgPSByZXNvbHZlTW9kdWxlKG1vZHVsZSlcbiAgICAgICAgICAgICAgICBsZXQgdmFyaWFibGVOYW1lID0gZm9ybWF0VmFyaWFibGVOYW1lKG1vZHVsZU5hbWUpO1xuICAgICAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICAgICAgaWQuZW5kc1dpdGgobW9kdWxlTmFtZSkgfHwgaWQuaW5jbHVkZXMoJ3ZpcnR1YWwtJyArIHZhcmlhYmxlTmFtZSlcbiAgICAgICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZU1vZHVsZUxvYWQoaWQsIHZhcmlhYmxlTmFtZSwgbW9kdWxlLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5vcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kdWxlc0NyZWF0ZWRcbiAgICAgICAgICAgICAgICAgICAgfSwgY29uZmlnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvdXRpbHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy91dGlscy9qc29uLXNjaGVtYS50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvdXRpbHMvanNvbi1zY2hlbWEudHNcIjtpbXBvcnQgQWp2IGZyb20gXCJhanZcIjtcbmltcG9ydCBhZGRGb3JtYXRzIGZyb20gXCJhanYtZm9ybWF0c1wiO1xuXG5pbnRlcmZhY2UgU2VydmVyU2NoZW1hIHtcbiAgdHlwZTogJ29iamVjdCc7XG4gIHByb3BlcnRpZXM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICByZXF1aXJlZDogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBDbGllbnRTY2hlbWEge1xuICB0eXBlOiAnb2JqZWN0JztcbiAgcHJvcGVydGllczogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbmludGVyZmFjZSBKc29uU2NoZW1hIHtcbiAgbmFtZXNwYWNlPzogc3RyaW5nO1xuICBzZXJ2ZXI/OiBTZXJ2ZXJTY2hlbWE7XG4gIGNsaWVudD86IENsaWVudFNjaGVtYTtcbiAgJyonOiBTZXJ2ZXJTY2hlbWEgfCBDbGllbnRTY2hlbWE7XG59XG5cbmludGVyZmFjZSBJbnB1dERhdGEge1xuICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xufVxuXG5pbnRlcmZhY2UgUGFyc2VkRGF0YSB7XG4gIHNlcnZlcjogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGNsaWVudDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIG5hbWVzcGFjZTogc3RyaW5nO1xuICBleHRyYVByb3BzOiBzdHJpbmdbXTtcbn1cblxuZnVuY3Rpb24gcGFyc2VOYW1lc3BhY2UoaW5wdXREYXRhOiBJbnB1dERhdGEsIHByb3BlcnRpZXM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB7XG4gIGNvbnN0IGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gIGZvciAoY29uc3QgW2tleV0gb2YgT2JqZWN0LmVudHJpZXMocHJvcGVydGllcyB8fCB7fSkpIHtcbiAgICBkYXRhW2tleV0gPSBpbnB1dERhdGFba2V5XTtcbiAgfVxuICByZXR1cm4gZGF0YTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlSnNvblNjaGVtYShqc29uU2NoZW1hOiBKc29uU2NoZW1hLCBpbnB1dERhdGE6IElucHV0RGF0YSk6IFBhcnNlZERhdGEge1xuICBsZXQgc2VydmVyOiBhbnkgPSB7fTtcbiAgbGV0IGNsaWVudDogYW55ID0ge307XG5cbiAgY29uc3QgbmFtZXNwYWNlID0ganNvblNjaGVtYS5uYW1lc3BhY2UgfHwgJyc7XG4gIGNvbnN0IGdldE9iamVjdEJ5TmFtZXNwYWNlID0gKCk6IGFueSA9PiB7XG4gICAgcmV0dXJuIG5hbWVzcGFjZSA/IChpbnB1dERhdGFbbmFtZXNwYWNlXSB8fCB7fSkgOiBpbnB1dERhdGFcbiAgfVxuXG4gIGZ1bmN0aW9uIHRvUGF0aEFzT2JqZWN0KGluc3RhbmNlUGF0aCkge1xuICAgIHJldHVybiBpbnN0YW5jZVBhdGgucmVwbGFjZSgvXlxcLy8sICcnKS5yZXBsYWNlKC9cXC8vZywgJy4nKVxuICB9XG5cbiAgY29uc3QgdmFsaWRhdGUgPSAoanNvblNjaGVtYSwgc2lkZTogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgYWp2ID0gbmV3IEFqdih7IGFsbEVycm9yczogdHJ1ZSwgYWxsb3dVbmlvblR5cGVzOiB0cnVlIH0pO1xuICAgIGFkZEZvcm1hdHMoYWp2KTtcbiAgICBjb25zdCBhanZWYWxpZGF0ZSA9IGFqdi5jb21waWxlKGpzb25TY2hlbWEpO1xuICAgIGNvbnN0IHZhbGlkID0gYWp2VmFsaWRhdGUoZ2V0T2JqZWN0QnlOYW1lc3BhY2UoKSk7XG4gICAgaWYgKCF2YWxpZCkge1xuICAgICAgY29uc3QgZXJyb3JzID0gYWp2VmFsaWRhdGUuZXJyb3JzO1xuICAgICAgaWYgKCFlcnJvcnMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVycm9yJylcbiAgICAgIH1cbiAgICAgIGNvbnN0IGZpcnN0RXJyb3IgPSBlcnJvcnNbMF07XG4gICAgICBjb25zdCBlcnJvcjogYW55ID0gbmV3IEVycm9yKGZpcnN0RXJyb3IubWVzc2FnZSk7XG4gICAgICBlcnJvci5uYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG4gICAgICBlcnJvci5wYXJhbXMgPSBmaXJzdEVycm9yLnBhcmFtcztcbiAgICAgIGVycm9yLnByb3BlcnR5ID0gZmlyc3RFcnJvci5wYXJhbXMubWlzc2luZ1Byb3BlcnR5ID8/IHRvUGF0aEFzT2JqZWN0KGZpcnN0RXJyb3IuaW5zdGFuY2VQYXRoKVxuICAgICAgdGhyb3cgZXJyb3JcbiAgICB9XG4gIH1cblxuICBpZiAoanNvblNjaGVtYS5zZXJ2ZXIgJiYgT2JqZWN0LmtleXMoanNvblNjaGVtYS5zZXJ2ZXIpLmxlbmd0aCA+IDApIHtcbiAgICB0cnkge1xuICAgICAgdmFsaWRhdGUoanNvblNjaGVtYS5zZXJ2ZXIsICdzZXJ2ZXInKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IGVcbiAgICB9XG4gICAgY29uc3Qgb2JqZWN0ID0gcGFyc2VOYW1lc3BhY2UoZ2V0T2JqZWN0QnlOYW1lc3BhY2UoKSwganNvblNjaGVtYS5zZXJ2ZXIucHJvcGVydGllcyk7XG4gICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgc2VydmVyW25hbWVzcGFjZV0gPSBvYmplY3RcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZXJ2ZXIgPSBvYmplY3RcbiAgICB9XG4gIH1cblxuICBpZiAoanNvblNjaGVtYS5jbGllbnQgJiYgT2JqZWN0LmtleXMoanNvblNjaGVtYS5jbGllbnQpLmxlbmd0aCA+IDApIHtcbiAgICB0cnkge1xuICAgICAgdmFsaWRhdGUoanNvblNjaGVtYS5jbGllbnQsICdjbGllbnQnKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IGVcbiAgICB9XG4gICAgY29uc3Qgb2JqZWN0ID0gcGFyc2VOYW1lc3BhY2UoZ2V0T2JqZWN0QnlOYW1lc3BhY2UoKSwganNvblNjaGVtYS5jbGllbnQucHJvcGVydGllcyk7XG4gICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgY2xpZW50W25hbWVzcGFjZV0gPSBvYmplY3RcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjbGllbnQgPSBvYmplY3RcbiAgICB9XG4gIH1cblxuICBpZiAoanNvblNjaGVtYVsnKiddICYmIE9iamVjdC5rZXlzKGpzb25TY2hlbWFbJyonXSkubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGNvbW1vbkRhdGEgPSBwYXJzZU5hbWVzcGFjZShnZXRPYmplY3RCeU5hbWVzcGFjZSgpLCBqc29uU2NoZW1hWycqJ10ucHJvcGVydGllcyk7XG4gICAgdHJ5IHtcbiAgICAgIHZhbGlkYXRlKGpzb25TY2hlbWFbJyonXSwgJ2JvdGgnKTtcbiAgICB9XG4gICAgY2F0Y2ggKGUpIHtcbiAgICAgIHRocm93IGVcbiAgICB9XG4gICAgaWYgKG5hbWVzcGFjZSkge1xuICAgICAgc2VydmVyW25hbWVzcGFjZV0gPSB7IC4uLnNlcnZlcltuYW1lc3BhY2VdLCAuLi5jb21tb25EYXRhIH07XG4gICAgICBjbGllbnRbbmFtZXNwYWNlXSA9IHsgLi4uY2xpZW50W25hbWVzcGFjZV0sIC4uLmNvbW1vbkRhdGEgfTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBzZXJ2ZXIgPSB7IC4uLnNlcnZlciwgLi4uY29tbW9uRGF0YSB9O1xuICAgICAgY2xpZW50ID0geyAuLi5jbGllbnQsIC4uLmNvbW1vbkRhdGEgfTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBhZGRBZGRpdGlvbmFsUHJvcGVydGllcyhzY2hlbWE6IGFueSk6IEpzb25TY2hlbWEge1xuICAgIGlmIChzY2hlbWEudHlwZSA9PT0gXCJvYmplY3RcIikge1xuICAgICAgaWYgKCEoXCJhZGRpdGlvbmFsUHJvcGVydGllc1wiIGluIHNjaGVtYSkpIHtcbiAgICAgICAgc2NoZW1hLmFkZGl0aW9uYWxQcm9wZXJ0aWVzID0gZmFsc2U7XG4gICAgICB9XG4gIFxuICAgICAgaWYgKHNjaGVtYS5wcm9wZXJ0aWVzKSB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IGluIHNjaGVtYS5wcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgc2NoZW1hLnByb3BlcnRpZXNba2V5XSA9IGFkZEFkZGl0aW9uYWxQcm9wZXJ0aWVzKHNjaGVtYS5wcm9wZXJ0aWVzW2tleV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICBcbiAgICByZXR1cm4gc2NoZW1hO1xuICB9XG5cbiAgZnVuY3Rpb24gY2hlY2soanNvblNjaGVtYTogYW55LCBvYmo6IG9iamVjdCk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBhanYgPSBuZXcgQWp2KHsgYWxsRXJyb3JzOiB0cnVlLCBhbGxvd1VuaW9uVHlwZXM6IHRydWUgfSk7XG4gICAgYWRkRm9ybWF0cyhhanYpO1xuICAgIGNvbnN0IHZhbGlkYXRlID0gYWp2LmNvbXBpbGUoYWRkQWRkaXRpb25hbFByb3BlcnRpZXMoanNvblNjaGVtYSkpO1xuICAgIGNvbnN0IHZhbGlkID0gdmFsaWRhdGUob2JqKTtcblxuICAgIGlmICghdmFsaWQpIHtcbiAgICAgIGNvbnN0IGV4dHJhUHJvcHM6IHN0cmluZ1tdID0gW107XG4gICAgICB2YWxpZGF0ZS5lcnJvcnM/LmZvckVhY2goKGVycm9yKSA9PiB7XG4gICAgICAgIGlmIChlcnJvci5rZXl3b3JkID09PSBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCIpIHtcbiAgICAgICAgICBjb25zdCByb290ID0gdG9QYXRoQXNPYmplY3QoZXJyb3IuaW5zdGFuY2VQYXRoKVxuICAgICAgICAgIGNvbnN0IHByb3BQYXRoID0gcm9vdCArIChyb290ID8gJy4nIDogJycpICsgZXJyb3IucGFyYW1zPy5hZGRpdGlvbmFsUHJvcGVydHk7XG4gICAgICAgICAgZXh0cmFQcm9wcy5wdXNoKHByb3BQYXRoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gZXh0cmFQcm9wcztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGFsbFByb3BlcnRpZXMgPSAge1xuICAgIC4uLihqc29uU2NoZW1hLnNlcnZlcj8ucHJvcGVydGllcyB8fCB7fSksXG4gICAgLi4uKGpzb25TY2hlbWEuY2xpZW50Py5wcm9wZXJ0aWVzIHx8IHt9KSxcbiAgICAuLi4oanNvblNjaGVtYVsnKiddPy5wcm9wZXJ0aWVzIHx8IHt9KSxcbiAgfTtcblxuICBjb25zdCBleHRyYVByb3BzID0gXG4gICAgY2hlY2soeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczogYWxsUHJvcGVydGllcyB9LCBnZXRPYmplY3RCeU5hbWVzcGFjZSgpKVxuICAgIC5maWx0ZXIoKHByb3ApID0+IHByb3AgIT09ICdtb2R1bGVzJylcbiAgICAubWFwKHByb3AgPT4gbmFtZXNwYWNlID8gYCR7bmFtZXNwYWNlfS4ke3Byb3B9YCA6IHByb3ApXG5cbiAgcmV0dXJuIHsgc2VydmVyLCBjbGllbnQsIG5hbWVzcGFjZSwgZXh0cmFQcm9wcyB9O1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC9sb2FkLWdsb2JhbC1jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL2xvYWQtZ2xvYmFsLWNvbmZpZy50c1wiO2ltcG9ydCB7IHBhcnNlSnNvblNjaGVtYSB9IGZyb20gJy4uL3V0aWxzL2pzb24tc2NoZW1hLmpzJztcbmltcG9ydCBjb2xvcnMgZnJvbSAncGljb2NvbG9ycydcbmltcG9ydCBkZWZhdWx0Q29uZmlnIGZyb20gJy4vZGVmYXVsdC1jb25maWcuanMnXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBDbGllbnRCdWlsZENvbmZpZ09wdGlvbnMsIENvbmZpZyB9IGZyb20gJy4vY2xpZW50LWNvbmZpZyc7XG5pbXBvcnQgeyBsb2FkRW52IH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgeyB3YXJuIH0gZnJvbSAnLi4vbG9ncy93YXJuaW5nLmpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRHbG9iYWxDb25maWcobW9kdWxlczogc3RyaW5nW10sIGNvbmZpZzogQ29uZmlnLCBvcHRpb25zOiBDbGllbnRCdWlsZENvbmZpZ09wdGlvbnMpOiB7XG4gICAgY29uZmlnQ2xpZW50OiBhbnk7XG4gICAgY29uZmlnU2VydmVyOiBhbnk7XG59IHwgZmFsc2Uge1xuICAgIGxldCBjb25maWdDbGllbnQgPSB7fVxuICAgIGxldCBjb25maWdTZXJ2ZXIgPSB7fVxuICAgIGxldCBhbGxFeHRyYVByb3BzOiBzdHJpbmdbXSA9IFtdXG4gICAgY29uc3QgZGlzcGxheUVycm9yID0gb3B0aW9ucy5zaWRlID09ICdzZXJ2ZXInXG4gICAgY29uc3QgbW9kZSA9IG9wdGlvbnMubW9kZSB8fCAnZGV2ZWxvcG1lbnQnXG5cbiAgICBjb25zdCBwYXJzZVNjaGVtYSA9IChjb25maWdGaWxlLCBtb2R1bGVOYW1lPykgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJzZUpzb25TY2hlbWEoY29uZmlnRmlsZSwgY29uZmlnIGFzIGFueSlcbiAgICAgICAgICAgIGlmICh2YWx1ZS5zZXJ2ZXIpIHtcbiAgICAgICAgICAgICAgICBjb25maWdTZXJ2ZXIgPSB7IC4uLmNvbmZpZ1NlcnZlciwgLi4udmFsdWUuc2VydmVyIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZS5jbGllbnQpIHtcbiAgICAgICAgICAgICAgICBjb25maWdDbGllbnQgPSB7IC4uLmNvbmZpZ0NsaWVudCwgLi4udmFsdWUuY2xpZW50IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZS5leHRyYVByb3BzKSB7XG4gICAgICAgICAgICAgICAgYWxsRXh0cmFQcm9wcyA9IFsuLi5hbGxFeHRyYVByb3BzLCAuLi52YWx1ZS5leHRyYVByb3BzXVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgaWYgKCFlcnIucHJvcGVydHkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpXG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWRpc3BsYXlFcnJvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IG1lc3NhZ2UgPSBjb2xvcnMucmVkKGBJbnZhbGlkYXRlIFwiJHttb2R1bGVOYW1lfVwiIG1vZHVsZTogJHtlcnIubWVzc2FnZX1gKVxuICAgICAgICAgICAgbGV0IGhlbHBNZXNzYWdlID0gYFske2Vyci5uYW1lc3BhY2V9XVxcbiAgJHtlcnIucHJvcGVydHl9ID0gWU9VUl9WQUxVRWBcbiAgICAgICAgICAgIGlmICghbW9kdWxlTmFtZSkge1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBjb2xvcnMucmVkKGBJbnZhbGlkYXRlIGNvbmZpZzogJHtlcnIubWVzc2FnZX1gKVxuICAgICAgICAgICAgICAgIGhlbHBNZXNzYWdlID0gYCR7ZXJyLnByb3BlcnR5fSA9IFlPVVJfVkFMVUVgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnLS0tLS0tLS0tLScpXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKVxuICAgICAgICAgICAgaWYgKGVyci5wYXJhbXMuYWxsb3dlZFZhbHVlcykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBcXG4ke2NvbG9ycy5kaW0oJ1x1Mjc5QyBBdXRob3JpemUgdmFsdWVzOicpfSAke2NvbG9ycy5kaW0oZXJyLnBhcmFtcy5hbGxvd2VkVmFsdWVzLmpvaW4oJywgJykpfWApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgJHtjb2xvcnMuZGltKCdcdTI3OUMnKX0gJHtjb2xvcnMuZGltKGB5b3UgbmVlZCB0byBwdXQgdGhlIGZvbGxvd2luZyBjb25maWd1cmF0aW9uIGluIHJwZy50b21sOlxcblxcbiR7aGVscE1lc3NhZ2V9YCl9YClcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tJylcbiAgICAgICAgICAgIHRocm93IGVyclxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcGFyc2VTY2hlbWEoZGVmYXVsdENvbmZpZylcblxuICAgIGxldCBuYW1lc3BhY2VzOiBzdHJpbmdbXSA9IFtdXG4gICAgZm9yIChsZXQgbW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgICAgLy8gaWYgbW9kdWxlIG5vdCBiZWdpbnMgYnkgLiwgc2VhcmNoIGluIG5vZGVfbW9kdWxlc1xuICAgICAgICBsZXQgbW9kdWxlUGF0aCA9IG1vZHVsZVxuICAgICAgICBpZiAobW9kdWxlUGF0aFswXSAhPSAnLicpIHtcbiAgICAgICAgICAgIG1vZHVsZVBhdGggPSBwYXRoLmpvaW4oJ25vZGVfbW9kdWxlcycsIG1vZHVsZVBhdGgpXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgY29uZmlnUGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBtb2R1bGVQYXRoLCAnY29uZmlnLmpzb24nKVxuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhjb25maWdQYXRoKSkge1xuICAgICAgICAgICAgY29uc3QgY29uZmlnRmlsZTogYW55ID0gZnMucmVhZEZpbGVTeW5jKGNvbmZpZ1BhdGgsICd1dGYtOCcpXG4gICAgICAgICAgICBjb25zdCBqc29uRmlsZSA9IEpTT04ucGFyc2UoY29uZmlnRmlsZSlcbiAgICAgICAgICAgIGlmIChqc29uRmlsZS5uYW1lc3BhY2UpIG5hbWVzcGFjZXMucHVzaChqc29uRmlsZS5uYW1lc3BhY2UpXG4gICAgICAgICAgICBwYXJzZVNjaGVtYShqc29uRmlsZSwgbW9kdWxlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGRpc3BsYXlFcnJvcikge1xuICAgICAgICBjb25zdCBmaWx0ZXJFeHRyYVByb3BzID0gYWxsRXh0cmFQcm9wcy5maWx0ZXIocHJvcCA9PiBuYW1lc3BhY2VzLmluZGV4T2YocHJvcCkgPT0gLTEpXG5cbiAgICAgICAgaWYgKGZpbHRlckV4dHJhUHJvcHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgd2FybignSW4gcnBnLnRvbWwsIHlvdSBwdXQgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzLCBidXQgdGhleSBhcmUgbm90IHVzZWQgYnkgdGhlIG1vZHVsZXMuIENoZWNrIHRoZSBuYW1lcyBvZiB0aGUgcHJvcGVydGllcy4nKVxuICAgICAgICAgICAgZm9yIChsZXQgZXh0cmFQcm9wIG9mIGZpbHRlckV4dHJhUHJvcHMpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgICAtICR7Y29sb3JzLnllbGxvdyhleHRyYVByb3ApfWApXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBsYWNlRW52VmFycyhvYmosIGVudnMpIHtcbiAgICAgICAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgICAgIHJldHVybiBvYmoubWFwKHJlcGxhY2VFbnZWYXJzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBPYmplY3QuZW50cmllcyhvYmopLnJlZHVjZSgoYWNjLCBba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSByZXBsYWNlRW52VmFycyh2YWx1ZSwgZW52cyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUuc3RhcnRzV2l0aCgnJEVOVjonKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVudlZhciA9IHZhbHVlLnNsaWNlKDUpO1xuICAgICAgICAgICAgICAgIHZhbHVlID0gZW52c1tlbnZWYXJdXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhY2Nba2V5XSA9IHZhbHVlO1xuICAgICAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgICAgfSwge30pO1xuICAgIH1cblxuICAgIGNvbnN0IGVudnMgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCkpXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBjb25maWdDbGllbnQ6IHJlcGxhY2VFbnZWYXJzKGNvbmZpZ0NsaWVudCwgZW52cyksXG4gICAgICAgIGNvbmZpZ1NlcnZlcjogcmVwbGFjZUVudlZhcnMoY29uZmlnU2VydmVyLCBlbnZzKVxuICAgIH1cbn0iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL2RlZmF1bHQtY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC9kZWZhdWx0LWNvbmZpZy50c1wiO2NvbnN0IGNhbnZhc09wdGlvbnMgPXtcbiAgICBcImNhbnZhc1wiOiB7XG4gICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgXCJ0cmFuc3BhcmVudFwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJhdXRvRGVuc2l0eVwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJhbnRpYWxpYXNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwicmVzb2x1dGlvblwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCJcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInByZXNlcnZlRHJhd2luZ0J1ZmZlclwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJiYWNrZ3JvdW5kQ29sb3JcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFwic2VsZWN0b3JcIjoge1xuICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgIH0sXG4gICAgXCJzZWxlY3Rvckd1aVwiOiB7XG4gICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgfSxcbiAgICBcInNlbGVjdG9yQ2FudmFzXCI6IHtcbiAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICB9LFxuICAgIFwic3RhbmRhbG9uZVwiOiB7XG4gICAgICAgIFwidHlwZVwiOiBcImJvb2xlYW5cIlxuICAgIH0sXG4gICAgXCJkcmF3TWFwXCI6IHtcbiAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiXG4gICAgfSxcbiAgICBcIm1heEZwc1wiOiB7XG4gICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgfSxcbiAgICBcInNlcnZlckZwc1wiOiB7XG4gICAgICAgIFwidHlwZVwiOiBcIm51bWJlclwiXG4gICAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCB7XG4gICAgXCJzZXJ2ZXJcIjoge1xuICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgIFwic3RhcnRNYXBcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJzdGFydFwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJtYXBcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJncmFwaGljXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFwiaGl0Ym94XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIml0ZW1zXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IFwidHlwZVwiOiBcImludGVnZXJcIiB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgXCJ0eXBlXCI6IFwiaW50ZWdlclwiIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxJdGVtc1wiOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWluSXRlbXNcIjogMixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWF4SXRlbXNcIjogMlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwic3ByaXRlc2hlZXREaXJlY3Rvcmllc1wiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJhcGlcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgIFwicHJvcGVydGllc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwiZW5hYmxlZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJib29sZWFuXCJcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgXCJhdXRoU2VjcmV0XCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFwicmVxdWlyZWRcIjogW1wiZW5hYmxlZFwiLCBcImF1dGhTZWNyZXRcIl1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXCJjbGllbnRcIjoge1xuICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgIFwic2hvcnROYW1lXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiZGVzY3JpcHRpb25cIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgXCJ0aGVtZUNvbG9yXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwiaWNvbnNcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgXCJpdGVtc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcIm9iamVjdFwiLFxuICAgICAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJzcmNcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzaXplc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYXJyYXlcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIml0ZW1zXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwibnVtYmVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibWluaW11bVwiOiAwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcInRoZW1lQ3NzXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJzdHJpbmdcIlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwibWF0Y2hNYWtlclNlcnZpY2VcIjoge1xuICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInN0cmluZ1wiXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLi4uY2FudmFzT3B0aW9uc1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcIipcIjoge1xuICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgIFwiaW5wdXRzXCI6IHtcbiAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJvYmplY3RcIixcbiAgICAgICAgICAgICAgICBcImFkZGl0aW9uYWxQcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgXCJvbmVPZlwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwcm9wZXJ0aWVzXCI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyZXBlYXRcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwiYm9vbGVhblwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJkZWZhdWx0XCI6IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYmluZFwiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic3RyaW5nXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhcnJheVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZGVsYXlcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwib2JqZWN0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInByb3BlcnRpZXNcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZHVyYXRpb25cIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJudW1iZXJcIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJtaW5pbXVtXCI6IDBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwib3RoZXJDb250cm9sc1wiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcImFycmF5XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiaXRlbXNcIjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInJlcXVpcmVkXCI6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImR1cmF0aW9uXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyZXF1aXJlZFwiOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYmluZFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFwibmFtZVwiOiB7XG4gICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwic3RyaW5nXCJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLWNzcy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tY3NzLnRzXCI7aW1wb3J0IHsgUGx1Z2luIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IGZzIGZyb20gXCJmcy1leHRyYVwiO1xuaW1wb3J0IHsgQ29uZmlnIH0gZnJvbSBcIi4vY2xpZW50LWNvbmZpZ1wiO1xuXG5jb25zdCBERUZBVUxUX1RIRU1FID0gYFxuICAgICR3aW5kb3ctYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KDE0OGRlZywgcmdiYSg3OSw4MiwxMzYsMC43KSAwJSwgcmdiYSg0Miw0Myw3MywwLjcpIDEwMCUpO1xuICAgICR3aW5kb3ctYm9yZGVyOiAyLjVweCBzb2xpZCB3aGl0ZTtcbiAgICAkd2luZG93LWJvcmRlci1yYWRpdXM6IDVweDtcbiAgICAkd2luZG93LWFycm93LWNvbG9yOiB3aGl0ZTtcbiAgICAkd2luZG93LWZvbnQtc2l6ZTogMjVweDtcbiAgICAkd2luZG93LWZvbnQtY29sb3I6IHdoaXRlO1xuICAgICR3aW5kb3ctZm9udC1mYW1pbHk6ICdBcmlhbCc7XG4gICAgJGN1cnNvci1iYWNrZ3JvdW5kOiAjNzc4MmFiO1xuICAgICRjdXJzb3ItYm9yZGVyOiAxcHggc29saWQgIzlkYjBjNjtcblxuICAgIEBtaXhpbiB3aW5kb3ctY29udGVudCB7fVxuYFxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjc3NQbHVnaW4oY29uZmlnOiBDb25maWcpOiBQbHVnaW4ge1xuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6ICd2aXRlLXBsdWdpbi1jc3MnLFxuICAgICAgICBjb25maWcoY29uZmlnOiBhbnkpIHtcbiAgICAgICAgICAgIC8vIGlmIGZpbmQgZmlsZSBjb25maWcvY2xpZW50L3RoZW1lLnNjc3Mgb3IgaGF2ZSBjb25maWcudGhlbWVDc3NcbiAgICAgICAgICAgIGxldCBhZGRpdGlvbmFsRGF0YSA9ICcnXG4gICAgICAgICAgICBjb25zdCB0aGVtZUNzcyA9IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3NyYy9jb25maWcvY2xpZW50L3RoZW1lLnNjc3MnKVxuICAgICAgICAgICAgY29uc3QgdGhlbWVDc3NSb290ID0gcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAndGhlbWUuc2NzcycpXG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0aGVtZUNzcykpIHtcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsRGF0YSArPSBgQGltcG9ydCBcIiR7dGhlbWVDc3N9XCI7YFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoZnMuZXhpc3RzU3luYyh0aGVtZUNzc1Jvb3QpKSB7XG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbERhdGEgKz0gYEBpbXBvcnQgXCIke3RoZW1lQ3NzUm9vdH1cIjtgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjb25maWcudGhlbWVDc3MpIHtcbiAgICAgICAgICAgICAgICAvLyBleGNlcHRpb24gaWYgbm90IGZpbmQgZmlsZVxuICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhyZXNvbHZlKHByb2Nlc3MuY3dkKCksIGNvbmZpZy50aGVtZUNzcykpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRmlsZSAke2NvbmZpZy50aGVtZUNzc30gbm90IGZvdW5kYClcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbERhdGEgKz0gYEBpbXBvcnQgXCJALyR7Y29uZmlnLnRoZW1lQ3NzfVwiO2BcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxEYXRhICs9IERFRkFVTFRfVEhFTUVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uZmlnLmNzcyA9IHtcbiAgICAgICAgICAgICAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgIHNjc3M6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxEYXRhXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBjb25maWdcbiAgICAgICAgfVxuXG4gICAgfVxufSIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9zYW11ZWwvd3d3L1JQRy1KUy12NC9wYWNrYWdlcy9jb21waWxlci9zcmMvYnVpbGQvdml0ZS1wbHVnaW4tcnBnanMtbG9hZGVyLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZC92aXRlLXBsdWdpbi1ycGdqcy1sb2FkZXIudHNcIjtleHBvcnQgZnVuY3Rpb24gcnBnanNQbHVnaW5Mb2FkZXIob3V0cHV0OiBzdHJpbmcgPSAnY2xpZW50JywgaXNCdWlsZDogYm9vbGVhbiA9IGZhbHNlKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogJ3JwZ2pzLWFzc2V0cy1sb2FkZXInLFxuICAgIGVuZm9yY2U6ICdwcmUnLFxuICAgIHRyYW5zZm9ybTogIGFzeW5jIChjb2RlLCBpZDogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCByZWdleCA9IC9eKD8hLipub2RlX21vZHVsZXMoPzpcXC98XFxcXCkoPyFycGdqcy18QHJwZ2pzKSkuKiQvO1xuICAgICAgaWYgKHJlZ2V4LnRlc3QoaWQpICYmIGlkLmVuZHNXaXRoKCcudHMnKSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGNvZGU6IGBpbXBvcnQgJyR7aWR9JztcXG4ke2NvZGV9YCxcbiAgICAgICAgICBtYXA6IG51bGxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL3NhbXVlbC93d3cvUlBHLUpTLXY0L3BhY2thZ2VzL2NvbXBpbGVyL3NyYy9idWlsZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLW1hcC11cGRhdGUudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvc2FtdWVsL3d3dy9SUEctSlMtdjQvcGFja2FnZXMvY29tcGlsZXIvc3JjL2J1aWxkL3ZpdGUtcGx1Z2luLW1hcC11cGRhdGUudHNcIjtpbXBvcnQgeyBQbHVnaW4gfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IGdsb2JGaWxlcyB9IGZyb20gJy4vdXRpbHMuanMnO1xuaW1wb3J0IHsgZXJyb3JBcGksIGluZm8gfSBmcm9tICcuLi9sb2dzL3dhcm5pbmcuanMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB4bWwyanMgZnJvbSAneG1sMmpzJztcbmltcG9ydCBheGlvcyBmcm9tICcuLi9zZXJ2ZS9hcGkuanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gbWFwVXBkYXRlUGx1Z2luKF9zZXJ2ZXJVcmw/OiBzdHJpbmcpOiBQbHVnaW4ge1xuICByZXR1cm4ge1xuICAgIG5hbWU6ICd2aXRlLXBsdWdpbi1tYXAtdXBkYXRlJyxcbiAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICBjb25zdCBzZXJ2ZXJVcmwgPSBfc2VydmVyVXJsIHx8IChzZXJ2ZXIuaHR0cFNlcnZlcj8uYWRkcmVzcygpIGFzIGFueSkucG9ydFxuXG4gICAgICBzZXJ2ZXIud2F0Y2hlci5hZGQoZ2xvYkZpbGVzKCdAKHRteHx0c3gpJykpO1xuXG4gICAgICBzZXJ2ZXIud2F0Y2hlci5vbignY2hhbmdlJywgYXN5bmMgKGZpbGU6IHN0cmluZykgPT4ge1xuICAgICAgICBpZiAoZmlsZS5lbmRzV2l0aCgndG14JykpIHtcbiAgICAgICAgICBpbmZvKGBGaWxlICR7ZmlsZX0gY2hhbmdlZCwgdXBkYXRpbmcgbWFwLi4uYClcbiAgICAgICAgICAvLyBvcGVuIGZpbGVcbiAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgZnMucmVhZEZpbGUoZmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgYXhpb3MucHV0KHNlcnZlclVybCArICcvYXBpL21hcHMnLCB7XG4gICAgICAgICAgICBtYXBGaWxlOiBmaWxlLFxuICAgICAgICAgICAgZGF0YVxuICAgICAgICAgIH0pLmNhdGNoKGVycm9yQXBpKVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGZpbGUuZW5kc1dpdGgoJ3RzeCcpKSB7XG4gICAgICAgICAgaW5mbyhgRmlsZSAke2ZpbGV9IGNoYW5nZWQsIHVwZGF0aW5nIHRpbGVzZXQuLi5gKVxuICAgICAgICAgIC8vIG9wZW4gZmlsZVxuICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmcy5yZWFkRmlsZShmaWxlLCAndXRmLTgnKTtcbiAgICAgICAgICBjb25zdCBwYXJzZXIgPSBuZXcgeG1sMmpzLlBhcnNlcigpO1xuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHBhcnNlci5wYXJzZVN0cmluZ1Byb21pc2UoZGF0YSk7XG4gICAgICAgICAgYXhpb3MucHV0KHNlcnZlclVybCArICcvYXBpL3RpbGVzZXRzJywge1xuICAgICAgICAgICAgdGlsZXNldElkOiByZXN1bHQudGlsZXNldC4kLm5hbWUsXG4gICAgICAgICAgICBkYXRhXG4gICAgICAgICAgfSkuY2F0Y2goZXJyb3JBcGkpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9O1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9COzs7QUNEMlQsU0FBUyw4QkFBOEI7QUFDL1gsU0FBUyxlQUFlO0FBQ3hCLE9BQU8sVUFBVTtBQUNqQixPQUFPLG1CQUFtQjtBQUMxQixTQUFTLGlDQUFpQztB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Y0FBYyxPQUFPO0FBQzVGLE1BQUkscUJBQXFCLENBQUM7QUFDMUIsYUFBVyxPQUFPLFVBQVU7QUFDeEIsdUJBQW1CLFVBQVUsS0FBSyxJQUFJQyxNQUFLLFFBQVEsa0NBQVcsWUFBWSxrQkFBa0I7QUFBQSxFQUNoRztBQUNBLFdBQVM7QUFBQSxJQUNMLEdBQUc7QUFBQSxJQUNILFNBQVM7QUFBQSxNQUNMLEdBQUcsT0FBTztBQUFBLE1BQ1YsT0FBTztBQUFBLFFBQ0gsR0FBRyxPQUFPLFFBQVE7QUFBQSxRQUNsQixHQUFHO0FBQUEsTUFDUDtBQUFBLE1BQ0EsWUFBWSxDQUFDO0FBQUEsSUFDakI7QUFBQSxFQUNKO0FBQ0EsU0FBTztBQUFBLElBQ0gsR0FBRztBQUFBLElBQ0gsTUFBTTtBQUFBLE1BQ0YsYUFBYTtBQUFBLE1BQ2IsU0FBUztBQUFBLE1BQ1QsWUFBWTtBQUFBLFFBQ1I7QUFBQSxNQUNKO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDTCxHQUFHLGVBQWU7QUFBQSxRQUNsQjtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbInJlc29sdmUiLCAiam9pbiIsICJwYXRoIiwgIl9hIiwgIklkZW50aWZpZXJOYW1lIiwgIm9wdGlvbnMiLCAicGF0aCIsICJwYXRoIiwgInBhdGgiLCAiZnMiLCAiZXJyb3IiLCAicGF0aCIsICJmcyIsICJmcyIsICJmcyIsICJwYXRoIiwgImZzIiwgInBhdGgiLCAiZnMiLCAicGF0aCIsICJwYXRoIiwgImZzIiwgImZzIiwgInBhdGgiLCAiY29sb3JzIiwgImVycm9yIiwgImNvbG9ycyIsICJmcyIsICJwYXRoIiwgImpzb25TY2hlbWEiLCAiZXJyb3IiLCAiX2EiLCAidmFsaWRhdGUiLCAiZXh0cmFQcm9wcyIsICJjb2xvcnMiLCAiZnMiLCAicGF0aCIsICJjb2xvcnMiLCAicGF0aCIsICJmcyIsICJlbnZzIiwgImZzIiwgInBhdGgiLCAiaW1wb3J0U3RyaW5nIiwgImJhc2VuYW1lIiwgImZzIiwgImNvbmZpZyIsICJmcyIsICJmcyIsICJmcyIsICJwYXJzZXIiLCAicmVxdWlyZSIsICJyZXNvbHZlIiwgImZzIiwgImVycm9yIiwgImNvbmZpZyIsICJqb2luIiwgInBhdGgiLCAicGF0aCJdCn0K
