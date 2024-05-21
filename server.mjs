import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 3000;

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'db_biblia'
};

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

let connection;

async function createConnection() {
  try {
    connection = await mysql.createConnection(dbConfig);
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
    process.exit(1); // Salir del proceso con código de error
  }
}

createConnection();

// Middleware para gestionar el token de sesión
app.use((req, res, next) => {
  let token = req.cookies.session_token;
  if (!token) {
    token = uuidv4();
    res.cookie('session_token', token, { maxAge: 900000, httpOnly: true });
  }
  req.session_token = token;
  next();
});

app.post('/api/favorito', async (req, res) => {
  const { libro_id, capitulo, versiculo } = req.body;
  const session_token = req.session_token;

  try {
    const [result] = await connection.execute(
      'INSERT INTO favorito (session_token, libro_id, capitulo, versiculo) VALUES (?, ?, ?, ?)',
      [session_token, libro_id, capitulo, versiculo]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error Interno del Servidor' });
  }
});

app.get('/api/favorito', async (req, res) => {
  const session_token = req.session_token;

  try {
    const [rows] = await connection.execute(
      'SELECT * FROM favorito WHERE session_token = ?',
      [session_token]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error Interno del Servidor' });
  }
});

app.get('/api/libro', async (req, res) => {
  try {
    const [rows] = await connection.execute('SELECT * FROM libro');
    res.json(rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error Interno del Servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
