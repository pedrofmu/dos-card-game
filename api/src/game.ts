interface Timeout {
    id: number;
    seconds: number;
}

interface Player {
    id: string;
    name: string;
    hand: number[];
}

interface Room {
    timeout: Timeout;
    deck: number[];
    reverse: boolean;
    turn: number;
    cardOnBoard: number;
    conectedPlayers: number;
    players: Player[];
    isPlaying: boolean;
}

interface roomDictionary {
    [key: string]: Room;
}

const NUM_ROOMS = 5;
const MAX_PEOPLE = 10;

const allRooms: roomDictionary = {};
const clients: Record<string, WebSocket> = {};
export function initialiceRoomData(roomName: string) {
    const room: Room = {
        timeout: { id: 0, seconds: 10 },
        deck: [],
        reverse: false,
        turn: 0,
        cardOnBoard: 0,
        conectedPlayers: 0,
        players: [],
        isPlaying: false,
    };

    // Populate players array
    for (let j = 0; j < MAX_PEOPLE; j++) {
        const player: Player = {
            id: "",
            name: "",
            hand: [],
        };
        room.players.push(player);
    }

    allRooms[roomName] = room;
}

function shuffleDeck(deck: number[]): void {
    let j, x, i;
    for (i = deck.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = deck[i];
        deck[i] = deck[j];
        deck[j] = x;
    }
}

function findPlayer(
    room: Room,
    key: "id" | "name",
    value: string,
): Player {
    return room.players.find((player) => player[key] === value) as Player;
}

function getNextCard(deck: number[]): number {
    const card = deck.shift();
    if (card === undefined) {
        console.error("error repartiendo la siguiente carta");
        return 1;
    }

    return card;
}

enum CardColor {
    red,
    yellow,
    green,
    blue,
    black,
}

function cardColor(num: number): CardColor {
    // black card chosee
    switch (Math.round(num)){
        case 1000:
            return CardColor.red;
        case 2000:
            return CardColor.yellow;
        case 3000:
            return CardColor.green;
        case 4000:
            return CardColor.blue;
    }

    if (num % 14 === 13) {
        return CardColor.black;
    }

    switch (Math.floor(num / 14)) {
        case 0:
        case 4:
            return CardColor.red;
        case 1:
        case 5:
            return CardColor.yellow;
        case 2:
        case 6:
            return CardColor.green;
        case 3:
        case 7:
            return CardColor.blue;
    }

    return CardColor.black;
}

enum CardType {
    skip,
    reverse,
    draw2,
    draw4,
    wild,
    standard,
}

function cardType(num: number): CardType {
    switch (num % 14) {
        case 10:
            return CardType.skip;
        case 11:
            return CardType.reverse;
        case 12:
            return CardType.draw2;
        case 13:
            if (Math.floor(num / 14) >= 4) {
                return CardType.draw4;
            } else {
                return CardType.wild;
            }
        default:
            return CardType.standard;
    }
}

function handleRequestRoom(
    playerName: string,
    roomName: string,
    clientId: string,
) {
    for (let i = 1; i <= NUM_ROOMS; i++) {
        if (!(roomName in allRooms)) {
            initialiceRoomData(roomName);
        }

        const room = allRooms[roomName];

        if (room.conectedPlayers < MAX_PEOPLE && room.timeout.seconds > 0) {
            room.players[room.conectedPlayers] = {
                id: clientId,
                name: playerName,
                hand: [],
            };
            room.conectedPlayers++;
            console.log(
                `>> User ${playerName} connected to ${roomName} (${room.conectedPlayers}/${MAX_PEOPLE})`,
            );

            const response = { type: "responseRoom", roomName: roomName };
            clients[clientId].send(JSON.stringify(response));

            // Comenzar el timeout si hay +2 personas
            if (room.conectedPlayers >= 2) {
                clearInterval(room.timeout.id);
                room.timeout.seconds = 3;
                console.log(">> ", roomName, ": starting countdown");
                room.timeout.id = setInterval(() => {
                    // countdown
                    room.timeout.seconds--;

                    const response = {
                        type: "countDown",
                        time: room.timeout.seconds,
                    };
                    for (let i = 0; i < room.players.length; i++) {
                        if (room.players[i].id !== "") {
                            clients[room.players[i].id].send(
                                JSON.stringify(response),
                            );
                        }
                    }

                    if (room.timeout.seconds <= 0) {
                        clearInterval(allRooms[roomName]["timeout"]["id"]);
                        startGame(roomName);
                    }
                }, 1000);
            }
            return;
        }
    }
    const errorResponse = { type: "responseRoom", room: "error" };
    clients[clientId].send(JSON.stringify(errorResponse));
    console.log(">> Rooms exceeded");
}

function notifyTurn(room: Room) {
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].id !== "") {
            const turnPlayerMsj = {
                type: "turnPlayer",
                yourTurn: room.turn === i ? true : false,
                playerTurn: room.players[room.turn].name,
                playersList: room.players.map((player) => player.name),
            };
            clients[room.players[i].id].send(JSON.stringify(turnPlayerMsj));
        }
    }
}

function notifyHand(player: Player) {
    const haveCardMsj = {
        type: "haveCard",
        hand: player.hand,
    };
    clients[player.id].send(JSON.stringify(haveCardMsj));
}

function notifyCardOnBoard(room: Room) {
    const cardOnBoardMsj = { type: "sendCard", cardOnBoard: room.cardOnBoard };
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].id !== "") {
            clients[room.players[i].id].send(JSON.stringify(cardOnBoardMsj));
        }
    }
}

function nextTurn(room: Room) {
    room.turn += 1;

    if (room.turn >= room.conectedPlayers) {
        room.turn = 0;
    }
}

function startGame(roomName: string): void {
    const room = allRooms[roomName];
    if (allRooms[roomName].isPlaying) {
        return;
    }

    if (allRooms[roomName].conectedPlayers < 2) {
        return;
    }

    console.log(">> ", roomName, ": starting game");

    allRooms[roomName].isPlaying = true;

    const deck: number[] = Array.from({ length: 112 }, (_, i) => i);

    //Quitar los valores de las cartas vacias
    deck.splice(56, 1);
    deck.splice(69, 1);
    deck.splice(82, 1);
    deck.splice(95, 1);

    shuffleDeck(deck);

    room.deck = deck;

    // dar las cartas
    for (let i = 0; i < room.conectedPlayers * 7; i++) {
        const player = i % room.conectedPlayers;
        const card = getNextCard(deck);

        room.players[player].hand.push(card);
        console.log(
            ">> " + roomName + ": Player " + room.players[player].name +
            " draws " +
            cardType(card) +
            " " + cardColor(card),
        );
    }

    // dibujar la primera carta
    let cardOnBoard;
    do {
        cardOnBoard = getNextCard(deck);

        if (cardColor(cardOnBoard) == CardColor.black) {
            deck.push(cardOnBoard);
        } else {
            break;
        }
    } while (true);

    room.cardOnBoard = cardOnBoard;
    room.turn = 0;
    room.reverse = false;

    if (cardType(cardOnBoard) == CardType.draw2) {
        const card1 = getNextCard(room.deck);
        const card2 = getNextCard(room.deck);

        room.players[room.turn].hand.push(card1);
        room.players[room.turn].hand.push(card2);

        nextTurn(room);
    } else if (cardType(cardOnBoard) == CardType.reverse) {
        room.reverse = !room.reverse;
    } else if (cardType(cardOnBoard) == CardType.skip) {
        nextTurn(room);
    }

    console.log(">> ", roomName, ": sending first data to players");

    notifyCardOnBoard(room);
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].id !== "") {
            notifyHand(room.players[i]);
        }
    }

    notifyTurn(room);
}

function addCardsToPlayer(cuantity: number, player: Player, room: Room) {
    for (let i = 0; i < cuantity; i++) {
        const newCard = getNextCard(room.deck);
        player.hand.push(newCard);
    }
}

function handlePlayerDisconnection(clientID: string): void {
    const playerDisconnected = {
        type: "playerDisconnected",
        state: "no_error",
    };

    for (const roomKey in allRooms) {
        let playerFound = false;

        // buscar si el jugador esta en la sala
        for (let i = 0; i < allRooms[roomKey].players.length; i++) {
            if (allRooms[roomKey].players[i].id === clientID) {
                playerFound = true;
                break;
            }
        }

        if (!playerFound) continue;

        console.log(">> ", roomKey, " disconecting all players");

        if (!allRooms[roomKey].isPlaying) {
            return;
        }

        allRooms[roomKey].isPlaying = false;

        // notificar a los demas jugadores
        for (let i = 0; i < allRooms[roomKey].players.length; i++) {
            const player = allRooms[roomKey].players[i];
            if (player.id !== "" && player.id !== clientID) {
                console.log(">> sending disconect msj to: ", player.name);
                clients[player.id].send(JSON.stringify(playerDisconnected));
            }
        }

        delete allRooms[roomKey];

        break;
    }
}

function handleDrawCard(cuantity: number, clientId: string, roomName: string) {
    const room = allRooms[roomName];
    const player = findPlayer(room, "id", clientId);

    addCardsToPlayer(cuantity, player, room);

    notifyHand(player);

    notifyCardOnBoard(room);

    nextTurn(room);

    notifyTurn(room);
}

function handlePlayCard(
    playedCardRaw: number,
    clientId: string,
    roomName: string,
) {
    const room = allRooms[roomName];
    const player = findPlayer(room, "id", clientId);

    const playedCard = Math.floor(playedCardRaw);

    // representa color escogido 1000: rojo, 2000: amarillo, 3000: verde, 4000: azul
    const choosedColor = (playedCardRaw - playedCard) * 10000;

    // get played card data
    const playedCardType = cardType(playedCard);
    const playedCardColor = cardColor(playedCard);
    const playedCardNumber = playedCard % 14;

    // get card on board data
    const cardOnBoardColor = cardColor(room.cardOnBoard);
    const cardOnBoardNumber = room.cardOnBoard % 14;

    console.log(`>> Card on board color: ${room.cardOnBoard}`);

    if (
        !(playedCardNumber === cardOnBoardNumber ||
            playedCardColor === cardOnBoardColor ||
            playedCardColor === CardColor.black)
    ) {
        // DEVOLVER QUE NO PUEDES JUGAR ESA CARTA
        const responseFromPlayedCardMsj = {
            type: "responseFromPlayedCard",
            state: "card_not_playable",
        };

        clients[clientId].send(JSON.stringify(responseFromPlayedCardMsj));
        return;
    }

    switch (playedCardType) {
        case CardType.standard:
            room.cardOnBoard = playedCard;
            break;
        case CardType.wild:
            room.cardOnBoard = playedCard;
            break;
        case CardType.reverse:
            room.reverse = !room.reverse;
            room.cardOnBoard = playedCard;
            break;
        case CardType.skip:
            nextTurn(room);
            room.cardOnBoard = playedCard;
            break;
        case CardType.draw2:
            nextTurn(room);
            addCardsToPlayer(2, room.players[room.turn], room);
            notifyHand(room.players[room.turn]);
            room.cardOnBoard = playedCard;
            break;
        case CardType.draw4:
            nextTurn(room);
            addCardsToPlayer(4, room.players[room.turn], room);
            notifyHand(room.players[room.turn]);
            room.cardOnBoard = playedCard;
            break;
    }

    const responseFromPlayedCardMsj = {
        type: "responseFromPlayedCard",
        state: "card_played",
    };

    clients[clientId].send(JSON.stringify(responseFromPlayedCardMsj));
    player.hand = player.hand.filter((card) => card !== playedCard);
    notifyHand(player);

    notifyCardOnBoard(room);

    nextTurn(room);

    notifyTurn(room);

    if (choosedColor > 0){
        room.cardOnBoard = choosedColor;
    }
}

export function onConnectionWS(socket: WebSocket) {
    const clientId = Math.random().toString(36).slice(2);
    clients[clientId] = socket;

    let roomName: string;

    socket.onopen = () => {
        console.log(`Client connected: ${clientId}`);
    };

    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);

            // Check the type of event
            switch (message.type) {
                case "requestRoom":
                    handleRequestRoom(
                        message.playerName,
                        message.roomName,
                        clientId,
                    );
                    roomName = message.roomName;
                    break;
                case "drawCard":
                    handleDrawCard(message.cuantity, clientId, roomName);
                    break;
                case "playCard":
                    handlePlayCard(message.card, clientId, roomName);
                    break;
                default:
                    console.error(`>> Unsuported message: ${message.type}`);
            }
        } catch (error) {
            console.error("Error parsing message", error);
        }
    };

    socket.onclose = () => {
        console.log(`Client disconnected: ${clientId}`);
        handlePlayerDisconnection(clientId);
        delete clients[clientId];
    };

    socket.onerror = (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
    };
}
