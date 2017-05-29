'use strict';
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const config = require('./config.json');
const parallel = require('async').parallel;
const votazione_generale = require('./endpoints/votazione_generale.js');
const votazioni_docenti = require('./endpoints/votazione_docenti.js');
const docentiXclasse = require('./endpoints/docentiXclasse.js');
const domandeEndpoint = require('./endpoints/domande.js');
const login = require('./endpoints/login.js')
const materie = require('./tipoMaterie.json');
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "rds.soluzionifutura.it",
  user: "spalla_vdocenti",
  database: "spalla_vdocenti",
  password: config.dbPassword
});

const app = new express();
const port = 4040;
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.options('*', (req, res) => {
  res.sendStatus(200);
});

const exposeList = (tableName, sorter) => {
  app.get(`/${tableName}`, (req, res) => {
    const limit = req.query.limit;
    const offset = req.query.offset;
    pool.query(`SELECT * FROM ${tableName} ORDER BY ${sorter} ASC ${limit? 'LIMIT ' + limit : ''} ${offset? 'OFFSET ' + offset : ''}`, (err, rows, fields) => {
      if (err) return res.status(500).json(err);
      if (tableName === 'docenti') {
        const docenti = [];
        rows.forEach(docente => {
          let type;
          const docente_materia = docente.materia;
          if (materie.T_Scientifico.includes(docente_materia)) type = "Materia Scientifica"
          if (materie.T_Letteratura.includes(docente_materia)) type = "Letteratura"
          if (materie.T_Lingue.includes(docente_materia)) type = "Lingua"
          if (materie.T_Altro.includes(docente_materia)) type = "Altro"
          // push nell'array docenti un docente
          docenti.push({
            id: docente.id,
            nome: docente.nome,
            cognome: docente.cognome,
            materia: docente_materia,
            tipo_materia: type
          });
        });
        res.json(docenti);
      } else {
        res.json(rows);
      };
    })
  });
};
//I VARI GET UTILI
exposeList('domande', 'ordine');
exposeList('docenti', 'cognome');

app.get('/votazioni/scuola', votazione_generale); //GET VOTAZIONE GENERALE SCUOLA
app.get('/votazioni/docenti', votazioni_docenti); //GET VOTAZIONE GENERALE PER I DOCENTI
app.get('/docenti/:idClasse', docentiXclasse); //GET DOCENTI PER idClasse
app.get(`/domande/:type`, domandeEndpoint); // GET DOMANDE IN BASE AL TIPO

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
  console.log(`IN ASCOLTO ALLA PORTA : ${port}`);
});
