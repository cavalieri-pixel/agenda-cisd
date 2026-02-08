import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

// ==========================================
// MÓDULO 1: PROFESIONALES
// ==========================================
export function ProfessionalsView() {
  const [pros, setPros] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', color: '#3788d8', phone: '' });

  useEffect(() => { loadPros(); }, []);
  const loadPros = async () => { const res = await axios.get(`${API_URL}/professionals`); setPros(res.data); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.id) await axios.post(`${API_URL}/professionals`, form);
      else await axios.put(`${API_URL}/professionals/${form.id}`, form);
      setForm({ name: '', email: '', password: '', color: '#3788d8', phone: '' });
      loadPros();
      alert('Guardado correctamente');
    } catch { alert('Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Borrar?')) { await axios.delete(`${API_URL}/professionals/${id}`); loadPros(); }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2">Gestión de Profesionales</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="font-bold mb-4 text-gray-700">{form.id ? 'Editar Profesional' : 'Nuevo Profesional'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input placeholder="Nombre" className="w-full p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                <input placeholder="Email" type="email" className="w-full p-2 border rounded" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                <input placeholder="Contraseña" type="password" className="w-full p-2 border rounded" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!form.id} />
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Color:</span>
                    <input type="color" className="h-8 flex-1" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
                </div>
                <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold">Guardar</button>
            </form>
        </div>
        {/* Lista */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {pros.map(p => (
                <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-2" style={{backgroundColor: p.color}}></div>
                    <div className="pl-4">
                        <p className="font-bold text-lg">{p.name}</p>
                        <p className="text-sm text-gray-500">{p.email}</p>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setForm(p)} className="text-blue-600 bg-blue-50 p-2 rounded">✏️</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 bg-red-50 p-2 rounded">🗑️</button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO 2: ESPECIALIDADES
// ==========================================
export function ServicesView() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', durationMin: 30, price: 0, isTelemed: false });

  useEffect(() => { loadServices(); }, []);
  const loadServices = async () => { const res = await axios.get(`${API_URL}/services`); setServices(res.data); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.id) await axios.post(`${API_URL}/services`, form);
      else await axios.put(`${API_URL}/services/${form.id}`, form);
      setForm({ name: '', code: '', durationMin: 30, price: 0, isTelemed: false });
      loadServices();
    } catch { alert('Error al guardar'); }
  };

  const handleDelete = async (id) => { if (window.confirm('¿Borrar?')) { await axios.delete(`${API_URL}/services/${id}`); loadServices(); }};

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2">Catálogo de Especialidades</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
            <h3 className="font-bold mb-4 text-gray-700">Datos del Servicio</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                <input placeholder="Nombre" className="w-full p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                <input placeholder="Código (KINE-01)" className="w-full p-2 border rounded" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required />
                <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Minutos" className="p-2 border rounded" value={form.durationMin} onChange={e => setForm({...form, durationMin: e.target.value})} />
                    <input type="number" placeholder="Precio" className="p-2 border rounded" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <label className="flex items-center gap-2 p-2 border rounded bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={form.isTelemed} onChange={e => setForm({...form, isTelemed: e.target.checked})} />
                    <span className="text-sm font-medium">Es Telemedicina (Google Meet)</span>
                </label>
                <button className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 font-bold">Guardar</button>
            </form>
        </div>
        
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr><th className="p-4">Nombre</th><th className="p-4">Código</th><th className="p-4">Duración</th><th className="p-4">Acciones</th></tr>
                    </thead>
                    <tbody>
                        {services.map(s => (
                            <tr key={s.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-medium">{s.name} {s.isTelemed && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Meet</span>}</td>
                                <td className="p-4 text-gray-500">{s.code}</td>
                                <td className="p-4">{s.durationMin} min</td>
                                <td className="p-4 flex gap-2">
                                    <button onClick={() => setForm(s)} className="text-blue-600 hover:underline">Editar</button>
                                    <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Borrar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MÓDULO 3: HORARIOS
// ==========================================
export function ScheduleView() {
    const [pros, setPros] = useState([]);
    const [selectedPro, setSelectedPro] = useState('');
    const [schedules, setSchedules] = useState([]);
    const [day, setDay] = useState(1);
    const [start, setStart] = useState('09:00');
    const [end, setEnd] = useState('13:00');

    useEffect(() => { axios.get(`${API_URL}/professionals`).then(res => { setPros(res.data); if (res.data.length > 0) setSelectedPro(res.data[0].id); }); }, []);
    useEffect(() => { if (selectedPro) loadSchedule(); }, [selectedPro]);

    const loadSchedule = async () => { const res = await axios.get(`${API_URL}/availability/${selectedPro}`); setSchedules(res.data); };
    const addBlock = () => { setSchedules([...schedules, { dayOfWeek: parseInt(day), startTime: start, endTime: end }]); };
    const removeBlock = (i) => { const n = [...schedules]; n.splice(i, 1); setSchedules(n); };
    const saveChanges = async () => { try { await axios.post(`${API_URL}/availability`, { professionalId: selectedPro, schedules }); alert('Guardado'); } catch { alert('Error'); } };
    
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    return (
        <div className="p-8">
             <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2">Configuración de Horarios</h2>
             <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
                <label className="font-bold">Seleccionar Profesional:</label>
                <select className="p-2 border rounded" value={selectedPro} onChange={e => setSelectedPro(e.target.value)}>
                    {pros.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h4 className="font-bold mb-4">Agregar Bloque de Disponibilidad</h4>
                    <div className="space-y-4">
                        <select className="w-full p-2 border rounded" value={day} onChange={e => setDay(e.target.value)}>
                            {days.map((d, i) => <option key={i} value={i}>{d}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="time" className="p-2 border rounded" value={start} onChange={e => setStart(e.target.value)} />
                            <input type="time" className="p-2 border rounded" value={end} onChange={e => setEnd(e.target.value)} />
                        </div>
                        <button onClick={addBlock} className="w-full bg-blue-100 text-blue-700 py-2 rounded font-bold hover:bg-blue-200">+ Agregar</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h4 className="font-bold mb-4 flex justify-between">
                        <span>Horarios Actuales</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">{schedules.length} Bloques</span>
                    </h4>
                    <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                        {schedules.sort((a,b) => a.dayOfWeek - b.dayOfWeek).map((s, i) => (
                            <li key={i} className="flex justify-between p-2 bg-gray-50 border rounded items-center">
                                <span className="font-medium text-blue-800">{days[s.dayOfWeek]}</span>
                                <span>{s.startTime} - {s.endTime}</span>
                                <button onClick={() => removeBlock(i)} className="text-red-500 font-bold hover:bg-red-100 px-2 rounded">×</button>
                            </li>
                        ))}
                    </ul>
                    <button onClick={saveChanges} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 shadow-md">💾 Guardar Cambios</button>
                </div>
             </div>
        </div>
    )
}