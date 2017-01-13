'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const app = new express();
//const router = require('router');
const port = 8000;

//app.use(bodyParser.json());

app.listen(port, () => {
  console.log(`backend listening on port ${port}`);
});
