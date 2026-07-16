/**
 * Playable 1P roster for the character-select screen.
 */

export const CHARACTERS = [
  {
    id: 'rookie',
    name: 'ROOKIE',
    attackStyle: 'kick',
  },
  {
    id: 'trump',
    name: 'PREZZ',
    attackStyle: 'wig',
  },
];

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
