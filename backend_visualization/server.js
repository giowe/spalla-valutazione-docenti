'use strict';
const express = require('express');
const explorer = require('express-explorer');
const mysql = require('mysql');
const config = require('./config.json');
const parallel = require('async').parallel;
const votazione_generale = require('./endpoints/votazione_generale.js');
const votazioni_docenti = require('./endpoints/votazione_docenti.js');
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

app.use('/explorer',explorer());

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
        let docenti = [];
        rows.forEach(docente => {
          let type;
          const docente_materia = docente.materia;
          if (isInArray(docente_materia, materie.T_Scientifico)) type = "Materia Scientifica"
          if (isInArray(docente_materia, materie.T_Letteratura)) type = "Letteratura"
          if (isInArray(docente_materia, materie.T_Lingue)) type = "Lingua"
          if (isInArray(docente_materia, materie.T_Altro)) type = "Altro"
          const obj_docente = {
            id: docente.id,
            nome: docente.nome,
            cognome: docente.cognome,
            materia: docente_materia,
            tipo_materia: type
          }
          docenti.push(obj_docente);
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

app.get('/votazioni/scuola',votazione_generale);//GET VOTAZIONE GENERALE SCUOLA
app.get('/votazioni/docenti',votazioni_docenti);//GET VOTAZIONE GENERALE PER I DOCENTI

// GET DOMANDE IN BASE AL TIPO
app.get(`/domande/:type`, (req, res) => {
  const params = {
    type: req.params.type
  };
  pool.query(`SELECT * FROM domande WHERE ? ORDER BY ordine ASC`, params, (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  })
});
//GET DOCENTI PER idClasse
app.get('/docenti/:idClasse', (req, res) => {
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
//FUNZIONE CHE TI CONTROLLA SE UN VALORE è CONTENUTO IN UN ARRAY
function isInArray(value, array) {
  return array.indexOf(value) > -1;
}
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
