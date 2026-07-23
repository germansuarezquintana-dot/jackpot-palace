import "../App.css";

const WILD = "🃏";
const SCATTER = "🎁";

function SymbolContent({ symbol }) {
  return symbol;
}

export default function Reel({
  values,
  spinning,
  delay,
  columnIndex,
  winningCells = [],
  scatterCells = [],
  spinningSymbols = [],
}) {
  return (
    <div className="reel-window">
      {spinning ? (
        <div
          className="reel-strip spinning"
          style={{ animationDelay: `${delay}ms` }}
        >
          {spinningSymbols.map((symbol, index) => (
            <div className="reel-symbol" key={`${symbol}-${index}`}>
              <SymbolContent symbol={symbol} />
            </div>
          ))}
        </div>
      ) : (
        <div className="stopped-reel">
          {values.map((symbol, rowIndex) => {
            const isWinner = winningCells.some(
              (cell) =>
                cell.column === columnIndex &&
                cell.row === rowIndex
            );

            const isScatterWinner = scatterCells.some(
              (cell) =>
                cell.column === columnIndex &&
                cell.row === rowIndex
            );

            return (
              <div
                key={`${symbol}-${rowIndex}`}
                className={[
                  "stopped-symbol",
                  isWinner ? "winning-symbol" : "",
                  isScatterWinner ? "scatter-winner" : "",
                  symbol === WILD ? "wild-symbol" : "",
                  symbol === SCATTER ? "scatter-symbol" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <SymbolContent symbol={symbol} />
              </div>
            );
          })}
        </div>
      )}

      <div className="reel-shadow reel-shadow-top" />
      <div className="reel-shadow reel-shadow-bottom" />
    </div>
  );
}