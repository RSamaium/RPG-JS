const fs = require('fs')

module.exports = {
    process(src, filename, config, options) {
      const bitmap = fs.readFileSync(filename);
      const base64 = Buffer.from(bitmap).toString('base64');
      return `module.exports =  'data:image/png;base64,${base64}';`;
    }
}