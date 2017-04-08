'use strict';

function getVotiDocenti(idDocente, idDomanda, idClasse){
  const where = {
    idDocente,
    idDomanda,
    idClasse
  };
  return fetch(`http://localhost:4000/votazioni?where=${JSON.stringify(where)}`)
    .then(res => res.json())
}

function getVotiGenerali(idDomanda, idClasse){
  const where = {
    idDomanda,
    idClasse
  };
  return fetch('http://localhost:4000/docenti?where=${JSON.stringify(where)}')
    .then(res => res.json())
}

getVotiDocenti(50, 7, '2FSINFO').then(result => {
  console.log(getStats(result.data));
 // console.log(result);
});

function getStats(votazioni) {
  let min = 666;
  let max = -666;
  let sum = 0;
  let votanti = 0;
  let na = 0; 
  const l = votazioni.length;
  for (let i = 0; i < l; i++) {
    const singolaVotazione = votazioni[i];
    const voto = singolaVotazione.voto;
    if ( voto === -1) {
      na++;
    } else {
      if (voto < min) min = voto;
      if (voto > max) max = voto;
      sum += voto;
      votanti++;
    }
  }
  
  return {
    min,
    max,
    avg: sum/votanti,
    votanti,
    na
  }
}
