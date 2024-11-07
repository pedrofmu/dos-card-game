'use strict';

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
let roomName;

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

  document.addEventListener('touchstart', onMouseClick, false);
  document.addEventListener('click', onMouseClick, false);

  playerName = getCookie('playerName');
  if (playerName == null) {
    playerName = prompt('Enter your name: ', 'Guest');
    if (playerName == null || playerName == "") {
      playerName = 'Guest';
    }
    setCookie('playerName', playerName, 24 * 3600);
  }

  roomName = getCookie('roomName');

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
        case 'playerDisconnected':
            if (data.state !== 'error'){
              handleDisconection();
            }else{
              socket.close();
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

function handleDisconection(){
    alert("Se ha desconectado un jugador");
    location.href = "/";
}

function haveCard(recivedHand){
  hand = recivedHand;
  ctx.clearRect(0, 400, canvas.width, canvas.height);
  for (let i = 0; i < recivedHand.length; i++) {

    ctx.drawImage(
        cards,
        1+cdWidth*(recivedHand[i]%14),
        1+cdHeight*Math.floor(recivedHand[i]/14),
        cdWidth,
        cdHeight,
        (recivedHand.length/112)*(cdWidth/3)+(canvas.width/(2+(hand.length-1)))*(i+1)-(cdWidth/4),
        400,
        cdWidth/2,
        cdHeight/2
    );
    console.log('<< Have card', recivedHand[i]);
  }
}

function turnPlayer(isTurn){
    turn = isTurn;
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
    playerName: playerName,
    roomName: roomName 
  };
  socket.send(JSON.stringify(message));
  console.log('>> Room Request');
}

function debugArea(x1, x2, y1, y2) {
  ctx.beginPath();
  ctx.moveTo(0, y1);
  ctx.lineTo(canvas.width, y1);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, y2);
  ctx.lineTo(canvas.width, y2);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x1, 0);
  ctx.lineTo(x1, canvas.height);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, 0);
  ctx.lineTo(x2, canvas.height);
  ctx.closePath();
  ctx.stroke();
}

function onMouseClick(e) {
  const offsetY = parseInt(window.getComputedStyle(canvas).marginTop);
  const offsetX = parseInt(window.getComputedStyle(canvas).marginLeft);
  const X = e.pageX - offsetX;
  const Y = e.pageY - offsetY;

  let lastCard = (hand.length/112)*(cdWidth/3)+(canvas.width/(2+(hand.length-1)))*(hand.length)-(cdWidth/4)+cdWidth/2;
  let initCard = 2 + (hand.length/112)*(cdWidth/3)+(canvas.width/(2+(hand.length-1)))-(cdWidth/4);

  if (Y >= 400 && Y <= 580 && X >= initCard && X <= lastCard) {
    for (let i = 0, pos = initCard; i < hand.length; i++, pos += canvas.width/(2+(hand.length-1))) {
      if (X >= pos && X <= pos+canvas.width/(2+(hand.length-1))) {
        //debugArea(pos, pos+canvas.width/(2+(hand.length-1)), 400, 580);
        console.log(`clicked card ${hand[i]}`); 
        return;
      }
    }
  } else if (X >= canvas.width-cdWidth/2-60 &&  X <= canvas.width-60 &&
    Y >= canvas.height/2-cdHeight/4 && Y <= canvas.height/2+cdHeight/4) {
      console.log("draw card");
  }
}

init();
