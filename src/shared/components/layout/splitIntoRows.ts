/**
 * Splits widths, in order, into at most `rows` runs of about equal length.
 * Returns the index each run starts at.
 */
export function splitIntoRows(widths: number[], rows: number, gap: number): number[] {
  const count = Math.min(rows, widths.length);
  if (count <= 1) return [0];
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
  const target = total / count;
  const starts = [0];
  let line = 0;
  widths.forEach((w, i) => {
    const left = widths.length - i;
    const rowsLeft = count - starts.length;
    const longer = line === 0 ? w : line + gap + w;
    // Start a new row when this pill takes the row further past the target than
    // stopping short of it would, or when every remaining row needs a pill.
    const breakHere =
      i > 0 && line > 0 && rowsLeft > 0 && (longer - target > target - line || left === rowsLeft);
    if (breakHere) {
      starts.push(i);
      line = w;
    } else line = longer;
  });
  return starts;
}
