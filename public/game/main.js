let socket;

const canvas = document.getElementById('game_canvas');
const ctx = canvas.getContext('2d');

const cdWidth = 240;
const cdHeight = 360;
const cards = new Image();
const back = new Image();

let room;
let hand = [];
let turn;
let playerName;

function setCookie(name, value, seconds) {
  let date = new Date();
  date.setTime(date.getTime() + (seconds * 1000));
  let expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
  name += "=";
  let cookies = document.cookie.split(';');
  for(let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) == ' ') {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) == 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
}

function init() {
  ctx.font = "12px Arial";
  canvas.style.backgroundColor = '#10ac84';
  cards.src = '../images/deck.svg';
  back.src = '../images/back.svg';

  document.addEventListener('touchstart', () => {}, false);
  document.addEventListener('click', () => {}, false);

  playerName = getCookie('playerName');
  if (playerName == null) {
    playerName = prompt('Enter your name: ', 'Guest');
    if (playerName == null || playerName == "") {
      playerName = 'Guest';
    }
    setCookie('playerName', playerName, 24 * 3600);
  }

  socket = new WebSocket(`ws://${window.location.host}/api/ws`); 

  // Cuando se abra la conexión, envía la solicitud de sala
  socket.onopen = function() {
    requestRoom();
  };

  // Al recibir un mensaje del servidor
  socket.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'responseRoom') {
      // Respuesta a la solicitud de sala 
      room = data.room;
      hand = [];
      turn = 0;
      console.log('>> Room Assigned:', room);
    }
    // añadir más tipos de mensaje 
  };

  // Al cerrar la conexión
  socket.onclose = function() {
    console.log(">> Conexión cerrada");
  };

  // Manejo de errores
  socket.onerror = function(error) {
    console.error("WebSocket error:", error);
  };
}


function requestRoom() {
  const message = {
    type: 'requestRoom',
    playerName: playerName
  };
  socket.send(JSON.stringify(message));
  console.log('>> Room Request');
}

init();
