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
    process.exit(1);
  }
}

createConnection();

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
    const [rows] = await connection.execute(
      'SELECT * FROM favorito WHERE session_token = ? AND libro_id = ? AND capitulo = ? AND versiculo = ?',
      [session_token, libro_id, capitulo, versiculo]
    );
    
    if (rows.length > 0) {
      return res.status(400).json({ error: 'El versículo ya está en favoritos' });
    }

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

// Endpoint para eliminar un favorito específico por ID de libro
app.delete('/api/favorito/libro/:libro_id', async (req, res) => {
  console.log('DELETE request received at /api/favorito/libro/:libro_id');
  const libroId = req.params.libro_id;
  const session_token = req.session_token;
  
  console.log('ID del libro del favorito a eliminar:', libroId);
  
  try {
    const [result] = await connection.execute(
      'DELETE FROM favorito WHERE libro_id = ? AND session_token = ?',
      [libroId, session_token]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Favoritos del libro eliminados exitosamente' });
    } else {
      res.status(404).json({ error: 'Favoritos del libro no encontrados' });
    }
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

app.get('/api/versiculo/:libro_id/capitulo/:capitulo/versiculo/:versiculo', async (req, res) => {
  const { libro_id, capitulo, versiculo } = req.params;

  try {
    const [rows] = await connection.execute(
      'SELECT * FROM versiculo WHERE libro_id = ? AND capitulo = ? AND versiculo = ?',
      [libro_id, capitulo, versiculo]
    );
    if (rows.length > 0) {
      res.json(rows);
    } else {
      res.status(404).json({ error: 'Versículo no encontrado' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error Interno del Servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
