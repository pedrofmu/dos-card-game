export interface Timeout {
  id: number;
  seconds: number;
}

export interface Player {
  id: string;
  name: string;
  hand: number[];
  dos: boolean;
}

export interface Room {
  timeout: Timeout;
  deck: number[];
  reverse: boolean;
  turn: number;
  cardOnBoard: number;
  connectedPlayers: number;
  players: Player[];
  isPlaying: boolean;
}

export interface roomDictionary {
  [key: string]: Room;
}

const MessageType = {
  RESPONSE_ROOM: "responseRoom",
  COUNT_DOWN: "countDown",
  TURN_PLAYER: "turnPlayer",
  HAVE_CARD: "haveCard",
  SEND_CARD: "sendCard",
  WIN: "win",
  PLAYER_DISCONNECTED: "playerDisconnected",
  RESPONSE_FROM_PLAYED_CARD: "responseFromPlayedCard",
  COLOR_CHANGED: "colorChanged",
  DOS_RESPONSE: "dosResponse",
} as const;

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
    connectedPlayers: 0,
    players: [],
    isPlaying: false,
  };

  // Populate players array
  for (let j = 0; j < MAX_PEOPLE; j++) {
    const player: Player = {
      id: "",
      name: "",
      hand: [],
      dos: false,
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

function findPlayer(room: Room, key: "id" | "name", value: string): Player {
  return room.players.find((player) => player[key] === value) as Player;
}

export function getNextCard(deck: number[]): number {
  if (deck.length <= 0) {
    deck = Array.from({ length: 112 }, (_, i) => i);
    deck.splice(56, 1);
    deck.splice(69, 1);
    deck.splice(82, 1);
    deck.splice(95, 1);

    shuffleDeck(deck);
  }

  const card = deck.shift();
  if (card === undefined) {
    console.error("error repartiendo la siguiente carta");
    return 1;
  }

  return card;
}

export enum CardColor {
  red,
  yellow,
  green,
  blue,
  black,
}

export function cardColor(num: number): CardColor {
  // black card chosee
  switch (Math.round(num)) {
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

export enum CardType {
  skip,
  reverse,
  draw2,
  draw4,
  wild,
  standard,
}

export function cardType(num: number): CardType {
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
  // Make sure room exist
  if (!(roomName in allRooms)) {
    initialiceRoomData(roomName);
  }

  const room = allRooms[roomName];

  for (let i = 0; i < room.players.length; i++) {
    if (room.players[i].name === playerName) {
      const response = {
        type: MessageType.RESPONSE_ROOM,
        roomName: "player_already_exist",
      };
      sendWSMsj(clients[clientId], JSON.stringify(response));
      return;
    }
  }

  if (room.connectedPlayers < MAX_PEOPLE && room.timeout.seconds > 0) {
    room.players[room.connectedPlayers] = {
      id: clientId,
      name: playerName,
      hand: [],
      dos: false,
    };
    room.connectedPlayers++;
    console.log(
      `>> User ${playerName} connected to ${roomName} (${room.connectedPlayers}/${MAX_PEOPLE})`,
    );

    const response = { type: MessageType.RESPONSE_ROOM, roomName: roomName };
    sendWSMsj(clients[clientId], JSON.stringify(response));

    // Start the timer if there is atleast 2 players
    if (room.connectedPlayers >= 2) {
      clearInterval(room.timeout.id);
      room.timeout.seconds = 5;
      console.log(">> ", roomName, ": starting countdown");

      room.timeout.id = setInterval(() => {
        room.timeout.seconds--;

        const countdownResponse = {
          type: MessageType.COUNT_DOWN,
          time: room.timeout.seconds,
        };
        for (const player of room.players) {
          if (player.id) {
            sendWSMsj(clients[player.id], JSON.stringify(countdownResponse));
          }
        }

        if (room.timeout.seconds <= 0) {
          clearInterval(room.timeout.id);
          startGame(roomName);
        }
      }, 1000);
    }
    return;
  }

  // On connection fails
  const errorResponse = { type: MessageType.RESPONSE_ROOM, room: "error" };
  sendWSMsj(clients[clientId], JSON.stringify(errorResponse));
  console.log(">> Rooms exceeded or no valid room found");
}

function sendWSMsj(ws: WebSocket, message: string) {
  try {
    ws.send(message);
  } catch (error) {
    console.error(">> Error sending message: ", error);
    for (const clientID in clients) {
      if (clients[clientID] === ws) {
        handlePlayerDisconnection(clientID);
        delete clients[clientID];
      }
    }
  }
}

function notifyTurn(room: Room) {
  for (let i = 0; i < room.players.length; i++) {
    if (room.players[i].id !== "") {
      const turnPlayerMsj = {
        type: MessageType.TURN_PLAYER,
        yourTurn: room.turn === i ? true : false,
        playerTurn: room.players[room.turn].name,
        playersList: room.players.map((player) =>
          player.id !== "" ? `${player.name} (${player.hand.length})` : "",
        ),
      };

      sendWSMsj(clients[room.players[i].id], JSON.stringify(turnPlayerMsj));
    }
  }
}

function notifyHand(player: Player) {
  const haveCardMsj = {
    type: MessageType.HAVE_CARD,
    hand: player.hand,
  };

  sendWSMsj(clients[player.id], JSON.stringify(haveCardMsj));
}

function notifyCardOnBoard(room: Room) {
  const cardOnBoardMsj = {
    type: MessageType.SEND_CARD,
    cardOnBoard: room.cardOnBoard,
  };
  for (let i = 0; i < room.players.length; i++) {
    if (room.players[i].id !== "") {
      sendWSMsj(clients[room.players[i].id], JSON.stringify(cardOnBoardMsj));
    }
  }
}

function notifyWin(room: Room, playerWin: Player) {
  const winMsj = { type: MessageType.WIN, playerWin: playerWin.name };
  for (let i = 0; i < room.players.length; i++) {
    if (room.players[i].id !== "") {
      sendWSMsj(clients[room.players[i].id], JSON.stringify(winMsj));
    }
  }
}

function nextTurn(room: Room) {
  if (!room.reverse) {
    room.turn = (room.turn + 1) % room.connectedPlayers;
  } else {
    room.turn = (room.turn - 1 + room.connectedPlayers) % room.connectedPlayers;
  }
}

function startGame(roomName: string): void {
  const room = allRooms[roomName];
  if (!room) {
    return;
  }

  if (allRooms[roomName].isPlaying) {
    return;
  }

  if (allRooms[roomName].connectedPlayers < 2) {
    return;
  }

  console.log(">> ", roomName, ": starting game");

  allRooms[roomName].isPlaying = true;

  const deck: number[] = Array.from({ length: 112 }, (_, i) => i);

  // Remove empty cards
  deck.splice(56, 1);
  deck.splice(69, 1);
  deck.splice(82, 1);
  deck.splice(95, 1);

  shuffleDeck(deck);

  room.deck = deck;

  // give the cards
  for (let i = 0; i < room.connectedPlayers * 7; i++) {
    const player = i % room.connectedPlayers;
    const card = getNextCard(deck);

    room.players[player].hand.push(card);
    console.log(
      ">> " +
        roomName +
        ": Player " +
        room.players[player].name +
        " draws " +
        cardType(card) +
        " " +
        cardColor(card),
    );
  }

  // draw the first card
  let cardOnBoard: number;
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
    type: MessageType.PLAYER_DISCONNECTED,
    state: "no_error",
  };

  for (const roomKey in allRooms) {
    let playerFound = false;

    // find if the player is in the room
    for (let i = 0; i < allRooms[roomKey].players.length; i++) {
      if (allRooms[roomKey].players[i].id === clientID) {
        playerFound = true;
        break;
      }
    }

    if (!playerFound) continue;

    console.log(">> ", roomKey, " disconecting all players");

    allRooms[roomKey].isPlaying = false;

    // notify to the players
    for (let i = 0; i < allRooms[roomKey].players.length; i++) {
      const player = allRooms[roomKey].players[i];
      if (player.id !== "" && player.id !== clientID) {
        console.log(">> sending disconect msj to: ", player.name);
        sendWSMsj(clients[player.id], JSON.stringify(playerDisconnected));
      }
    }

    console.log(`>> deleting room: ${roomKey}`);
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

function handleDOS(clientId: string, roomName: string) {
  const room = allRooms[roomName];
  const player = findPlayer(room, "id", clientId);
  console.log(`>> ${roomName}: DOS!`);

  const RESPONSE_TYPES = {
    SUCCESS: 'success',
    FORGOT: 'forgot',
    MISS_CLICK: 'miss',
  };

  if (player.dos) {
    console.log(`>> ${roomName}: ${player.name} no loger need to say 2`);
    player.dos = false;
    const responseFromClickedDOS = {
      type: MessageType.DOS_RESPONSE,
      response: RESPONSE_TYPES.SUCCESS,
    };
    sendWSMsj(clients[clientId], JSON.stringify(responseFromClickedDOS));
    return;
  }

  for (let i = 0; i < room.players.length; i++) {
    if (room.players[i].id === "") {
      continue;
    }

    if (room.players[i].dos) {
      console.log(`>> ${roomName}: ${room.players[i].name} forgot to say 2`);
      addCardsToPlayer(2, room.players[i], room);
      notifyHand(room.players[i]);
      room.players[i].dos = false;
      const responseFromClickedDOS = {
        type: MessageType.DOS_RESPONSE,
        response: RESPONSE_TYPES.FORGOT,
      };
      sendWSMsj(clients[room.players[i].id], JSON.stringify(responseFromClickedDOS));
      return;
    }
  }

  // the player click DOS without the need to, he gets penalized 
  console.log(`>> ${roomName}: ${player.name} clicked DOS without the need to`);
  addCardsToPlayer(2, player, room);
  notifyHand(player);
  const responseFromClickedDOS = {
    type: MessageType.DOS_RESPONSE,
    response: RESPONSE_TYPES.MISS_CLICK,
  };
  sendWSMsj(clients[clientId], JSON.stringify(responseFromClickedDOS));
}

function handlePlayCard(
  playedCardRaw: number,
  clientId: string,
  roomName: string,
) {
  const room = allRooms[roomName];
  const player = findPlayer(room, "id", clientId);

  const playedCard = Math.floor(playedCardRaw);

  // represent choseen color, 1000: red, 2000: yellow, 3000: green, 4000: blue
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
    !(
      playedCardNumber === cardOnBoardNumber ||
      playedCardColor === cardOnBoardColor ||
      playedCardColor === CardColor.black
    )
  ) {
    // RETURN THAT YOU CAN NOT PLAY THIS CARD
    const responseFromPlayedCardMsj = {
      type: MessageType.RESPONSE_FROM_PLAYED_CARD,
      state: "card_not_playable",
    };

    sendWSMsj(clients[clientId], JSON.stringify(responseFromPlayedCardMsj));
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
    type: MessageType.RESPONSE_FROM_PLAYED_CARD,
    state: "card_played",
  };

  sendWSMsj(clients[clientId], JSON.stringify(responseFromPlayedCardMsj));
  player.hand = player.hand.filter((card) => card !== playedCard);
  notifyHand(player);

  notifyCardOnBoard(room);

  nextTurn(room);

  notifyTurn(room);

  console.log(`>> Player ${player.name} : ${player.hand.length}`);

  player.dos = player.hand.length === 2;

  if (player.hand.length <= 0) {
    notifyWin(room, player);
    delete allRooms[roomName];
  }

    if (choosedColor > 0) {
      room.cardOnBoard = choosedColor;
      const colorChanged = {
        type: MessageType.COLOR_CHANGED,
        color: Math.round(choosedColor),
      };
    for (let i = 0; i < room.players.length; i++) {
      sendWSMsj(clients[room.players[i].id], JSON.stringify(colorChanged));
    }
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
          handleRequestRoom(message.playerName, message.roomName, clientId);
          roomName = message.roomName;
          break;
        case "drawCard":
          handleDrawCard(message.cuantity, clientId, roomName);
          break;
        case "playCard":
          handlePlayCard(message.card, clientId, roomName);
          break;
        case "dos":
          handleDOS(clientId, roomName);
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
    handlePlayerDisconnection(clientId);
    delete clients[clientId];
  };
}
