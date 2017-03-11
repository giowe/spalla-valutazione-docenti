'use strict';
const express = require('express');
const app = new express();
const request = require('request');
const parallel = require('async').parallel;

const port = 8000;

app.set('view engine', 'pug');
app.set('views', './views/pages');
app.use('/static', express.static('./static'));
app.get('/', (req, res) => {
  request(`http://localhost:4000/classi/current/${req.ip}`, (err, response, body) => {
    if (err) return err;
    let statusCode = response.statusCode;
    try {
      if (statusCode == 200) {
        res.render('sceltaClasse', {
          title: 'Home',
          classi: JSON.parse(body)
        });
      };
      if (statusCode == 201) {
        res.redirect('/questionario');
      };
      if (statusCode == 600) {
        res.redirect('/votato');
      }
    } catch (err) {
      return err;
    }
  });
})
app.get('/questionario', (req, res) => {
  const ipPc = req.ip;
  let statusCode;
  const asyncFunctions = [
    //domande generali
    (cb) => {
      request('http://localhost:4000/domande/1', (err, response, body) => {
        if (err) return cb(err);
        try {
          cb(null, JSON.parse(body));
        } catch (err) {
          cb(err);
        }
      });
    },

    //domande docenti
    (cb) => {
      request('http://localhost:4000/domande/0', (err, response, body) => {
        if (err) return cb(err);
        try {
          cb(null, JSON.parse(body));
        } catch (err) {
          cb(err);
        }
      });
    },

    //lista docenti
    (cb) => {
      request(`http://localhost:4000/docenti/${ipPc}`, (err, response, body) => {
        if (err) return cb(err);
        statusCode = response.statusCode;
        try {
          cb(null, JSON.parse(body));
        } catch (err) {
          cb(err);
        }
      });
    }
  ];

  parallel(asyncFunctions, (err, results) => {
    if (err) return res.render('error', {
      err: err
    });
    if (statusCode == 600) {
      res.redirect('/votato');
    } else if (statusCode == 202) {
      res.redirect('/');
    } else {
      res.render('index', {
        title: 'Questionario',
        domandeGenerali: results[0],
        domandeDocenti: results[1],
        docenti: results[2]
      });
    };
  });
});

app.all('/success', (req, res) => {
  res.render('success', {
    title: 'Test inviato con successo'
  });
});
app.all('/votato', (req, res) => {
  res.render('votato', {
    title: 'Hai già votato'
  });
});
app.all('/hack', (req, res) => {
  res.render('hack', {
    title: 'Povero illuso'
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
