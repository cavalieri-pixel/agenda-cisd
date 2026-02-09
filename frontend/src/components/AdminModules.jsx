import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

// --- UTILIDADES CSV ---
const downloadCSV = (data, filename) => {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// Parser inteligente que respeta comillas (ej: "descripcion con, comas")
const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // Leer cabeceras y normalizar a minúsculas
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase()); 

  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = [];
    let current = '';
    let inQuotes = false;

    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim()); // Último valor

    // Convertir array row a objeto usando headers
    const obj = {};
    headers.forEach((h, index) => {
      let val = row[index] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      val = val.replace(/""/g, '"');
      obj[h] = val;
    });
    result.push(obj);
  }
  return result;
};

// =========================================================
// 1. VISTA DE TRATAMIENTOS (JERÁRQUICA: CAT -> ESP -> SERV)
// =========================================================
export function ServicesView() {
  const [services, setServices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  // ESTADOS DE CARGA
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    category: '', specialty: '', name: '', code: '', 
    price: 0, discountValue: 0, description: '', 
    durationMin: 30, isTelemed: false
  });

  useEffect(() => { loadServices(); }, []);

  const loadServices = () => { axios.get(`${API_URL}/services`).then(res => setServices(res.data)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingService) { await axios.put(`${API_URL}/services/${editingService.id}`, formData); } 
      else { await axios.post(`${API_URL}/services`, formData); }
      setIsModalOpen(false); setEditingService(null);
      setFormData({ category: '', specialty: '', name: '', code: '', price: 0, discountValue: 0, description: '', durationMin: 30, isTelemed: false });
      loadServices();
    } catch { alert("Error al guardar."); }
  };

  const handleEdit = (service) => { setEditingService(service); setFormData(service); setIsModalOpen(true); };
  const handleDelete = async (id) => { if (confirm('¿Eliminar?')) { try { await axios.delete(`${API_URL}/services/${id}`); loadServices(); } catch { alert("Tiene citas asociadas."); } } };
  const handleExport = () => { axios.get(`${API_URL}/services/export`).then(res => downloadCSV(res.data, 'tratamientos_cisd.csv')); };
  
  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsUploading(true); setUploadProgress(10);
        const rawData = parseCSV(evt.target.result);
        const formatted = rawData.map(d => {
          const cleanPrice = (val) => parseInt((val || '').replace(/[^0-9]/g, '')) || 0;
          return {
            category: d.categoria || d.category || 'General',
            specialty: d.especialidad || d.specialty || 'General',
            name: d.nombre || d.name || '',
            code: d.codigo || d.code || `GEN-${Math.random().toString(36).substr(2, 5)}`,
            price: cleanPrice(d.precio || d.price),
            discountValue: cleanPrice(d.valor_descuento || d.discountValue),
            description: d.descripcion || d.description || '',
            isTelemed: (d.nombre || '').toLowerCase().includes('online'),
            durationMin: 30 
          };
        });
        const res = await axios.post(`${API_URL}/services/import`, { data: formatted }, {
          onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total) > 90 ? 90 : Math.round((p.loaded * 100) / p.total))
        });
        setUploadProgress(100); await new Promise(r => setTimeout(r, 500));
        alert(`✅ Importación completada.\n${res.data.message}`); loadServices();
      } catch (err) { alert('❌ Error CSV.'); } finally { setIsUploading(false); setUploadProgress(0); e.target.value = null; }
    };
    reader.readAsText(file);
  };

  // LÓGICA DE AGRUPACIÓN (Categoría -> Especialidad -> Servicios)
  const groupedServices = services.reduce((acc, service) => {
    const cat = service.category || 'Sin Categoría';
    const spec = service.specialty || 'General';
    
    if (!acc[cat]) acc[cat] = {};
    if (!acc[cat][spec]) acc[cat][spec] = [];
    
    acc[cat][spec].push(service);
    return acc;
  }, {});

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tratamientos y Servicios</h2>
          <p className="text-sm text-gray-500">{services.length} servicios cargados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded text-sm hover:bg-green-100 flex items-center gap-2 font-bold">⬇ CSV</button>
          <label className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded text-sm hover:bg-blue-100 cursor-pointer flex items-center gap-2 font-bold">⬆ CSV<input type="file" className="hidden" accept=".csv" onChange={handleImport} /></label>
          <button onClick={() => { setEditingService(null); setFormData({ category: '', specialty: '', name: '', code: '', price: 0, discountValue: 0, description: '', durationMin: 30, isTelemed: false }); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 shadow-md flex items-center gap-2">+ Nuevo</button>
        </div>
      </div>

      {/* VISTA JERÁRQUICA */}
      <div className="space-y-8">
        {Object.entries(groupedServices).map(([category, specialties]) => (
          <div key={category} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            
            {/* NIVEL 1: CATEGORÍA */}
            <div className="bg-teal-700 p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white tracking-wide uppercase flex items-center gap-2">📂 {category}</h3>
              <span className="bg-teal-800 text-teal-100 text-xs px-2 py-1 rounded-full font-bold">{Object.values(specialties).flat().length} servicios</span>
            </div>

            {/* CONTENEDOR DE ESPECIALIDADES */}
            <div className="p-4 space-y-6 bg-gray-50">
              {Object.entries(specialties).map(([specialty, items]) => (
                <div key={specialty} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  
                  {/* NIVEL 2: ESPECIALIDAD */}
                  <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-700 flex items-center gap-2">🔹 {specialty}</h4>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{items.length} items</span>
                  </div>

                  {/* NIVEL 3: TABLA DE SERVICIOS */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-white text-gray-400 text-xs uppercase border-b">
                        <tr>
                          <th className="px-4 py-2 font-semibold">Código</th>
                          <th className="px-4 py-2 font-semibold">Nombre del Tratamiento</th>
                          <th className="px-4 py-2 font-semibold text-right">Precio</th>
                          <th className="px-4 py-2 font-semibold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map(s => (
                          <tr key={s.id} className="hover:bg-teal-50 transition-colors group">
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.code}</td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-gray-800 text-sm">{s.name}</p>
                              {s.description && <p className="text-xs text-gray-400 italic mt-1 line-clamp-1">{s.description}</p>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-bold text-gray-700">${s.price.toLocaleString('es-CL')}</div>
                              {s.discountValue > 0 && <div className="text-xs text-red-500 font-bold">Desc: -${s.discountValue.toLocaleString('es-CL')}</div>}
                            </td>
                            <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEdit(s)} className="text-blue-600 hover:text-blue-800 text-xs font-bold mr-3 uppercase">Editar</button>
                              <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Borrar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {services.length === 0 && (
          <div className="text-center py-20 text-gray-400 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
            <p className="text-xl">No hay servicios cargados.</p>
            <p className="text-sm">Usa el botón "Importar CSV" o crea uno nuevo.</p>
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-2xl h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 text-teal-800">{editingService ? 'Editar' : 'Nuevo'} Tratamiento</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-1"><label className="block text-xs font-bold mb-1 text-gray-600">Categoría</label><input required className="w-full p-2 border rounded bg-gray-50" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ej: Fonoaudiología" /></div>
              <div className="col-span-1"><label className="block text-xs font-bold mb-1 text-gray-600">Especialidad</label><input required className="w-full p-2 border rounded bg-gray-50" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} placeholder="Ej: Adulto" /></div>
              <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-gray-600">Nombre</label><input required className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="col-span-1"><label className="block text-xs font-bold mb-1 text-gray-600">Código</label><input required className="w-full p-2 border rounded font-mono" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
              <div className="col-span-1"><label className="block text-xs font-bold mb-1 text-gray-600">Duración (min)</label><input type="number" className="w-full p-2 border rounded" value={formData.durationMin} onChange={e => setFormData({...formData, durationMin: e.target.value})} /></div>
              <div className="col-span-1"><label className="block text-xs font-bold mb-1 text-gray-600">Precio ($)</label><input type="number" required className="w-full p-2 border rounded font-bold text-gray-700" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
              <div className="col-span-1"><label className="block text-xs font-bold text-red-600 mb-1">Descuento ($)</label><input type="number" className="w-full p-2 border rounded bg-red-50 text-red-600" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} /></div>
              <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-gray-600">Descripción</label><textarea className="w-full p-2 border rounded h-24 text-sm" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea></div>
              <div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={formData.isTelemed} onChange={e => setFormData({...formData, isTelemed: e.target.checked})} /><span className="text-sm font-bold text-gray-600">¿Es Telemedicina?</span></div>
              <div className="col-span-2 flex gap-3 mt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border rounded text-gray-500 hover:bg-gray-50 font-bold">Cancelar</button><button type="submit" className="flex-1 py-3 bg-teal-600 text-white rounded font-bold hover:bg-teal-700">Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PROGRESO */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-sm w-full">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Subiendo Archivo...</h3>
            <p className="text-gray-500 text-sm mb-4 text-center">Organizando categorías...</p>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden"><div className="bg-teal-600 h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div></div>
            <span className="text-teal-700 font-bold mt-2">{uploadProgress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// 2. VISTA DE PACIENTES (COMPLETA)
// =========================================================
export function PatientsView() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  
  const [form, setForm] = useState({ rut: '', name: '', email: '', phone: '', address: '', prevision: 'Fonasa', birthDate: '' });

  useEffect(() => { load(); }, []);
  const load = () => axios.get(`${API_URL}/patients`).then(r => setPatients(r.data));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, birthDate: form.birthDate ? new Date(form.birthDate) : null };
      if (editing) { await axios.put(`${API_URL}/patients/${editing.id}`, payload); } 
      else { await axios.post(`${API_URL}/patients`, payload); }
      setIsModalOpen(false); setEditing(null); setForm({ rut: '', name: '', email: '', phone: '', address: '', prevision: 'Fonasa', birthDate: '' });
      load();
    } catch { alert('Error al guardar.'); }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar paciente?')) { try { await axios.delete(`${API_URL}/patients/${id}`); load(); } catch { alert('Tiene historial clínico.'); } }
  };

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.rut.includes(search));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Pacientes</h2>
        <button onClick={() => { setEditing(null); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold">+ Nuevo Paciente</button>
      </div>
      <input placeholder="Buscar por nombre o RUT..." className="w-full p-3 border rounded-lg mb-4" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr><th className="p-4">Nombre</th><th className="p-4">RUT</th><th className="p-4">Contacto</th><th className="p-4">Previsión</th><th className="p-4">Acciones</th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-bold">{p.name}</td><td className="p-4 text-sm">{p.rut}</td>
                <td className="p-4 text-sm"><div>{p.email}</div><div className="text-gray-500">{p.phone}</div></td>
                <td className="p-4 text-sm font-bold text-teal-700">{p.prevision}</td>
                <td className="p-4"><button onClick={() => { setEditing(p); setForm({ ...p, birthDate: p.birthDate ? p.birthDate.split('T')[0] : '' }); setIsModalOpen(true); }} className="text-blue-600 mr-3">Editar</button><button onClick={() => handleDelete(p.id)} className="text-red-600">Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editing ? 'Editar' : 'Nuevo'} Paciente</h3>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-xs font-bold">Nombre</label><input required className="w-full p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="text-xs font-bold">RUT</label><input required className="w-full p-2 border rounded" value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} /></div>
              <div><label className="text-xs font-bold">Previsión</label><select className="w-full p-2 border rounded" value={form.prevision} onChange={e => setForm({...form, prevision: e.target.value})}><option>Fonasa</option><option>Isapre</option><option>Particular</option></select></div>
              <div><label className="text-xs font-bold">Email</label><input type="email" className="w-full p-2 border rounded" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><label className="text-xs font-bold">Teléfono</label><input className="w-full p-2 border rounded" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="text-xs font-bold">Nacimiento</label><input type="date" className="w-full p-2 border rounded" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} /></div>
              <div className="col-span-2"><label className="text-xs font-bold">Dirección</label><input className="w-full p-2 border rounded" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div className="col-span-2 flex gap-3 mt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded">Cancelar</button><button type="submit" className="flex-1 py-2 bg-teal-600 text-white rounded font-bold">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// 3. VISTA DE PROFESIONALES (COMPLETA)
// =========================================================
export function ProfessionalsView() {
  const [profs, setProfs] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', color: '#3788d8', phone: '', slotInterval: 30 });

  useEffect(() => { load(); }, []);
  const load = () => axios.get(`${API_URL}/professionals`).then(r => setProfs(r.data));
  const save = async () => { await axios.post(`${API_URL}/professionals`, form); load(); setForm({name:'',email:'',password:'',color:'#3788d8',phone:'', slotInterval:30}); };
  const del = async (id) => { if(confirm('¿Borrar?')) { await axios.delete(`${API_URL}/professionals/${id}`); load(); } };

  const handleExport = () => axios.get(`${API_URL}/professionals/export`).then(res => downloadCSV(res.data, 'profesionales.csv'));
  const handleImport = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => { const data = parseCSV(evt.target.result); await axios.post(`${API_URL}/professionals/import`, { data }); load(); alert('Importado'); };
    reader.readAsText(file);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Profesionales</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-green-600 text-white px-3 py-2 rounded text-sm">Exportar CSV</button>
          <label className="bg-blue-600 text-white px-3 py-2 rounded text-sm cursor-pointer">Importar CSV<input type="file" className="hidden" accept=".csv" onChange={handleImport} /></label>
        </div>
      </div>
      <div className="flex gap-2 mb-6 bg-white p-4 rounded shadow">
        <input placeholder="Nombre" className="border p-2 rounded" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input placeholder="Email" className="border p-2 rounded" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input placeholder="Pass" type="password" className="border p-2 rounded" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
        <input placeholder="Intervalo" type="number" className="border p-2 rounded w-20" value={form.slotInterval} onChange={e=>setForm({...form,slotInterval:e.target.value})} />
        <input type="color" className="h-10 w-10" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} />
        <button onClick={save} className="bg-blue-600 text-white px-4 rounded">Crear</button>
      </div>
      <div className="grid gap-2">
        {profs.map(p => (
          <div key={p.id} className="bg-white p-4 rounded shadow flex justify-between">
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full" style={{background:p.color}}></div><span>{p.name} (Int: {p.slotInterval}m)</span></div>
            <button onClick={() => del(p.id)} className="text-red-500">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// 4. VISTA DE HORARIOS (COMPLETA)
// =========================================================
export function ScheduleView() {
  const [profs, setProfs] = useState([]);
  const [selectedPro, setSelectedPro] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [slotInterval, setSlotInterval] = useState(30);
  
  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  useEffect(() => {
    axios.get(`${API_URL}/professionals`).then(r => {
      setProfs(r.data);
      if (r.data.length > 0) {
        setSelectedPro(r.data[0].id);
        setSlotInterval(r.data[0].slotInterval || 30);
      }
    });
  }, []);

  useEffect(() => { 
    if (selectedPro) {
      loadSchedule();
      const currentPro = profs.find(p => p.id === parseInt(selectedPro));
      if (currentPro) setSlotInterval(currentPro.slotInterval || 30);
    }
  }, [selectedPro]);

  const loadSchedule = () => { axios.get(`${API_URL}/availability/${selectedPro}`).then(r => setSchedules(r.data)); };

  const addSlot = (dayIndex) => {
    const newSlot = { dayOfWeek: dayIndex, startTime: '09:00', endTime: '13:00', professionalId: parseInt(selectedPro) };
    setSchedules([...schedules, newSlot]);
  };

  const removeSlot = (index) => {
    const news = [...schedules];
    news.splice(index, 1);
    setSchedules(news);
  };

  const updateSlot = (index, field, value) => {
    const news = [...schedules];
    news[index][field] = value;
    setSchedules(news);
  };

  const save = async () => {
    try {
      await axios.post(`${API_URL}/availability`, { professionalId: selectedPro, schedules });
      const currentPro = profs.find(p => p.id === parseInt(selectedPro));
      await axios.put(`${API_URL}/professionals/${selectedPro}`, { ...currentPro, slotInterval: parseInt(slotInterval) });
      alert('✅ Configuración guardada con éxito');
    } catch (error) { alert('Error al guardar'); }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">Configurar Horarios</h2><p className="text-sm text-gray-500">Define turnos y pausas.</p></div>
        <div className="flex flex-col md:flex-row gap-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <label className="font-bold text-gray-600 text-sm">Profesional:</label>
            <select className="p-2 border rounded-lg bg-gray-50 font-bold text-teal-700 outline-none" value={selectedPro || ''} onChange={e => setSelectedPro(e.target.value)}>{profs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          </div>
          <div className="flex items-center gap-2 border-l pl-4">
            <label className="font-bold text-gray-600 text-sm">Intervalo (min):</label>
            <input type="number" className="p-2 border rounded-lg w-20 text-center font-bold bg-gray-50" value={slotInterval} onChange={e => setSlotInterval(e.target.value)} min="5" max="60" step="5" />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100 flex items-start gap-3">
        <span className="text-2xl">💡</span>
        <div><p className="font-bold text-blue-800 text-sm">¿Cómo bloquear horarios de almuerzo?</p><p className="text-sm text-blue-600">Crea <strong>dos bloques</strong> separados. Ej: [09:00 - 13:00] y [14:00 - 18:00].</p></div>
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden divide-y divide-gray-100">
        {DAYS.map((day, idx) => {
          const daySlots = schedules.map((s, i) => ({ ...s, originalIndex: i })).filter(s => s.dayOfWeek === idx);
          return (
            <div key={idx} className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 hover:bg-gray-50 transition">
              <div className="md:col-span-1 flex flex-col justify-center border-r border-transparent md:border-gray-100 pr-4">
                <h3 className="text-lg font-bold text-teal-800 mb-1">{day}</h3>
                <button onClick={() => addSlot(idx)} className="text-sm text-white bg-teal-500 px-3 py-1 rounded hover:bg-teal-600 font-bold shadow-sm w-max transition">+ Agregar Turno</button>
              </div>
              <div className="md:col-span-3 space-y-3">
                {daySlots.length === 0 && <p className="text-gray-400 italic py-4">No atiende este día (Día Libre)</p>}
                {daySlots.map((slot) => (
                  <div key={slot.originalIndex} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full max-w-lg group">
                    <div className="flex items-center gap-2 flex-1"><span className="text-xs font-bold text-gray-400 uppercase">Inicio</span><input type="time" className="border rounded p-1 text-lg font-bold text-gray-700 flex-1 focus:ring-2 focus:ring-teal-200 outline-none" value={slot.startTime} onChange={e => updateSlot(slot.originalIndex, 'startTime', e.target.value)} /></div>
                    <span className="text-gray-300 font-bold">➝</span>
                    <div className="flex items-center gap-2 flex-1"><span className="text-xs font-bold text-gray-400 uppercase">Fin</span><input type="time" className="border rounded p-1 text-lg font-bold text-gray-700 flex-1 focus:ring-2 focus:ring-teal-200 outline-none" value={slot.endTime} onChange={e => updateSlot(slot.originalIndex, 'endTime', e.target.value)} /></div>
                    <button onClick={() => removeSlot(slot.originalIndex)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Eliminar Bloque">✕</button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end sticky bottom-6 z-10">
        <button onClick={save} className="bg-teal-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl hover:bg-teal-700 transition transform hover:scale-105 flex items-center gap-2"><span>💾</span> Guardar Configuración</button>
      </div>
    </div>
  );
}