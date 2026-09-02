export const rupee = (n: number | null | undefined) => '₹' + Number(n || 0).toLocaleString('en-IN')

export const monthLabel = (ym: string | null | undefined) => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

export const todayYM = () => {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export function monthsBetween(startYM: string, endYM: string): string[] {
  if (!startYM || !endYM) return []
  let [sy, sm] = startYM.split('-').map(Number)
  const [ey, em] = endYM.split('-').map(Number)
  const out: string[] = []
  let guard = 0
  while ((sy < ey || (sy === ey && sm <= em)) && guard < 600) {
    out.push(sy + '-' + String(sm).padStart(2, '0'))
    sm++
    if (sm > 12) { sm = 1; sy++ }
    guard++
  }
  return out
}
