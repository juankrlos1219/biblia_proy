import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();
const PORT = 3000;

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'db_biblia'
};

app.use(cors({ origin: 'http://localhost:5173' }));

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

app.get('/api/libro', async (req, res) => {
  try {
    const [rows] = await connection.execute('SELECT * FROM libro');
    res.json(rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error Interno del Servidor' });
  }
});

app.get('/api/versiculo/:id/capitulo/:capitulo/versiculo/:versiculo', async (req, res) => {
  const { id, capitulo, versiculo } = req.params;
  console.log(`Consultando libro ID: ${id}, capítulo: ${capitulo}, versículo: ${versiculo}`);
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM versiculo WHERE libro_id = ? AND capitulo = ? AND versiculo = ?',
      [id, capitulo, versiculo]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Versículo no encontrado' });
    }
    res.json(rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error Interno del Servidor' });
  }
});

// app.get('/api/versiculo', async (req, res) => {
//   try {
//     const [rows] = await connection.execute('SELECT distinct libro_id FROM versiculo ORDER BY libro_id');
//     res.json(rows);
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({ error: 'Error Interno del Servidor' });
//   }
// });

app.on('close', async () => {
  if (connection) {
    await connection.end();
    console.log('Conexión a la base de datos cerrada');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
