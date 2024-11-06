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
    switch (data.type){
        case 'responseRoom':
            if (data.room != 'error'){
                responseFromRoom(data.room);
            }else {
                socket.close();
                alert("Error conectandote al servidor, intentalo más tarde");
            }
        break;
        case 'countDown':
            if (data.time != 'error'){
              handleCountDown(data.time);
            }else {
              socket.close();
              alert("Error conectandote al servidor, intentalo más tarde");
            } 
        break;
        case 'haveCard':
            if (data.hand !== 'error'){
                haveCard(data.hand); 
            }else {
              socket.close();
              alert("Error conectandote al servidor, intentalo más tarde");
            }
        break;
        case 'turnPlayer':
            if (data.turn !== 'error'){
              turnPlayer(data.turn);       
            }else {
              socket.close();
              alert("Error conectandote al servidor, intentalo más tarde");
            }
        break;
        case 'sendCard':
            if (data.cardOnBoard !== 'error'){
              sendCard(data.cardOnBoard); 
            }else {
              socket.close();
              alert("Error conectandote al servidor, intentalo más tarde");
            }
        break;
        default:
            console.error("unsoported messaje: ", data.type);
    }
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

function haveCard(hand){
  ctx.clearRect(0, 400, canvas.width, canvas.height);
  for (let i = 0; i < hand.length; i++) {
    ctx.drawImage(
        cards,
        1+cdWidth*(hand[i]%14),
        1+cdHeight*Math.floor(hand[i]/14),
        cdWidth,
        cdHeight,
        (hand.length/112)*(cdWidth/3)+(canvas.width/(2+(hand.length-1)))*(i+1)-(cdWidth/4),
        400,
        cdWidth/2,
        cdHeight/2
    );
    console.log('<< Have card', hand[i]);
  }
}

function turnPlayer(turn){
    turn = turn;
    console.log(">> ", "turn: ", turn);
}

function sendCard(num){
    ctx.drawImage(cards, 1+cdWidth*(num%14), 1+cdHeight*Math.floor(num/14), cdWidth, cdHeight, canvas.width/2-cdWidth/4, canvas.height/2-cdHeight/4, cdWidth/2, cdHeight/2);
}

function handleCountDown(time){
  ctx.clearRect(0, 10, 15, 10);
  ctx.fillText(time, 0, 20);
}

function responseFromRoom(roomName){
   room = roomName;
   hand = [];
   turn = 0;
   console.log('>> Room Assigned:', room);
   ctx.fillText(roomName, 0, 10);
   ctx.drawImage(back, canvas.width-cdWidth/2-60, canvas.height/2-cdHeight/4, cdWidth/2, cdHeight/2);
   ctx.fillText(playerName, 100, 390);
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
