import { StringOption } from 'necord';

export class GameJoinDto {
  @StringOption({
    name: 'game-type',
    description: 'เลือกประเภทเกม',
    required: true,
    choices: [
      {
        name: 'MMORPG',
        value: '672c80fe33d81519c85ec478',
      },
      {
        name: 'MOBA',
        value: '672c80fe33d81519c85ec479',
      },
      {
        name: 'FPS',
        value: '672c80fe33d81519c85ec477',
      },
      {
        name: 'Battle Royale',
        value: '672c80fe33d81519c85ec474',
      },
      {
        name: 'RTS',
        value: '66d2d5da2b0108700c98ea65',
      },
      {
        name: 'Simulation',
        value: '672c80ff33d81519c85ec47c',
      },
      {
        name: 'Sports',
        value: '672c80ff33d81519c85ec47d',
      },
      {
        name: 'Card Games',
        value: '672c80fe33d81519c85ec475',
      },
      {
        name: 'Puzzle',
        value: '672c80fe33d81519c85ec47a',
      },
      {
        name: 'Adventure',
        value: '672c80fe33d81519c85ec473',
      },
      {
        name: 'Casual',
        value: '672c80fe33d81519c85ec476',
      },
      {
        name: 'Survival',
        value: '672c80ff33d81519c85ec47e',
      },
      {
        name: ' Rhythm',
        value: '672c80ff33d81519c85ec47b',
      },
    ],
  })
  gameType: string;

  @StringOption({
    name: 'rank-mode',
    description: 'เลือกระดับเกม',
    required: true,
    choices: [
      { name: 'UnRank', value: '0' },
      { name: 'Rank', value: '1' },
    ],
  })
  rankMode: string;
}
