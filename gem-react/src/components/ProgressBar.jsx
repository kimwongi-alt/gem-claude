/** 현재 레벨 안에서의 진행률 막대 (PRD F-33). value: 0 ~ 1 */
export default function ProgressBar({ value }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="bar" role="progressbar" aria-label="레벨 진행" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <i style={{ width: pct + '%' }} />
    </div>
  );
}
