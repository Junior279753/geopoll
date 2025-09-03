// Point d'entrée pour Vercel
const path = require('path');

// Définir le chemin de la base de données pour Vercel
process.env.DB_PATH = '/tmp/geopoll.db';

// Importer et exporter l'application
const app = require('../server.js');

module.exports = app;
