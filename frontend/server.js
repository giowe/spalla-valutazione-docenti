'use strict';
const express = require('express');
const app = new express();
const request = require('request');

const port = 8000;

app.set('view engine', 'pug');
app.set('views', './views/pages');

app.get('/', (req, res) => {
  request('http://localhost:4000/domande/0', (err, response, body) => {
    if (err) return res.render('error', {err: err});
    
    res.render('index', {
      title: 'Home',
      domande: JSON.parse(body)
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
