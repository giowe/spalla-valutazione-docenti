'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const config = require('./config.json');
const uuid = require('uuid/v4');
const parallel = require('async').parallel;
const sezioneCorrente = process.argv[2];
let idVotati = [];
let passString = "";
if (!sezioneCorrente) throw new Error("Devi specificare la sezione alla quale stai somministrando il test");
//console.log(`STAI SOMMINISTRANDO IL TEST ALLA SEZIONE ${sezioneCorrente}`);
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "rds.soluzionifutura.it",
  user: "spalla_vdocenti",
  database: "spalla_vdocenti",
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
    pool.query(`SELECT * FROM ${tableName} ORDER BY ${sorter} ASC`, (err, rows, fields) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    })
  });
};

exposeList('classi', 'id');
exposeList('domande', 'ordine');
exposeList('docenti', 'cognome');
exposeList('votazioni', 'idDocente');
exposeList('studenti', 'idClasse');


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

function isInArray(value, array) {
  return array.indexOf(value) > -1;
}
//middleWare contro hacking e doppia votazione 
app.use('/votazioni', (req, res, next) => {
  const ipStudente = req.ip;
  if (isInArray(ipStudente, idVotati)) {
    res.status(600).json("{}");
    console.log(ipStudente, `ha tentato di rivotare`);
    return;
  };
  const body = req.body;

  let Compatibilita = controlData(body);

  if (Compatibilita) {
    next();
  } else {
    res.status(601).json("{}");
    console.log(ipStudente, `ha tentato di cambiare L'HTML`);
    return;
  };

});
app.post('/votazioni', (req, res) => {
  const body = req.body; /*require('./fake-data.json');*/
  const studente = {
    id: uuid(),
    idClasse: sezioneCorrente
  };
  const ipStudente = req.ip;
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
      idVotati.push(ipStudente);
      console.log(idVotati.length, 'hanno finito di votare');
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

app.listen(port, () => {
  //console.log(`backend listening on port ${port}`);
  console.log('ATTENDERE BACKEND "backend pronto"');
});

generatePassString();
// funzione che ti genere una stringa composta da id(docente o generali) + i relativi id domande 
function generatePassString() {
  let idDocentiCurrent = [];
  let idDomandeDocCurrent = [];
  let idDomandeGenCurrent = [];
  const query = [
    'SELECT d.id FROM docenti d',
    'INNER JOIN classi_docenti cd ON d.id = cd.idDocente',
    'INNER JOIN classi c ON cd.idClasse = c.id',
    'WHERE c.id = ?'
  ].join(' ');

  pool.query(query, [sezioneCorrente], (err, rows, fields) => {
    if (err) return console.log('Errore creazione passString fase GetidDocenti');
    rows.forEach(docente => {
      idDocentiCurrent.push(docente.id);
    });
    let params = {
      type: '0'
    };
    pool.query(`SELECT id FROM domande WHERE ? ORDER BY ordine ASC`, params, (err, rows, fields) => {
      if (err) return console.log('Errore creazione passString fase GetDomandeDocenti');
      rows.forEach(domanda => {
        idDomandeDocCurrent.push(domanda.id);
      });
      params = {
        type: '1'
      };
      pool.query(`SELECT id FROM domande WHERE ? ORDER BY ordine ASC`, params, (err, rows, fields) => {
        if (err) return console.log('Errore creazione passString fase GetDomandeGenerali');
        rows.forEach(domanda => {
          idDomandeGenCurrent.push(domanda.id);
        });
        idDocentiCurrent.forEach(docente => {
          passString = passString + docente;
          idDomandeDocCurrent.forEach(domanda => {
            passString = passString + domanda;
          });
        });
        passString = passString + null;
        idDomandeGenCurrent.forEach(domanda => {
          passString = passString + domanda;
        });
        console.log('backend pronto');
      });
    });
  });
};
// funzione per il controllo tra passString e la stringa generata partendo dai dati del body 
// da come risposta true in caso positivo e false in caso negativo 
function controlData(body) {
  let InDomGenId = [];
  let protoRNA = "";
  body.docenti.forEach(docente => {
    if (docente.id !== null) {
      protoRNA = protoRNA + docente.id;
      docente.domande.forEach(domanda => {
        protoRNA = protoRNA + domanda.id;
      });
    } else {
      docente.domande.forEach(domanda => {
        InDomGenId.push(domanda.id);
      });
    };
  });
  protoRNA = protoRNA + null;
  InDomGenId.forEach(domanda => {
    protoRNA = protoRNA + domanda;
  });
  if (passString === protoRNA) {
    return true;
  } else {
    return false;
  }
};
