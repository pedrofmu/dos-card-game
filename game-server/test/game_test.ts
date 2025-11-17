import {
  CardColor,
  cardColor,
  CardType,
  cardType,
  getNextCard,
} from "../src/game.ts";

Deno.test("cardColor returns correct basic colors", () => {
  // red block (0–13)
  if (cardColor(0) !== CardColor.red) throw new Error("0 should be red");
  if (cardColor(5) !== CardColor.red) throw new Error("5 should be red");

  // yellow block (14–27)
  if (cardColor(14) !== CardColor.yellow)
    throw new Error("14 should be yellow");

  // green block (28–41)
  if (cardColor(28) !== CardColor.green) throw new Error("28 should be green");
});

Deno.test("cardColor returns black for wild cards (num % 14 === 13)", () => {
  if (cardColor(13) !== CardColor.black) throw new Error("13 should be black");
  if (cardColor(41) !== CardColor.black) throw new Error("41 should be black");
});

Deno.test("cardType correctly identifies special cards", () => {
  if (cardType(10) !== CardType.skip) throw new Error("10 should be skip");
  if (cardType(11) !== CardType.reverse)
    throw new Error("11 should be reverse");
  if (cardType(12) !== CardType.draw2) throw new Error("12 should be draw2");
});

Deno.test("getNextCard returns first card and mutates deck", () => {
  const deck = [99, 88, 77];
  const card = getNextCard(deck);

  if (card !== 99) throw new Error("Expected first card 99");
  if (deck.length !== 2) throw new Error("Deck should have 2 cards left");
  if (deck[0] !== 88) throw new Error("Next card should be 88");
});

Deno.test(
  "getNextCard on empty deck returns some card (never undefined)",
  () => {
    const deck: number[] = [];
    const card = getNextCard(deck);

    if (card === undefined) throw new Error("Should never return undefined");
  },
);
