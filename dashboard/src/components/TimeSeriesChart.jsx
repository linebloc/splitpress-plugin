import { useLayoutEffect, useMemo, useRef, useState } from 'react';

/**
 * Minimal SVG line chart — no charting library dependency.
 * Measures its container on mount and on resize, so the viewBox always matches
 * the actual pixel width. This avoids text/stroke distortion from
 * preserveAspectRatio="none" at varying screen widths.
 *
 * @param {{ series: Array<{ label: string, color: string, points: Array<{ date: string, value: number }> }>, metric: string }} props
 */
export default function TimeSeriesChart({ series = [], metric = 'Conversions' }) {
  const containerRef = useRef(null);
  const [W, setW] = useState(640);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setW(Math.floor(el.getBoundingClientRect().width) || 640);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 240;
  const PAD = { top: 16, right: 24, bottom: 36, left: 52 };

  const allPoints = series.flatMap((s) => s.points);
  const allValues = allPoints.map((p) => p.value);
  const maxValue  = Math.max(1, ...allValues);
  const dates     = [...new Set(allPoints.map((p) => p.date))].sort();

  const scaleX = (i) => PAD.left + (i / Math.max(1, dates.length - 1)) * (W - PAD.left - PAD.right);
  const scaleY = (v) => H - PAD.bottom - (v / maxValue) * (H - PAD.top - PAD.bottom);

  const yTicks = useMemo(() => {
    const step = Math.ceil(maxValue / 4);
    return [0, step, step * 2, step * 3, maxValue];
  }, [maxValue]);

  if (!dates.length) {
    return (
      <div className="sp-chart sp-chart--empty" ref={containerRef}>
        <span>No data yet</span>
      </div>
    );
  }

  return (
    <div className="sp-chart" ref={containerRef}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="sp-chart__svg"
      >
        {/* Y grid lines */}
        {yTicks.map((tick) => (
          <line
            key={tick}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={scaleY(tick)}
            y2={scaleY(tick)}
            className="sp-chart__grid"
          />
        ))}

        {/* Y axis labels */}
        {yTicks.map((tick) => (
          <text key={tick} x={PAD.left - 6} y={scaleY(tick) + 4} className="sp-chart__tick" textAnchor="end">
            {tick}
          </text>
        ))}

        {/* X axis labels (show up to 7) */}
        {dates
          .filter((_, i) => i % Math.ceil(dates.length / 7) === 0)
          .map((date) => (
            <text
              key={date}
              x={scaleX(dates.indexOf(date))}
              y={H - PAD.bottom + 16}
              className="sp-chart__tick"
              textAnchor="middle"
            >
              {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </text>
          ))}

        {/* Series lines */}
        {series.map((s) => {
          const points = dates.map((d, i) => {
            const pt = s.points.find((p) => p.date === d);
            return `${scaleX(i)},${scaleY(pt ? pt.value : 0)}`;
          });

          return (
            <polyline
              key={s.label}
              points={points.join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {/* Dots on data points */}
        {series.map((s) =>
          dates.map((d, i) => {
            const pt = s.points.find((p) => p.date === d);
            if (!pt) return null;
            return (
              <circle
                key={`${s.label}-${d}`}
                cx={scaleX(i)}
                cy={scaleY(pt.value)}
                r="4"
                fill={s.color}
              >
                <title>{`${s.label}: ${pt.value} on ${d}`}</title>
              </circle>
            );
          })
        )}
      </svg>

      {/* Legend
      <div className="sp-chart__legend">
        {series.map((s) => (
          <span key={s.label} className="sp-chart__legend-item">
            <span className="sp-chart__legend-dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>*/}
    </div>
  );
}
