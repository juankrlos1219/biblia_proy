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

app.delete('/api/favorito/:id', async (req, res) => {
  console.log('DELETE request received at /api/favorito/:id');
  const favoritoId = req.params.id;
  const session_token = req.session_token;
  
  console.log('ID del favorito a eliminar:', favoritoId);
  
  try {
    await connection.execute(
      'DELETE FROM nota WHERE favorito_id = ?',
      [favoritoId]
    );

    const [result] = await connection.execute(
      'DELETE FROM favorito WHERE id = ? AND session_token = ?',
      [favoritoId, session_token]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Favorito eliminado exitosamente' });
    } else {
      res.status(404).json({ error: 'Favorito no encontrado' });
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
      `SELECT favorito.*, libro.nombre_libro, nota.nota 
       FROM favorito 
       JOIN libro ON favorito.libro_id = libro.id
       LEFT JOIN nota ON favorito.id = nota.favorito_id
       WHERE favorito.session_token = ?`,
      [session_token]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error Interno del Servidor' });
  }
});

app.post('/api/nota/:favoritoId', async (req, res) => {
  const favoritoId = req.params.favoritoId;
  const { nota } = req.body;

  try {
    const [rows] = await connection.execute(
      'SELECT * FROM nota WHERE favorito_id = ?',
      [favoritoId]
    );

    if (rows.length > 0) {
      return res.status(400).json({ error: 'Este favorito ya tiene una nota guardada' });
    }

    const [result] = await connection.execute(
      'INSERT INTO nota (favorito_id, nota) VALUES (?, ?)',
      [favoritoId, nota]
    );
    res.status(201).json({ message: 'Nota guardada exitosamente' });
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
