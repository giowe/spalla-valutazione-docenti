# API Visualization Documentation
### Chiamate disponibili
    - "/votazioni/scuola" => per avere le votazioni generali della scuola;
    - "/votazioni/scuola/:sede" => per avere le votazioni generali della scuola filtrata
    per sede "ariosto" e "spalla";
    - "/votazioni/scuola/materia/:materia" => per avere le votazioni generali della scuola 
    filtrata per materia: "Matematica e Fisica", "Scienze", "Matematica", "Informatica", 
    "Matematica e Informatica","Lettere", "Storia Filosofia", "Greco", "Storia dell'Arte", 
    "Francese", "Inglese", "Tedesco", "Religione", "Educazione Fisica";
    - "/votazioni/scuola/tipologiaMateria/:tipoMateria" => per avere le votazioni generali 
    della scuola filtrata per tipologia materia: "letteratura", "scientifico", "lingue", "altro";
    - "/votazioni/docenti" => per  avere le votazioni di tutti i docenti;
    - "/votazioni/docenti/:sede" => per avere le votazioni di tutti i docenti filtrati per sede 
    "ariosto" e "spalla";
    - "/docenti/:idClasse" => per avere la lista dei docenti di una determinata classe;
    - "/domande/:type" => per avere la lista delle domande filtrate per tipo "0" o "1";
    - "/domande" => per avere la lista completa delle domande;
    - "/docenti" => per avere la lista completa dei docenti;