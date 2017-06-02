'use strict';
const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const config = require('../config.json');
const materie = require('../tipoMaterie.json');
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "rds.soluzionifutura.it",
  user: "spalla_vdocenti",
  database: "spalla_vdocenti",
  password: config.dbPassword
});
router.get('/votazioni/scuola/tipologiaMateria/:tipoMateria', (req, res) => {
  const tipologiaMateria = req.params.tipoMateria;
  if (tipologiaMateria !== 'letteratura' && tipologiaMateria !== 'scientifico' && tipologiaMateria !== 'lingue' && tipologiaMateria !== 'altro') {
    return res.status(404).json({
      error: {
        status: 404,
        statusCode: 404,
        message: 'non esiste la tipologiaMateria cercata'
      }
    })
  }
  let newArrayMateria = [];
  if (tipologiaMateria == 'letteratura') newArrayMateria = materie.T_Letteratura
  if (tipologiaMateria == 'scientifico') newArrayMateria = materie.T_Scientifico
  if (tipologiaMateria == 'lingue') newArrayMateria = materie.T_Lingue
  if (tipologiaMateria == 'altro') newArrayMateria = materie.T_Altro
  let whereString = "";
  let first = true;
  newArrayMateria.forEach(materiaCiclo => {
    if (first) {
      whereString = 'docenti.materia="' + materiaCiclo + '"';
      first = false;
    } else {
      whereString = whereString + ' OR docenti.materia="' + materiaCiclo + '"';
    }
  })
  pool.query(`SELECT idDomanda , voto ,COUNT(*) as countValue FROM votazioni INNER JOIN docenti ON votazioni.idDocente = docenti.id WHERE ${whereString} GROUP BY idDomanda , voto ORDER BY idDomanda , voto ASC`, (err, rows, fields) => {
    if (err) return res.status(705).json(err);
    let countVal = [];
    let index, countTotRows, sommaAvgRows, countAvgRows = 0;
    rows.forEach(countRows => {
      const idDomandaRows = countRows.idDomanda;
      const votoRows = countRows.voto;
      const countValueRows = countRows.countValue;
      if (index === idDomandaRows) {
        const n_countVal = countVal.length - 1;
        if (votoRows !== -1) {
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
      } else {
        countTotRows = countValueRows;
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
          countVal: [votazioneRows]
        };
        index = idDomandaRows; 
        countVal.push(domanda); 
      }
    });
    res.json(countVal);
  });
});
module.exports = router;
