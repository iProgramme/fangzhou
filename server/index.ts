
import express from 'express';
import cors from 'cors';
import { query } from './db';
import { MOCK_PROJECTS, MOCK_USERS, INITIAL_DICTIONARIES, INITIAL_LOGS } from '../services/mockData';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors() as express.RequestHandler);
app.use(express.json());

// Initialize Database Tables
const initDB = async () => {
    try {
        // Projects Table
        await query(`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);
        // Users Table
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);
        // Logs Table
        await query(`
            CREATE TABLE IF NOT EXISTS logs (
                id TEXT PRIMARY KEY,
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Settings Table (for Dictionaries)
        await query(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);

        // Check if data exists, if not, seed with Mock Data
        const projectCount = await query('SELECT count(*) FROM projects');
        if (parseInt(projectCount.rows[0].count) === 0) {
            console.log('Seeding initial projects...');
            for (const p of MOCK_PROJECTS) {
                await query('INSERT INTO projects (id, data) VALUES ($1, $2)', [p.id, JSON.stringify(p)]);
            }
        }

        const userCount = await query('SELECT count(*) FROM users');
        if (parseInt(userCount.rows[0].count) === 0) {
            console.log('Seeding initial users...');
            for (const u of MOCK_USERS) {
                await query('INSERT INTO users (id, data) VALUES ($1, $2)', [u.id, JSON.stringify(u)]);
            }
        }

        const dictCheck = await query('SELECT * FROM settings WHERE key = $1', ['dictionaries']);
        if (dictCheck.rows.length === 0) {
             console.log('Seeding initial dictionaries...');
             await query('INSERT INTO settings (key, data) VALUES ($1, $2)', ['dictionaries', JSON.stringify(INITIAL_DICTIONARIES)]);
        }

        console.log('Database initialized successfully.');
    } catch (err: any) {
        console.error('Error initializing database:', err);
    }
};

// --- API Routes ---

// Projects
app.get('/api/projects', async (req, res) => {
    try {
        const result = await query('SELECT data FROM projects');
        const projects = result.rows.map(row => row.data);
        res.json(projects);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/projects', async (req, res) => {
    const project = req.body;
    try {
        await query('INSERT INTO projects (id, data) VALUES ($1, $2)', [project.id, JSON.stringify(project)]);
        res.json(project);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    const project = req.body;
    try {
        await query('UPDATE projects SET data = $1 WHERE id = $2', [JSON.stringify(project), id]);
        res.json(project);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM projects WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Users
app.get('/api/users', async (req, res) => {
    try {
        const result = await query('SELECT data FROM users');
        res.json(result.rows.map(row => row.data));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const user = req.body;
    try {
        await query('INSERT INTO users (id, data) VALUES ($1, $2)', [user.id, JSON.stringify(user)]);
        res.json(user);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const user = req.body;
    try {
        // Check if exists, else insert (upsert logic if needed, but simple update here)
        // For simplicity in user management update logic
        const exists = await query('SELECT 1 FROM users WHERE id = $1', [id]);
        if (exists.rows.length === 0) {
            await query('INSERT INTO users (id, data) VALUES ($1, $2)', [id, JSON.stringify(user)]);
        } else {
            await query('UPDATE users SET data = $1 WHERE id = $2', [JSON.stringify(user), id]);
        }
        res.json(user);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/sync', async (req, res) => {
    // Bulk update for user list replacement
    const users = req.body; // Array of users
    try {
        await query('BEGIN');
        await query('DELETE FROM users');
        for (const u of users) {
            await query('INSERT INTO users (id, data) VALUES ($1, $2)', [u.id, JSON.stringify(u)]);
        }
        await query('COMMIT');
        res.json(users);
    } catch (err: any) {
        await query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// Dictionaries
app.get('/api/dictionaries', async (req, res) => {
    try {
        const result = await query('SELECT data FROM settings WHERE key = $1', ['dictionaries']);
        if (result.rows.length > 0) {
            res.json(result.rows[0].data);
        } else {
            res.json({});
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/dictionaries', async (req, res) => {
    const dicts = req.body;
    try {
        await query(`
            INSERT INTO settings (key, data) VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET data = $2
        `, ['dictionaries', JSON.stringify(dicts)]);
        res.json(dicts);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Logs
app.get('/api/logs', async (req, res) => {
    try {
        const result = await query('SELECT data FROM logs ORDER BY created_at DESC LIMIT 500');
        res.json(result.rows.map(row => row.data));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs', async (req, res) => {
    const log = req.body;
    try {
        await query('INSERT INTO logs (id, data) VALUES ($1, $2)', [log.id, JSON.stringify(log)]);
        res.json(log);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


// Start
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initDB();
});
