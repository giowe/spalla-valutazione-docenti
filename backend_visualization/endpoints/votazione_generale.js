'use strict';
const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const config = require('../config.json');
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "rds.soluzionifutura.it",
  user: "spalla_vdocenti",
  database: "spalla_vdocenti",
  password: config.dbPassword
});
router.post('/votazioni/scuola', (req, res) => {
  //GET STATISTICHE GENERALI DELLA SCUOLA
  pool.query(`SELECT idDomanda , voto ,COUNT(*) as countValue FROM votazioni GROUP BY idDomanda , voto ORDER BY idDomanda , voto ASC`, (err, rows, fields) => {
    if (err) return res.status(705).json(err);
    let countVal = [];
    let index, countTotRows, sommaAvgRows, countAvgRows = 0;
    rows.forEach(countRows => {
      //MI SALVO I DATI DELL'OGGETTO PRESO IN ESAME
      const idDomandaRows = countRows.idDomanda;
      const votoRows = countRows.voto;
      const countValueRows = countRows.countValue;
      //CONTROLLO IF...
      if (index === idDomandaRows) { //VUOL DIRE CHE SIAMO ANCORA NELLA STESSA DOMANDA
        //AGGIORNAMENTO VALORI COME CONTEGGIO E SOMMA
        const n_countVal = countVal.length - 1;
        if (votoRows !== -1) { //SE IL VOTO NON E' NULLO
          countAvgRows += countValueRows;
          sommaAvgRows += countValueRows * votoRows;
        }
        countTotRows += countValueRows;
        const votazioneRows = {
          value: votoRows,
          count: countValueRows
        };
        countVal[n_countVal].countVal.push(votazioneRows);
        countVal[n_countVal].countTot = countTotRows;
        countVal[n_countVal].avg = sommaAvgRows / countAvgRows;
      } else { //SE L'ID DELLA DOMANDA NON COINCIDE CON L'ID DOMANDA DI PRIMA ...
        //RESET VALORI PERCHE' ABBIAMO CAMBIATO DOMANDA
        countTotRows = countValueRows;
        countAvgRows = sommaAvgRows = 0;
        if (votoRows !== -1) { //SE IL VOTO NON E' NULLO
          countAvgRows = countTotRows;
          sommaAvgRows = countAvgRows * votoRows;
        }
        const votazioneRows = { //STRUTTURA VOTAZIONE DOMANDA
          value: votoRows,
          count: countTotRows
        };
        let domanda = { // STRUTTURA DOMANDA
          idDomanda: idDomandaRows,
          countTot: countTotRows,
          avg: sommaAvgRows / countAvgRows,
          countVal: [votazioneRows]
        };
        index = idDomandaRows; //SET DEL NUOVO ID DOMANDA
        countVal.push(domanda); //PUSH NUOVA DOMANDA NELL'ARRAY DOMANDE
      }
    });
    res.json(countVal);
  });
});
module.exports = router;
