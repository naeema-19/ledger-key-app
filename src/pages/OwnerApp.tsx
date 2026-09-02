import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Property, Tenant, Payment, MaintenanceRequest, Doc } from '../lib/types'
import { rupee, monthLabel, todayYM, monthsBetween } from '../lib/format'
import { printLedger } from '../lib/print'
import {
  Button, Card, StatCard, Stamp, StatusTag, PriorityTag, Field, inputCls, Modal, RowItem, EmptyNote, Toast,
} from '../components/ui'

type Tab = 'overview' | 'properties' | 'tenants' | 'payments' | 'maintenance' | 'documents'
const NAV: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'properties', label: 'Properties' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'payments', label: 'Payments' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'documents', label: 'Documents' },
]

export default function OwnerApp() {
  const [tab, setTab] = useState<Tab>('overview')
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([])
  const [documents, setDocuments] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [modal, setModal] = useState<{ type: string; editId?: string } | null>(null)
  const [paymentFilter, setPaymentFilter] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  async function loadAll() {
    setLoading(true)
    const [p, t, pay, m, d] = await Promise.all([
      supabase.from('properties').select('*').order('created_at'),
      supabase.from('tenants').select('*').order('created_at'),
      supabase.from('payments').select('*'),
      supabase.from('maintenance_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
    ])
    setProperties((p.data as Property[]) || [])
    setTenants((t.data as Tenant[]) || [])
    setPayments((pay.data as Payment[]) || [])
    setMaintenance((m.data as MaintenanceRequest[]) || [])
    setDocuments((d.data as Doc[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function syncDues(silent = false) {
    const nowYM = todayYM()
    let added = 0
    const toInsert: any[] = []
    for (const t of tenants.filter(t => t.active)) {
      if (!t.lease_start || !t.property_id) continue
      const prop = properties.find(p => p.id === t.property_id)
      if (!prop) continue
      const months = monthsBetween(t.lease_start.slice(0, 7), nowYM)
      for (const ym of months) {
        const exists = payments.some(p => p.tenant_id === t.id && p.month === ym)
        if (!exists) {
          toInsert.push({ tenant_id: t.id, month: ym, amount: prop.rent, status: 'due' })
          added++
        }
      }
    }
    if (toInsert.length > 0) {
      const { error } = await supabase.from('payments').insert(toInsert)
      if (error) { showToast('Could not sync dues.'); return }
      await loadAll()
    }
    if (!silent) showToast(added > 0 ? `${added} due entr${added === 1 ? 'y' : 'ies'} added.` : 'Payments already up to date.')
  }

  useEffect(() => { if (!loading && tenants.length) syncDues(true) }, [loading])

  function propertyById(id: string | null) { return properties.find(p => p.id === id) }
  function tenantById(id: string | null) { return tenants.find(t => t.id === id) }

  const currentMonthSummary = useMemo(() => {
    const ym = todayYM()
    return tenants.filter(t => t.active).map(t => {
      const pay = payments.find(p => p.tenant_id === t.id && p.month === ym)
      const prop = propertyById(t.property_id)
      return { tenant: t, status: pay ? pay.status : 'due', amount: pay ? pay.amount : (prop ? prop.rent : 0) }
    })
  }, [tenants, payments, properties])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-inksoft">Loading…</div>

  return (
    <div className="flex min-h-screen">
      {/* mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-ink text-parchment flex items-center justify-between px-4 py-3 z-30">
        <span className="font-display font-semibold">Ledger &amp; Key</span>
        <select className="bg-ink border border-white/30 rounded px-2 py-1 text-sm" value={tab} onChange={e => setTab(e.target.value as Tab)}>
          {NAV.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
        </select>
      </div>

      {/* sidebar */}
      <div className="hidden md:flex w-[230px] bg-ink text-parchment flex-col p-6 flex-shrink-0">
        <div className="font-display font-semibold text-xl mb-6">Ledger &amp; Key</div>
        <nav className="flex flex-col gap-1">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium ${tab === n.id ? 'bg-brass text-white' : 'text-[#C9CFD8] hover:bg-white/10 hover:text-white'}`}>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-4 border-t border-white/10">
          <div className="text-[12.5px] text-[#9AA4B2] mb-2">Signed in as Owner</div>
          <Button variant="ghost" size="sm" className="w-full !text-parchment !border-white/30" onClick={() => supabase.auth.signOut()}>Log out</Button>
        </div>
      </div>

      <div className="flex-1 p-6 md:p-10 pt-20 md:pt-10 max-w-[1180px]">
        {tab === 'overview' && (
          <Overview properties={properties} summary={currentMonthSummary} maintenance={maintenance} tenantById={tenantById} propertyById={propertyById} />
        )}
        {tab === 'properties' && (
          <Properties properties={properties} tenants={tenants} onAdd={() => setModal({ type: 'property' })}
            onEdit={id => setModal({ type: 'property', editId: id })}
            onDelete={async id => {
              if (!confirm('Remove this property? Tenants assigned to it will become unassigned.')) return
              await supabase.from('properties').delete().eq('id', id)
              await loadAll(); showToast('Property removed.')
            }} />
        )}
        {tab === 'tenants' && (
          <Tenants tenants={tenants} propertyById={propertyById} onAdd={() => setModal({ type: 'tenant' })}
            onEdit={id => setModal({ type: 'tenant', editId: id })}
            onDelete={async id => {
              if (!confirm('Remove this tenant record? Their payment/maintenance history stays on file.')) return
              await supabase.from('tenants').delete().eq('id', id)
              await loadAll(); showToast('Tenant removed.')
            }} />
        )}
        {tab === 'payments' && (
          <Payments payments={payments} tenants={tenants} tenantById={tenantById} propertyById={propertyById}
            filter={paymentFilter} setFilter={setPaymentFilter}
            onAdd={() => setModal({ type: 'payment' })}
            onSync={() => syncDues(false)}
            onMarkPaid={async id => {
              await supabase.from('payments').update({ status: 'paid', paid_date: new Date().toISOString().slice(0, 10) }).eq('id', id)
              await loadAll(); showToast('Marked as paid.')
            }}
            onDelete={async id => { await supabase.from('payments').delete().eq('id', id); await loadAll() }}
            onPrint={tenantId => {
              const t = tenantById(tenantId); if (!t) return
              printLedger(t, propertyById(t.property_id), payments.filter(p => p.tenant_id === tenantId))
            }}
          />
        )}
        {tab === 'maintenance' && (
          <MaintenanceTab list={maintenance} tenantById={tenantById} propertyById={propertyById}
            onAdd={() => setModal({ type: 'maintenance' })}
            onStatus={async (id, status) => { await supabase.from('maintenance_requests').update({ status }).eq('id', id); await loadAll(); showToast('Status updated.') }}
            onDelete={async id => { await supabase.from('maintenance_requests').delete().eq('id', id); await loadAll() }} />
        )}
        {tab === 'documents' && (
          <Documents list={documents} tenantById={tenantById} propertyById={propertyById}
            onAdd={() => setModal({ type: 'document' })}
            onDelete={async id => { await supabase.from('documents').delete().eq('id', id); await loadAll() }} />
        )}
      </div>

      {modal && (
        <OwnerModal modal={modal} properties={properties} tenants={tenants}
          editData={{
            property: modal.editId && modal.type === 'property' ? properties.find(p => p.id === modal.editId) : undefined,
            tenant: modal.editId && modal.type === 'tenant' ? tenants.find(t => t.id === modal.editId) : undefined,
          }}
          onClose={() => setModal(null)}
          onSaved={async (msg) => { await loadAll(); setModal(null); showToast(msg) }} />
      )}
      <Toast message={toast} />
    </div>
  )
}

/* ---------------- Overview ---------------- */
function Overview({ properties, summary, maintenance, tenantById, propertyById }: any) {
  const occupied = properties.filter((p: Property) => summary.some((s: any) => s.tenant.property_id === p.id)).length
  const collected = summary.filter((s: any) => s.status === 'paid').reduce((a: number, s: any) => a + Number(s.amount || 0), 0)
  const dueCount = summary.filter((s: any) => s.status !== 'paid').length
  const openMaint = maintenance.filter((m: MaintenanceRequest) => m.status !== 'resolved')

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Overview</h1>
      <p className="text-inksoft text-sm mb-6">{monthLabel(todayYM())} · a snapshot of your portfolio</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-8">
        <StatCard num={properties.length} label="Properties" />
        <StatCard num={`${occupied}/${properties.length}`} label="Occupied" />
        <StatCard num={rupee(collected)} label="Collected this month" />
        <StatCard num={dueCount} label="Rent pending" />
        <StatCard num={openMaint.length} label="Open maintenance" />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-lg font-semibold mb-3">Rent status — {monthLabel(todayYM())}</h2>
          {summary.length === 0 ? <EmptyNote>No active tenants yet.</EmptyNote> : (
            <div className="flex flex-col gap-2.5">
              {summary.map((s: any) => (
                <RowItem key={s.tenant.id}>
                  <div>
                    <div className="font-semibold text-[14.5px]">{s.tenant.name}</div>
                    <div className="text-inksoft text-[12.5px]">{propertyById(s.tenant.property_id)?.name || 'No property'} · {rupee(s.amount)}</div>
                  </div>
                  <Stamp status={s.status} />
                </RowItem>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-semibold mb-3">Open maintenance</h2>
          {openMaint.length === 0 ? <EmptyNote>Nothing open. Nice and quiet.</EmptyNote> : (
            <div className="flex flex-col gap-2.5">
              {openMaint.slice(0, 6).map((m: MaintenanceRequest) => (
                <RowItem key={m.id}>
                  <div>
                    <div className="font-semibold text-[14.5px]">{m.issue}</div>
                    <div className="text-inksoft text-[12.5px]">{tenantById(m.tenant_id)?.name || 'Unassigned'}</div>
                  </div>
                  <StatusTag status={m.status} />
                </RowItem>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ---------------- Properties ---------------- */
function Properties({ properties, tenants, onAdd, onEdit, onDelete }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Properties</h1>
          <p className="text-inksoft text-sm">{properties.length} home{properties.length === 1 ? '' : 's'} in your portfolio</p>
        </div>
        <Button variant="brass" onClick={onAdd}>+ Add property</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p: Property) => {
          const tenant = tenants.find((t: Tenant) => t.property_id === p.id && t.active)
          return (
            <div key={p.id} className="relative bg-card border border-line rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-[17px] mt-1">{p.name}</h3>
              <div className="text-[13px] text-inksoft mb-3">{p.address}</div>
              <div className="mono text-[19px] font-semibold text-brassdark">{rupee(p.rent)}<span className="text-xs text-inksoft font-medium"> /mo</span></div>
              <div className="text-[13px] text-inksoft mt-2.5">{tenant ? <>Tenant: <b className="text-ink">{tenant.name}</b></> : 'Vacant'}</div>
              <div className="flex gap-2 mt-3.5">
                <Button size="sm" variant="ghost" onClick={() => onEdit(p.id)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(p.id)}>Delete</Button>
              </div>
            </div>
          )
        })}
        <button onClick={onAdd} className="border-2 border-dashed border-line rounded-2xl flex flex-col items-center justify-center gap-2 min-h-[150px] text-inksoft font-semibold hover:border-brass hover:text-brassdark">
          <span className="text-2xl">+</span> Add property
        </button>
      </div>
    </div>
  )
}

/* ---------------- Tenants ---------------- */
function Tenants({ tenants, propertyById, onAdd, onEdit, onDelete }: any) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <p className="text-inksoft text-sm">{tenants.length} on record</p>
        </div>
        <Button variant="brass" onClick={onAdd}>+ Add tenant</Button>
      </div>
      {tenants.length === 0 ? <Card><EmptyNote>No tenants yet.</EmptyNote></Card> : (
        <div className="flex flex-col gap-2.5">
          {tenants.map((t: Tenant) => (
            <RowItem key={t.id}>
              <div>
                <div className="font-semibold text-[14.5px]">{t.name} {!t.active && <span className="ml-1 text-[11px] bg-parchmentdeep text-inksoft px-2 py-0.5 rounded-full">inactive</span>}</div>
                <div className="text-inksoft text-[12.5px]">{propertyById(t.property_id)?.name || 'No property'} · {t.email} · {t.phone || ''}</div>
                <div className="text-inksoft text-[12.5px]">Lease: {t.lease_start || '—'} to {t.lease_end || '—'}</div>
              </div>
              <div className="flex gap-2 items-center">
                <Button size="sm" variant="ghost" onClick={() => onEdit(t.id)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(t.id)}>Delete</Button>
              </div>
            </RowItem>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- Payments ---------------- */
function Payments({ payments, tenants, tenantById, propertyById, filter, setFilter, onAdd, onSync, onMarkPaid, onDelete, onPrint }: any) {
  let list = filter ? payments.filter((p: Payment) => p.tenant_id === filter) : [...payments]
  list = [...list].sort((a: Payment, b: Payment) => (b.month || '').localeCompare(a.month || ''))
  const filterTenant = filter ? tenantById(filter) : null
  const totals = filterTenant ? {
    paid: list.filter((p: Payment) => p.status === 'paid').length,
    pending: list.filter((p: Payment) => p.status !== 'paid').length,
  } : null

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="text-inksoft text-sm">Due entries auto-generate monthly from each tenant's lease start date.</p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="ghost" onClick={onSync}>Sync dues</Button>
          <Button variant="brass" onClick={onAdd}>+ Record payment</Button>
        </div>
      </div>
      <Card className="mb-4 !p-4">
        <Field label="View history for">
          <select className={inputCls + ' max-w-[280px]'} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All tenants</option>
            {tenants.map((t: Tenant) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        {totals && (
          <div className="flex items-center justify-between flex-wrap gap-3 -mt-2">
            <div className="text-inksoft text-[13px]">{filterTenant.name} — {totals.paid} paid · {totals.pending} pending, {list.length} month{list.length === 1 ? '' : 's'} on record</div>
            <Button size="sm" variant="ghost" onClick={() => onPrint(filter)}>🖨 Print / export ledger</Button>
          </div>
        )}
      </Card>
      {list.length === 0 ? <Card><EmptyNote>No payment records{filter ? ' for this tenant' : ''} yet.</EmptyNote></Card> : (
        <Card className="!p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11.5px] uppercase text-inksoft border-b border-line">
                {!filter && <th className="text-left p-3">Tenant</th>}
                <th className="text-left p-3">Month</th>
                <th className="text-left p-3">Amount</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Paid on</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p: Payment) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  {!filter && <td className="p-3">{tenantById(p.tenant_id)?.name || 'Unknown'}</td>}
                  <td className="p-3 mono">{monthLabel(p.month)}</td>
                  <td className="p-3 mono">{rupee(p.amount)}</td>
                  <td className="p-3"><Stamp status={p.status} /></td>
                  <td className="p-3 mono">{p.paid_date || '—'}</td>
                  <td className="p-3 whitespace-nowrap">
                    {p.status !== 'paid' && <Button size="sm" variant="ghost" className="mr-2" onClick={() => onMarkPaid(p.id)}>Mark paid</Button>}
                    <Button size="sm" variant="danger" onClick={() => onDelete(p.id)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

/* ---------------- Maintenance ---------------- */
function MaintenanceTab({ list, tenantById, propertyById, onAdd, onStatus, onDelete }: any) {
  const sorted = [...list].sort((a: MaintenanceRequest, b: MaintenanceRequest) => (b.created_at || '').localeCompare(a.created_at || ''))
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h1 className="text-2xl font-semibold">Maintenance</h1><p className="text-inksoft text-sm">Repair &amp; upkeep requests</p></div>
        <Button variant="brass" onClick={onAdd}>+ Add request</Button>
      </div>
      {sorted.length === 0 ? <Card><EmptyNote>No maintenance requests on record.</EmptyNote></Card> : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((m: MaintenanceRequest) => (
            <RowItem key={m.id}>
              <div>
                <div className="font-semibold text-[14.5px] flex items-center gap-2">{m.issue} <PriorityTag priority={m.priority} /></div>
                <div className="text-inksoft text-[12.5px]">{tenantById(m.tenant_id)?.name || 'Unassigned'} · {propertyById(m.property_id)?.name || ''}</div>
                {m.description && <div className="text-inksoft text-[12.5px] mt-1">{m.description}</div>}
              </div>
              <div className="flex gap-2 items-center">
                <select className="border border-line rounded-lg px-2 py-1.5 text-sm" value={m.status} onChange={e => onStatus(m.id, e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in-progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <Button size="sm" variant="danger" onClick={() => onDelete(m.id)}>Delete</Button>
              </div>
            </RowItem>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- Documents ---------------- */
function Documents({ list, tenantById, propertyById, onAdd, onDelete }: any) {
  const sorted = [...list].sort((a: Doc, b: Doc) => (b.created_at || '').localeCompare(a.created_at || ''))
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div><h1 className="text-2xl font-semibold">Documents</h1><p className="text-inksoft text-sm">Notes &amp; records (text only)</p></div>
        <Button variant="brass" onClick={onAdd}>+ Add document</Button>
      </div>
      {sorted.length === 0 ? <Card><EmptyNote>No documents added yet.</EmptyNote></Card> : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((d: Doc) => (
            <RowItem key={d.id}>
              <div>
                <div className="font-semibold text-[14.5px]">{d.title}</div>
                <div className="text-inksoft text-[12.5px]">{d.related_to === 'tenant' ? tenantById(d.related_id)?.name : propertyById(d.related_id)?.name}</div>
                {d.notes && <div className="text-inksoft text-[12.5px] mt-1">{d.notes}</div>}
              </div>
              <Button size="sm" variant="danger" onClick={() => onDelete(d.id)}>Delete</Button>
            </RowItem>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------- Modal ---------------- */
function OwnerModal({ modal, properties, tenants, editData, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(() => {
    if (modal.type === 'property') return editData.property || { name: '', address: '', rent: '', bedrooms: '', notes: '' }
    if (modal.type === 'tenant') return editData.tenant || { name: '', email: '', property_id: '', phone: '', lease_start: '', lease_end: '', active: true }
    if (modal.type === 'payment') return { tenant_id: '', month: todayYM(), amount: '', status: 'due' }
    if (modal.type === 'maintenance') return { tenant_id: '', issue: '', description: '', priority: 'medium' }
    if (modal.type === 'document') return { title: '', related_to: 'tenant', related_id: '', notes: '' }
    return {}
  })
  const [err, setErr] = useState('')

  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })) }

  async function save() {
    setErr('')
    if (modal.type === 'property') {
      if (!form.name?.trim()) return setErr('Please enter a property name.')
      const obj = { name: form.name.trim(), address: form.address, rent: Number(form.rent) || 0, bedrooms: Number(form.bedrooms) || 0, notes: form.notes }
      const q = modal.editId ? supabase.from('properties').update(obj).eq('id', modal.editId) : supabase.from('properties').insert(obj)
      const { error } = await q
      if (error) return setErr(error.message)
      return onSaved('Property saved.')
    }
    if (modal.type === 'tenant') {
      if (!form.name?.trim() || !form.email?.trim()) return setErr('Please enter a name and email.')
      const obj = {
        name: form.name.trim(), email: form.email.trim(), property_id: form.property_id || null,
        phone: form.phone, lease_start: form.lease_start || null, lease_end: form.lease_end || null, active: !!form.active,
      }
      if (modal.editId) {
        const { error } = await supabase.from('tenants').update(obj).eq('id', modal.editId)
        if (error) return setErr(error.message)
      } else {
        const { error } = await supabase.from('tenants').insert(obj)
        if (error) return setErr(error.message)
      }
      return onSaved('Tenant saved. Ask them to sign up in the app using this exact email address \u2014 their account links automatically.')
    }
    if (modal.type === 'payment') {
      if (!form.tenant_id) return setErr('Please select a tenant.')
      const obj = { tenant_id: form.tenant_id, month: form.month || todayYM(), amount: Number(form.amount) || 0, status: form.status, paid_date: form.status === 'paid' ? new Date().toISOString().slice(0, 10) : null }
      const { error } = await supabase.from('payments').insert(obj)
      if (error) return setErr(error.message)
      return onSaved('Payment recorded.')
    }
    if (modal.type === 'maintenance') {
      if (!form.issue?.trim()) return setErr('Please describe the issue.')
      const tenant = tenants.find((t: Tenant) => t.id === form.tenant_id)
      const obj = { tenant_id: form.tenant_id || null, property_id: tenant?.property_id || null, issue: form.issue.trim(), description: form.description, priority: form.priority, status: 'open', created_by: 'owner' }
      const { error } = await supabase.from('maintenance_requests').insert(obj)
      if (error) return setErr(error.message)
      return onSaved('Request added.')
    }
    if (modal.type === 'document') {
      if (!form.title?.trim()) return setErr('Please enter a title.')
      const obj = { title: form.title.trim(), related_to: form.related_to, related_id: form.related_id, notes: form.notes }
      const { error } = await supabase.from('documents').insert(obj)
      if (error) return setErr(error.message)
      return onSaved('Document added.')
    }
  }

  const titles: Record<string, string> = {
    property: modal.editId ? 'Edit property' : 'Add property',
    tenant: modal.editId ? 'Edit tenant' : 'Add tenant',
    payment: 'Record payment',
    maintenance: 'Add maintenance request',
    document: 'Add document / note',
  }

  return (
    <Modal title={titles[modal.type]} onClose={onClose}>
      {modal.type === 'property' && (
        <>
          <Field label="Property name"><input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Palm View Villa" /></Field>
          <Field label="Address"><input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monthly rent (₹)"><input type="number" className={inputCls} value={form.rent} onChange={e => set('rent', e.target.value)} /></Field>
            <Field label="Bedrooms"><input type="number" className={inputCls} value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} /></Field>
          </div>
          <Field label="Notes"><textarea rows={2} className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
        </>
      )}
      {modal.type === 'tenant' && (
        <>
          <Field label="Full name"><input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Email (used for their login)"><input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Property">
            <select className={inputCls} value={form.property_id || ''} onChange={e => set('property_id', e.target.value)}>
              <option value="">No property assigned</option>
              {properties.map((p: Property) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Phone"><input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lease start"><input type="date" className={inputCls} value={form.lease_start || ''} onChange={e => set('lease_start', e.target.value)} /></Field>
            <Field label="Lease end"><input type="date" className={inputCls} value={form.lease_end || ''} onChange={e => set('lease_end', e.target.value)} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input type="checkbox" checked={!!form.active} onChange={e => set('active', e.target.checked)} /> Active tenant
          </label>
        </>
      )}
      {modal.type === 'payment' && (
        <>
          <Field label="Tenant">
            <select className={inputCls} value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
              <option value="">Select tenant</option>
              {tenants.map((t: Tenant) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Month"><input type="month" className={inputCls} value={form.month} onChange={e => set('month', e.target.value)} /></Field>
            <Field label="Amount (₹)"><input type="number" className={inputCls} value={form.amount} onChange={e => set('amount', e.target.value)} /></Field>
          </div>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="paid">Paid</option><option value="due">Due</option><option value="overdue">Overdue</option>
            </select>
          </Field>
        </>
      )}
      {modal.type === 'maintenance' && (
        <>
          <Field label="Tenant">
            <select className={inputCls} value={form.tenant_id} onChange={e => set('tenant_id', e.target.value)}>
              <option value="">Select tenant</option>
              {tenants.map((t: Tenant) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Issue"><input className={inputCls} value={form.issue} onChange={e => set('issue', e.target.value)} /></Field>
          <Field label="Description"><textarea rows={3} className={inputCls} value={form.description} onChange={e => set('description', e.target.value)} /></Field>
          <Field label="Priority">
            <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </Field>
        </>
      )}
      {modal.type === 'document' && (
        <>
          <Field label="Title"><input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} /></Field>
          <Field label="Relates to">
            <select className={inputCls} value={form.related_to} onChange={e => set('related_to', e.target.value)}>
              <option value="tenant">Tenant</option><option value="property">Property</option>
            </select>
          </Field>
          <Field label="Select">
            <select className={inputCls} value={form.related_id} onChange={e => set('related_id', e.target.value)}>
              <option value="">Select…</option>
              {(form.related_to === 'tenant' ? tenants : properties).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Field>
          <Field label="Notes"><textarea rows={3} className={inputCls} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
        </>
      )}
      {err && <div className="text-due text-[12.5px] mb-2">{err}</div>}
      <div className="flex gap-2.5 mt-4">
        <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
        <Button className="flex-1" onClick={save}>Save</Button>
      </div>
    </Modal>
  )
}
