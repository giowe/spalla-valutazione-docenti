var send = false;

function sendTest(elem, cb) {
  var idClasse = elem.getAttribute("href");
  idClasse = idClasse.substr(1);
  if (send) {
    return;
  }
  send = true;
  dataToSend = {
      idClasseScelto : idClasse
  }
  nanoajax.ajax({
      method: 'POST',
      body: JSON.stringify(dataToSend),
      headers: {
        'Content-Type': 'application/json'
      },
      url: `http://localhost:4000/sceltaClasse`
    },

    function (code, responseText) {
      console.log(code);
      if (code === 200) {
        window.location.pathname = '/questionario';
      };
      if (code === 600) {
        window.location.pathname = '/votato';
      };
      if (code === 601) {
        window.location.pathname = '/hack';
      };
    });
};
