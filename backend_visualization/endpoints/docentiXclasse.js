const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const config = require('../config.json');
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "rds.soluzionifutura.it",
  user: "spalla_vdocenti",
  database: "spalla_vdocenti",
  password: config.dbPassword
});
router.get('/docenti/:idClasse', (req, res) => {
  const idClasse = req.params.idClasse;
  const query = [
    'SELECT d.id, d.nome, d.cognome, d.materia FROM docenti d',
    'INNER JOIN classi_docenti cd ON d.id = cd.idDocente',
    'INNER JOIN classi c ON cd.idClasse = c.id',
    'WHERE c.id = ?'
  ].join(' ');
  pool.query(query, [idClasse], (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    res.status(200).json(rows);
    return;
  });
});
module.exports = router;
