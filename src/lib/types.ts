export type Role = 'owner' | 'tenant'

export interface Profile {
  id: string
  role: Role
  tenant_id: string | null
  full_name: string | null
}

export interface Property {
  id: string
  name: string
  address: string | null
  rent: number
  bedrooms: number | null
  notes: string | null
  created_at: string
}

export interface Tenant {
  id: string
  name: string
  email: string
  property_id: string | null
  phone: string | null
  lease_start: string | null
  lease_end: string | null
  active: boolean
  created_at: string
}

export interface Payment {
  id: string
  tenant_id: string
  month: string // YYYY-MM
  amount: number
  status: 'paid' | 'due' | 'overdue'
  paid_date: string | null
  created_at: string
}

export interface MaintenanceRequest {
  id: string
  tenant_id: string
  property_id: string | null
  issue: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'open' | 'in-progress' | 'resolved'
  created_by: 'owner' | 'tenant'
  created_at: string
}

export interface Doc {
  id: string
  title: string
  related_to: 'tenant' | 'property'
  related_id: string
  notes: string | null
  created_at: string
}
