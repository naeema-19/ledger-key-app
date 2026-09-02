import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Tenant, Property, Payment, MaintenanceRequest, Doc } from '../lib/types'
import { rupee, monthLabel } from '../lib/format'
import { printLedger } from '../lib/print'
import { Button, Card, Stamp, StatusTag, PriorityTag, Field, inputCls, Modal, RowItem, EmptyNote } from '../components/ui'

export default function TenantApp() {
  const { profile } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [property, setProperty] = useState<Property | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([])
  const [documents, setDocuments] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function loadAll() {
    if (!profile?.tenant_id) { setLoading(false); return }
    setLoading(true)
    const { data: t } = await supabase.from('tenants').select('*').eq('id', profile.tenant_id).maybeSingle()
    setTenant(t as Tenant | null)
    if (t?.property_id) {
      const { data: p } = await supabase.from('properties').select('*').eq('id', t.property_id).maybeSingle()
      setProperty(p as Property | null)
    }
    const [pay, m, d] = await Promise.all([
      supabase.from('payments').select('*').eq('tenant_id', profile.tenant_id).order('month', { ascending: false }),
      supabase.from('maintenance_requests').select('*').eq('tenant_id', profile.tenant_id).order('created_at', { ascending: false }),
      supabase.from('documents').select('*'),
    ])
    setPayments((pay.data as Payment[]) || [])
    setMaintenance((m.data as MaintenanceRequest[]) || [])
    setDocuments((d.data as Doc[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [profile?.tenant_id])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-inksoft">Loading…</div>
  if (!tenant) return <div className="min-h-screen flex items-center justify-center text-inksoft p-6 text-center">No tenant record linked to your account yet.</div>

  const myDocs = documents.filter(d => (d.related_to === 'tenant' && d.related_id === tenant.id) || (d.related_to === 'property' && d.related_id === tenant.property_id))

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between bg-ink text-parchment px-5 py-3.5 md:hidden">
        <span className="font-display font-semibold">Ledger &amp; Key</span>
        <Button variant="ghost" size="sm" className="!text-parchment !border-white/30" onClick={() => supabase.auth.signOut()}>Log out</Button>
      </div>

      <div className="max-w-[760px] mx-auto p-5 md:p-10">
        <div className="hidden md:flex justify-end mb-2">
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Log out</Button>
        </div>

        <div className="bg-ink text-parchment rounded-2xl p-7 mb-6 relative overflow-hidden">
          <h1 className="text-2xl font-semibold mb-1">Hi, {tenant.name}</h1>
          <div className="text-[#C9CFD8] text-sm">{property?.name || 'No property assigned'} {property?.address ? '· ' + property.address : ''}</div>
          {property && <div className="mono text-2xl text-brass mt-3 font-semibold">{rupee(property.rent)}<span className="text-sm text-[#C9CFD8] font-normal"> /month</span></div>}
          <div className="text-[12.5px] text-[#9AA4B2] mt-1.5">Lease: {tenant.lease_start || '—'} to {tenant.lease_end || '—'}</div>
        </div>

        <Card className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Payment history</h2>
            {payments.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => printLedger(tenant, property || undefined, payments)}>🖨 Print / export</Button>
            )}
          </div>
          {payments.length === 0 ? <EmptyNote>No payment records yet.</EmptyNote> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[11.5px] uppercase text-inksoft border-b border-line">
                  <th className="text-left p-2.5">Month</th><th className="text-left p-2.5">Amount</th><th className="text-left p-2.5">Status</th><th className="text-left p-2.5">Paid on</th>
                </tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="p-2.5 mono">{monthLabel(p.month)}</td>
                      <td className="p-2.5 mono">{rupee(p.amount)}</td>
                      <td className="p-2.5"><Stamp status={p.status} /></td>
                      <td className="p-2.5 mono">{p.paid_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Maintenance requests</h2>
            <Button size="sm" variant="brass" onClick={() => setShowModal(true)}>+ Report an issue</Button>
          </div>
          {maintenance.length === 0 ? <EmptyNote>No requests submitted yet.</EmptyNote> : (
            <div className="flex flex-col gap-2.5">
              {maintenance.map(m => (
                <RowItem key={m.id}>
                  <div>
                    <div className="font-semibold text-[14.5px] flex items-center gap-2">{m.issue} <PriorityTag priority={m.priority} /></div>
                    <div className="text-inksoft text-[12.5px]">{new Date(m.created_at).toLocaleDateString('en-IN')}</div>
                  </div>
                  <StatusTag status={m.status} />
                </RowItem>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">Documents</h2>
          {myDocs.length === 0 ? <EmptyNote>Nothing shared here yet.</EmptyNote> : (
            <div className="flex flex-col gap-2.5">
              {myDocs.map(d => (
                <RowItem key={d.id}>
                  <div>
                    <div className="font-semibold text-[14.5px]">{d.title}</div>
                    {d.notes && <div className="text-inksoft text-[12.5px] mt-0.5">{d.notes}</div>}
                  </div>
                </RowItem>
              ))}
            </div>
          )}
        </Card>
      </div>

      {showModal && (
        <ReportIssueModal tenant={tenant} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); loadAll() }} />
      )}
    </div>
  )
}

function ReportIssueModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: () => void }) {
  const [issue, setIssue] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [err, setErr] = useState('')

  async function submit() {
    if (!issue.trim()) { setErr('Please describe the issue.'); return }
    const { error } = await supabase.from('maintenance_requests').insert({
      tenant_id: tenant.id, property_id: tenant.property_id, issue: issue.trim(), description, priority, status: 'open', created_by: 'tenant',
    })
    if (error) { setErr(error.message); return }
    onSaved()
  }

  return (
    <Modal title="Report an issue" onClose={onClose}>
      <Field label="Issue"><input className={inputCls} value={issue} onChange={e => setIssue(e.target.value)} placeholder="e.g. Leaking kitchen tap" /></Field>
      <Field label="Description"><textarea rows={3} className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell us more" /></Field>
      <Field label="Priority">
        <select className={inputCls} value={priority} onChange={e => setPriority(e.target.value as any)}>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
      </Field>
      {err && <div className="text-due text-[12.5px] mb-2">{err}</div>}
      <div className="flex gap-2.5 mt-4">
        <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" onClick={submit}>Submit</Button>
      </div>
    </Modal>
  )
}
