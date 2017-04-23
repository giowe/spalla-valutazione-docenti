'use strict';
const express = require('express');
const mysql = require('mysql');
const config = require('./config.json');
const parallel = require('async').parallel;
const materie_scientifiche = require('./tipoMaterie.json').T_Scientifico;
const materie_letteratura = require('./tipoMaterie.json').T_Letteratura;
const materie_lingue = require('./tipoMaterie.json').T_Lingue;
const materie_altro = require('./tipoMaterie.json').T_Altro;
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "rds.soluzionifutura.it",
  user: "spalla_vdocenti",
  database: "spalla_vdocenti",
  password: config.dbPassword
});

const app = new express();
const port = 4040;

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
exposeList('domande', 'ordine');
exposeList('docenti', 'cognome');

//GET STATISTICHE GENERALI DELLA SCUOLA
app.get('/votazioni/scuola', (req, res) => {
  pool.query(`SELECT idDomanda , voto ,COUNT(*) as countValue FROM votazioni GROUP BY idDomanda , voto ORDER BY idDomanda , voto ASC`, (err, rows, fields) => {
    if (err) return res.status(705).json(err);
    let countVal = [];
    let index, countTotRows, sommaAvgRows, countAvgRows = 0;
    rows.forEach(countRows => {
      const idDomandaRows = countRows.idDomanda;
      const votoRows = countRows.voto;
      if (index === idDomandaRows) {
        const n_countVal = countVal.length - 1;
        const countValueDomanda = countRows.countValue;
        if (votoRows !== -1) {
          countAvgRows += countValueDomanda;
          sommaAvgRows += countValueDomanda * votoRows;
        }
        countTotRows += countValueDomanda;
        const votazioneRows = {
          value: votoRows,
          count: countValueDomanda
        };
        countVal[n_countVal].votazione.push(votazioneRows);
        countVal[n_countVal].countTot = countTotRows;
        countVal[n_countVal].avg = sommaAvgRows / countAvgRows;
      } else {
        countTotRows = countRows.countValue;
        countAvgRows = sommaAvgRows = 0;
        if (votoRows !== -1) {
          countAvgRows = countTotRows;
          sommaAvgRows = countAvgRows * votoRows;
        }
        const votazioneRows = {
          value: votoRows,
          count: countTotRows
        };
        let domanda = {
          idDomanda: idDomandaRows,
          countTot: countTotRows,
          avg: sommaAvgRows / countAvgRows,
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
  const idDocenteQS = req.query.idDocente;
  const queryToSend = [
    (cb) => {
      let whereString = '';
      if (idDocenteQS !== undefined) {
        whereString = `WHERE idDocente = ${idDocenteQS}`;
      }
      pool.query(`SELECT idDocente , voto , idDomanda ,COUNT(*) as countValue FROM votazioni ${whereString} GROUP BY voto , idDomanda , idDocente ORDER BY idDocente , idDomanda , voto ASC`, (err, rows, fields) => {
        if (err) return cb(err);
        let statisticheDocenti = [];
        let indexDomanda, indexDocente, sommaAvgTot, countAvgTot, sommaAvgDomanda, countAvgDomanda, countTotDomanda = 0;
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
            const countValueInProgress = {
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
            const countValueInProgress = {
              value: voto,
              count: countDomanda
            }
            let valutazioneInProgress = {
              idDomanda: idDomandaData,
              countTot: countDomanda,
              avg: sommaAvgDomanda / countAvgDomanda,
              countVal: [countValueInProgress]
            }
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
            const countValueInProgress = {
              value: voto,
              count: countDomanda
            }
            let valutazioneInProgress = {
              idDomanda: idDomandaData,
              countTot: countDomanda,
              avg: sommaAvgDomanda / countAvgDomanda,
              countVal: [countValueInProgress]
            }
            let docenteInProgress = {
              idDocente: idDocenteData,
              avgTot: sommaAvgTot / countAvgTot,
              valutazione: [valutazioneInProgress]
            }
            statisticheDocenti.push(docenteInProgress);
          }
        })
        cb(null, statisticheDocenti);
      })
    },
    (cb) => {
      let whereString = '';
      if (idDocenteQS !== undefined) {
        whereString = `WHERE id = ${idDocenteQS}`;
      }
      pool.query(`SELECT * FROM docenti ${whereString} ORDER BY id ASC`, (err, rows, fields) => {
        if (err) return cb(err); //  ERRORE GET DATI DEI DOCENTI
        const arrayDocenti = [];
        if (idDocenteQS === undefined) {
          let generale = {
            idDocente: null,
            nome: null,
            cognome: null,
            materia: null,
            tipo_materia: null,
            avgTot: 0,
            valutazione: []
          };
          arrayDocenti.push(generale);
        }
        rows.forEach(docente => {
          let type;
          const docente_materia = docente.materia;
          if (isInArray(docente_materia, materie_scientifiche)) type = "Materia Scientifica"
          if (isInArray(docente_materia, materie_letteratura)) type = "Letteratura"
          if (isInArray(docente_materia, materie_lingue)) type = "Lingua"
          if (isInArray(docente_materia, materie_altro)) type = "Altro"
          let docenteRows = {
            idDocente: docente.id,
            nome: docente.nome,
            cognome: docente.cognome,
            materia: docente.materia,
            tipo_materia: type,
            avgTot: 0,
            valutazione: []
          };
          arrayDocenti.push(docenteRows);
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
      message: 'non esiste questa API'
    }
  });
});

app.listen(port, () => {
  console.log(`IN ASCOLTO ALLA PORTA : ${port}`);
});
