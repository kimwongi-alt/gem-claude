function Stat({ label, value }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}

export default function Hud({ score, level, best }) {
  return (
    <div className="hud">
      <Stat label="점수" value={score} />
      <Stat label="레벨" value={level} />
      <Stat label="최고" value={best} />
    </div>
  );
}
