'use strict';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const mysql = require('mysql');
const config = require('../config.json');
const cryptoKey = require('../config.json').cryptoKey;
const pool = mysql.createPool({
  connectionLimit: 10,
  host: "rds.soluzionifutura.it",
  user: "spalla_vdocenti",
  database: "spalla_vdocenti",
  password: config.dbPassword
});
router.post('/login', (req, res) => {
  try {
    const body = req.body.userData; /*|| require('../fakeAccount-data.json').userLoginData; */
    const password = crypto.createHmac('sha256', body.password)
      .update(cryptoKey)
      .digest('hex');
    const username = body.username;
    const users = require('../users/users.json');
    console.log(users);
    let esiste = false;
    users.forEach(user => {
      if (user.username == username && user.password == password) {
        const label = crypto.createHmac('sha256', username + password + req.ip)
          .update(cryptoKey)
          .digest('hex');
        esiste = true;
        res.status(200).json({
          userData: {
            username: username,
            password: password,
            label: label
          }
        });
        return;
      }
    })
    if (!esiste) {
      res.status(303).json({
        error: {
          status: 303,
          statusCode: 303,
          message: 'dati utente non validi'
        }
      })
    }
    return;
  } catch (err) {
    res.status(303).json({
      error: {
        status: 303,
        statusCode: 303,
        message: 'dati utente non validi'
      }
    })
    return;
  }
});
module.exports = router;
