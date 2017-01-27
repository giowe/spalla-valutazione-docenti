'use strict';
const express = require('express');
const app = new express();
const request = require('request');
const parallel = require('async').parallel; 
  
const port = 8000;

app.set('view engine', 'pug');
app.set('views', './views/pages');

app.get('/', (req, res) => {
  const asyncFunctions = [
    //domande generali
    (cb) => {
      request('http://localhost:4000/domande/1', (err, response, body) => {
        if (err) return cb(err);
        try { cb(null, JSON.parse(body)); }
        catch (err) { cb(err); }
      });
    },
    
    //domande docenti
    (cb) => {
      request('http://localhost:4000/domande/0', (err, response, body) => {
        if (err) return cb(err);
        try { cb(null, JSON.parse(body)); }
        catch (err) { cb(err); }
      });
    },
    
    //lista docenti
    (cb) => {
      request('http://localhost:4000/docenti/current', (err, response, body) => {
        if (err) return cb(err);
        try { cb(null, JSON.parse(body)); }
        catch (err) { cb(err); }
      });
    }
  ];

  parallel(asyncFunctions, (err, results) => {
    if (err) return res.render('error', { err: err });
    
    res.render('index', {
      title: 'Home',
      domandeGenerali: results[0],
      domandeDocenti: results[1],
      docenti: results[2]
    });
  });
});


app.all('*', (req, res) => {
  res.render('404', {
    title: 'Pagina non trovata'
  });
});

app.listen(port, () => {
  console.log(`FRONTEND listening on port ${port}`);
});
