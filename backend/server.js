'use strict';
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
let ipUsati = [];
let classiCreate = [];
let classiInfo = []; // array che contiene le varie stringhe di controllo
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
    const limit = req.query.limit;
    const offset = req.query.offset;
    pool.query(`SELECT * FROM ${tableName} ORDER BY ${sorter} ASC ${limit? 'LIMIT ' + limit : ''} ${offset? 'OFFSET ' + offset : ''}`, (err, rows, fields) => {
      if (err) return res.status(500).json(err);
      if (tableName === 'docenti') {
        /*
        const materie = rows.map(item => item.materia);
        console.log((Array.from(new Set(materie))));*/
        let docenti = [];
        rows.forEach(docente => {
          let type;
          const docente_materia = docente.materia;
          if (isInArray(docente_materia, materie_scientifiche)) type = "Materia Scientifica"
          if (isInArray(docente_materia, materie_letteratura)) type = "Letteratura"
          if (isInArray(docente_materia, materie_lingue)) type = "Lingua"
          if (isInArray(docente_materia, materie_altro)) type = "Altro"
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
exposeList('classi', 'id');
exposeList('domande', 'ordine');
exposeList('docenti', 'cognome');
//exposeList('votazioni', 'idDocente');
exposeList('studenti', 'idClasse');

//GET STATISTICHE GENERALI DELLA SCUOLA
app.get('/votazioni/scuola', (req, res) => {
  pool.query(`SELECT idDomanda , voto ,COUNT(*) as countValue FROM votazioni GROUP BY idDomanda , voto ORDER BY idDomanda , voto ASC`, (err, rows, fields) => {
    if (err) return res.status(705).json(err);
    let countVal = [];
    let index = 0;
    let countTotRows = 0;
    let sommaAvgRows = 0;
    let countAvgRows = 0;
    rows.forEach(countRows => {
      const idDomandaRows = countRows.idDomanda;
      if (index === idDomandaRows) {
        const n_countVal = countVal.length - 1;
        const votoRows = countRows.voto;
        const countRowsTot01 = countRows.countValue;
        if (votoRows !== -1) {
          countAvgRows += countRowsTot01;
          sommaAvgRows += countRowsTot01 * votoRows;
        }
        countTotRows += countRowsTot01;
        const avgRows = sommaAvgRows / countAvgRows;
        const votazioneRows = {
          value: votoRows,
          count: countRowsTot01
        };
        countVal[n_countVal].votazione.push(votazioneRows);
        countVal[n_countVal].countTot = countTotRows;
        countVal[n_countVal].avg = avgRows;
      } else {
        countTotRows = countRows.countValue;
        countAvgRows = sommaAvgRows = 0;
        const votoRows = countRows.voto;
        if (votoRows !== -1) {
          countAvgRows = countTotRows;
          sommaAvgRows = countAvgRows * votoRows;
        }
        const avgRows = sommaAvgRows / countAvgRows;
        const votazioneRows = {
          value: votoRows,
          count: countTotRows
        };
        let domanda = {
          idDomanda: idDomandaRows,
          countTot: countTotRows,
          avg: avgRows,
          votazione: [votazioneRows]
        };
        index = idDomandaRows;
        countVal.push(domanda);
      }
    });
    res.json(countVal);
  });
})

app.get('/votazioni/docenti', (req, res) => {
  const queryToSend = [
    (cb) => {
      console.log('Inizio :       ' + Date());
      pool.query(`SELECT idDocente , voto , idDomanda ,COUNT(*) as countValue FROM votazioni GROUP BY voto , idDomanda , idDocente ORDER BY idDocente , idDomanda , voto ASC`, (err, rows, fields) => {
        if (err) return cb(err);
        console.log('Elaborazione dati :       ' + Date());
        let statisticheDocenti = [];
        let indexDomanda = 0;
        let indexDocente = 0;
        let sommaAvgTot = 0;
        let countAvgTot = 0;
        let sommaAvgDomanda = 0;
        let countAvgDomanda = 0;
        let countTotDomanda = 0;
        rows.forEach(data => {
          const idDocenteData = data.idDocente;
          const idDomandaData = data.idDomanda;
          const voto = data.voto;
          const countDomanda = data.countValue;
          if (indexDocente === idDocenteData && indexDomanda === idDomandaData) {
            //stesso docente e domanda
            if (voto !== -1) {
              countAvgTot += countDomanda;
              sommaAvgTot += countDomanda * voto;
              countAvgDomanda += countDomanda;
              sommaAvgDomanda += countDomanda * voto;
            };
            countTotDomanda += countDomanda;
            let countValueInProgress = {
              value: voto,
              count: countDomanda
            }
            const n_statisticheDocenti = statisticheDocenti.length - 1;
            const n_valutazione = statisticheDocenti[n_statisticheDocenti].valutazione.length - 1;
            statisticheDocenti[n_statisticheDocenti].avgTot = sommaAvgTot / countAvgTot;
            statisticheDocenti[n_statisticheDocenti].valutazione[n_valutazione].countVal.push(countValueInProgress);
            statisticheDocenti[n_statisticheDocenti].valutazione[n_valutazione].countTot = countTotDomanda;
            statisticheDocenti[n_statisticheDocenti].valutazione[n_valutazione].avg = sommaAvgDomanda / countAvgDomanda;
          } else if (indexDocente === idDocenteData && indexDomanda !== idDomandaData) {
            //stesso docente ma domanda cambiata
            indexDomanda = idDomandaData;
            countAvgDomanda = sommaAvgDomanda = 0;
            if (voto !== -1) {
              countAvgTot += countDomanda;
              sommaAvgTot += countDomanda * voto;
              countAvgDomanda = countDomanda;
              sommaAvgDomanda = countDomanda * voto;
            };
            countTotDomanda = countDomanda;
            let countValueInProgress = {
              value: voto,
              count: countDomanda
            }
            let valutazioneInProgress = {
              idDomanda: idDomandaData,
              countTot: countDomanda,
              avg: sommaAvgDomanda / countAvgDomanda,
              countVal: []
            }
            valutazioneInProgress.countVal.push(countValueInProgress);
            const n_statisticheDocenti = statisticheDocenti.length - 1;
            statisticheDocenti[n_statisticheDocenti].avgTot = sommaAvgTot / countAvgTot;
            statisticheDocenti[n_statisticheDocenti].valutazione.push(valutazioneInProgress);
          } else {
            //cambio docente 
            indexDocente = idDocenteData;
            indexDomanda = idDomandaData;
            countAvgTot = sommaAvgTot = countAvgDomanda = sommaAvgDomanda = 0;
            if (voto !== -1) {
              countAvgTot = countDomanda;
              sommaAvgTot = countDomanda * voto;
              countAvgDomanda = countDomanda;
              sommaAvgDomanda = countDomanda * voto;
            };
            countTotDomanda = countDomanda;
            let countValueInProgress = {
              value: voto,
              count: countDomanda
            }
            let valutazioneInProgress = {
              idDomanda: idDomandaData,
              countTot: countDomanda,
              avg: sommaAvgDomanda / countAvgDomanda,
              countVal: []
            }
            valutazioneInProgress.countVal.push(countValueInProgress);
            let docenteInProgress = {
              idDocente: idDocenteData,
              avgTot: sommaAvgTot / countAvgTot,
              valutazione: []
            }
            docenteInProgress.valutazione.push(valutazioneInProgress);
            statisticheDocenti.push(docenteInProgress);
          }
        })
        console.log('FINE :       ' + Date());
        cb(null, statisticheDocenti);
      })

    },
    (cb) => {
      pool.query(`SELECT * FROM docenti ORDER BY id ASC`, (err, rows, fields) => {
        if (err) return cb(err); //  ERRORE GET DATI DEI DOCENTI
        const arrayDocenti = [];
        const generale = {
          idDocente: null,
          nome: null,
          cognome: null,
          materia: null,
          tipo_materia: null,
          avgTot: 0,
          valutazione: []
        };
        arrayDocenti.push(generale);
        rows.forEach(docente => {
          let type;
          const docente_materia = docente.materia;
          if (isInArray(docente_materia, materie_scientifiche)) type = "Materia Scientifica"
          if (isInArray(docente_materia, materie_letteratura)) type = "Letteratura"
          if (isInArray(docente_materia, materie_lingue)) type = "Lingua"
          if (isInArray(docente_materia, materie_altro)) type = "Altro"
          let docentis = {
            idDocente: docente.id,
            nome: docente.nome,
            cognome: docente.cognome,
            materia: docente.materia,
            tipo_materia: type,
            avgTot: 0,
            valutazione: []
          };
          arrayDocenti.push(docentis);
        })
        cb(null, arrayDocenti);
      })
    }
  ];
  parallel(queryToSend, (err, results) => {
    if (err) res.status(705).json(err);
    let docentiArray = results[1];
    const valutazioneDocenti = results[0];
    const n_docentiArray = docentiArray.length;
    const n_valutazioneDocenti = valutazioneDocenti.length;
    for (let i = 0; i < n_docentiArray; i++) {
      for (let y = 0; y < n_valutazioneDocenti; y++) {
        if (docentiArray[i].idDocente === valutazioneDocenti[y].idDocente) {
          docentiArray[i].avgTot = valutazioneDocenti[y].avgTot;
          docentiArray[i].valutazione = valutazioneDocenti[y].valutazione;
          break;
        }
      }
    }
    res.json(docentiArray);
  });
})

//API presa da Gio

app.get(`/votazioni`, (req, res) => {
  const limit = req.query.limit;
  const offset = req.query.offset;
  let where = req.query.where;
  let whereString = '';
  if (where) {
    try {
      where = JSON.parse(where);

      whereString = [];
      Object.keys(where).forEach(key => {
        const value = where[key];
        const type = typeof value;
        if (type === 'object') {

        } else {
          const wrapperChar = type === 'string' ? '"' : '';
          whereString.push(`\`${key}\` = ${wrapperChar+value+wrapperChar}`);
        }
      });
      if (whereString.length) {
        whereString = `WHERE ${whereString.join(' AND ')}`;
      } else {
        whereString = '';
      }

    } catch (err) {
      console.log(err);
      where = null;
    }
  }

  //console.log(whereString);

  pool.query(
    `SELECT votazioni.*, studenti.idClasse, docenti.cognome AS cognomeDocente, docenti.nome AS nomeDocente, docenti.materia AS materiaDocente FROM votazioni
   INNER JOIN studenti ON votazioni.idStudente = studenti.id
   INNER JOIN docenti ON votazioni.idDocente = docenti.id 
   ${whereString}
   ORDER BY idDocente ASC ${limit? 'LIMIT ' + limit : ''} ${offset? 'OFFSET ' + offset : ''}`,

    (err, rows, fields) => {
      if (err) return res.status(500).json(err);

      res.json({
        count: rows.length,
        data: rows
      });
    })
});
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
  if (isInArray(ipPc, ipUsati)) {
    res.status(600).json("{}"); //gia votato
    return;
  } else if (!isInArray(idClasse, classiCreate)) {
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
  if (isInArray(ipPc, ipUsati)) {
    res.status(600).json("{}"); //gia votato
    return;
  } else {
    res.status(200).json(classiInfo);
    return;
  };
})
//FUNZIONE CHE TI CONTROLLA SE UN VALORE è CONTENUTO IN UN ARRAY
function isInArray(value, array) {
  return array.indexOf(value) > -1;
}
//FUNZIONE CHE ELIMINA UN VALORE DA UN ARRAY
function removeElem(value, array) {
  for (var i in array) {
    if (array[i] == value) {
      array.splice(i, 1);
    }
  }
}
//API CHE CONTROLLA LO STATUS DELL'IP E SE TUTTO "OK" ASSEGNA IP PC ALLA CLASSE SCELTA
app.get('/sceltaClasse', (req, res) => {
  const ipPc = req.ip;
  const idClasseScelto = req.query.idClasse;
  if (isInArray(ipPc, ipUsati)) {
    res.status(600).json("{}"); //gia votato
    return;
  } else if (!isInArray(idClasseScelto, classiCreate)) {
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
  if (isInArray(ipStudente, ipUsati)) {
    res.status(600).json("{}");
    return;
  } else {
    const body = req.body;
    let Compatibilita = checkData(body, idClasse);
    if (Compatibilita) {
      next();
    } else {
      res.status(601).json("{}");
      return;
    };
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
      console.log('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n')
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
  let classi = [];
  let classiLength;
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

    classiLength = classi.length;
    //PER OGNI CLASSE OTTENUTA DAL DB
    classi.forEach(classe => {
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
  let InDomGenId = [];
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
