'use scrict';
const username = process.argv[2];
const fs = require('fs');
if (!username) throw new Error("Manca il nome");

if (!fs.existsSync('../users')) {
  fs.mkdirSync('../users');
}
let users;
if (fs.existsSync('../users/users.json')) {
  users = require('../users/users.json');
} else {
  users = [];
}
let eliminato = false;
for (let i in users) {
  if (users[i].username == username) {
    users.splice(i, 1);
    eliminato = true;
  }
}
fs.writeFile('../users/users.json', JSON.stringify(users), (err) => {
  if (err) {
    return console.log(err);
  }
  if(eliminato){
      console.log('ELIMINATO IL PROFILO : '+ username);
  }else{
      console.log('NESSUN PROFILO TROVATO DI NOME : '+username);
  }
});
