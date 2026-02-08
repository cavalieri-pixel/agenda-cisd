import React from 'react';

export default function Sidebar({ activeView, setActiveView, onLogout }) {
  
  const menuItems = [
    { id: 'agenda', label: '📅 Agenda', icon: '📅' },
    { id: 'patients', label: '👥 Pacientes', icon: '👥' }, // <--- Nuevo botón
    { id: 'professionals', label: '👨‍⚕️ Profesionales', icon: '👨‍⚕️' },
    { id: 'services', label: '🏥 Especialidades', icon: '🏥' },
    { id: 'schedule', label: '⏰ Horarios', icon: '⏰' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen shadow-xl z-20">
      {/* LOGO AREA */}
      <div className="p-6 border-b border-slate-700 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mb-2">
          C
        </div>
        <h1 className="text-xl font-bold tracking-wider">CISD</h1>
        <p className="text-xs text-slate-400">Admin Panel</p>
      </div>

      {/* MENU ITEMS */}
      <nav className="flex-1 py-6 space-y-2 px-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeView === item.id 
                ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* FOOTER / LOGOUT */}
      <div className="p-4 border-t border-slate-700">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white py-2 rounded-lg transition-colors border border-red-600/20"
        >
          🚪 Cerrar Sesión
        </button>
      </div>
    </div>
  );
}