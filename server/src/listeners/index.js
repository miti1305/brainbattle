// Loads every *.js file in this folder. Each listener file subscribes to eventBus events.
// To add a listener, just create a new file here (no need to edit this file).
const fs = require('fs');
const path = require('path');

function loadListeners() {
  const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.js') && f !== 'index.js');
  for (const file of files) {
    require(path.join(__dirname, file));
  }
  if (files.length) console.log(`Event listeners loaded: ${files.join(', ')}`);
}

module.exports = { loadListeners };
