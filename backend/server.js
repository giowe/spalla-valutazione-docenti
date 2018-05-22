const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const config = require('./config.json');
const uuid = require('uuid/v4');
const parallel = require('async').parallel;
const materie_scientifiche = require('./tipoMaterie.json').T_Scientifico;
const materie_letteratura = require('./tipoMaterie.json').T_Letteratura;
const materie_lingue = require('./tipoMaterie.json').T_Lingue;
const materie_altro = require('./tipoMaterie.json').T_Altro;
const sezioneCorrente = process.argv[2];
const ipUsati = [];
const classiCreate = [];
let classiInfo = []; // array che contiene le varie stringhe di controllo
if (!sezioneCorrente) throw new Error("Devi specificare la sezione alla quale stai somministrando il test");
const pool = mysql.createPool(config);

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
    const limit = req.query.limit;
    const offset = req.query.offset;
    pool.query(`SELECT * FROM ${tableName} ORDER BY ${sorter} ASC ${limit? 'LIMIT ' + limit : ''} ${offset? 'OFFSET ' + offset : ''}`, (err, rows, fields) => {
      if (err) return res.status(500).json(err);
      if (tableName === 'docenti') {
        const docenti = [];
        rows.forEach(docente => {
          let type;
          const docente_materia = docente.materia;
          if (materie_scientifiche.includes(docente_materia)) type = "Materia Scientifica"
          if (materie_letteratura.includes(docente_materia)) type = "Letteratura"
          if (materie_lingue.includes(docente_materia)) type = "Lingua"
          if (materie_altro.includes(docente_materia)) type = "Altro"
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
exposeList('classi', 'id');
exposeList('domande', 'ordine');
exposeList('docenti', 'cognome');
exposeList('studenti', 'idClasse');
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
  const ipPc = req.query.ipPc;
  if (ipUsati.includes(ipPc)) {
    res.status(600).json("{}"); //gia votato
    return;
  } else if (!classiCreate.includes(idClasse)) {
    res.status(202).json("{}");
    return;
  } else {
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
  };
});
//GET CLASSI CREATE
app.get('/classi/current/:ipPc', (req, res) => {
  const ipPc = req.params.ipPc;
  if (ipUsati.includes(ipPc)) {
    res.status(600).json("{}"); //gia votato
    return;
  } else {
    res.status(200).json(classiInfo);
    return;
  };
})

//FUNZIONE CHE ELIMINA UN VALORE DA UN ARRAY
function removeElem(value, array) {
  for (let i in array) {
    if (array[i] == value) {
      array.splice(i, 1);
    }
  }
}
//API CHE CONTROLLA LO STATUS DELL'IP E SE TUTTO "OK" ASSEGNA IP PC ALLA CLASSE SCELTA
app.get('/sceltaClasse', (req, res) => {
  const ipPc = req.ip;
  const idClasseScelto = req.query.idClasse;
  if (ipUsati.includes(ipPc)) {
    res.status(600).json("{}"); //gia votato
    return;
  } else if (!classiCreate.includes(idClasseScelto)) {
    res.status(601).json("{}"); //HTML cambiato
    return;
  } else {
    res.status(200).json("{}"); //ok next()
    return;
  };
})
//MIDDLEWARE DELLA CHIAMATA /VOTAZIONI (CONTROLLO STATUS IP PC)
app.use('/votazioni', (req, res, next) => {
  const ipStudente = req.ip;
  const idClasse = req.query.idClasse;
  if (ipUsati.includes(ipStudente)) {
    res.status(600).json("{}");
    return;
  } else {/*
    const body = req.body;
    const Compatibilita = checkData(body, idClasse);//check
    if (Compatibilita) {
      next();
    } else {
      res.status(601).json("{}");
      return;
    };*/
    next();
  };
});
//API PER INSERIRE LE VOTAZIONI
app.post('/votazioni', (req, res) => {
  const body = req.body; /*require('./fake-data.json');*/
  const ipStudente = req.ip;
  const classeStudente = req.query.idClasse; //todo Controllare sicuramente andrà in conflitto con quello di gio "idClasse: req.query.classe || sezioneCorrente" 
  if (classeStudente == "") return;
  const studente = {
    id: uuid(),
    idClasse: classeStudente
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
      ipUsati.push(ipStudente);
      // si lo so è una porcata (^_^)
      console.log('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n');
      console.log('-----------------AGGIORNAMENTO STATUS VOTAZIONE-----------------');
      for (let i = 0; i < classiInfo.length; i++) {
        if (classiInfo[i].id == classeStudente) {
          classiInfo[i].nStudenti++;
          console.log(`\n +1 Voto per la ${classiInfo[i].label}\n\n`);
        };
      }
      classiInfo.forEach(classe => {
        console.log(` N° Voti per la ${classe.label}  : ${classe.nStudenti}`);
      });
      console.log('\n\n TOTALE STUDENTI CHE HANNO FINITO DI VOTARE : ' + ipUsati.length + '\n\n');
      console.log('--------------FINE AGGIORNAMENTO STATUS VOTAZIONE---------------');
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

//AVVIO FUNZIONE PER GENERARE LE CLASSI (DATE LE INIZIALI DELLA CLASSE) E I PASS STRING DI CONTROLLO
generatePassStringAndClass(sezioneCorrente);

function generatePassStringAndClass(sezioneIniziali) {
  const classi = [];//check
  //let classiLength;
  let contatoreClassi = 0;
  const classeCorrente = `${sezioneIniziali}%`;

  //GET CLASSI "LIKE"
  pool.query(`SELECT * FROM classi WHERE id LIKE '${classeCorrente}'`, (err, rows, fields) => {
    if (err) return console.log(`errore chiamata classi al DB, RIAVVIARE IL SERVER`);
    rows.forEach(classe => {
      const currClasse = {
        id: classe.id,
        label: classe.label,
        passString: "",
        nStudenti: 0
      };
      classi.push(currClasse);

      classiCreate.push(classe.id); //array delle classi create SOLO ID
    });

    const classiLength = classi.length;
    //PER OGNI CLASSE OTTENUTA DAL DB
    classi.forEach(classe => {
      const idDocentiCurrent = [];
      const idDomandeDocCurrent = [];
      const idDomandeGenCurrent = [];
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
            // CREAZIONE PASS STRING
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
            classiInfo.push(classe); //ARRAY GLOBALE CON I DATI DELLE VARIE CLASSI  (id , label , passString, nStudenti)
            contatoreClassi++;
            //AVVISO SE TUTTE LE CLASSI POSSIBILI SONO STATE CREATE
            if (contatoreClassi === classiLength) {
              console.log();
              console.log();
              console.log('----------------CLASSI CREATE--------------');
              console.log();
              classiInfo.forEach(classe => {
                console.log(classe.label);
              });
              console.log();
              console.log('-----------FINE CREAZIONE CLASSI-----------');
            };
          });
        });
      });
    });
  });
};
// funzione per il controllo tra passString e la stringa generata partendo dai dati del body
// da come risposta true in caso positivo e false in caso negativo
function checkData(body, classe) {
  const InDomGenId = [];
  let passStringBody = "";
  const idClasse = classe;
  let passString = "";
  body.docenti.forEach(docente => {
    if (docente.id !== null) {
      passStringBody = passStringBody + docente.id;
      docente.domande.forEach(domanda => {
        passStringBody = passStringBody + domanda.id;
      });
    } else {
      docente.domande.forEach(domanda => {
        InDomGenId.push(domanda.id);
      });
    };
  });
  passStringBody = passStringBody + null;
  InDomGenId.forEach(domanda => {
    passStringBody = passStringBody + domanda;
  });
  classiInfo.forEach(classe => {
    if (classe.id == idClasse) {
      passString = classe.passString;
    };
  });

  if (passString === passStringBody) {
    return true;
  } else {
    return false;
  }
};
