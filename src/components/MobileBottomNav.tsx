import { navigationGroups } from '../lib/navigation'

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const { operations, admin } = navigationGroups;

  const navItems = [
    { ...operations.find(i => i.id === 'command-center'), name: 'Dashboard' },
    { ...operations.find(i => i.id === 'fets-roster'), name: 'Roster' },
    { ...operations.find(i => i.id === 'fets-calendar'), name: 'Calendar' },
    { ...admin.find(i => i.id === 'staff-management'), name: 'Staff' }
  ];

  const navigation = navItems.filter(i => i.id);

  return (
    <div className="flex items-center justify-around py-2 px-1 bg-white border-t border-gray-200">
      {navigation.map((item) => {
        const Icon = item.icon;
        if (!Icon) return null;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id!)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg min-h-[44px] flex-1 transition-colors ${
              activeTab === item.id
                ? 'text-yellow-600 bg-yellow-50'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={20} className="mb-1" />
            <span className="text-xs font-medium">{item.name}</span>
          </button>
        )
      })}
    </div>
  )
}
