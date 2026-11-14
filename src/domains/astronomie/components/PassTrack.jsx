import { ALERTE, CIEL_000, CIEL_200, ENCRE, ENCRE_ATTENUEE, OK, OR } from '../../../kit/charte'
/** Tracé du passage dans le ciel (zénith au centre, nord en haut, est à gauche). */
export default function PassTrack({ pass }) {
  const S = 240
  const R = S / 2 - 18
  const p = (el, az) => {
    const r = ((90 - Math.max(0, el)) / 90) * R
    return [S / 2 - r * Math.sin((az * Math.PI) / 180), S / 2 - r * Math.cos((az * Math.PI) / 180)]
  }
  const segs = []
  pass.samples.forEach((s, i) => {
    if (i === 0) return
    const a = pass.samples[i - 1]
    segs.push({ from: p(a.el, a.az), to: p(s.el, s.az), visible: s.visible && a.visible })
  })
  const [sx, sy] = p(pass.start.el, pass.start.az)
  const [ex, ey] = p(pass.end.el, pass.end.az)
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto h-auto w-full max-w-[280px]" role="img" aria-label="Trajectoire du passage">
      <circle cx={S / 2} cy={S / 2} r={R} style={{ fill: CIEL_000, stroke: ENCRE_ATTENUEE }} strokeWidth="1.2" />
      {[30, 60].map((el) => (
        <circle key={el} cx={S / 2} cy={S / 2} r={((90 - el) / 90) * R} fill="none" style={{ stroke: CIEL_200 }} />
      ))}
      {[
        ['N', 0],
        ['E', 90],
        ['S', 180],
        ['O', 270],
      ].map(([l, az]) => {
        const [x, y] = p(-8, az)
        const k = (R + 10) / R
        return (
          <text key={l} x={S / 2 + (x - S / 2) * k} y={S / 2 + (y - S / 2) * k + 4} textAnchor="middle" className="font-mono text-[11px] font-semibold" style={{ fill: l === 'N' ? ENCRE : ENCRE_ATTENUEE }}>
            {l}
          </text>
        )
      })}
      {segs.map((s, i) => (
        <line key={i} x1={s.from[0]} y1={s.from[1]} x2={s.to[0]} y2={s.to[1]} style={{ stroke: s.visible ? OR : ENCRE_ATTENUEE }} strokeWidth={s.visible ? 3 : 1.5} strokeLinecap="round" />
      ))}
      <circle cx={sx} cy={sy} r="4" style={{ fill: OK }} />
      <circle cx={ex} cy={ey} r="4" style={{ fill: ALERTE }} />
    </svg>
  )
}
