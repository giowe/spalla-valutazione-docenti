'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const config = require('./config.json');
const pool  = mysql.createPool({
    connectionLimit  : 10,
    host             : "rds.soluzionifutura.it",
    user             : "spalla_vdocenti",
    database         : "spalla_vdocenti",
    password         : config.dbPassword
  }
);

const app = new express();
const port = 4000;

app.get('/domande', (req, res) => {
  pool.query('SELECT * FROM domande ORDER BY ordine ASC', (err, rows, fields) => {
    if (err) return res.status(500).json(err); 
    res.json(rows);
  })
});

app.get('/docenti/:classe', (req, res) => {
  
  pool.query('SELECT * FROM domande ORDER BY ordine ASC', (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  })
});

app.use(bodyParser.json());

app.all('*', (req, res) => {
  res.status(404).json({
    error: {
      status: 404,
      statusCode: 404,
      message: 'resource not found'
    }
  });
});

app.listen(port, () => {
  console.log(`backend listening on port ${port}`);
});
