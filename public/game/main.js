'use strict';

let socket;

const canvas = document.getElementById('game_canvas');
const ctx = canvas.getContext('2d');

const dosButton = document.getElementById('dos-button');

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

function setCookie(name, value, seconds) {
    let date = new Date();
    date.setTime(date.getTime() + (seconds * 1000));
    let expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    name += "=";
    let cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
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
    ctx.font = "20px Arial";
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

    try {
        socket = new WebSocket(`ws://${window.location.host}/api/ws`);
    }catch{
        alert("error conectando al servidor, intentalo más tarde");
        location.href = "/";
    }

    // Cuando se abra la conexión, envía la solicitud de sala
    socket.onopen = function() {
        requestRoom();
    };

    // Al recibir un mensaje del servidor
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'responseRoom':
                if (data.roomName === 'player_already_exist') {
                    alert("Un jugador con el mismo nombre ya existe");
                    socket.close();
                    location.href = "/";
                    break;
                }

                if (data.roomName !== 'error') {
                    console.log(data.roomName);
                    responseFromRoom(data.roomName);
                } else {
                    alert("Error conectandote al servidor, intentalo más tarde");
                    socket.close();
                    location.href = "/";
                }
                break;
            case 'countDown':
                if (data.time != 'error') {
                    handleCountDown(data.time);
                } else {
                    alert("Error conectandote al servidor, intentalo más tarde");
                    socket.close();
                    location.href = "/";
                }
                break;
            case 'haveCard':
                if (data.hand !== 'error') {
                    haveCard(data.hand);
                } else {
                    alert("Error conectandote al servidor, intentalo más tarde");
                    socket.close();
                    location.href = "/";
                }
                break;
            case 'turnPlayer':
                if (data.yourTurn !== 'error') {
                    console.log(data.playerTurn);
                    turnPlayer(data.yourTurn, data.playerTurn, data.playersList);
                } else {
                    alert("Error conectandote al servidor, intentalo más tarde");
                    socket.close();
                    location.href = "/";
                }
                break;
            case 'sendCard':
                if (data.cardOnBoard !== 'error') {
                    sendCard(data.cardOnBoard);
                } else {
                    alert("Error conectandote al servidor, intentalo más tarde");
                    socket.close();
                    location.href = "/";
                }
                break;
            case 'playerDisconnected':
                if (data.state !== 'error') {
                    handleDisconection();
                } else {
                    alert("Error conectandote al servidor, intentalo más tarde");
                    socket.close();
                    location.href = "/";
                }
                break;
            case 'responseFromPlayedCard':
                if (data.state !== 'error') {
                    console.log(`>> Response from player: ${data.state}`);
                } else {
                    alert("Error conectandote al servidor, intentalo más tarde");
                    socket.close();
                    location.href = "/";
                }
                break;
            case 'win':
                if (data.playerWin !== 'error') {
                    handleWin(data.playerWin);
                } else {
                    alert("Error conectandote al servidor, intentalo más tarde");
                    socket.close();
                    location.href = "/";
                }
                break;
            case 'colorChanged':
                if (data.color !== 'error') {
                    handleColorChange(data.color);
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

    // Al cerrar la conexión
    socket.onclose = function() {
        console.log(">> Conexión cerrada");
    };

    // Manejo de errores
    socket.onerror = function(error) {
        console.error("WebSocket error:", error);
    };
}

function handleDisconection() {
    alert("Se ha desconectado un jugador");
    location.href = "/";
}

// representa color escogido 1000: rojo, 2000: amarillo, 3000: verde, 4000: azul
function handleColorChange(color) {
    switch (color) {
        case 1000:
            canvas.style.backgroundColor = '#ff5555';
            break;
        case 2000:
            canvas.style.backgroundColor = '#ffaa00';
            break;
        case 3000:
            canvas.style.backgroundColor = '#55aa55';
            break;
        case 4000:
            canvas.style.backgroundColor = '#5555ff';
            break;
        default:
            console.error(`error with color sent: ${color}`);
    }

}

function handleWin(playerWin) {
    if (playerWin === playerName) {
        alert("Has ganado");
    } else {
        alert("Has perdido")
    }

    location.href = "/";
}

function getColor() {
    return new Promise((resolve, reject) => {
        do {
            let color = prompt("Escoge un color: 'rojo', 'amarillo', 'verde' o 'azul'");
            switch (color) {
                case 'rojo':
                    resolve(0.1);
                    return;
                case 'amarillo':
                    resolve(0.2);
                    return;
                case 'verde':
                    resolve(0.3);
                    return;
                case 'azul':
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
    ctx.clearRect(0, 400, canvas.width, canvas.height);
    for (let i = 0; i < recivedHand.length; i++) {

        ctx.drawImage(
            cards,
            1 + cdWidth * (recivedHand[i] % 14),
            1 + cdHeight * Math.floor(recivedHand[i] / 14),
            cdWidth,
            cdHeight,
            (recivedHand.length / 112) * (cdWidth / 3) + (canvas.width / (2 + (hand.length - 1))) * (i + 1) - (cdWidth / 4),
            400,
            cdWidth / 2,
            cdHeight / 2
        );
    }
}


//Card colors:
// rojo: #FF5555
// azul: #5555FF
// verde: #55AA55
// amarillo: #FFAA00
function turnPlayer(yourTurn, playerTurn, allPlayers) {
    canvas.style.backgroundColor = '#10ac84';
    ctx.clearRect(0, 0, 200, 50);
    turn = yourTurn;

    listaUl.innerHTML = '';

    allPlayers.forEach(name => {
        const li = document.createElement("li");

        let parsedName = name.replace(/\([^)]*\)/g, '').trim();
        console.log(parsedName);

        if (parsedName === playerTurn) {
            li.textContent = `→ ${name}`;
            li.style.fontWeight = "bold";
        } else {
            li.textContent = name;
        }

        if (parsedName === playerName) {
            li.style.color = "#10ac84";
        }

        if (li.textContent !== "")
            listaUl.appendChild(li);
    });
}


function sendCard(num) {
    ctx.drawImage(cards, 1 + cdWidth * (num % 14), 1 + cdHeight * Math.floor(num / 14), cdWidth, cdHeight, canvas.width / 2 - cdWidth / 4, canvas.height / 2 - cdHeight / 4, cdWidth / 2, cdHeight / 2);
}

function handleCountDown(time) {
    ctx.clearRect(0, 0, 200, 50);
    ctx.fillText(`Starting in: ${time}`, 20, 20);
}

function responseFromRoom(roomName, players) {
    allPlayers = players;
    room = roomName;
    hand = [];
    turn = 0;
    console.log('>> Room Assigned:', room);
    document.getElementById("room_name").textContent = roomName;
    ctx.drawImage(back, canvas.width - cdWidth / 2 - 60, canvas.height / 2 - cdHeight / 4, cdWidth / 2, cdHeight / 2);
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

async function onMouseClick(e) {
    const offsetY = parseInt(window.getComputedStyle(canvas).marginTop);
    const offsetX = parseInt(window.getComputedStyle(canvas).marginLeft);
    const X = e.pageX - offsetX;
    const Y = e.pageY - offsetY;

    let lastCard = (hand.length / 112) * (cdWidth / 3) + (canvas.width / (2 + (hand.length - 1))) * (hand.length) - (cdWidth / 4) + cdWidth / 2;
    let initCard = 2 + (hand.length / 112) * (cdWidth / 3) + (canvas.width / (2 + (hand.length - 1))) - (cdWidth / 4);

    if (Y >= 400 && Y <= 580 && X >= initCard && X <= lastCard) {
        for (let i = 0, pos = initCard; i < hand.length; i++, pos += canvas.width / (2 + (hand.length - 1))) {
            if (X >= pos && X <= pos + canvas.width / (2 + (hand.length - 1))) {
                if (turn) {
                    let valueAdd = 0;
                    if (hand[i] % 14 === 13)
                        valueAdd = await getColor();

                    const message = {
                        type: 'playCard',
                        card: hand[i] + valueAdd
                    };
                    socket.send(JSON.stringify(message));
                    console.log(`message sent: ${JSON.stringify(message)}`);

                    console.log(`>> clicked card ${hand[i] + valueAdd}`);
                }
                return;
            }
        }
    } else if (X >= canvas.width - cdWidth / 2 - 60 && X <= canvas.width - 60 &&
        Y >= canvas.height / 2 - cdHeight / 4 && Y <= canvas.height / 2 + cdHeight / 4) {
        if (turn) {
            console.log(">> draw card");
            const message = {
                type: 'drawCard',
                cuantity: 1
            };
            socket.send(JSON.stringify(message));
        }
    }
}

init();

dosButton.addEventListener("click", () => {
    const message = {
        type: 'dos',
    };
    socket.send(JSON.stringify(message));
    console.log("<< DOS!");
});
