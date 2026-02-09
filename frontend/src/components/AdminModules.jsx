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
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase()); 
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { row.push(current.trim()); current = ''; }
      else current += char;
    }
    row.push(current.trim());
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
// 1. VISTA DE TRATAMIENTOS (Con Barra de Carga)
// =========================================================
export function ServicesView() {
  const [services, setServices] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  // ESTADOS DE CARGA NUEVOS
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({ category: '', specialty: '', name: '', code: '', price: 0, discountValue: 0, description: '', durationMin: 30, isTelemed: false });

  useEffect(() => { loadServices(); }, []);
  const loadServices = () => { axios.get(`${API_URL}/services`).then(res => setServices(res.data)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingService) await axios.put(`${API_URL}/services/${editingService.id}`, formData);
      else await axios.post(`${API_URL}/services`, formData);
      setIsModalOpen(false); setEditingService(null);
      setFormData({ category: '', specialty: '', name: '', code: '', price: 0, discountValue: 0, description: '', durationMin: 30, isTelemed: false });
      loadServices();
    } catch { alert("Error al guardar."); }
  };

  const handleEdit = (service) => { setEditingService(service); setFormData(service); setIsModalOpen(true); };
  const handleDelete = async (id) => { if (confirm('¿Eliminar?')) { try { await axios.delete(`${API_URL}/services/${id}`); loadServices(); } catch { alert("Error: Tiene citas asociadas."); } } };

  const handleExport = () => { axios.get(`${API_URL}/services/export`).then(res => downloadCSV(res.data, 'tratamientos_cisd.csv')); };
  
  const handleImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        setIsUploading(true); // ACTIVAR BARRA
        setUploadProgress(10); // Inicio simulado

        const rawData = parseCSV(evt.target.result);
        const formatted = rawData.map(d => {
          const cleanPrice = (val) => parseInt((val || '').replace(/[^0-9]/g, '')) || 0;
          return {
            category: d.categoria || d.category || 'General',
            specialty: d.especialidad || d.specialty || '',
            name: d.nombre || d.name || '',
            code: d.codigo || d.code || `GEN-${Math.random().toString(36).substr(2, 5)}`,
            price: cleanPrice(d.precio || d.price),
            discountValue: cleanPrice(d.valor_descuento || d.discountValue),
            description: d.descripcion || d.description || '',
            isTelemed: (d.nombre || '').toLowerCase().includes('online'),
            durationMin: 30 
          };
        });

        // Enviar al backend con monitoreo de progreso
        const res = await axios.post(`${API_URL}/services/import`, { data: formatted }, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Limitamos al 90% para dejar el 100% para cuando el server responda OK
            setUploadProgress(percentCompleted > 90 ? 90 : percentCompleted);
          }
        });

        setUploadProgress(100); // Completado
        await new Promise(r => setTimeout(r, 500)); // Pequeña pausa para ver el 100%

        alert(`✅ Importación completada.\n${res.data.message}`);
        loadServices();
      } catch (err) { 
        console.error(err);
        alert('❌ Error al procesar el archivo CSV.'); 
      } finally {
        setIsUploading(false); // APAGAR BARRA
        setUploadProgress(0);
        e.target.value = null; // Limpiar input
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Tratamientos y Servicios</h2><div className="flex gap-2"><button onClick={handleExport} className="bg-green-600 text-white px-3 py-2 rounded text-sm">⬇ Exportar CSV</button><label className="bg-blue-600 text-white px-3 py-2 rounded text-sm cursor-pointer">⬆ Importar CSV<input type="file" className="hidden" accept=".csv" onChange={handleImport} /></label><button onClick={() => { setEditingService(null); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold">+ Nuevo</button></div></div>
      
      {/* TABLA DE DATOS */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-left"><thead className="bg-gray-50 border-b"><tr><th className="p-4">Código</th><th className="p-4">Nombre</th><th className="p-4">Cat/Esp</th><th className="p-4">Precio</th><th className="p-4">Acciones</th></tr></thead><tbody>{services.map(s => (<tr key={s.id} className="border-b hover:bg-gray-50"><td className="p-4 font-mono text-sm text-gray-500">{s.code}</td><td className="p-4 font-bold text-gray-800">{s.name}</td><td className="p-4 text-sm"><span className="block font-bold text-teal-700">{s.specialty}</span><span className="text-xs text-gray-500">{s.category}</span></td><td className="p-4 text-gray-700">${s.price.toLocaleString('es-CL')}</td><td className="p-4"><button onClick={() => handleEdit(s)} className="text-blue-600 mr-3">Editar</button><button onClick={() => handleDelete(s.id)} className="text-red-600">Eliminar</button></td></tr>))}</tbody></table>
      </div>

      {/* MODAL DE EDICIÓN */}
      {isModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-2xl h-[90vh] overflow-y-auto"><h3 className="text-xl font-bold mb-4">{editingService ? 'Editar' : 'Nuevo'} Tratamiento</h3><form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4"><div className="col-span-1"><label className="text-xs font-bold">Categoría</label><input required className="w-full p-2 border rounded" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} /></div><div className="col-span-1"><label className="text-xs font-bold">Especialidad</label><input required className="w-full p-2 border rounded" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} /></div><div className="col-span-2"><label className="text-xs font-bold">Nombre</label><input required className="w-full p-2 border rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div><div className="col-span-1"><label className="text-xs font-bold">Código</label><input required className="w-full p-2 border rounded" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} /></div><div className="col-span-1"><label className="text-xs font-bold">Duración (min)</label><input type="number" className="w-full p-2 border rounded" value={formData.durationMin} onChange={e => setFormData({...formData, durationMin: e.target.value})} /></div><div className="col-span-1"><label className="text-xs font-bold">Precio ($)</label><input type="number" required className="w-full p-2 border rounded" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} /></div><div className="col-span-1"><label className="text-xs font-bold text-red-600">Descuento ($)</label><input type="number" className="w-full p-2 border rounded bg-red-50" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} /></div><div className="col-span-2"><label className="text-xs font-bold">Descripción</label><textarea className="w-full p-2 border rounded h-24" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea></div><div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={formData.isTelemed} onChange={e => setFormData({...formData, isTelemed: e.target.checked})} /><span className="text-sm">¿Es Telemedicina?</span></div><div className="col-span-2 flex gap-3 mt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border rounded">Cancelar</button><button type="submit" className="flex-1 py-3 bg-teal-600 text-white rounded font-bold">Guardar</button></div></form></div></div>)}

      {/* --- NUEVO: MODAL DE PROGRESO DE CARGA --- */}
      {isUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-sm w-full">
            <div className="w-16 h-16 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Subiendo Archivo...</h3>
            <p className="text-gray-500 text-sm mb-4 text-center">Procesando registros en la base de datos.<br/>Por favor no cierres esta ventana.</p>
            
            {/* Barra Visual */}
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-teal-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="text-teal-700 font-bold mt-2">{uploadProgress}%</span>
          </div>
        </div>
      )}

    </div>
  );
}

// ... Resto de los componentes (PatientsView, ProfessionalsView, ScheduleView) ...
// (Pégalos aquí abajo tal cual los tenías, no cambian)
export function PatientsView() { const [patients, setPatients] = useState([]); const [search, setSearch] = useState(''); const [isModalOpen, setIsModalOpen] = useState(false); const [editing, setEditing] = useState(null); const [form, setForm] = useState({ rut: '', name: '', email: '', phone: '', address: '', prevision: 'Fonasa', birthDate: '' }); useEffect(() => { axios.get(`${API_URL}/patients`).then(r => setPatients(r.data)); }, []); const handleSave = async (e) => { e.preventDefault(); try { const payload = { ...form, birthDate: form.birthDate ? new Date(form.birthDate) : null }; if (editing) await axios.put(`${API_URL}/patients/${editing.id}`, payload); else await axios.post(`${API_URL}/patients`, payload); setIsModalOpen(false); setEditing(null); setForm({ rut: '', name: '', email: '', phone: '', address: '', prevision: 'Fonasa', birthDate: '' }); axios.get(`${API_URL}/patients`).then(r => setPatients(r.data)); } catch { alert('Error al guardar.'); } }; const handleDelete = async (id) => { if (confirm('¿Eliminar?')) { await axios.delete(`${API_URL}/patients/${id}`); axios.get(`${API_URL}/patients`).then(r => setPatients(r.data)); } }; const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.rut.includes(search)); return (<div className="p-6"><div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-gray-800">Pacientes</h2><button onClick={() => { setEditing(null); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold">+ Nuevo</button></div><input placeholder="Buscar..." className="w-full p-3 border rounded-lg mb-4" value={search} onChange={e => setSearch(e.target.value)} /><div className="bg-white rounded-xl shadow border overflow-hidden"><table className="w-full text-left"><thead className="bg-gray-50 border-b"><tr><th className="p-4">Nombre</th><th className="p-4">RUT</th><th className="p-4">Email</th><th className="p-4">Acciones</th></tr></thead><tbody>{filtered.map(p => (<tr key={p.id} className="border-b"><td className="p-4">{p.name}</td><td className="p-4">{p.rut}</td><td className="p-4">{p.email}</td><td className="p-4"><button onClick={() => { setEditing(p); setForm({ ...p, birthDate: p.birthDate ? p.birthDate.split('T')[0] : '' }); setIsModalOpen(true); }} className="text-blue-600 mr-2">Editar</button><button onClick={() => handleDelete(p.id)} className="text-red-600">Eliminar</button></td></tr>))}</tbody></table></div>{isModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl"><h3 className="text-xl font-bold mb-4">Paciente</h3><form onSubmit={handleSave} className="grid grid-cols-2 gap-4"><input required className="border p-2 rounded" placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /><input required className="border p-2 rounded" placeholder="RUT" value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} /><input className="border p-2 rounded" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /><input className="border p-2 rounded" placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /><div className="col-span-2 flex gap-2"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded">Cancelar</button><button type="submit" className="flex-1 py-2 bg-teal-600 text-white rounded">Guardar</button></div></form></div></div>)}</div>); }
export function ProfessionalsView() { const [profs, setProfs] = useState([]); const [form, setForm] = useState({ name: '', email: '', password: '', color: '#3788d8', phone: '', slotInterval: 30 }); useEffect(() => { load(); }, []); const load = () => axios.get(`${API_URL}/professionals`).then(r => setProfs(r.data)); const save = async () => { await axios.post(`${API_URL}/professionals`, form); load(); }; const del = async (id) => { if(confirm('¿Borrar?')) { await axios.delete(`${API_URL}/professionals/${id}`); load(); } }; const handleImport = (e) => { const file = e.target.files[0]; if(!file)return; const reader = new FileReader(); reader.onload = async (evt) => { const data = parseCSV(evt.target.result); await axios.post(`${API_URL}/professionals/import`, { data }); load(); }; reader.readAsText(file); }; return (<div className="p-6"><div className="flex justify-between mb-6"><h2 className="text-2xl font-bold">Profesionales</h2><label className="bg-blue-600 text-white px-3 py-2 rounded cursor-pointer">Importar CSV<input type="file" className="hidden" onChange={handleImport}/></label></div><div className="flex gap-2 mb-4"><input placeholder="Nombre" className="border p-2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /><input placeholder="Email" className="border p-2" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /><button onClick={save} className="bg-blue-600 text-white px-4 rounded">Crear</button></div>{profs.map(p => (<div key={p.id} className="bg-white p-4 mb-2 shadow flex justify-between"><span>{p.name}</span><button onClick={() => del(p.id)} className="text-red-500">x</button></div>))}</div>); }
export function ScheduleView() { const [profs, setProfs] = useState([]); const [selectedPro, setSelectedPro] = useState(null); const [schedules, setSchedules] = useState([]); const [slotInterval, setSlotInterval] = useState(30); const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']; useEffect(() => { axios.get(`${API_URL}/professionals`).then(r => { setProfs(r.data); if (r.data.length > 0) { setSelectedPro(r.data[0].id); setSlotInterval(r.data[0].slotInterval || 30); } }); }, []); useEffect(() => { if (selectedPro) { axios.get(`${API_URL}/availability/${selectedPro}`).then(r => setSchedules(r.data)); const currentPro = profs.find(p => p.id === parseInt(selectedPro)); if(currentPro) setSlotInterval(currentPro.slotInterval||30); } }, [selectedPro]); const save = async () => { await axios.post(`${API_URL}/availability`, { professionalId: selectedPro, schedules }); await axios.put(`${API_URL}/professionals/${selectedPro}`, { ...profs.find(p=>p.id==selectedPro), slotInterval: parseInt(slotInterval) }); alert('Guardado'); }; const addSlot = (d) => setSchedules([...schedules, { dayOfWeek: d, startTime: '09:00', endTime: '13:00', professionalId: parseInt(selectedPro) }]); const removeSlot = (i) => { const n = [...schedules]; n.splice(i,1); setSchedules(n); }; const updateSlot = (i,f,v) => { const n = [...schedules]; n[i][f]=v; setSchedules(n); }; return (<div className="p-6"><div className="flex justify-between mb-4"><h2 className="text-2xl font-bold">Horarios</h2><div><label>Profesional: </label><select className="border p-2" value={selectedPro||''} onChange={e=>setSelectedPro(e.target.value)}>{profs.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div><label>Intervalo: </label><input type="number" className="border p-2 w-16" value={slotInterval} onChange={e=>setSlotInterval(e.target.value)}/></div></div><div className="grid grid-cols-1 md:grid-cols-4 gap-4">{DAYS.map((d,idx)=>{ const slots=schedules.map((s,i)=>({...s,idx})).filter(s=>s.dayOfWeek===idx); return (<div key={idx} className="bg-white p-4 shadow"><div className="flex justify-between font-bold mb-2"><span>{d}</span><button onClick={()=>addSlot(idx)} className="text-blue-600 text-sm">+ Add</button></div>{slots.map(s=>(<div key={s.idx} className="flex gap-1 mb-1"><input type="time" className="border w-20" value={s.startTime} onChange={e=>updateSlot(s.idx,'startTime',e.target.value)}/><span>-</span><input type="time" className="border w-20" value={s.endTime} onChange={e=>updateSlot(s.idx,'endTime',e.target.value)}/><button onClick={()=>removeSlot(s.idx)} className="text-red-500">x</button></div>))}</div>) })}</div><button onClick={save} className="mt-4 bg-teal-600 text-white px-6 py-2 rounded font-bold">Guardar</button></div>); }