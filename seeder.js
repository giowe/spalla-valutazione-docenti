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
            cb(null, JSON.parse(results.body));
          })
        });
      });

      async.parallel(fns, (err, results)=>{
        if (err) cb(err);

        cb(null, results);
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
  
  //todo da qui dobbiamo comporre tutte le possibili risposte ai questionari e poi inviarle
});

