import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

// --- UTILIDAD: Convertir CSV a JSON en el navegador ---
const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const obj = {};
    const currentline = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');

    headers.forEach((header, index) => {
      let val = currentline[index] ? currentline[index].trim().replace(/"/g, '') : '';
      obj[header] = val;
    });
    result.push(obj);
  }
  return result;
};

// ==========================================
// MÓDULO 1: PROFESIONALES
// ==========================================
export function ProfessionalsView() {
  const [pros, setPros] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', color: '#3788d8', phone: '' });
  const fileInputRef = useRef(null);

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

  const handleExport = () => { window.open(`${API_URL}/professionals/export`, '_blank'); };
  const handleImportClick = () => fileInputRef.current.click();
  const handleFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try { const res = await axios.post(`${API_URL}/professionals/import`, { data: parseCSV(evt.target.result) }); alert(res.data.message); loadPros(); } catch { alert("Error al importar"); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Profesionales</h2>
        <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-bold flex items-center gap-2">⬇ Descargar CSV</button>
            <button onClick={handleImportClick} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm font-bold flex items-center gap-2">⬆ Cargar CSV</button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
  const fileInputRef = useRef(null);

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

  const handleExport = () => window.open(`${API_URL}/services/export`, '_blank');
  const handleImportClick = () => fileInputRef.current.click();
  const handleFileChange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try { const res = await axios.post(`${API_URL}/services/import`, { data: parseCSV(evt.target.result) }); alert(res.data.message); loadServices(); } catch { alert("Error al importar"); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6 border-b pb-2">
        <h2 className="text-2xl font-bold text-slate-800">Catálogo de Especialidades</h2>
        <div className="flex gap-2">
            <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-bold flex items-center gap-2">⬇ CSV</button>
            <button onClick={handleImportClick} className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm font-bold flex items-center gap-2">⬆ CSV</button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
        </div>
      </div>

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
                    <span className="text-sm font-medium">Es Telemedicina</span>
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

// ==========================================
// MÓDULO 4: PACIENTES (NUEVO)
// ==========================================
export function PatientsView() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', rut: '', email: '', phone: '' });
  const [isEditing, setIsEditing] = useState(false);
  
  // Estado para el Modal de Perfil
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => { loadPatients(); }, []);

  const loadPatients = async () => {
    const res = await axios.get(`${API_URL}/patients`);
    setPatients(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`${API_URL}/patients/${form.id}`, form);
      } else {
        await axios.post(`${API_URL}/patients`, form);
      }
      setForm({ name: '', rut: '', email: '', phone: '' });
      setIsEditing(false);
      loadPatients();
      alert('Guardado correctamente');
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar paciente? Si tiene citas pasadas, no se podrá borrar por seguridad.')) {
      try {
        await axios.delete(`${API_URL}/patients/${id}`);
        loadPatients();
      } catch (error) {
        alert('No se pudo eliminar (Posiblemente tiene historial médico).');
      }
    }
  };

  const handleEdit = (p) => {
    setForm(p);
    setIsEditing(true);
    // Scrollear arriba para ver el form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewProfile = async (patient) => {
    setSelectedPatient(patient);
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_URL}/patients/${patient.id}/history`);
      setHistory(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Filtrado
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.rut.includes(search)
  );

  return (
    <div className="p-8 relative">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-2">Gestión de Pacientes</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULARIO DE CREACIÓN/EDICIÓN */}
        <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
          <h3 className="font-bold mb-4 text-gray-700">
            {isEditing ? 'Editar Paciente' : 'Registrar Nuevo Paciente'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input placeholder="RUT (Ej: 12.345.678-9)" className="w-full p-2 border rounded" value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} required />
            <input placeholder="Nombre Completo" className="w-full p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            <input placeholder="Email" type="email" className="w-full p-2 border rounded" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            <input placeholder="Teléfono" className="w-full p-2 border rounded" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} />
            
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 font-bold">
                {isEditing ? 'Actualizar' : 'Registrar'}
              </button>
              {isEditing && (
                <button type="button" onClick={() => { setIsEditing(false); setForm({ name: '', rut: '', email: '', phone: '' }); }} className="bg-gray-400 text-white p-2 rounded">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* LISTA Y BUSCADOR */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <input 
              type="text" 
              placeholder="🔍 Buscar por nombre o RUT..." 
              className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="p-4">Paciente</th>
                    <th className="p-4 hidden sm:table-cell">Contacto</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map(p => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <p className="font-bold text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{p.rut}</p>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <p className="text-sm">{p.email}</p>
                        <p className="text-sm text-gray-500">{p.phone}</p>
                      </td>
                      <td className="p-4 flex justify-end gap-2">
                        <button onClick={() => handleViewProfile(p)} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm hover:bg-indigo-200 font-medium">
                          👁️ Perfil
                        </button>
                        <button onClick={() => handleEdit(p)} className="text-blue-600 hover:bg-blue-50 p-2 rounded">✏️</button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:bg-red-50 p-2 rounded">🗑️</button>
                      </td>
                    </tr>
                  ))}
                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-gray-400">
                        No se encontraron pacientes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE PERFIL / HISTORIAL */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 text-white p-6 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold">{selectedPatient.name}</h3>
                <p className="opacity-80 font-mono text-sm">RUT: {selectedPatient.rut}</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-white hover:text-gray-300 text-2xl">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6 bg-white p-4 rounded-lg border">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Email</label>
                  <p className="text-gray-800">{selectedPatient.email}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Teléfono</label>
                  <p className="text-gray-800">{selectedPatient.phone || '-'}</p>
                </div>
              </div>

              <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">Historial de Citas</h4>
              
              {loadingHistory ? (
                <p className="text-center text-gray-500 py-4">Cargando historial...</p>
              ) : history.length === 0 ? (
                <p className="text-center text-gray-400 py-4 italic">No hay citas registradas.</p>
              ) : (
                <div className="space-y-3">
                  {history.map(cita => (
                    <div key={cita.id} className="bg-white p-3 rounded border-l-4 border-blue-500 shadow-sm">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-800">{cita.service.name}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {new Date(cita.startTime).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1 text-sm text-gray-600">
                        <span>{new Date(cita.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span>Prof: {cita.professional.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-100 text-right">
              <button onClick={() => setSelectedPatient(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-medium">
                Cerrar Perfil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}