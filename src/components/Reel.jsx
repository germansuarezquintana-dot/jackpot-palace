export default function Reel({
  values,
  spinning,
  columnIndex,
  winningCells = [],
  scatterCells = [],
  delay = 0,
}) {
  return (
    <div
    className={`reel ${spinning ? "spinning" : "reel-stopped reel-bounce"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {values.map((symbol, rowIndex) => {
        const isWinning = winningCells.some(
          (cell) =>
            cell.column === columnIndex &&
            cell.row === rowIndex
        );

        const isScatter = scatterCells.some(
          (cell) =>
            cell.column === columnIndex &&
            cell.row === rowIndex
        );

        return (
          <div
            className={[
              "symbol",
              isWinning ? "winning-symbol" : "",
              isScatter ? "scatter-symbol" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={`${symbol}-${rowIndex}`}
          >
            {symbol}
          </div>
        );
      })}
    </div>
  );
}