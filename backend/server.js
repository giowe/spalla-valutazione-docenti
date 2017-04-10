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

app.get('/scuola/statistica', (req, res) => {
  const votoMin = req.query.votoMin | 1;
  pool.query(`SELECT COUNT(*) as n_domande FROM domande`, (err, rows, fields) => {
    if (err) return res.status(700).json(err); //  ERRORE CONTEGGIO DOMANDE 
    let n_domande = rows[0].n_domande;
    let arrayOfQuery = [];
    for (let i = 1; i <= n_domande; i++) {
      arrayOfQuery.push((cb) => {
        //REWORKED ALL ASYNC
        let avgDomanda = {
          idDomanda: i,
          avg: 0,
          countRistretto: 0,
          countTot: 0
        };
        const parallelQuery = [
          (cb) => {
            pool.query(`SELECT AVG(voto) as avg FROM votazioni WHERE idDomanda = ${i}`, (err, rows, fields) => {
              if (err) return cb(err);
              cb(null, rows[0].avg);
            })
          },
          (cb) => {
            pool.query(`SELECT COUNT(*) as n_domande FROM votazioni WHERE idDomanda = ${i}`, (err, rows, fields) => {
              if (err) return cb(err);
              cb(null, rows[0].n_domande);
            })
          },
          (cb) => {
            pool.query(`SELECT COUNT(*) as n_domande FROM votazioni WHERE idDomanda = ${i} AND voto >= ${votoMin}`, (err, rows, fields) => {
              if (err) return cb(err);
              cb(null, rows[0].n_domande);
            })
          }
        ];
        parallel(parallelQuery, (err, results) => {
          if (err) return cb(err);
          avgDomanda.avg = results[0];
          avgDomanda.countTot = results[1];
          avgDomanda.countRistretto = results[2];
          console.log(avgDomanda);
          cb(null, avgDomanda);
        });

      });
    };
    parallel(arrayOfQuery, (err, results) => {
      if (err) {
        return res.statusCode(701).json(err); // ERRORE DURANTE GET MEDIE DELLE DOMANDE DAL DB
      } else {
        res.json(results);
      }
    });
  })
})

app.get('/votazioni/statistica', (req, res) => {
  let arrayIdDomandeDocenti = [];
  let arrayIdDomandeGenerali = [];
  let arrayDocentiInfo = [];
  let serieQuery = [
    //domande generali
    (cb) => {
      pool.query(`SELECT id FROM domande WHERE type = 1 ORDER BY id ASC`, (err, rows, fields) => {
        if (err) return cb(err);
        const idDomande = rows.map(item => item.id);
        cb(null, Array.from(new Set(idDomande)))
      })
    },
    //domande docenti
    (cb) => {
      pool.query(`SELECT id FROM domande WHERE type = 0 ORDER BY id ASC`, (err, rows, fields) => {
        if (err) return cb(err);
        const idDomande = rows.map(item => item.id);
        cb(null, Array.from(new Set(idDomande)))
      })
    },
    (cb) => {
      pool.query(`SELECT * FROM docenti ORDER BY id ASC`, (err, rows, fields) => {
        if (err) return cb(err); //  ERRORE GET DATI DEI DOCENTI
        const arrayDocenti = [];
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

  parallel(serieQuery, (err, results) => {
    if (err) return res.status(702).json(err); // ERRORE DURANTE SERIE QUERY
    const n_domandeGenerali = results[0].length;
    const n_domandeDocenti = results[1].length;
    const n_docenti = results[2].length;
    arrayIdDomandeGenerali = results[0];
    arrayIdDomandeDocenti = results[1];
    arrayDocentiInfo = results[2];
    serieQuery = [];
    for (let i = 0; i < n_docenti; i++) {
      const idDocenteCurr = arrayDocentiInfo[i].idDocente;
      serieQuery.push((cb) => {
        let serieQuery1 = [
          (cb) => { //avgTot
            pool.query(`SELECT AVG(voto) as avg FROM votazioni WHERE idDocente = ${idDocenteCurr}`, (err, rows, fields) => {
              if (err) return cb(err);
              cb(null, rows[0].avg);
            })
          }
        ];
        for (let y = 0; y < n_domandeDocenti; y++) {
          const idDomandaCurr = arrayIdDomandeDocenti[y];
          serieQuery1.push((cb) => {
            let serieQuery2 = [
              (cb) => {
                pool.query(`SELECT AVG(voto) as avg FROM votazioni WHERE idDocente = ${idDocenteCurr} AND idDomanda = ${idDomandaCurr}`, (err, rows, fields) => {
                  if (err) return cb(err);
                  cb(null, rows[0].avg);
                })
              },
              (cb) => {
                pool.query(`SELECT voto ,COUNT(*) as countValue FROM votazioni WHERE idDocente = ${idDocenteCurr} AND idDomanda = ${idDomandaCurr} GROUP BY voto ORDER BY voto ASC`, (err, rows, fields) => {
                  if (err) return cb(err);
                  let countVal=[];
                  rows.forEach(countRows =>{
                    let a = {
                      value: countRows.voto,
                      count: countRows.countValue
                    };
                    countVal.push(a);
                  });
                  cb(null, countVal);
                })
              }
            ];
            parallel(serieQuery2, (err, data) => {
              if (err) return cb(err);
              let b = data[1].map(item => item.count)
              var somma = b.reduce((a, b) => { return a + b; }, 0);
              const parallelDocenteVal = {
                idDomanda: idDomandaCurr,
                countTot: somma,
                avg: data[0],
                countVal: data[1]
              };
              cb(null, parallelDocenteVal);
            })
          });
        };
        parallel(serieQuery1, (err, data) => {
          if (err) return cb(err);
          let valutations = [];
          for (let x = 1; x <= n_domandeDocenti; x++) { //in caso di errore controlla qui
            valutations.push(data[x]);
          }
          const docenteSerieQuery1 = {
            avgTot: data[0],
            valutazione: valutations // array
          };
          cb(null,docenteSerieQuery1);
        });
      })
    };
    parallel(serieQuery, (err, results) => {
      if (err) return res.status(703).json(err); // ERRORE DURANTE GET VARI COUNT
      for (let i = 0; i < n_docenti; i++) {
        arrayDocentiInfo[i].avgTot = results[i].avgTot;
        arrayDocentiInfo[i].valutazione = results[i].valutazione;
      };
      console.log(arrayDocentiInfo);
      res.json(arrayDocentiInfo);
    })
  });
})

//API presa da Gio

/*app.get(`/votazioni`, (req, res) => {
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
*/

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
