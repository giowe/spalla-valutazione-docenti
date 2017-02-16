'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const config = require('./config.json');
const uuid = require('uuid/v4');
const parallel = require('async').parallel;
const sezioneCorrente = process.argv[2];
let idVotati = [];
let domandeGeneraliDB = [];
let domandeDocentiDB = [];
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
    return;
  };
  const body = req.body;
  let Compatibilita = controlData(body);
  if (Compatibilita) {
    next();
  } else {
    res.status(601).json("{}");
    return;
  };

});
app.post('/votazioni', (req, res) => {
  const body = req.body; /*require('./fake-data.json');*/

  const studente = {
    id: uuid(),
    idClasse: sezioneCorrente
  };
  const votazioni = [];
  body.docenti.forEach(docente => {
    docente.domande.forEach(domanda => {
      //todo sarebbe bello se si controllasse con il db per il required
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
      idVotati.push(req.ip);
      console.log('Registrazione eseguita da parte di ', req.ip);
    });
  });
});
app.get('/risultati/:idDocente', (req, res) => {
  let idDocenteReq = parseInt(req.params.idDocente);
  let copiaDomandeDB = [];
  let asyncFunctions = [];
  domandeDocentiDB.forEach(domanda => {
    copiaDomandeDB.push(domanda);
  })
  copiaDomandeDB.forEach(domanda => {
    asyncFunctions.push((cb) => {
      const domandaId = copiaDomandeDB[0];
      copiaDomandeDB.shift();
      let query = "SELECT AVG(voto) , idDomanda FROM votazioni WHERE idDocente = ? AND idDomanda = ?";
      query = mysql.format(query, [idDocenteReq, domandaId.id]);
      console.log(query);
      pool.query(query, (err, rows, fields) => {
        if (err) return cb(err);
        cb(null, rows);
      });
    });
  });
  parallel(asyncFunctions, (err, results) => {
    if (err) return res.render('error', {
      err: err
    });
    let risultati = [];
    results.forEach(domanda => {
      risultati.push(domanda);
    });
    return res.status(200).json(risultati);
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
getDomande();

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

function getDomande() {
  pool.query(`SELECT id , required , type FROM domande`, (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    rows.forEach(domanda => {
      const Dom = composeDomande(domanda.id, domanda.required, domanda.type);
      if (domanda.type === 0) {
        domandeDocentiDB.push(Dom);
      } else {
        domandeGeneraliDB.push(Dom);
      }
    });
  });
};

function composeDomande(idDom, isRequired, typeDom) {
  const domanda = {
    id: idDom,
    required: isRequired,
    type: typeDom
  }
  return domanda;
}

function generateArrayQuery(arrayDomande) {
  let ArrayQuery = [];
  arrayDomande.forEach(domanda => {
    ArrayQuery.push((cb) => {
      const domandaId = copiaDomandeDB[0];
      copiaDomandeDB.shift();
      let query = "SELECT AVG(voto) , idDomanda FROM votazioni WHERE idDocente = ? AND idDomanda = ?";
      query = mysql.format(query, [idDocenteReq, domandaId.id]);
      pool.query(query, (err, rows, fields) => {
        if (err) return cb(err);
        cb(null, rows);
      });
    });
    console.log(ArrayQuery);
    return ArrayQuery;
  })
}
