import {
  Users,
  UserCog,
  Settings,
  Calendar,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Home,
  Vault
} from 'lucide-react'

export interface NavigationItem {
  id: string
  name: string
  icon: any
  badge?: string | number
  group?: string
}

export const navigationGroups = {
  operations: [
    { id: 'command-center', name: 'Command Centre', icon: Home, badge: 'Home' },
    { id: 'candidate-tracker', name: 'Candidate Tracker', icon: Users },
    { id: 'fets-roster', name: 'FETS Roster', icon: UserCheck, badge: '0' },
    { id: 'fets-calendar', name: 'FETS Calendar', icon: Calendar },
  ],
  compliance: [
    { id: 'log-incident', name: 'Log Incident', icon: AlertTriangle },
    { id: 'checklist-management', name: 'Checklist Management', icon: CheckCircle },
    { id: 'fets-vault', name: 'Resource Centre', icon: Vault },
  ],
  admin: [
    { id: 'staff-management', name: 'User Management', icon: UserCog },
    { id: 'settings', name: 'Settings', icon: Settings },
  ]
}
