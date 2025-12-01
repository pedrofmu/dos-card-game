"use strict";

let socket;

const canvas = document.getElementById("game_canvas");
const ctx = canvas.getContext("2d");

const dosButton = document.getElementById("dos-button");
const statusBadge = document.getElementById("status_badge");
const countdownText = document.getElementById("countdown_text");
const countdownBar = document.getElementById("countdown_bar");
const countdownChip = document.getElementById("countdown_chip");
const turnIndicator = document.getElementById("turn_indicator");
const turnPlayerNameEl = document.getElementById("turn_player_name");
const turnHintEl = document.getElementById("turn_hint");
const gameBoard = document.querySelector(".game-board");

if (countdownChip) {
  countdownChip.style.display = "none";
}

const cdWidth = 240;
const cdHeight = 360;
const cards = new Image();
const back = new Image();

let room;
let hand = [];
let turn = false;
let playerName;
let roomName;

let listaUl = document.getElementById("lista-jugadores");
let allPlayers;
let initialCountdown = null;

function setCookie(name, value, seconds) {
  let date = new Date();
  date.setTime(date.getTime() + seconds * 1000);
  let expires = "expires=" + date.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
  name += "=";
  let cookies = document.cookie.split(";");
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  return null;
}

function getHandY() {
  return canvas.height * (2 / 3);
}

function clearHandArea() {
  const y = getHandY();
  ctx.clearRect(0, y - 10, canvas.width, canvas.height - (y - 10));
}

function getCanvasCoords(evt) {
  const rect = canvas.getBoundingClientRect();

  let clientX, clientY;
  if (evt.touches && evt.touches.length > 0) {
    clientX = evt.touches[0].clientX;
    clientY = evt.touches[0].clientY;
  } else {
    clientX = evt.clientX;
    clientY = evt.clientY;
  }

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  // Map CSS pixels to canvas internal coordinates
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: x * scaleX,
    y: y * scaleY,
  };
}

function init() {
  ctx.font = "20px Arial";
  canvas.style.backgroundColor = "#10ac84";
  cards.src = "../images/deck.svg";
  back.src = "../images/back.svg";

  // Listen only on the canvas, not the whole document
  canvas.addEventListener("touchstart", onMouseClick, { passive: false });
  canvas.addEventListener("click", onMouseClick, false);

  playerName = getCookie("playerName");
  if (playerName == null) {
    playerName = prompt("Enter your name: ", "Guest");
    if (playerName == null || playerName === "") {
      playerName = "Guest";
    }
    setCookie("playerName", playerName, 24 * 3600);
  }

  roomName = getCookie("roomName");

  try {
    socket = new WebSocket(`ws://${window.location.host}/api/ws`);
  } catch {
    alert("error conectando al servidor, intentalo más tarde");
    location.href = "/";
  }

  // When the connection opens, send the room request
  socket.onopen = function () {
    requestRoom();
  };

  // When a message is received from the server
  socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    console.log(data);
    switch (data.type) {
      case "responseRoom":
        if (data.roomName === "player_already_exist") {
          alert("Un jugador con el mismo nombre ya existe");
          socket.close();
          location.href = "/";
          break;
        }

        if (data.roomName !== "error") {
          console.log(data.roomName);
          responseFromRoom(data.roomName);
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      case "countDown":
        if (data.time !== "error") {
          handleCountDown(data.time);
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      case "haveCard":
        if (data.hand !== "error") {
          haveCard(data.hand);
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      case "turnPlayer":
        if (data.yourTurn !== "error") {
          console.log(data.playerTurn);
          turnPlayer(data.yourTurn, data.playerTurn, data.playersList);
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      case "sendCard":
        if (data.cardOnBoard !== "error") {
          sendCard(data.cardOnBoard);
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      case "playerDisconnected":
        if (data.state !== "error") {
          handleDisconection();
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      case "responseFromPlayedCard":
        if (data.state !== "error") {
          console.log(`>> Response from player: ${data.state}`);
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      case "win":
        if (data.playerWin !== "error") {
          handleWin(data.playerWin);
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      case "colorChanged":
        if (data.color !== "error") {
          handleColorChange(data.color);
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      case "dosResponse":
        if (data.response !== "error") {
          handleDOSReponse(data.response);
        } else {
          alert("Error conectandote al servidor, intentalo más tarde");
          socket.close();
          location.href = "/";
        }
        break;
      default:
        console.error("unsoported messaje: ", data.type);
    }
  };

  // When the connection closes
  socket.onclose = function () {
    console.log(">> Conexión cerrada");
  };

  // Error handling
  socket.onerror = function (error) {
    console.error("WebSocket error:", error);
  };
}

function handleDisconection() {
  alert("Se ha desconectado un jugador");
  location.href = "/";
}

// Represents chosen color 1000: red, 2000: yellow, 3000: green, 4000: blue
function handleColorChange(color) {
  switch (color) {
    case 1000:
      canvas.style.backgroundColor = "#ff5555";
      break;
    case 2000:
      canvas.style.backgroundColor = "#ffaa00";
      break;
    case 3000:
      canvas.style.backgroundColor = "#55aa55";
      break;
    case 4000:
      canvas.style.backgroundColor = "#5555ff";
      break;
    default:
      console.error(`error with color sent: ${color}`);
  }
}

function handleDOSReponse(response) {
    const RESPONSE_TYPES = {
      SUCCESS: 'success',
      FORGOT: 'forgot',
      MISS_CLICK: 'miss',
    };


    switch (response) {
        case RESPONSE_TYPES.SUCCESS:
            alert("Enhorabuena por darle al DOS");
            break;
        case RESPONSE_TYPES.FORGOT:
            alert("Se te ha olvidado darle al DOS, chupate 2");           
            break;
        case RESPONSE_TYPES.MISS_CLICK:
             alert("Le has dado a DOS sin necesidad, chupate 2");           
            break;
        default:
            break;
    }
}

function handleWin(playerWin) {
  if (playerWin === playerName) {
    alert("Has ganado");
  } else {
    alert("Has perdido");
  }

  location.href = "/";
}

function getColor() {
  return new Promise((resolve) => {
    do {
      let color = prompt(
        "Escoge un color: 'rojo', 'amarillo', 'verde' o 'azul'",
      );
      switch (color) {
        case "rojo":
          resolve(0.1);
          return;
        case "amarillo":
          resolve(0.2);
          return;
        case "verde":
          resolve(0.3);
          return;
        case "azul":
          resolve(0.4);
          return;
        default:
          alert("Escoge un color válido");
      }
    } while (true);
  });
}

function haveCard(recivedHand) {
  hand = recivedHand;
  clearHandArea();

  const handY = getHandY();

  for (let i = 0; i < recivedHand.length; i++) {
    ctx.drawImage(
      cards,
      1 + cdWidth * (recivedHand[i] % 14),
      1 + cdHeight * Math.floor(recivedHand[i] / 14),
      cdWidth,
      cdHeight,
      (recivedHand.length / 112) * (cdWidth / 3) +
        (canvas.width / (2 + (hand.length - 1))) * (i + 1) -
        cdWidth / 4,
      handY,
      cdWidth / 2,
      cdHeight / 2,
    );
  }
}

function updateTurnIndicator(isMyTurn, playerTurnName) {
  if (!turnIndicator || !turnPlayerNameEl || !turnHintEl) return;

  const cleanedName =
    playerTurnName && typeof playerTurnName === "string"
      ? playerTurnName.replace(/\([^)]*\)/g, "").trim()
      : "";

  turnIndicator.classList.toggle("is-my-turn", isMyTurn);
  if (gameBoard) {
    gameBoard.classList.toggle("is-my-turn", isMyTurn);
  }

  if (isMyTurn) {
    turnPlayerNameEl.textContent = "¡Tu turno!";
    turnHintEl.textContent = "Juega una carta o roba del mazo.";
  } else if (cleanedName) {
    turnPlayerNameEl.textContent = `Turno de ${cleanedName}`;
    turnHintEl.textContent = "Espera a que el jugador termine.";
  } else {
    turnPlayerNameEl.textContent = "Esperando jugadores...";
    turnHintEl.textContent = "Te avisaremos cuando puedas jugar.";
  }
}

// Card colors:
// red: #FF5555
// blue: #5555FF
// green: #55AA55
// yellow: #FFAA00
function turnPlayer(yourTurn, playerTurn, allPlayersList) {
  canvas.style.backgroundColor = "#10ac84";
  ctx.clearRect(0, 0, 200, 50);
  turn = yourTurn;

  listaUl.innerHTML = "";

  updateTurnIndicator(yourTurn, playerTurn);

  allPlayersList.forEach((name) => {
    const li = document.createElement("li");

    const parsedName = name.replace(/\([^)]*\)/g, "").trim();
    console.log(parsedName);

    li.textContent = name;

    const isMe = parsedName === playerName;
    const isTurn = parsedName === playerTurn;

    if (isTurn) {
      li.classList.add("game-player-turn");
    }

    if (isMe) {
      li.classList.add("game-player-me");
    }

    if (isMe || isTurn) {
      const chip = document.createElement("span");
      chip.className = "player-status-chip";

      if (isMe && isTurn) {
        chip.textContent = "Tu turno";
      } else if (isMe) {
        chip.textContent = "Tú";
      } else if (isTurn) {
        chip.textContent = "Jugando";
      }

      li.appendChild(chip);
    }

    if (li.textContent !== "") listaUl.appendChild(li);
  });
}

function sendCard(num) {
  ctx.drawImage(
    cards,
    1 + cdWidth * (num % 14),
    1 + cdHeight * Math.floor(num / 14),
    cdWidth,
    cdHeight,
    canvas.width / 2 - cdWidth / 4,
    canvas.height / 2 - cdHeight / 4,
    cdWidth / 2,
    cdHeight / 2,
  );
}

function handleCountDown(time) {
  if (!statusBadge || !countdownText || !countdownBar) return;

  if (initialCountdown === null && time > 0) {
    initialCountdown = time;
  }

  const remaining = Math.max(0, time);

  if (time > 0) {
    statusBadge.textContent = "Preparando partida";
    statusBadge.classList.remove("badge-live");
    statusBadge.classList.add("badge-waiting");

    if (countdownChip) {
      countdownChip.style.display = "flex";
    }

    countdownText.textContent = `${remaining}s`;
    const progress = initialCountdown
      ? Math.max(0, Math.min(100, (remaining / initialCountdown) * 100))
      : 100;
    countdownBar.style.width = `${progress}%`;

    if (countdownChip) {
      countdownChip.classList.remove("is-live");
    }
  } else {
    statusBadge.textContent = "En juego";
    statusBadge.classList.remove("badge-waiting");
    statusBadge.classList.add("badge-live");

    if (countdownChip) {
      countdownChip.style.display = "none";
    }

    countdownText.textContent = "¡Arrancó!";
    countdownBar.style.width = "100%";

    if (countdownChip) {
      countdownChip.classList.add("is-live");
    }

    initialCountdown = null;
  }
}

function responseFromRoom(roomName) {
  room = roomName;
  hand = [];
  turn = 0;
  console.log(">> Room Assigned:", room);
  document.getElementById("room_name").textContent = roomName;
  ctx.drawImage(
    back,
    canvas.width - cdWidth / 2 - 60,
    canvas.height / 2 - cdHeight / 4,
    cdWidth / 2,
    cdHeight / 2,
  );
}

function requestRoom() {
  const message = {
    type: "requestRoom",
    playerName: playerName,
    roomName: roomName,
  };
  socket.send(JSON.stringify(message));
  console.log(">> Room Request");
}

async function onMouseClick(e) {
  if (e.type === "touchstart") {
    // To avoid also firing click after touch
    e.preventDefault();
  }

  const { x: X, y: Y } = getCanvasCoords(e);

  const handY = getHandY();
  const handBottom = handY + cdHeight / 2;

  let lastCard =
    (hand.length / 112) * (cdWidth / 3) +
    (canvas.width / (2 + (hand.length - 1))) * hand.length -
    cdWidth / 4 +
    cdWidth / 2;
  let initCard =
    2 +
    (hand.length / 112) * (cdWidth / 3) +
    canvas.width / (2 + (hand.length - 1)) -
    cdWidth / 4;

  if (Y >= handY && Y <= handBottom && X >= initCard && X <= lastCard) {
    for (
      let i = 0, pos = initCard;
      i < hand.length;
      i++, pos += canvas.width / (2 + (hand.length - 1))
    ) {
      if (X >= pos && X <= pos + canvas.width / (2 + (hand.length - 1))) {
        if (turn) {
          let valueAdd = 0;
          if (hand[i] % 14 === 13) valueAdd = await getColor();

          const message = {
            type: "playCard",
            card: hand[i] + valueAdd,
          };
          socket.send(JSON.stringify(message));
          console.log(`message sent: ${JSON.stringify(message)}`);

          console.log(`>> clicked card ${hand[i] + valueAdd}`);
        }
        return;
      }
    }
  } else if (
    X >= canvas.width - cdWidth / 2 - 60 &&
    X <= canvas.width - 60 &&
    Y >= canvas.height / 2 - cdHeight / 4 &&
    Y <= canvas.height / 2 + cdHeight / 4
  ) {
    if (turn) {
      console.log(">> draw card");
      const message = {
        type: "drawCard",
        cuantity: 1,
      };
      socket.send(JSON.stringify(message));
    }
  }
}

init();

dosButton.addEventListener("click", () => {
  const message = {
    type: "dos",
  };
  socket.send(JSON.stringify(message));
  console.log("<< DOS!");
});
