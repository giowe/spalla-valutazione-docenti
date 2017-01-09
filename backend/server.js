'use strict';
const express = require('express');
const app = new express();
const port = 4000;

app.listen(port, ()=> {
  console.log(`backend listening on port ${port}`);
});
