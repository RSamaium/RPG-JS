var sax = require('sax');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var Pend = require('pend');
const { isBrowser } = require('../../common/Utils')

exports.readFile = defaultReadFile;
exports.parseFile = parseFile;
exports.parse = parse;
exports.Map = Map;
exports.TileSet = TileSet;
exports.Image = Image;
exports.Tile = Tile;
exports.TileLayer = TileLayer;
exports.ObjectLayer = ObjectLayer;
exports.ImageLayer = ImageLayer;
exports.TmxObject = TmxObject;
exports.Terrain = Terrain;

var FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
var FLIPPED_VERTICALLY_FLAG   = 0x40000000;
var FLIPPED_DIAGONALLY_FLAG   = 0x20000000;

var STATE_COUNT = 0;
var STATE_START                = STATE_COUNT++;
var STATE_MAP                  = STATE_COUNT++;
var STATE_COLLECT_PROPS        = STATE_COUNT++;
var STATE_COLLECT_ANIMATIONS   = STATE_COUNT++;
var STATE_COLLECT_OBJECT_GROUPS = STATE_COUNT++;
var STATE_WAIT_FOR_CLOSE       = STATE_COUNT++;
var STATE_TILESET              = STATE_COUNT++;
var STATE_TILE                 = STATE_COUNT++;
var STATE_TILE_LAYER           = STATE_COUNT++;
var STATE_OBJECT_LAYER         = STATE_COUNT++;
var STATE_OBJECT               = STATE_COUNT++;
var STATE_TILE_OBJECT          = STATE_COUNT++;
var STATE_IMAGE_LAYER          = STATE_COUNT++;
var STATE_TILE_DATA_XML        = STATE_COUNT++;
var STATE_TILE_DATA_CSV        = STATE_COUNT++;
var STATE_TILE_DATA_B64_RAW    = STATE_COUNT++;
var STATE_TILE_DATA_B64_GZIP   = STATE_COUNT++;
var STATE_TILE_DATA_B64_ZLIB   = STATE_COUNT++;
var STATE_TERRAIN_TYPES        = STATE_COUNT++;
var STATE_TERRAIN              = STATE_COUNT++;

function parse(content, pathToFile, cb) {
  var pathToDir = path.dirname(pathToFile);
  var parser = sax.parser();
  var map;
  var topLevelObject = null;
  var state = STATE_START;
  var states = new Array(STATE_COUNT);
  var waitForCloseNextState = 0;
  var waitForCloseOpenCount = 0;
  var propertiesObject = null;
  var propertiesNextState = 0;
  var animationsObject = null;
  var animationsNextState = 0;
  var objectGroupsObject = null;
  var objectGroupsNextState = 0;
  var tileIndex = 0;
  var tileSet = null;
  var tileSetNextState = 0;
  var tile;
  var layer;
  var object;
  var terrain;
  var pend = new Pend();
  // this holds the numerical tile ids
  // later we use it to resolve the real tiles
  var unresolvedLayers = [];
  var unresolvedLayer;
  states[STATE_START] = {
    opentag: function(tag) {
      if (tag.name === 'MAP') {
        map = new Map();
        topLevelObject = map;
        map.version = tag.attributes.VERSION;
        map.orientation = tag.attributes.ORIENTATION;
        map.width = int(tag.attributes.WIDTH);
        map.height = int(tag.attributes.HEIGHT);
        map.tileWidth = int(tag.attributes.TILEWIDTH);
        map.tileHeight = int(tag.attributes.TILEHEIGHT);
        map.backgroundColor = tag.attributes.BACKGROUNDCOLOR;

        state = STATE_MAP;
      } else if (tag.name === 'TILESET') {
        collectTileSet(tag, STATE_START);
        topLevelObject = tileSet;
      } else {
        waitForClose();
      }
    },
    closetag: noop,
    text: noop,
  };
  states[STATE_MAP] = {
    opentag: function(tag) {
      switch (tag.name) {
        case 'PROPERTIES':
          collectProperties(map.properties);
          break;
        case 'TILESET':
          collectTileSet(tag, STATE_MAP);
          map.tileSets.push(tileSet);
          break;
        case 'LAYER':
          layer = new TileLayer(map);
          tileIndex = 0;
          layer.name = tag.attributes.NAME;
          layer.opacity = float(tag.attributes.OPACITY, 1);
          layer.visible = bool(tag.attributes.VISIBLE, true);
          map.layers.push(layer);
          unresolvedLayer = {
            layer: layer,
            tiles: new Array(map.width * map.height),
          };
          unresolvedLayers.push(unresolvedLayer);
          state = STATE_TILE_LAYER;
          break;
        case 'OBJECTGROUP':
          layer = new ObjectLayer();
          layer.name = tag.attributes.NAME;
          layer.color = tag.attributes.COLOR;
          layer.opacity = float(tag.attributes.OPACITY, 1);
          layer.visible = bool(tag.attributes.VISIBLE, true);
          map.layers.push(layer);
          state = STATE_OBJECT_LAYER;
          break;
        case 'IMAGELAYER':
          layer = new ImageLayer();
          layer.name = tag.attributes.NAME;
          layer.x = int(tag.attributes.X);
          layer.y = int(tag.attributes.Y);
          layer.opacity = float(tag.attributes.OPACITY, 1);
          layer.visible = bool(tag.attributes.VISIBLE, true);
          map.layers.push(layer);
          state = STATE_IMAGE_LAYER;
          break;
        default:
          waitForClose();
      }
    },
    closetag: noop,
    text: noop,
  };
  states[STATE_TILESET] = {
    opentag: function(tag) {
      switch (tag.name) {
        case 'TILEOFFSET':
          tileSet.tileOffset.x = int(tag.attributes.X);
          tileSet.tileOffset.y = int(tag.attributes.Y);
          waitForClose();
          break;
        case 'PROPERTIES':
          collectProperties(tileSet.properties);
          break;
        case 'IMAGE':
          tileSet.image = collectImage(tag);
          break;
        case 'TERRAINTYPES':
          state = STATE_TERRAIN_TYPES;
          break;
        case 'TILE':
          tile = new Tile();
          tile.id = int(tag.attributes.ID);
          if (tag.attributes.TERRAIN) {
            var indexes = tag.attributes.TERRAIN.split(",");
            tile.terrain = indexes.map(resolveTerrain);
          }
          tile.probability = float(tag.attributes.PROBABILITY);
          tileSet.tiles[tile.id] = tile;
          state = STATE_TILE;
          break;
        default:
          waitForClose();
      }
    },
    closetag: function(name) {
      state = tileSetNextState;
    },
    text: noop,
  };
  states[STATE_COLLECT_PROPS] = {
    opentag: function(tag) {
      if (tag.name === 'PROPERTY') {
        propertiesObject[tag.attributes.NAME] = parseProperty(
          tag.attributes.VALUE,
          tag.attributes.TYPE
        );
      }
      waitForClose();
    },
    closetag: function(name) {
      state = propertiesNextState;
    },
    text: noop,
  };
  states[STATE_COLLECT_ANIMATIONS] = {
    opentag: function(tag) {
      if (tag.name === 'FRAME') {
          animationsObject.push({
              'tileId': tag.attributes.TILEID,
              'duration': tag.attributes.DURATION
          });
      }
      waitForClose();
    },
    closetag: function(name) {
      state = animationsNextState;
    },
    text: noop,
  };
  states[STATE_COLLECT_OBJECT_GROUPS] = {
    opentag: function(tag) {
      if (tag.name === 'OBJECT') {
        object = new TmxObject();
        object.name = tag.attributes.NAME;
        object.type = tag.attributes.TYPE;
        object.x = int(tag.attributes.X);
        object.y = int(tag.attributes.Y);
        object.width = int(tag.attributes.WIDTH, 0);
        object.height = int(tag.attributes.HEIGHT, 0);
        object.rotation = float(tag.attributes.ROTATION, 0);
        object.gid = int(tag.attributes.GID);
        object.visible = bool(tag.attributes.VISIBLE, true);
        objectGroupsObject.push(object);
        state = STATE_TILE_OBJECT;
      } else {
        waitForClose();
      }
    },
    closetag: function(name) {
      state = objectGroupsNextState;
    },
    text: noop
  };
  states[STATE_WAIT_FOR_CLOSE] = {
    opentag: function(tag) {
      waitForCloseOpenCount += 1;
    },
    closetag: function(name) {
      waitForCloseOpenCount -= 1;
      if (waitForCloseOpenCount === 0) state = waitForCloseNextState;
    },
    text: noop,
  };
  states[STATE_TILE] = {
    opentag: function(tag) {
      if (tag.name === 'PROPERTIES') {
        collectProperties(tile.properties);
      } else if (tag.name === 'IMAGE') {
        tile.image = collectImage(tag);
      } else if (tag.name === 'ANIMATION') {
        tile.animation = collectAnimations(tile.animations);
      } else if (tag.name === 'OBJECTGROUP') {
        tile.objectGroup = collectObjectGroups(tile.objectGroups);
      } else {
        waitForClose();
      }
    },
    closetag: function(name) {
      state = STATE_TILESET
    },
    text: noop,
  };
  states[STATE_TILE_LAYER] = {
    opentag: function(tag) {
      if (tag.name === 'PROPERTIES') {
        collectProperties(layer.properties);
      } else if (tag.name === 'DATA') {
        var dataEncoding = tag.attributes.ENCODING;
        var dataCompression = tag.attributes.COMPRESSION;
        switch (dataEncoding) {
          case undefined:
          case null:
            state = STATE_TILE_DATA_XML;
            break;
          case 'csv':
            state = STATE_TILE_DATA_CSV;
            break;
          case 'base64':
            switch (dataCompression) {
              case undefined:
              case null:
                state = STATE_TILE_DATA_B64_RAW;
                break;
              case 'gzip':
                state = STATE_TILE_DATA_B64_GZIP;
                break;
              case 'zlib':
                state = STATE_TILE_DATA_B64_ZLIB;
                break;
              default:
                error(new Error("unsupported data compression: " + dataCompression));
                return;
            }
            break;
          default:
            error(new Error("unsupported data encoding: " + dataEncoding));
            return;
        }
      } else {
        waitForClose();
      }
    },
    closetag: function(name) {
      state = STATE_MAP;
    },
    text: noop,
  };
  states[STATE_OBJECT_LAYER] = {
    opentag: function(tag) {
      if (tag.name === 'PROPERTIES') {
        collectProperties(layer.properties);
      } else if (tag.name === 'OBJECT') {
        object = new TmxObject();
        object.name = tag.attributes.NAME;
        object.type = tag.attributes.TYPE;
        object.x = int(tag.attributes.X);
        object.y = int(tag.attributes.Y);
        object.width = int(tag.attributes.WIDTH, 0);
        object.height = int(tag.attributes.HEIGHT, 0);
        object.rotation = float(tag.attributes.ROTATION, 0);
        object.gid = int(tag.attributes.GID);
        object.visible = bool(tag.attributes.VISIBLE, true);
        layer.objects.push(object);
        state = STATE_OBJECT;
      } else {
        waitForClose();
      }
    },
    closetag: function(name) {
      state = STATE_MAP;
    },
    text: noop,
  };
  states[STATE_IMAGE_LAYER] = {
    opentag: function(tag) {
      if (tag.name === 'PROPERTIES') {
        collectProperties(layer.properties);
      } else if (tag.name === 'IMAGE') {
        layer.image = collectImage(tag);
      } else {
        waitForClose();
      }
    },
    closetag: function(name) {
      state = STATE_MAP;
    },
    text: noop,
  };
  states[STATE_OBJECT] = {
    opentag: function(tag) {
      switch (tag.name) {
        case 'PROPERTIES':
          collectProperties(object.properties);
          break;
        case 'ELLIPSE':
          object.ellipse = true;
          waitForClose();
          break;
        case 'POLYGON':
          object.polygon = parsePoints(tag.attributes.POINTS);
          waitForClose();
          break;
        case 'POLYLINE':
          object.polyline = parsePoints(tag.attributes.POINTS);
          waitForClose();
          break;
        case 'IMAGE':
          object.image = collectImage(tag);
          break;
        default:
          waitForClose();
      }
    },
    closetag: function(name) {
      state = STATE_OBJECT_LAYER;
    },
    text: noop,
  };
  states[STATE_TILE_OBJECT] = {
    opentag: function(tag) {
      switch (tag.name) {
        case 'PROPERTIES':
          collectProperties(object.properties);
          break;
        case 'ELLIPSE':
          object.ellipse = true;
          waitForClose();
          break;
        case 'POLYGON':
          object.polygon = parsePoints(tag.attributes.POINTS);
          waitForClose();
          break;
        case 'POLYLINE':
          object.polyline = parsePoints(tag.attributes.POINTS);
          waitForClose();
          break;
        case 'IMAGE':
          object.image = collectImage(tag);
          break;
        default:
          waitForClose();
      }
    },
    closetag: function(name) {
      state = STATE_COLLECT_OBJECT_GROUPS;
    },
    text: noop
  };
  states[STATE_TILE_DATA_XML] = {
    opentag: function(tag) {
      if (tag.name === 'TILE') {
        saveTile(int(tag.attributes.GID, 0));
      }
      waitForClose();
    },
    closetag: function(name) {
      state = STATE_TILE_LAYER;
    },
    text: noop,
  };
  states[STATE_TILE_DATA_CSV] = {
    opentag: function(tag) {
      waitForClose();
    },
    closetag: function(name) {
      state = STATE_TILE_LAYER;
    },
    text: function(text) {
      text.split(",").forEach(function(c) {
        saveTile(parseInt(c, 10));
      });
    },
  };
  states[STATE_TILE_DATA_B64_RAW] = {
    opentag: function(tag) {
      waitForClose();
    },
    closetag: function(name) {
      state = STATE_TILE_LAYER;
    },
    text: function(text) {
      unpackTileBytes(new Buffer(text.trim(), 'base64'));
    },
  };
  states[STATE_TILE_DATA_B64_GZIP] = {
    opentag: function(tag) {
      waitForClose();
    },
    closetag: function(name) {
      state = STATE_TILE_LAYER;
    },
    text: function(text) {
      var zipped = new Buffer(text.trim(), 'base64');
      var oldUnresolvedLayer = unresolvedLayer;
      var oldLayer = layer;
      pend.go(function(cb) {
        zlib.gunzip(zipped, function(err, buf) {
          if (err) {
            cb(err);
            return;
          }
          unresolvedLayer = oldUnresolvedLayer;
          layer = oldLayer;
          unpackTileBytes(buf);
          cb();
        });
      });
    },
  };
  states[STATE_TILE_DATA_B64_ZLIB] = {
    opentag: function(tag) {
      waitForClose();
    },
    closetag: function(name) {
      state = STATE_TILE_LAYER;
    },
    text: function(text) {
      var zipped = new Buffer(text.trim(), 'base64');
      var oldUnresolvedLayer = unresolvedLayer;
      var oldLayer = layer;
      pend.go(function(cb) {
        zlib.inflate(zipped, function(err, buf) {
          if (err) {
            cb(err);
            return;
          }
          layer = oldLayer;
          unresolvedLayer = oldUnresolvedLayer;
          unpackTileBytes(buf);
          cb();
        });
      });
    },
  };
  states[STATE_TERRAIN_TYPES] = {
    opentag: function(tag) {
      if (tag.name === 'TERRAIN') {
        terrain = new Terrain();
        terrain.name = tag.attributes.NAME;
        terrain.tile = int(tag.attributes.TILE);
        tileSet.terrainTypes.push(terrain);
        state = STATE_TERRAIN;
      } else {
        waitForClose();
      }
    },
    closetag: function(name) {
      state = STATE_TILESET;
    },
    text: noop,
  };
  states[STATE_TERRAIN] = {
    opentag: function(tag) {
      if (tag.name === 'PROPERTIES') {
        collectProperties(terrain.properties);
      } else {
        waitForClose();
      }
    },
    closetag: function(name) {
      state = STATE_TERRAIN_TYPES;
    },
    text: noop,
  };

  parser.onerror = cb;
  parser.onopentag = function(tag) {
    states[state].opentag(tag);
  };
  parser.onclosetag = function(name) {
    states[state].closetag(name);
  };
  parser.ontext = function(text) {
    states[state].text(text);
  };
  parser.onend = function() {
    // wait until async stuff has finished
    pend.wait(function(err) {
      if (err) {
        cb(err);
        return;
      }
      // now all tilesets are resolved and all data is decoded
      unresolvedLayers.forEach(resolveLayer);
      cb(null, topLevelObject);
    });
  };
  parser.write(content).close();

  function resolveTerrain(terrainIndexStr) {
    return tileSet.terrainTypes[parseInt(terrainIndexStr, 10)];
  }

  function saveTile(gid) {
    layer.horizontalFlips[tileIndex] = !!(gid & FLIPPED_HORIZONTALLY_FLAG);
    layer.verticalFlips[tileIndex]   = !!(gid & FLIPPED_VERTICALLY_FLAG);
    layer.diagonalFlips[tileIndex]   = !!(gid & FLIPPED_DIAGONALLY_FLAG);

    gid &= ~(FLIPPED_HORIZONTALLY_FLAG |
             FLIPPED_VERTICALLY_FLAG |
             FLIPPED_DIAGONALLY_FLAG);

    unresolvedLayer.tiles[tileIndex] = gid;

    tileIndex += 1;
  }

  function collectImage(tag) {
    var img = new Image();
    img.format = tag.attributes.FORMAT;
    img.source = tag.attributes.SOURCE;
    img.trans = tag.attributes.TRANS;
    img.width = int(tag.attributes.WIDTH);
    img.height = int(tag.attributes.HEIGHT);

    // TODO: read possible <data>
    waitForClose();
    return img;
  }

  function collectTileSet(tag, nextState) {
    tileSet = new TileSet();
    tileSet.firstGid = int(tag.attributes.FIRSTGID);
    tileSet.source = tag.attributes.SOURCE;
    tileSet.name = tag.attributes.NAME;
    tileSet.tileWidth = int(tag.attributes.TILEWIDTH);
    tileSet.tileHeight = int(tag.attributes.TILEHEIGHT);
    tileSet.spacing = int(tag.attributes.SPACING);
    tileSet.margin = int(tag.attributes.MARGIN);

    if (tileSet.source) {
      pend.go(function(cb) {
        resolveTileSet(tileSet, cb);
      });
    }

    state = STATE_TILESET;
    tileSetNextState = nextState;
  }

  function collectProperties(obj) {
    propertiesObject = obj;
    propertiesNextState = state;
    state = STATE_COLLECT_PROPS;
  }

  function collectAnimations(obj) {
    animationsObject = obj;
    animationsNextState = state;
    state = STATE_COLLECT_ANIMATIONS;
  }

  function collectObjectGroups(obj) {
    objectGroupsObject = obj;
    objectGroupsNextState = state;
    state = STATE_COLLECT_OBJECT_GROUPS;
  }

  function waitForClose() {
    waitForCloseNextState = state;
    state = STATE_WAIT_FOR_CLOSE;
    waitForCloseOpenCount = 1;
  }

  function error(err) {
    parser.onerror = null;
    parser.onopentag = null;
    parser.onclosetag = null;
    parser.ontext = null;
    parser.onend = null;
    cb(err);
  }

  function resolveTileSet(unresolvedTileSet, cb) {
    var target = path.join(pathToDir, unresolvedTileSet.source);
    parseFile(target, function(err, resolvedTileSet) {
      if (err) {
        cb(err);
        return;
      }
      resolvedTileSet.mergeTo(unresolvedTileSet);
      cb();
    });
  }

  function resolveLayer(unresolvedLayer) {
    for (var i = 0; i < unresolvedLayer.tiles.length; i += 1) {
      var globalTileId = unresolvedLayer.tiles[i];
      for (var tileSetIndex = map.tileSets.length - 1;
          tileSetIndex >= 0; tileSetIndex -= 1)
      {
        var tileSet = map.tileSets[tileSetIndex];
        if (tileSet.firstGid <= globalTileId) {
          var tileId = globalTileId - tileSet.firstGid;
          var tile = tileSet.tiles[tileId];
          if (!tile) {
            // implicit tile
            tile = new Tile();
            tile.id = tileId;
            tileSet.tiles[tileId] = tile;
          }
          tile.gid = globalTileId;
          unresolvedLayer.layer.tiles[i] = tile;
          break;
        }
      }
    }
  }

  function unpackTileBytes(buf) {
    var expectedCount = map.width * map.height * 4;
    if (buf.length !== expectedCount) {
      error(new Error("Expected " + expectedCount +
            " bytes of tile data; received " + buf.length));
      return;
    }
    tileIndex = 0;
    for (var i = 0; i < expectedCount; i += 4) {
      saveTile(buf.readUInt32LE(i));
    }
  }
}

function defaultReadFile(name, cb) {
  if (!isBrowser()) {
    fs.readFile(name, { encoding: 'utf8' }, cb)
  }
  else {
    fetch('/tmx/' + name).then(res => res.text()).then((val) => {
      cb(null, val)
    }).catch(cb)
  }
}

function parseFile(name, cb) {
  exports.readFile(name, function(err, content) {
    if (err) {
      cb(err);
    } else {
      parse(content, name, cb);
    }
  });
}

function parsePoints(str) {
  var points = str.split(" ");
  return points.map(function(pt) {
    var xy = pt.split(",");
    return {
      x: xy[0],
      y: xy[1],
    };
  });
}

function parseProperty(value, type) {
  switch (type) {
    case 'int':
      return parseInt(value, 10);
    case 'float':
      return parseFloat(value, 2);
    case 'bool':
      return value === 'true';
    default:
      return value;
  }

}

function noop() {}

function int(value, defaultValue) {
  defaultValue = defaultValue == null ? null : defaultValue;
  return value == null ? defaultValue : parseInt(value, 10);
}

function bool(value, defaultValue) {
  defaultValue = defaultValue == null ? null : defaultValue;
  return value == null ? defaultValue : !!parseInt(value, 10);
}

function float(value, defaultValue) {
  defaultValue = defaultValue == null ? null : defaultValue;
  return value == null ? defaultValue : parseFloat(value, 10);
}

function Map() {
  this.version = null;
  this.orientation = "orthogonal";
  this.width = 0;
  this.height = 0;
  this.tileWidth = 0;
  this.tileHeight = 0;
  this.backgroundColor = null;

  this.layers = [];
  this.properties = {};
  this.tileSets = [];
}

function TileSet() {
  this.firstGid = 0;
  this.source = "";
  this.name = "";
  this.tileWidth = 0;
  this.tileHeight = 0;
  this.spacing = 0;
  this.margin = 0;
  this.tileOffset = {x: 0, y: 0};
  this.properties = {};
  this.image = null;
  this.tiles = [];
  this.terrainTypes = [];
}

TileSet.prototype.mergeTo = function(other) {
  other.firstGid = this.firstGid == null ? other.firstGid : this.firstGid;
  other.source = this.source == null ? other.source : this.source;
  other.name = this.name == null ? other.name : this.name;
  other.tileWidth = this.tileWidth == null ? other.tileWidth : this.tileWidth;
  other.tileHeight = this.tileHeight == null ? other.tileHeight : this.tileHeight;
  other.spacing = this.spacing == null ? other.spacing : this.spacing;
  other.margin = this.margin == null ? other.margin : this.margin;
  other.tileOffset = this.tileOffset == null ? other.tileOffset : this.tileOffset;
  other.properties = this.properties == null ? other.properties : this.properties;
  other.image = this.image == null ? other.image : this.image;
  other.tiles = this.tiles == null ? other.tiles : this.tiles;
  other.terrainTypes = this.terrainTypes == null ? other.terrainTypes : this.terrainTypes;
};

function Image() {
  this.format = null;
  this.source = "";
  this.trans = null;
  this.width = 0;
  this.height = 0;
}

function Tile() {
  this.id = 0;
  this.terrain = [];
  this.probability = null;
  this.properties = {};
  this.animations = [];
  this.objectGroups = [];
  this.image = null;
}

function TileLayer(map) {
  var tileCount = map.width * map.height;
  this.map = map;
  this.type = "tile";
  this.name = null;
  this.opacity = 1;
  this.visible = true;
  this.properties = {};
  this.tiles = new Array(tileCount);
  this.horizontalFlips = new Array(tileCount);
  this.verticalFlips = new Array(tileCount);
  this.diagonalFlips = new Array(tileCount);
}

TileLayer.prototype.tileAt = function(x, y) {
  return this.tiles[y * this.map.width + x];
};

TileLayer.prototype.setTileAt = function(x, y, tile) {
  this.tiles[y * this.map.width + x] = tile;
};

function ObjectLayer() {
  this.type = "object";
  this.name = null;
  this.color = null;
  this.opacity = 1;
  this.visible = true;
  this.properties = {};
  this.objects = [];
}

function ImageLayer() {
  this.type = "image";
  this.name = null;
  this.x = 0;
  this.y = 0;
  this.opacity = 1;
  this.visible = true;
  this.properties = {};
  this.image = null;
}

function TmxObject() {
  this.name = null;
  this.type = null;
  this.x = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;
  this.rotation = 0;
  this.properties = {};
  this.gid = null;
  this.visible = true;
  this.ellipse = false;
  this.polygon = null;
  this.polyline = null;
}

function Terrain() {
  this.name = "";
  this.tile = 0;
  this.properties = {};
}