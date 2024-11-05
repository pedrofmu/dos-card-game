interface Timeout {
    id: number;
    s: number;
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
    people: number;
    players: Player[];
}

interface Data {
    [key: string]: Room;
}

const NUM_ROOMS = 5;
const MAX_PEOPLE = 10;

let deck: number[];
let data: Data;
const clients: Record<string, WebSocket> = {};
export function initialiceGameData() {
    deck = Array.from({ length: 112 }, (_, i) => i);

    //Quitar los valores de las cartas vacias
    deck.splice(56, 1);
    deck.splice(69, 1);
    deck.splice(82, 1);
    deck.splice(95, 1);

    data = {};

    for (let i = 1; i <= NUM_ROOMS; i++) {
        const room: Room = {
            timeout: { id: 0, s: 10 },
            deck: [],
            reverse: 0,
            turn: 0,
            cardOnBoard: 0,
            people: 0,
            players: [],
        };

        // Populate players array
        for (let j = 0; j < MAX_PEOPLE; j++) {
            const player: Player = {
                id: '',
                name: "",
                hand: [],
            };
            room.players.push(player);
        }

        // Assign the room to data with the key 'Room_i'
        data[`Room_${i}`] = room;
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
        const name = `Room_${i}`;
        const room = data[name];
        if (room.people < MAX_PEOPLE && room.timeout.s > 0) {
            room.players.push({
                id: clientId,
                name: playerName,
                hand: [],
            });
            room.people++;
            console.log(
                `>> User ${playerName} connected to ${name} (${room.people}/${MAX_PEOPLE})`,
            );

            const response = { type: "responseRoom", room: name };
            clients[clientId].send(JSON.stringify(response));

            // Comenzar el timeout si hay +2 personas
            if (room.people >= 2) {
                clearInterval(room.timeout.id);
                room.timeout.s = 10;
                room.timeout.id = setInterval(() => {
                    // countdown
                    room.timeout.s--;

                    // notificar a los jugadores
                    if (room.timeout.s <= 0) {
                        clearInterval(data[name]["timeout"]["id"]);
                        // start game 
                        console.log("start game");
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
