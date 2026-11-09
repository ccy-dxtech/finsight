import { extractTextItems } from "unpdf";

// PDF 좌표(pt, 원점은 왼쪽 아래)의 글자 조각. unpdf의 StructuredTextItem에서 쓰는 필드만 둔다.
export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
}

interface Cell {
  text: string;
  x0: number;
  x1: number;
}

// 같은 칸으로 이어 붙일 글자 조각 사이의 최대 간격(글자 크기 배수). 띄어쓰기는 0.3배쯤, 표의 칸 사이는 그보다 넓다.
const CELL_GAP = 0.5;
// 이보다 넓게 떨어진 조각은 띄어쓰기를 넣어 잇는다.
const WORD_GAP = 0.1;

// y가 글자 크기의 절반 안에서 같은 조각을 한 줄로, 줄 안에서 가까운 조각을 한 칸으로 묶는다.
function toLines(items: PdfTextItem[]): Cell[][] {
  const lines: PdfTextItem[][] = [];
  for (const item of items.filter((part) => part.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.at(-1);
    if (line && line[0].y - item.y <= Math.max(line[0].fontSize, item.fontSize) / 2) line.push(item);
    else lines.push([item]);
  }

  return lines.map((line) => {
    const cells: Cell[] = [];
    for (const item of line.sort((a, b) => a.x - b.x)) {
      const last = cells.at(-1);
      const gap = last ? item.x - last.x1 : Infinity;
      if (last && gap <= item.fontSize * CELL_GAP) {
        last.text += (gap > item.fontSize * WORD_GAP ? " " : "") + item.str.trim();
        last.x1 = Math.max(last.x1, item.x + item.width);
      } else {
        cells.push({ text: item.str.trim(), x0: item.x, x1: item.x + item.width });
      }
    }
    return cells;
  });
}

const overlap = (cell: Cell, column: Cell) => Math.min(cell.x1, column.x1) - Math.max(cell.x0, column.x0);
const distance = (cell: Cell, column: Cell) => Math.max(column.x0 - cell.x1, cell.x0 - column.x1, 0);

function nearestColumn(cell: Cell, columns: Cell[]): number {
  let best = 0;
  for (let i = 1; i < columns.length; i++) {
    const [now, prev] = [columns[i], columns[best]];
    const better = overlap(cell, now) > 0 || overlap(cell, prev) > 0
      ? overlap(cell, now) > overlap(cell, prev)
      : distance(cell, now) < distance(cell, prev);
    if (better) best = i;
  }
  return best;
}

// 한 쪽의 열 구간. 표의 줄(칸 수가 가장 흔한 칸 수 이상인 줄)의 칸 구간을 겹치는 것끼리 합친 뒤,
// 같은 줄에 함께 나온 적이 없는 이웃 구간을 한 열로 합친다.
// 가운데 정렬 머리글과 오른쪽 정렬 금액은 x가 겹치지 않을 수 있지만 같은 줄에 함께 나오지 않는다.
// 머리행에는 모든 열 이름이 있어서 서로 다른 열은 합쳐지지 않는다.
function findColumns(lines: Cell[][]): Cell[] {
  const counts = new Map<number, number>();
  for (const line of lines) if (line.length >= 2) counts.set(line.length, (counts.get(line.length) ?? 0) + 1);
  if (counts.size === 0) return [];
  const [typical] = [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0];
  const tableLines = lines.filter((line) => line.length >= typical);

  const spans: Cell[] = [];
  for (const { x0, x1 } of tableLines.flat().sort((a, b) => a.x0 - b.x0)) {
    const last = spans.at(-1);
    if (last && x0 <= last.x1) last.x1 = Math.max(last.x1, x1);
    else spans.push({ text: "", x0, x1 });
  }

  const used = tableLines.map((line) => new Set(line.map((cell) => nearestColumn(cell, spans))));
  const columns: { span: Cell; members: number[] }[] = [];
  spans.forEach((span, index) => {
    const last = columns.at(-1);
    const together = last && used.some((set) => set.has(index) && last.members.some((member) => set.has(member)));
    if (last && !together) {
      last.span.x1 = span.x1;
      last.members.push(index);
    } else {
      columns.push({ span: { ...span }, members: [index] });
    }
  });
  return columns.map(({ span }) => span);
}

// 쪽마다 글자 조각을 행(줄)과 열(칸)로 복원해 쪽 순서대로 잇는다. 열 위치는 표마다 달라서 쪽마다 구한다.
// 빈 칸은 ""로 두어 같은 쪽의 행은 칸 수가 같다. 표의 줄이 없는 쪽은 줄마다 한 칸이다.
export function textItemsToRows(pages: PdfTextItem[][]): string[][] {
  return pages.flatMap((items) => {
    const lines = toLines(items);
    const columns = findColumns(lines);
    if (columns.length === 0) return lines.map((line) => [line.map((cell) => cell.text).join(" ")]);

    return lines.map((line) => {
      const row = columns.map(() => "");
      for (const cell of line) {
        const index = nearestColumn(cell, columns);
        row[index] = row[index] ? `${row[index]} ${cell.text}` : cell.text;
      }
      return row;
    });
  });
}

// 글자가 없는 PDF(스캔본)는 빈 배열을 돌려준다. 암호·손상 PDF는 pdf.js 오류를 그대로 던진다.
export async function readPdfRows(buffer: ArrayBuffer): Promise<string[][]> {
  const { items } = await extractTextItems(new Uint8Array(buffer));
  return textItemsToRows(items);
}
