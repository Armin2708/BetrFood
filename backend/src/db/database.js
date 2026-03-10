const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Store the database file in a `data` folder next to `src`
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'betrfood.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

module.exports = db;
