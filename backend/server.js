'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const config = require('./config.json');
const uuid = require('uuid/v4');
const parallel = require('async').parallel;
const sezioneCorrente = process.argv[2];
let ipUsati = [];
let ipRegistrati = [];
let classiCreate = [];
let classiInfo = [];
let ipPcWithClass = [];
if (!sezioneCorrente) throw new Error("Devi specificare la sezione alla quale stai somministrando il test");
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
app.get('/docenti/:ipPc', (req, res) => {
  let classeIpPc = "";
  const ipPc = req.params.ipPc;
  if (isInArray(ipPc, ipUsati)) {
    res.status(600).json("{}"); //gia votato
    return;
  };
  if(!isInArray(ipPc,ipRegistrati)){
    res.status(202).json("{}"); //gia votato
    return;
  }
  ipPcWithClass.forEach(pc => {
    if (pc.ipPc == ipPc)
      classeIpPc = pc.idClasse;
  });
  if (classeIpPc == "") return;
  const query = [
    'SELECT d.id, d.nome, d.cognome, d.materia FROM docenti d',
    'INNER JOIN classi_docenti cd ON d.id = cd.idDocente',
    'INNER JOIN classi c ON cd.idClasse = c.id',
    'WHERE c.id = ?'
  ].join(' ');

  pool.query(query, [classeIpPc], (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  })
});
app.get('/classi/current/:ipPc', (req, res) => {
  const ipPc = req.params.ipPc;
  if (isInArray(ipPc, ipUsati)) {
    res.status(600).json("{}"); //gia votato
    return;
  }else if (isInArray(ipPc, ipRegistrati)) {
    res.status(201).json("{}"); //ok 
    return;
  }else{
    res.status(200).json(classiInfo);
    return;
  };
})

function isInArray(value, array) {
  return array.indexOf(value) > -1;
}

function removeElem(value, array) {
  for (var i in array) {
    if (array[i] == value) {
      array.splice(i, 1);
    }
  }
}
app.post('/sceltaClasse', (req, res) => {
  const ipPc = req.ip;
  const idClasseScelto = req.body.idClasseScelto;
  if (isInArray(ipPc, ipUsati)) {
    res.status(600).json("{}"); //gia votato
    return;
  };
  if (isInArray(ipPc, ipRegistrati)) {
    res.status(200).json("{}"); //ok 
    return;
  };
  if(!isInArray(idClasseScelto,classiCreate)){
    res.status(601).json("{}");
    return;
  }else{
    const pcStudente = {
      idClasse: idClasseScelto,
      ipPc: ipPc
    };
    ipPcWithClass.push(pcStudente);
    ipRegistrati.push(ipPc);
    res.status(200).json("{}");
    return;
  };
})
//middleWare contro hacking e doppia votazione 
app.use('/votazioni', (req, res, next) => {
  const ipStudente = req.ip;
  if (isInArray(ipStudente, ipUsati)) {
    res.status(600).json("{}");
    console.log(ipStudente, `ha tentato di rivotare`);
    return;
  };
  const body = req.body;
  let Compatibilita = controlData(body, ipStudente);
  if (Compatibilita) {
    next();
  } else {
    res.status(601).json("{}");
    console.log(ipStudente, `si sta divertendo a cambiare L'HTML`);
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
      ipUsati.push(ipStudente);
      console.log(ipUsati.length, 'studenti hanno finito di votare');
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
  console.log(`ATTENDERE L'AVVISO DEL COMPLETAMENTO GENERAZIONE CLASSI`);
});
generatePassStringAndClass(sezioneCorrente);

function generatePassStringAndClass(sezioneIniziali) {
  //GET classi 
  let classi = [];
  let classiLength;
  let contatoreClassi = 0;
  const classeCorrente = `${sezioneIniziali}%`;
  pool.query(`SELECT * FROM classi WHERE id LIKE '${classeCorrente}'`, (err, rows, fields) => {
    if (err) return res.status(500).json(err);
    rows.forEach(classe => {
      const currClasse = {
        id: classe.id,
        label: classe.label,
        passString: ""
      };
      classi.push(currClasse);
      classiCreate.push(classe.id);
    });
    classiLength = classi.length;
    classi.forEach(classe => {
      // Creazione passString
      let idDocentiCurrent = [];
      let idDomandeDocCurrent = [];
      let idDomandeGenCurrent = [];
      const query = [
        'SELECT d.id FROM docenti d',
        'INNER JOIN classi_docenti cd ON d.id = cd.idDocente',
        'INNER JOIN classi c ON cd.idClasse = c.id',
        'WHERE c.id = ?'
      ].join(' ');

      pool.query(query, [classe.id], (err, rows, fields) => {
        if (err) return console.log('Errore creazione passString fase GetidDocenti, RIAVVIARE IL SERVER');
        rows.forEach(docente => {
          idDocentiCurrent.push(docente.id);
        });
        let params = {
          type: '0'
        };
        pool.query(`SELECT id FROM domande WHERE ? ORDER BY ordine ASC`, params, (err, rows, fields) => {
          if (err) return console.log('Errore creazione passString fase GetDomandeDocenti, RIAVVIARE IL SERVER');
          rows.forEach(domanda => {
            idDomandeDocCurrent.push(domanda.id);
          });
          params = {
            type: '1'
          };
          pool.query(`SELECT id FROM domande WHERE ? ORDER BY ordine ASC`, params, (err, rows, fields) => {
            if (err) return console.log('Errore creazione passString fase GetDomandeGenerali, RIAVVIARE IL SERVER');
            rows.forEach(domanda => {
              idDomandeGenCurrent.push(domanda.id);
            });
            let passString = "";
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
            classe.passString = passString;
            classiInfo.push(classe);
            contatoreClassi++;
            if(contatoreClassi === classiLength){
              console.log('Classi create : '+classiCreate);
              console.log('Fine creazione classi');
            };
          });
        });
      });
    });
  });
};
// funzione per il controllo tra passString e la stringa generata partendo dai dati del body 
// da come risposta true in caso positivo e false in caso negativo 
function controlData(body, ipPc) {
  let InDomGenId = [];
  let protoRNA = "";
  let classeIpPc;
  let passString;
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
  ipPcWithClass.forEach(pc => {
    if (pc.ipPc == ipPc)
      classeIpPc = pc.idClasse;
  });
  classiInfo.forEach(classe => {
    if (classe.id == classeIpPc) {
      passString = classe.passString;
    }
  })

  if (passString === protoRNA) {
    return true;
  } else {
    return false;
  }
};

function addPcStudente(ip, id) {
  if (isInArray(ip, ipUsati)) {
    return 600; //gia votato
  };
  ipPcWithClass.forEach(studente => {
    if (studente.ipPc == ip && studente.idClasse == id) {
      return 200; //ok next()
    }
  });
  console.log(classiInfo);
  classiInfo.forEach(classe => {
    if (classe.id == id) {
      const pcStudente = {
        idClasse: id,
        ipPc: ip
      }
      ipPcWithClass.push(pcStudente);
      return 200;
    };
  });
};
