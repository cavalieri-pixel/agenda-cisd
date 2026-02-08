import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- CONFIGURACIÓN DE URL BASE ---
const API_URL = 'https://cisd-api.onrender.com/api';

export default function AdminPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('professionals');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden">
        
        {/* ENCABEZADO */}
        <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">⚙️ Configuración CISD</h2>
          <button onClick={onClose} className="text-gray-300 hover:text-white text-2xl">✕</button>
        </div>

        {/* NAVEGACIÓN (TABS) */}
        <div className="flex border-b bg-gray-100">
          <button 
            className={`flex-1 py-3 font-medium ${activeTab === 'professionals' ? 'bg-white border-t-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('professionals')}
          >
            👨‍⚕️ Profesionales
          </button>
          <button 
            className={`flex-1 py-3 font-medium ${activeTab === 'services' ? 'bg-white border-t-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('services')}
          >
            🏥 Especialidades
          </button>
          <button 
            className={`flex-1 py-3 font-medium ${activeTab === 'schedule' ? 'bg-white border-t-4 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-200'}`}
            onClick={() => setActiveTab('schedule')}
          >
            📅 Horarios
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {activeTab === 'professionals' && <ProfessionalsTab />}
          {activeTab === 'services' && <ServicesTab />}
          {activeTab === 'schedule' && <ScheduleTab />}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 1. PESTAÑA PROFESIONALES
// ==========================================
function ProfessionalsTab() {
  const [pros, setPros] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', color: '#3788d8', phone: '' });

  useEffect(() => { loadPros(); }, []);

  const loadPros = async () => {
    const res = await axios.get(`${API_URL}/professionals`);
    setPros(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.id) {
        await axios.post(`${API_URL}/professionals`, form); // Crear
      } else {
        await axios.put(`${API_URL}/professionals/${form.id}`, form); // Editar
      }
      setForm({ name: '', email: '', password: '', color: '#3788d8', phone: '' }); // Limpiar
      loadPros();
      alert('Guardado correctamente');
    } catch (error) {
      alert('Error al guardar. Verifica que el email no esté repetido.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Borrar profesional? Se borrarán sus citas.')) {
      try {
        await axios.delete(`${API_URL}/professionals/${id}`);
        loadPros();
      } catch (error) { alert('Error al eliminar'); }
    }
  };

  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Gestión de Profesionales</h3>
      
      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input placeholder="Nombre Completo" className="p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <input placeholder="Email" type="email" className="p-2 border rounded" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
        <input placeholder="Contraseña" type="password" className="p-2 border rounded" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!form.id} />
        <input placeholder="Teléfono" className="p-2 border rounded" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        <div className="flex items-center gap-2">
            <label>Color en Agenda:</label>
            <input type="color" className="h-10 w-20" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
        </div>
        <button className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold">
            {form.id ? 'Actualizar Profesional' : 'Crear Profesional'}
        </button>
        {form.id && <button type="button" onClick={() => setForm({ name: '', email: '', password: '', color: '#3788d8', phone: '' })} className="bg-gray-400 text-white p-2 rounded">Cancelar Edición</button>}
      </form>

      {/* Lista */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-gray-100 border-b">
                <tr>
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Color</th>
                    <th className="p-3">Acciones</th>
                </tr>
            </thead>
            <tbody>
                {pros.map(p => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{p.name}</td>
                        <td className="p-3 text-gray-600">{p.email}</td>
                        <td className="p-3"><div className="w-6 h-6 rounded-full" style={{backgroundColor: p.color}}></div></td>
                        <td className="p-3 flex gap-2">
                            <button onClick={() => setForm(p)} className="text-blue-600 hover:underline">Editar</button>
                            <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">Eliminar</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// 2. PESTAÑA ESPECIALIDADES
// ==========================================
function ServicesTab() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', durationMin: 30, price: 0, isTelemed: false });

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    const res = await axios.get(`${API_URL}/services`);
    setServices(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.id) {
        await axios.post(`${API_URL}/services`, form);
      } else {
        await axios.put(`${API_URL}/services/${form.id}`, form);
      }
      setForm({ name: '', code: '', durationMin: 30, price: 0, isTelemed: false });
      loadServices();
      alert('Servicio guardado');
    } catch (error) { alert('Error al guardar servicio'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Borrar servicio?')) {
        await axios.delete(`${API_URL}/services/${id}`);
        loadServices();
    }
  };

  return (
    <div>
        <h3 className="text-lg font-bold mb-4">Gestión de Especialidades</h3>
        
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="Nombre (Ej: Kinesiología)" className="p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input placeholder="Código Único (Ej: KINE-01)" className="p-2 border rounded" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
            <div className="flex flex-col">
                <label className="text-xs text-gray-500">Duración (min)</label>
                <input type="number" className="p-2 border rounded" value={form.durationMin} onChange={e => setForm({...form, durationMin: e.target.value})} required />
            </div>
            <div className="flex flex-col">
                <label className="text-xs text-gray-500">Precio (CLP)</label>
                <input type="number" className="p-2 border rounded" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" id="telemed" className="w-5 h-5" checked={form.isTelemed} onChange={e => setForm({...form, isTelemed: e.target.checked})} />
                <label htmlFor="telemed" className="cursor-pointer select-none">¿Es Telemedicina? (Genera enlace Meet)</label>
            </div>
            <button className="bg-green-600 text-white p-2 rounded hover:bg-green-700 font-bold md:col-span-2">
                {form.id ? 'Actualizar Servicio' : 'Crear Servicio'}
            </button>
            {form.id && <button type="button" onClick={() => setForm({ name: '', code: '', durationMin: 30, price: 0, isTelemed: false })} className="bg-gray-400 text-white p-2 rounded md:col-span-2">Cancelar Edición</button>}
        </form>

        <div className="bg-white rounded shadow overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-100 border-b">
                    <tr>
                        <th className="p-3">Nombre</th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Minutos</th>
                        <th className="p-3">Precio</th>
                        <th className="p-3">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {services.map(s => (
                        <tr key={s.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 font-medium">
                                {s.name} {s.isTelemed && <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full ml-2">Meet</span>}
                            </td>
                            <td className="p-3 text-gray-500 text-sm">{s.code}</td>
                            <td className="p-3">{s.durationMin} min</td>
                            <td className="p-3">${s.price}</td>
                            <td className="p-3 flex gap-2">
                                <button onClick={() => setForm(s)} className="text-blue-600 hover:underline">Editar</button>
                                <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Eliminar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}

// ==========================================
// 3. PESTAÑA HORARIOS
// ==========================================
function ScheduleTab() {
    const [pros, setPros] = useState([]);
    const [selectedPro, setSelectedPro] = useState('');
    const [schedules, setSchedules] = useState([]);
    
    // Formulario para añadir bloque
    const [day, setDay] = useState(1);
    const [start, setStart] = useState('09:00');
    const [end, setEnd] = useState('13:00');

    const days = [
        { id: 1, name: 'Lunes' }, { id: 2, name: 'Martes' }, { id: 3, name: 'Miércoles' },
        { id: 4, name: 'Jueves' }, { id: 5, name: 'Viernes' }, { id: 6, name: 'Sábado' }, { id: 0, name: 'Domingo' }
    ];

    useEffect(() => {
        axios.get(`${API_URL}/professionals`).then(res => {
            setPros(res.data);
            if (res.data.length > 0) setSelectedPro(res.data[0].id);
        });
    }, []);

    useEffect(() => {
        if (selectedPro) loadSchedule();
    }, [selectedPro]);

    const loadSchedule = async () => {
        const res = await axios.get(`${API_URL}/availability/${selectedPro}`);
        setSchedules(res.data);
    };

    const addBlock = () => {
        const newBlock = { dayOfWeek: parseInt(day), startTime: start, endTime: end };
        setSchedules([...schedules, newBlock]);
    };

    const removeBlock = (index) => {
        const newSched = [...schedules];
        newSched.splice(index, 1);
        setSchedules(newSched);
    };

    const saveChanges = async () => {
        try {
            await axios.post(`${API_URL}/availability`, {
                professionalId: selectedPro,
                schedules: schedules
            });
            alert('Horarios guardados correctamente');
        } catch (error) {
            alert('Error al guardar horarios');
        }
    };

    const getDayName = (id) => days.find(d => d.id === id)?.name;

    return (
        <div>
            <h3 className="text-lg font-bold mb-4">Configurar Horario Laboral</h3>
            
            <div className="mb-6">
                <label className="block text-gray-700 font-bold mb-2">Seleccionar Profesional:</label>
                <select 
                    className="w-full p-2 border rounded shadow-sm"
                    value={selectedPro} 
                    onChange={e => setSelectedPro(e.target.value)}
                >
                    {pros.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Lado Izquierdo: Agregar Bloques */}
                <div className="bg-white p-4 rounded shadow">
                    <h4 className="font-bold border-b pb-2 mb-4">Agregar Nuevo Bloque</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-600">Día de la semana</label>
                            <select className="w-full p-2 border rounded" value={day} onChange={e => setDay(e.target.value)}>
                                {days.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm text-gray-600">Desde</label>
                                <input type="time" className="w-full p-2 border rounded" value={start} onChange={e => setStart(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600">Hasta</label>
                                <input type="time" className="w-full p-2 border rounded" value={end} onChange={e => setEnd(e.target.value)} />
                            </div>
                        </div>
                        <button onClick={addBlock} className="w-full bg-blue-100 text-blue-700 py-2 rounded font-bold hover:bg-blue-200">
                            + Agregar Bloque
                        </button>
                    </div>
                </div>

                {/* Lado Derecho: Lista Actual */}
                <div className="bg-white p-4 rounded shadow">
                    <h4 className="font-bold border-b pb-2 mb-4 flex justify-between">
                        <span>Horarios Actuales</span>
                        <span className="text-xs font-normal bg-gray-100 px-2 py-1 rounded">
                            {schedules.length} Bloques
                        </span>
                    </h4>
                    
                    {schedules.length === 0 ? (
                        <p className="text-gray-400 italic text-center py-4">No hay horarios configurados.</p>
                    ) : (
                        <ul className="space-y-2 max-h-60 overflow-y-auto">
                            {schedules
                              .sort((a,b) => a.dayOfWeek - b.dayOfWeek)
                              .map((s, index) => (
                                <li key={index} className="flex justify-between items-center p-2 bg-gray-50 border rounded">
                                    <span className="font-medium text-gray-700">
                                        {getDayName(s.dayOfWeek)}
                                    </span>
                                    <span className="text-gray-500 text-sm">
                                        {s.startTime} - {s.endTime}
                                    </span>
                                    <button onClick={() => removeBlock(index)} className="text-red-500 hover:text-red-700 font-bold">×</button>
                                </li>
                            ))}
                        </ul>
                    )}
                    
                    <button onClick={saveChanges} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700">
                        💾 Guardar Todos los Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}