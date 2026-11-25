import Table from 'cli-table3';

export function makeTable(head) {
  return new Table({
    head,
    style: { head: ['cyan'], border: ['gray'] },
    chars: {
      top: '─','top-mid': '┬','top-left': '┌','top-right': '┐',
      bottom: '─','bottom-mid': '┴','bottom-left': '└','bottom-right': '┘',
      left: '│','left-mid': '├', mid: '─','mid-mid': '┼',
      right: '│','right-mid': '┤', middle: '│',
    },
  });
}
