/**
 * Visual confidence meter. Shows a coloured bar + percentage.
 * Green ≥ 95%, amber ≥ 80%, red < 80%.
 * Pass lowData to show the value greyed out with a "low data" note.
 */
export default function ConfidenceMeter({ value, lowData = false }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const cls = lowData ? 'sp-conf--muted' :
    pct >= 95 ? 'sp-conf--high' :
    pct >= 80 ? 'sp-conf--mid'  :
                'sp-conf--low';

  return (
    <div
      className={`sp-conf ${cls}`}
      title={lowData ? `~${pct}% confidence (need 30+ visitors per variant for reliable results)` : `${pct}% confidence`}
    >
      <div className="sp-conf__bar sp-conf__bar-wrap">
        <div className="sp-conf__fill" style={{ width: `${pct}%` }} />
        <span className="sp-conf__threshold" title="95% threshold" />
      </div>
      <span className="sp-conf__label">~{pct}%</span>
      {lowData && <span className="sp-conf__note">low data</span>}
    </div>
  );
}
