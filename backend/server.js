import 'dotenv/config';             
import express from 'express';
import cors from 'cors';
import { Sequelize, DataTypes } from 'sequelize';
import * as jose from 'jose';

const app = express();

const DB_SCHEMA = process.env.DB_SCHEMA || 'public';
const useSsl = process.env.PGSSLMODE === 'require';
const ASGARDEO_ORG = process.env.ASGARDEO_ORG || 'nathanpalomera';
const JWKS_URI = `https://api.asgardeo.io/t/${ASGARDEO_ORG}/oauth2/jwks`;

app.use(cors());
app.use(express.json());

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER,
  process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    dialectOptions: useSsl ? { ssl: { require: true, rejectUnauthorized: false } } : undefined,
    define: { schema: DB_SCHEMA },
  });

const Puppies = sequelize.define('puppies', {
  id:      { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  name:    { type: DataTypes.STRING(100), allowNull: false },
  breed:   { type: DataTypes.STRING(100), allowNull: false },
  age:     { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.STRING(255), allowNull: true },
}, { schema: DB_SCHEMA, tableName: 'puppies', timestamps: false });

async function authMiddleware(req, res, next) {
  const authHeader = (req.headers.authorization || '').trim();

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Missing auth',
      detail: 'Send Authorization: Bearer <access_token>',
    });
  }

  const token = authHeader.slice(7).trim();
  const looksLikeJwt = token && token.split('.').length === 3;

  if (!looksLikeJwt) {
    return res.status(401).json({
      error: 'Access token is not a JWT. In Asgardeo, set your app to use JWT access tokens (Protocol tab).',
    });
  }

  try {
    const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URI));
    const { payload } = await jose.jwtVerify(token, JWKS);
    req.userId = payload.sub;
    return next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
  }
}

app.use('/puppies', authMiddleware);
app.get('/', (_req, res) => res.redirect('/puppies'));

app.get('/puppies', async (req, res) => {
  try {
    const allPuppies = await Puppies.findAll({ where: { user_id: req.userId } });
    res.json(allPuppies);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch puppies' });
  }
});

app.get('/puppies/:id', async (req, res) => {
  try {
    const puppy = await Puppies.findByPk(req.params.id);
    if (!puppy) return res.status(404).json({ error: 'Puppy not found' });
    if (puppy.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    res.json(puppy);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch puppy' });
  }
});

app.post('/puppies', async (req, res) => {
  try {
    const { name, breed, age } = req.body;
    const newPuppy = await Puppies.create({ name, breed, age, user_id: req.userId });
    res.status(201).json(newPuppy);
  } catch (e) {
    res.status(400).json({ error: 'Failed to create puppy', details: e.message });
  }
});

app.put('/puppies/:id', async (req, res) => {
  try {
    const puppy = await Puppies.findByPk(req.params.id);
    if (!puppy) return res.status(404).json({ error: 'Puppy not found' });
    if (puppy.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    const { name, breed, age } = req.body;
    await puppy.update({ name, breed, age });
    res.json(puppy);
  } catch (e) {
    res.status(400).json({ error: 'Failed to update puppy', details: e.message });
  }
});

app.delete('/puppies/:id', async (req, res) => {
  try {
    const puppy = await Puppies.findByPk(req.params.id);
    if (!puppy) return res.status(404).json({ error: 'Puppy not found' });
    if (puppy.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });
    await puppy.destroy();
    res.json({ message: `Puppy ${req.params.id} deleted successfully` });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete puppy' });
  }
});

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected...');
    await Puppies.sync({ alter: true });
    console.log(`Puppies model synced in schema "${DB_SCHEMA}".`);
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
  } catch (err) {
    console.error('Error: ', err);
    process.exit(1);
  }
};

startServer();