'use strict';

const request = require('request');
const async = require('async');
let classi;
const fns = [
  (cb) => {
    request('http://localhost:4000/classi', (err, results, res)=>{
      if (err) cb(err);
      classi = JSON.parse(results.body);

      const fns = [];
      classi.forEach((classe) => {
        fns.push((cb) => {
          request(`http://localhost:4000/docenti/${classe.id}`, (err, results, res) => {
            if (err) cb(err);
            cb(null, {
              [classe.id]: JSON.parse(results.body)
            });
          })
        });
      });

      async.parallel(fns, (err, results)=>{
        if (err) cb(err);
        const out = {};
        results.forEach(e => {
          const key = Object.keys(e)[0];
          out[key] = e[key];
        });
        
        cb(null, out);
      })
    });
  },
  
  (cb) => {
    request('http://localhost:4000/domande/0', (err, results, res)=> {
      if (err) cb(err);
      cb(null, JSON.parse(results.body));
    });
  },

  (cb) => {
    request('http://localhost:4000/domande/1', (err, results, res)=> {
      if (err) cb(err);
      cb(null, JSON.parse(results.body));
    });
  }
];

async.parallel(fns, (err, results) => {
  if (err) throw err;
  
  const docenti = results[0];
  const domandeDocenti = results[1];
  const domandeGenerali = results[2];
  
  for (let studentIndex = 0; studentIndex < 18; studentIndex++) {
    classi.forEach((classe) => {
      const out = {
        docenti: []
      };
      
      docenti[classe.id].forEach(docente => {
        const dataDocente = {
          id: docente.id,
          domande: []
        };
        out.docenti.push(dataDocente);
        domandeDocenti.forEach(domanda => {
          dataDocente.domande.push({
            id: domanda.id,
            voto: 5
          })
        })
      });
      
    });
  }
  //todo da qui dobbiamo comporre tutte le possibili risposte ai questionari e poi inviarle
});

