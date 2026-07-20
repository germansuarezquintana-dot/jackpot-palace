export default function Reel({ symbols, spinning }) {
  return (
    <div className={`reel ${spinning ? "spinning" : ""}`}>
      {symbols.map((symbol, index) => (
        <div className="symbol" key={`${symbol}-${index}`}>
          {symbol}
        </div>
      ))}
    </div>
  );
}