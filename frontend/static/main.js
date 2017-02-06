debugRispondi();

function validateAnswer() {
  
}

function debugRispondi() {
  var forms = document.getElementsByTagName('form');
  var formsLength = forms.length;
  for (var formsIndex = 0; formsIndex < formsLength; formsIndex++) {
    var form = forms[formsIndex];
    var inputs = form.getElementsByTagName('input');
    inputs[1].checked = true;
  }
}

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
        else if ( !isRequired && voto < 1) voto = -1;
        break;
      }
    }
    
    if (voto === null) {
      alert('Devi compilare tutte le risposte');
      //todo sarebbe bello dirgli quale non ha risposto tra tutte.
      return;
    }
    
    var last = dataToSend.docenti[dataToSend.docenti.length-1];
    if (!last || last.id !== idDocente) {
      //aggiungo nuovo docente
      dataToSend.docenti.push({
        id: idDocente,
        domande: []
      })
    }

    dataToSend.docenti[dataToSend.docenti.length-1].domande.push({
      id: idDomanda,
      voto: voto
    });
  }

  //todo mando il voto

  nanoajax.ajax({
      method: 'POST',
      body: JSON.stringify(dataToSend),
      headers: {
        'Content-Type': 'application/json'
      },
      url:'http://192.168.1.231:4000/votazioni'
    },

    function (code, responseText) {
      console.log(responseText);
    }

  );
}
