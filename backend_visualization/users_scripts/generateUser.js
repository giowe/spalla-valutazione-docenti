'use scrict';
const username = process.argv[2];
let password = process.argv[3];
const fs = require('fs');
const crypto = require('crypto');
const cryptoKey = require('../config.json').cryptoKey;
if (!username) throw new Error("Manca il nome");
if (!password) throw new Error("Manca la password");

password = crypto.createHmac('sha256', password)
  .update(cryptoKey)
  .digest('hex');

if (!fs.existsSync('../users')) {
  fs.mkdirSync('../users');
}
let users;
if (fs.existsSync('../users/users.json')) {
  users = require('../users/users.json');
} else {
  users = [];
}
const newUser = {
  username: username,
  password: password
}
users.forEach(user => {
  if (user.username === newUser.username) {
    throw new Error("Nome utente già esistente");
  }
});
users.push(newUser);
fs.writeFile('../users/users.json',JSON.stringify(users), (err) => {
  if (err) {
    return console.log(err);
  }
  console.log("The file was saved!");
});
