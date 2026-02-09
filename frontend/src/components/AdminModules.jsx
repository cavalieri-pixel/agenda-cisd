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

const parseCSV = (text) => {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]?.trim());
    return obj;
  });
};

// =========================================================
// 1. VISTA DE TRATAMIENTOS (SERVICIOS)
// =========================================================
export function ServicesView() {
  const [services, setServices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

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
    } catch { alert("Error. Verifique código único."); }
  };

  const handleEdit = (service) => { setEditingService(service); setFormData(service); setIsModalOpen(true); };
  const handleDelete = async (id) => { if (confirm('¿Eliminar?')) { try { await axios.delete(`${API_URL}/services/${id}`); loadServices(); } catch { alert("Tiene citas asociadas."); } } };

  // CSV Handlers
  const handleExport = () => {
    axios.get(`${API_URL}/services/export`).then(res => downloadCSV(res.data, 'servicios.csv'));
  };
  
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = parseCSV(evt.target.result);
      // Mapeo simple para asegurar tipos
      const formatted = data.map(d => ({
        ...d,
        price: parseInt(d.price) || 0,
        durationMin: parseInt(d.durationMin) || 30,
        isTelemed: d.isTelemed === 'true'
      }));
      await axios.post(`${API_URL}/services/import`, { data: formatted });
      alert('Importación completada');
      loadServices();
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tratamientos y Servicios</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700">Exportar CSV</button>
          <label className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 cursor-pointer">
            Importar CSV
            <input type="file" className="hidden" accept=".csv" onChange={handleImport} />
          </label>
          <button onClick={() => { setEditingService(null); setFormData({ category: '', specialty: '', name: '', code: '', price: 0, discountValue: 0, description: '', durationMin: 30, isTelemed: false }); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold">+ Nuevo</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-gray-600">Código</th>
              <th className="p-4 text-gray-600">Nombre</th>
              <th className="p-4 text-gray-600">Cat/Esp</th>
              <th className="p-4 text-gray-600">Precio</th>
              <th className="p-4 text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.map(s => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-mono text-sm text-gray-500">{s.code}</td>
                <td className="p-4 font-bold text-gray-800">{s.name}</td>
                <td className="p-4 text-sm"><span className="block font-bold text-teal-700">{s.specialty}</span><span className="text-xs text-gray-500">{s.category}</span></td>
                <td className="p-4 text-gray-700">${s.price.toLocaleString('es-CL')}</td>
                <td className="p-4">
                  <button onClick={() => handleEdit(s)} className="text-blue-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => handleDelete(s.id)} className="text-red-600 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-2xl h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingService ? 'Editar' : 'Nuevo'} Tratamiento</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-1"><label className="block text-xs font-bold mb-1">Categoría</label><input required className="w-full p-2 border rounded" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} /></div>
              <div className="col-span-1"><label className="block text-xs font-bold mb-1">Especialidad</label><input required className="w-full p-2 border rounded" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} /></div>
              <div className="col-span-2"><label className="block text-xs font-bold mb-1">Nombre</label><input required className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="col-span-1"><label className="block text-xs font-bold mb-1">Código</label><input required className="w-full p-2 border rounded" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
              <div className="col-span-1"><label className="block text-xs font-bold mb-1">Duración (min)</label><input type="number" className="w-full p-2 border rounded" value={formData.durationMin} onChange={e => setFormData({...formData, durationMin: e.target.value})} /></div>
              <div className="col-span-1"><label className="block text-xs font-bold mb-1">Precio ($)</label><input type="number" required className="w-full p-2 border rounded" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div>
              <div className="col-span-1"><label className="block text-xs font-bold text-red-600 mb-1">Descuento ($)</label><input type="number" className="w-full p-2 border rounded bg-red-50" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} /></div>
              <div className="col-span-2"><label className="block text-xs font-bold mb-1">Descripción</label><textarea className="w-full p-2 border rounded h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea></div>
              <div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={formData.isTelemed} onChange={e => setFormData({...formData, isTelemed: e.target.checked})} /><span className="text-sm">¿Es Telemedicina?</span></div>
              <div className="col-span-2 flex gap-3 mt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border rounded">Cancelar</button><button type="submit" className="flex-1 py-3 bg-teal-600 text-white rounded font-bold">Guardar</button></div>
            </form>
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
  
  const [form, setForm] = useState({ 
    rut: '', name: '', email: '', phone: '', 
    address: '', prevision: 'Fonasa', birthDate: '' 
  });

  useEffect(() => { load(); }, []);
  const load = () => axios.get(`${API_URL}/patients`).then(r => setPatients(r.data));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Ajustar fecha para que no dé error si está vacía
      const payload = { ...form, birthDate: form.birthDate ? new Date(form.birthDate) : null };
      if (editing) {
        await axios.put(`${API_URL}/patients/${editing.id}`, payload);
      } else {
        await axios.post(`${API_URL}/patients`, payload);
      }
      setIsModalOpen(false); setEditing(null); setForm({ rut: '', name: '', email: '', phone: '', address: '', prevision: 'Fonasa', birthDate: '' });
      load();
    } catch { alert('Error al guardar. El RUT podría estar duplicado.'); }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar paciente? Si tiene citas no se podrá borrar.')) {
      try { await axios.delete(`${API_URL}/patients/${id}`); load(); }
      catch { alert('Error: El paciente tiene historial clínico.'); }
    }
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
            <tr>
              <th className="p-4 text-gray-600">Nombre</th>
              <th className="p-4 text-gray-600">RUT</th>
              <th className="p-4 text-gray-600">Contacto</th>
              <th className="p-4 text-gray-600">Previsión</th>
              <th className="p-4 text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-bold">{p.name}</td>
                <td className="p-4 text-sm">{p.rut}</td>
                <td className="p-4 text-sm">
                  <div className="text-gray-800">{p.email}</div>
                  <div className="text-gray-500">{p.phone}</div>
                </td>
                <td className="p-4 text-sm text-teal-700 font-bold">{p.prevision}</td>
                <td className="p-4">
                  <button onClick={() => { setEditing(p); setForm({ ...p, birthDate: p.birthDate ? p.birthDate.split('T')[0] : '' }); setIsModalOpen(true); }} className="text-blue-600 hover:underline mr-3">Editar</button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">Eliminar</button>
                </td>
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
              <div className="col-span-2"><label className="text-xs font-bold">Nombre Completo</label><input required className="w-full p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="text-xs font-bold">RUT</label><input required className="w-full p-2 border rounded" value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} /></div>
              <div><label className="text-xs font-bold">Previsión</label><select className="w-full p-2 border rounded" value={form.prevision} onChange={e => setForm({...form, prevision: e.target.value})}><option>Fonasa</option><option>Isapre</option><option>Particular</option></select></div>
              <div><label className="text-xs font-bold">Email</label><input type="email" className="w-full p-2 border rounded" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><label className="text-xs font-bold">Teléfono</label><input className="w-full p-2 border rounded" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="text-xs font-bold">Nacimiento</label><input type="date" className="w-full p-2 border rounded" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})} /></div>
              <div className="col-span-2"><label className="text-xs font-bold">Dirección</label><input className="w-full p-2 border rounded" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
              <div className="col-span-2 flex gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-teal-600 text-white rounded font-bold">Guardar</button>
              </div>
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
  const [form, setForm] = useState({ name: '', email: '', password: '', color: '#3788d8', phone: '' });

  useEffect(() => { load(); }, []);
  const load = () => axios.get(`${API_URL}/professionals`).then(r => setProfs(r.data));
  const save = async () => { await axios.post(`${API_URL}/professionals`, form); load(); setForm({name:'',email:'',password:'',color:'#3788d8',phone:''}); };
  const del = async (id) => { if(confirm('¿Borrar?')) { await axios.delete(`${API_URL}/professionals/${id}`); load(); } };

  // CSV
  const handleExport = () => axios.get(`${API_URL}/professionals/export`).then(res => downloadCSV(res.data, 'profesionales.csv'));
  const handleImport = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = parseCSV(evt.target.result);
      await axios.post(`${API_URL}/professionals/import`, { data });
      load(); alert('Importado');
    };
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
        <input type="color" className="h-10 w-10" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} />
        <button onClick={save} className="bg-blue-600 text-white px-4 rounded">Crear</button>
      </div>
      <div className="grid gap-2">
        {profs.map(p => (
          <div key={p.id} className="bg-white p-4 rounded shadow flex justify-between">
            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full" style={{background:p.color}}></div><span>{p.name} ({p.email})</span></div>
            <button onClick={() => del(p.id)} className="text-red-500">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// 4. VISTA DE HORARIOS (CONFIGURACIÓN)
// =========================================================
export function ScheduleView() {
  const [profs, setProfs] = useState([]);
  const [selectedPro, setSelectedPro] = useState(null);
  const [schedules, setSchedules] = useState([]);
  
  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  useEffect(() => {
    axios.get(`${API_URL}/professionals`).then(r => {
      setProfs(r.data);
      if (r.data.length > 0) setSelectedPro(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedPro) loadSchedule();
  }, [selectedPro]);

  const loadSchedule = () => {
    axios.get(`${API_URL}/availability/${selectedPro}`).then(r => setSchedules(r.data));
  };

  const addSlot = (dayIndex) => {
    // 0=Lunes en Admin
    const newSlot = { dayOfWeek: dayIndex, startTime: '09:00', endTime: '18:00', professionalId: parseInt(selectedPro) };
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
    await axios.post(`${API_URL}/availability`, { professionalId: selectedPro, schedules });
    alert('Horario guardado correctamente');
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Configurar Horarios</h2>
      
      <div className="mb-6">
        <label className="font-bold mr-2">Seleccionar Profesional:</label>
        <select className="p-2 border rounded" value={selectedPro || ''} onChange={e => setSelectedPro(e.target.value)}>
          {profs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DAYS.map((day, idx) => {
          const daySlots = schedules.filter(s => s.dayOfWeek === idx);
          return (
            <div key={idx} className="bg-white p-4 rounded shadow border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-teal-700">{day}</h3>
                <button onClick={() => addSlot(idx)} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200">+ Agregar</button>
              </div>
              
              {daySlots.length === 0 && <p className="text-sm text-gray-400 italic">No atiende</p>}

              {schedules.map((s, i) => {
                if (s.dayOfWeek !== idx) return null;
                return (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input type="time" className="border rounded p-1 text-sm" value={s.startTime} onChange={e => updateSlot(i, 'startTime', e.target.value)} />
                    <span className="text-gray-400">-</span>
                    <input type="time" className="border rounded p-1 text-sm" value={s.endTime} onChange={e => updateSlot(i, 'endTime', e.target.value)} />
                    <button onClick={() => removeSlot(i)} className="text-red-500 hover:text-red-700">×</button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={save} className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition">
          💾 Guardar Cambios
        </button>
      </div>
    </div>
  );
}