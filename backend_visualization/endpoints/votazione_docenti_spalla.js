'use strict';
const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const parallel = require('async').parallel;
const config = require('../config.json');
const materie = require('../tipoMaterie.json');
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "rds.soluzionifutura.it",
  user: "spalla_vdocenti",
  database: "spalla_vdocenti",
  password: config.dbPassword
});
//GET DATI DOCENTI
router.get('/votazioni/docenti/spallanzani', (req, res) => {
  let idDocenteQS = req.query.idDocente;
  if ((typeof idDocenteQS) !== 'undefined') {
    if (idDocenteQS.includes(`'`) || idDocenteQS.includes(`"`)) {
      idDocenteQS = "";
    }
  }
  const queryToSend = [
    (cb) => {
      let whereString = '';
      if (idDocenteQS !== undefined && idDocenteQS !== '') {
        whereString = `AND idDocente = ${idDocenteQS}`;
      }
      if (idDocenteQS === 'null') {
        whereString = `AND idDocente IS NULL`;
      }
      pool.query(`SELECT idDocente , voto , idDomanda ,COUNT(*) as countValue FROM votazioni INNER JOIN studenti ON votazioni.idStudente = studenti.id WHERE studenti.idClasse LIKE '__S%' ${whereString} GROUP BY voto , idDomanda , idDocente ORDER BY idDocente , idDomanda , voto ASC`, (err, rows, fields) => {
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
      if (idDocenteQS !== undefined && idDocenteQS !== '') {
        whereString = `WHERE id = ${idDocenteQS}`;
      };
      let generale = {
        idDocente: null,
        nome: null,
        cognome: null,
        materia: null,
        tipo_materia: null,
        avgTot: 0,
        valutazione: []
      };
      const arrayDocenti = [];
      if (idDocenteQS === 'null') { //AGGIUNTA DOCENTE GENERALE
        arrayDocenti.push(generale);
        cb(null, arrayDocenti);
      } else {
        pool.query(`SELECT * FROM docenti ${whereString} ORDER BY id ASC`, (err, rows, fields) => {
          if (err) return cb(err); //  ERRORE GET DATI DEI DOCENTI
          if (idDocenteQS === undefined || idDocenteQS === '') { //AGGIUNTA DOCENTE GENERALE
            arrayDocenti.push(generale);
          }
          rows.forEach(docente => {
            let type;
            const docente_materia = docente.materia;
            if (materie.T_Scientifico.includes(docente_materia)) type = "Materia Scientifica"
            if (materie.T_Letteratura.includes(docente_materia)) type = "Letteratura"
            if (materie.T_Lingue.includes(docente_materia)) type = "Lingua"
            if (materie.T_Altro.includes(docente_materia)) type = "Altro"
            let docenteRows = {
              idDocente: docente.id,
              nome: docente.nome,
              cognome: docente.cognome,
              materia: docente_materia,
              tipo_materia: type,
              avgTot: 0,
              valutazione: []
            };
            arrayDocenti.push(docenteRows);
          })
          cb(null, arrayDocenti);
        })
      }
    }
  ];
  parallel(queryToSend, (err, results) => {
    if (err) {
      res.status(404).json({
        error: {
          status: 404,
          statusCode: 404,
          message: err
        }
      });
    } else {
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
    }
  });
});

module.exports = router;
