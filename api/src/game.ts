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
    reverse: number;
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

let allRooms: roomDictionary;
const clients: Record<string, WebSocket> = {};
export function initialiceGameData() {
    allRooms = {};

    for (let i = 1; i <= NUM_ROOMS; i++) {
        const room: Room = {
            timeout: { id: 0, seconds: 10 },
            deck: [],
            reverse: 0,
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

        // Assign the room to data with the key 'Room_i'
        allRooms[`Room_${i}`] = room;
    }
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

function getNextCard(deck: number[]): number {
    const card = deck.shift();
    if (card === undefined) {
        console.error("error repartiendo la siguiente carta");
        return 1;
    }

    return card;
}

function cardColor(num: number): string {
    let color: string = "";
    if (num % 14 === 13) {
        return "black";
    }
    switch (Math.floor(num / 14)) {
        case 0:
        case 4:
            color = "red";
            break;
        case 1:
        case 5:
            color = "yellow";
            break;
        case 2:
        case 6:
            color = "green";
            break;
        case 3:
        case 7:
            color = "blue";
            break;
    }
    return color;
}

function cardType(num: number): string {
    switch (num % 14) {
        case 10:
            return "Skip";
        case 11:
            return "Reverse";
        case 12:
            return "Draw2";
        case 13:
            if (Math.floor(num / 14) >= 4) {
                return "Draw4";
            } else {
                return "Wild";
            }
        default:
            return "Number " + (num % 14);
    }
}

function handleRequestRoom(playerName: string, clientId: string) {
    for (let i = 1; i <= NUM_ROOMS; i++) {
        const roomName = `Room_${i}`;
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

            const response = { type: "responseRoom", room: roomName };
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

function nextTurn(room: Room) {
    room.turn += 1;

    if (room.conectedPlayers >= room.turn) {
        room.turn = 0;
    }
}

function draw2(player: number, room: Room) {
    const card1 = getNextCard(room.deck);
    const card2 = getNextCard(room.deck);

    room.players[player].hand.push(card1);
    room.players[player].hand.push(card2);

    nextTurn(room);
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

        if (cardColor(cardOnBoard) == "black") {
            deck.push(cardOnBoard);
        } else {
            break;
        }
    } while (true);

    room.cardOnBoard = cardOnBoard;
    room.turn = 0;
    room.reverse = 0;

    if (cardType(cardOnBoard) == "Draw2") {
        draw2(room.turn, room);
    } else if (cardType(cardOnBoard) == "Reverse") {
        room.reverse = 1;
    } else if (cardType(cardOnBoard) == "Skip") {
        nextTurn(room);
    }

    console.log(">> ", roomName, ": sending first data to players");
    const cardOnBoardMsj = { type: "sendCard", cardOnBoard: room.cardOnBoard };
    for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].id !== "") {
            const haveCardMsj = {
                type: "haveCard",
                hand: room.players[i].hand,
            };
            clients[room.players[i].id].send(JSON.stringify(haveCardMsj));

            const turnPlayerMsj = {
                type: "turnPlayer",
                turn: room.turn === i ? true : false,
            };
            clients[room.players[i].id].send(JSON.stringify(turnPlayerMsj));

            clients[room.players[i].id].send(JSON.stringify(cardOnBoardMsj));
        }
    }
}

export function onConnectionWS(socket: WebSocket) {
    const clientId = Math.random().toString(36).slice(2);
    clients[clientId] = socket;

    socket.onopen = () => {
        console.log(`Client connected: ${clientId}`);
    };

    socket.onmessage = async (event) => {
        try {
            const message = JSON.parse(event.data);

            // Check the type of event
            if (message.type === "requestRoom") {
                handleRequestRoom(message.playerName, clientId);
            }
        } catch (error) {
            console.error("Error parsing message", error);
        }
    };

    socket.onclose = () => {
        console.log(`Client disconnected: ${clientId}`);
        delete clients[clientId];
    };

    socket.onerror = (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
    };
}
