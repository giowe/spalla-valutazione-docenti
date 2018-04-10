const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const config = require('./config.json');
const uuid = require('uuid/v4');
const sezioneCorrente = process.argv[2];

let ipStudenti = [];

if (!sezioneCorrente) throw new Error('Devi specificare la sezione alla quale stai somministrando il test');
console.log(`STAI SOMMINISTRANDO IL TEST ALLA SEZIONE ${sezioneCorrente}`);
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'rds.soluzionifutura.it',
  user: 'spalla_vdocenti',
  database: 'spalla_vdocenti',
  password: config.dbPassword
});
const app = new express();
const port = 4000;

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
    const { limit, offset } = req.query;
    
    pool.query(`SELECT * FROM ${tableName} ORDER BY ${sorter} ASC ${limit? 'LIMIT ' + limit : ''} ${offset? 'OFFSET ' + offset : ''}`, (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    })
  });
};

exposeList('classi', 'id');
exposeList('domande', 'ordine');
exposeList('docenti', 'cognome');
//exposeList('votazioni', 'idDocente');
exposeList('studenti', 'idClasse');

app.get(`/votazioni`, (req, res) => {
  const { limit, offset } = req.query;
  let { where } = req.query;
  
  let whereString;
  if (where){
    try {
      where = JSON.parse(where);
      whereString = [];
      Object.entries(where).forEach(([key, value]) => {
        const type = typeof value;
        if (type === 'object') {
          //todo per un where piu' peso. non succedera' mai.
        } else {
          whereString.push(`${mysql.escapeId(key)} = ${mysql.escape(value)}`);
        }
      });
      if (whereString.length) {
        whereString = `WHERE ${whereString.join(' AND ')}`;
      } else {
        whereString = '';
      }

    } catch(err) {
      console.log(err);
      where = null;
    }
  }

  const query = `SELECT votazioni.*, studenti.idClasse, docenti.cognome AS cognomeDocente, docenti.nome AS nomeDocente, docenti.materia AS materiaDocente FROM votazioni
   INNER JOIN studenti ON votazioni.idStudente = studenti.id
   INNER JOIN docenti ON votazioni.idDocente = docenti.id 
   ${whereString || ''}
   ORDER BY idDocente ASC ${limit? 'LIMIT ' + limit : ''} ${offset? 'OFFSET ' + offset : ''}`;
  console.log(query);
  pool.query(query, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json({
      count: rows.length,
      data: rows
    });
  })
});


app.get(`/domande/:type`, (req, res) => {
  const params = {
    type: req.params.type
  };

  pool.query(`SELECT * FROM domande WHERE ? ORDER BY ordine ASC`, params, (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  })
});

app.get('/docenti/:classe', (req, res) => {
  let classe = req.params.classe;
  if (classe === 'current') classe = sezioneCorrente;

  const query = [
    'SELECT d.id, d.nome, d.cognome, d.materia FROM docenti d',
    'INNER JOIN classi_docenti cd ON d.id = cd.idDocente',
    'INNER JOIN classi c ON cd.idClasse = c.id',
    'WHERE c.id = ?'
  ].join(' ');

  pool.query(query, [classe], (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  })
});

const checkDuplicated = (req, res, next) => {
  next();
};

app.post('/votazioni', checkDuplicated, (req, res) => {
  const { body } = req.body; /*require('./fake-data.json');*/
  const studente = {
    id: uuid(),
    idClasse: req.query.classe || sezioneCorrente
  };
  const votazioni = [];
  body.docenti.forEach(docente => {
    docente.domande.forEach(domanda => {
      if (domanda.voto > 5) domanda.voto = 5;
      else if (domanda.voto < 1 && domanda.voto !== -1) domanda.voto = 1;
      votazioni.push([studente.id, docente.id, domanda.id, domanda.voto]);
    });
  });
  pool.query('INSERT INTO studenti SET ?', [studente], (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    pool.query('INSERT INTO votazioni (idStudente, idDocente, idDomanda, voto) VALUES ?', [votazioni], (err, rows, fields) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
      ipStudenti.push(req.ip);
      console.log(ipStudenti.length, 'hanno finito di votare');
    });
  });
});

app.all('*', (req, res) => {
  res.status(404).json({
    error: {
      status: 404,
      statusCode: 404,
      message: 'resource not found'
    }
  });
});

app.listen(port, () => console.log(`backend listening on port ${port}`));
