function debugRispondi(val) {
  if (typeof val === 'undefined') val = 4;

  var forms = document.getElementsByTagName('form');
  var formsLength = forms.length;
  for (var formsIndex = 0; formsIndex < formsLength; formsIndex++) {
    var form = forms[formsIndex];
    var inputs = form.getElementsByTagName('input');
    inputs[val].checked = true;
  }
}
var send = false;
function sendTest() {
  var dataToSend = {
    docenti: []
  };
  var forms = document.getElementsByTagName('form');
  var formsLength = forms.length;
  for (var formsIndex = 0; formsIndex < formsLength; formsIndex++) {
    var form = forms[formsIndex];
    var idDocente = form.getAttribute('idDocente');
    var idDomanda = form.getAttribute('idDomanda');
    var isRequired = form.getAttribute('isRequired');
    var inputs = form.getElementsByTagName('input');
    var inputsLength = inputs.length;
    var voto = null;

    for (var inputIndex = 0; inputIndex < inputsLength; inputIndex++) {
      var input = inputs[inputIndex];
      if (input.checked) {
        voto = input.value;
        if (voto > 5) voto = 5;
        else if (isRequired && voto < 1) voto = 1;
        else if (!isRequired && voto < 1) voto = -1;
        break;
      }
    }
    //risparmio uso risorse = speed
    if (voto === null) {
      for (var i = 0; i < formsLength; i++) {
        var form = forms[i];
        var inputs = form.getElementsByTagName('input');
        var inputsLength = inputs.length;
        var voto = null;

        for (var inputIndex = 0; inputIndex < inputsLength; inputIndex++) {
          var input = inputs[inputIndex];
          if (input.checked) {
            voto = input.value;
            if (voto > 5) voto = 5;
            else if (isRequired && voto < 1) voto = 1;
            else if (!isRequired && voto < 1) voto = -1;
            break;
          }
        }
        if (voto === null) {
          var idDocDomUnChecked = form.getAttribute('idDocente');
          if (idDocDomUnChecked === null) idDocDomUnChecked = '';
          var idUnique = 'id' + idDocDomUnChecked + form.getAttribute('idDomanda');
          var domandaUnChecked = document.getElementById(idUnique);
          domandaUnChecked.classList.add('missing');
        }
      }
      var idUnique = 'idDoc' + idDocente;
      scrollZhou(idUnique,150);
      alert('Attenzione non hai risposto a tutte le domande!');
      return;
    }
    var last = dataToSend.docenti[dataToSend.docenti.length - 1];
    if (!last || last.id !== idDocente) {
      //aggiungo nuovo docente
      dataToSend.docenti.push({
        id: idDocente,
        domande: []
      })
    }

    dataToSend.docenti[dataToSend.docenti.length - 1].domande.push({
      id: idDomanda,
      voto: voto
    });
  }
  if(send){
    return;
  }
  send = true;
  nanoajax.ajax({
      method: 'POST',
      body: JSON.stringify(dataToSend),
      headers: {
        'Content-Type': 'application/json'
      },
      url: 'http://localhost:4000/votazioni'
    },

    function (code, responseText) {
      console.log(code);
      if (code === 200) {
        window.location.pathname = '/success';
      };
      if (code === 600) {
        window.location.pathname = '/votato';
      };
      if (code === 601) {
        window.location.pathname = '/hack';
      };
    });
};

function removeMissing(element) {
  var inputs = element.getElementsByTagName('input');
  var inputsLength = inputs.length;
  for (var inputIndex = 0; inputIndex < inputsLength; inputIndex++) {
    var input = inputs[inputIndex];
    if (input.checked) {
      var idDocDomUnChecked = element.getAttribute('idDocente');
      if (idDocDomUnChecked === null) idDocDomUnChecked = '';
      var idUnique = 'id' + idDocDomUnChecked + element.getAttribute('idDomanda');
      var domandaChecked = document.getElementById(idUnique);
      domandaChecked.classList.remove('missing');
      break;
    }
  }
}
