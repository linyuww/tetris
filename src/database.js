const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../tetris.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        wins INTEGER DEFAULT 0
    )`);
});

module.exports = {
    registerUser: (username, password) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
            stmt.run(username, password, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            stmt.finalize();
        });
    },

    loginUser: (username, password) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    incrementWins: (username) => {
        return new Promise((resolve, reject) => {
            db.run("UPDATE users SET wins = wins + 1 WHERE username = ?", [username], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    },

    getUserStats: (username) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT username, wins FROM users WHERE username = ?", [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    getLeaderboard: () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT username, wins FROM users ORDER BY wins DESC LIMIT 10", (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
};
