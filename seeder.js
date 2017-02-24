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
          let voto = 0;
          switch (domanda.id) {
            case 1: //espone chiaro
              voto = getVoto(0, 5, 25, 40, 25, 5);
              break;
            case 2: //ti appassiona
              voto = getVoto(0, 5, 30, 40, 20, 5);
              break;
            case 3: //coinvolgere
              voto = getVoto(0, 5, 20, 40, 30, 5);
              break;
            case 4: //clima sereno
              voto = getVoto(0, 2, 8, 35, 40, 15);
              break;
            case 5: //disponibile per chiarimenti
              voto = getVoto(0, 5, 5, 10, 40, 40);
              break;
            case 6: //verifiche fattibili
              voto = getVoto(0, 10, 25, 40, 20, 5);
              break;
            case 7: //metodi ortodossi
              voto = getVoto(0, 5, 25, 40, 25, 5);
              break;
            case 8: //pianificazione verifiche
              voto = getVoto(0, 5, 15, 60, 15, 5);
              break;
            case 9: //strumenti
              voto = getVoto(55, 2, 3, 5, 15, 20);
              break;
            case 10: //ti piace la materia
              voto = getVoto(0, 5, 30, 40, 20, 5);
              break;
            case 11: //voti sensati
              voto = getVoto(0, 20, 20, 20, 20, 20);
              break;
            case 12: //compiti
              voto = getVoto(0, 20, 30, 20, 20, 10);
              break; 
          }
          
          dataDocente.domande.push({
            id: domanda.id,
            voto: voto
          })
        })
      });
      console.log(out.docenti[0]);
    });
  }
  //todo da qui dobbiamo comporre tutte le possibili risposte ai questionari e poi inviarle
});

function getVoto(percNA, perc1, perc2, perc3, perc4, perc5){
  let r = Math.ceil(Math.random()*100);
  if (r <= percNA) return 0;
  r -=percNA;
  
  if (r <= perc1) return 1;
  r -=perc1;
  
  if (r <= perc2) return 2;
  r -=perc2;
  
  if (r <= perc3) return 3;
  r -=perc3;
  
  if (r <= perc4) return 4;
  r -=perc4;
  
  if (r <= perc5) return 5;
}
