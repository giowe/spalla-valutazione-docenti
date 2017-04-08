'use strict';
const express = require('express');
const mysql = require('mysql');
const config = require('./config.json');
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

//API presa da Gio

app.get(`/votazioni`, (req, res) => {
  const limit = req.query.limit;
  const offset = req.query.offset;
  let where = req.query.where;
  let whereString = '';
  if (where){
    try {
      where = JSON.parse(where);

      whereString = [];
      Object.keys(where).forEach(key => {
        const value = where[key];
        const type = typeof value;
        if (type === 'object') {

        } else {
          const wrapperChar =type === 'string' ? '"' : '';
          whereString.push(`\`${key}\` = ${wrapperChar+value+wrapperChar}`);
        }
      });
      if (whereString.length) {
        whereString = `WHERE ${whereString.join(' AND ')}`;
      } else {
        whereString = '';
      }

    } catch(err) {
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
  console.log(`IN ASCOLTO ALLA PORTA : ${port}`);
});