function validateAnswer() {
  
}

function sendTest() {
  var forms = document.getElementsByTagName('form');
  var l = forms.length;
  for (var i = 0; i < l; i++) {
    var form = forms[i];
    var idDocente = form.getAttribute('idDocente');
    var idDomanda = form.getAttribute('idDomanda');
    console.log(idDocente, idDomanda);
  }
}
