import { Payment, Tenant, Property } from './types'
import { rupee, monthLabel } from './format'

export function printLedger(tenant: Tenant, property: Property | undefined, payments: Payment[]) {
  let area = document.getElementById('print-area')
  if (!area) {
    area = document.createElement('div')
    area.id = 'print-area'
    document.body.appendChild(area)
  }

  const sorted = [...payments].sort((a, b) => (a.month || '').localeCompare(b.month || ''))
  const totalPaid = sorted.filter(p => p.status === 'paid').reduce((a, p) => a + Number(p.amount || 0), 0)
  const totalPending = sorted.filter(p => p.status !== 'paid').reduce((a, p) => a + Number(p.amount || 0), 0)
  const genDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  area.innerHTML = `
    <div style="display:flex;align-items:baseline;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:18px;">
      <div style="font-family:'Fraunces',serif;font-size:20px;font-weight:600;">Ledger &amp; Key</div>
      <div style="font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:#555;">Rent Payment Ledger</div>
    </div>
    <div style="margin-bottom:20px;font-size:13.5px;line-height:1.9;">
      <div><b>Tenant:</b> ${esc(tenant.name)}</div>
      <div><b>Property:</b> ${esc(property?.name || '—')}${property?.address ? ' · ' + esc(property.address) : ''}</div>
      <div><b>Lease period:</b> ${esc(tenant.lease_start || '—')} to ${esc(tenant.lease_end || '—')}</div>
      <div><b>Statement generated:</b> ${genDate}</div>
    </div>
    ${sorted.length === 0 ? '<p>No payment records on file for this tenant.</p>' : `
    <table style="width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:18px;">
      <thead><tr>
        <th style="text-align:left;padding:8px 10px;border-bottom:2px solid #111;font-size:11.5px;text-transform:uppercase;">Month</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:2px solid #111;font-size:11.5px;text-transform:uppercase;">Amount</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:2px solid #111;font-size:11.5px;text-transform:uppercase;">Status</th>
        <th style="text-align:left;padding:8px 10px;border-bottom:2px solid #111;font-size:11.5px;text-transform:uppercase;">Paid on</th>
      </tr></thead>
      <tbody>
        ${sorted.map(p => `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${monthLabel(p.month)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${rupee(p.amount)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;text-transform:capitalize;">${esc(p.status)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #ddd;">${esc(p.paid_date || '—')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="display:flex;gap:26px;flex-wrap:wrap;font-size:14px;padding-top:10px;border-top:2px solid #111;margin-bottom:16px;">
      <div>Total paid: <b>${rupee(totalPaid)}</b></div>
      <div>Total pending: <b>${rupee(totalPending)}</b></div>
      <div>${sorted.length} month${sorted.length === 1 ? '' : 's'} on record</div>
    </div>`}
    <div style="font-size:11.5px;color:#666;margin-top:24px;">Generated from Ledger &amp; Key on ${genDate}.</div>
  `

  setTimeout(() => window.print(), 60)
}

function esc(s: string | null | undefined) {
  if (s === undefined || s === null) return ''
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
