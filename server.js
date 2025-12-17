// server.js
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const pg = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(express.static('public'));
// --- Datenbank-Verbindung (PostgreSQL) ---

const isRailway = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRailway ? { rejectUnauthorized: false } : false
});

// Testen der DB-Verbindung
pool.connect((err, client, done) => {
    if (err) {
        console.error('Fehler beim Verbinden mit der Datenbank:', err);
        return;
    }
    client.release();
    console.log('PostgreSQL-Datenbank verbunden!');
});

// DELETE eine Zeit
app.delete('/zeiten/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM zeiten WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET alle Zeiten
app.get('/api/zeiten', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, zeit FROM zeiten ORDER BY zeit'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Neuen Verein  anlegen i.A
app.post("/api/vereine", async (req, res) => {
    const { vereinsname } = req.body;

    try {
        const result = await pool.query(
            "INSERT INTO vereine (vereinsname) VALUES ($1) RETURNING *",
            [vereinsname]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Fehler beim Anlegen des Vereins" });
    }
});



// --- API Endpunkt: Einen einzelnen Zeitpunkt speichern ---
app.post('/api/zeiten', async (req, res) => {
    const { zeit } = req.body;
    console.log('api zeiten', zeit);
    if (!zeit) {
        // Bei einem Fehler im Input senden wir einen 400 Bad Request zurück
        return res.status(400).json({ error: 'Zeitpunkt fehlt.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO zeiten (zeit) VALUES ($1) RETURNING *',
           [zeit]
        );

        // Wenn erfolgreich, senden wir eine 201 Created Antwort zurück
        // Die Frontend-Logik (messageArea.innerHTML etc.) wird im Frontend-JS gehandhabt
        res.status(201).json({
            message: 'Termin erfolgreich gespeichert!',
            id: result.rows[0].id,
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Fehler beim Speichern des Zeitpunkts:', error);
        // Bei einem Datenbank- oder Serverfehler senden wir einen 500 Internal Server Error zurück
        res.status(500).json({ error: 'Interner Serverfehler beim Speichern.' });
    }
});




/*
// --- API: Alle Termine abrufen ---
app.get('/api/termine', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM termine ORDER BY start_zeitpunkt ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Abrufen der Termine:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Termine' });
  }
});

// --- API: Termin löschen ---
app.delete('/api/termine/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM termine WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Termin nicht gefunden' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Fehler beim Löschen des Termins:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Termins' });
  }
});

app.get('/termine', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'termine.html'));
});
*/


// --- Static Files ---
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Server starten ---
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
