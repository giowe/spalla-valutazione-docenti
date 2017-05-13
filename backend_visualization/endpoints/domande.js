'use strict';
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

router.get('/domande/:type', (req, res) => {
  const params = {
    type: req.params.type
  };
  pool.query(`SELECT * FROM domande WHERE ? ORDER BY ordine ASC`, params, (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  })
});
module.exports = router;
