export default function Controls({ onHint, onNewGame, sound, onToggleSound }) {
  return (
    <div className="btns">
      <button type="button" onClick={onHint}>💡 힌트</button>
      <button type="button" onClick={onNewGame}>🔄 새 게임</button>
      <button type="button" onClick={onToggleSound} aria-pressed={sound}>
        {sound ? '🔊 소리' : '🔇 소리'}
      </button>
    </div>
  );
}
