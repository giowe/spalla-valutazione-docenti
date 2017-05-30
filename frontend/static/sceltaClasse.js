var send = false;

function sendTest(elem, cb) {
  var religioneRadio = document.getElementsByTagName('input');
  var radioLength = religioneRadio.length;
  var boolReligione = 'true';
  for (var radioIndex = 0; radioIndex < radioLength; radioIndex++) {
    if (religioneRadio[radioIndex].checked == true) {
      if (religioneRadio[radioIndex].value == '0') {
        boolReligione = 'true';
      }else{
        boolReligione = 'false';
      }
    }
  }
  var idClasse = elem.getAttribute("href");
  idClasse = idClasse.substr(1);
  if (send) {
    return;
  }
  send = true;
  nanoajax.ajax({
    url: `http://${sessionStorage.ServerIp}:4000/sceltaClasse?idClasse=${idClasse}`
  }, function (code, responseText) {
    if (code === 200) {
      window.location.href = `/questionario?idClasse=${idClasse}&TFreligione=${boolReligione}`;
    };
    if (code === 600) {
      window.location.pathname = '/success';
    };
    if (code === 601) {
      window.location.pathname = '/hack';
    };
  });
};
