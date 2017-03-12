const theIpOfServer ='192.168.0.12';
var send = false;
function sendTest(elem, cb) {
  var idClasse = elem.getAttribute("href");
  idClasse = idClasse.substr(1);
  if (send) {
    return;
  }
  send = true;
  nanoajax.ajax({
    url: `http://${theIpOfServer}:4000/sceltaClasse?idClasse=${idClasse}`
  }, function (code, responseText) {
    if (code === 200) {
      window.location.href = `/questionario?idClasse=${idClasse}`;
    };
    if (code === 600) {
      window.location.pathname = '/votato';
    };
    if (code === 601) {
      window.location.pathname = '/hack';
    };
  });
};
