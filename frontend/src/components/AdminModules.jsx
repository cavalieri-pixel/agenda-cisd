import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

// --- VISTA DE TRATAMIENTOS (SERVICIOS) ---
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tratamientos y Servicios</h2>
        <button onClick={() => { setEditingService(null); setFormData({ category: '', specialty: '', name: '', code: '', price: 0, discountValue: 0, description: '', durationMin: 30, isTelemed: false }); setIsModalOpen(true); }} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold">+ Nuevo</button>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-gray-600">Código</th>
              <th className="p-4 text-gray-600">Nombre</th>
              <th className="p-4 text-gray-600">Categoría</th>
              <th className="p-4 text-gray-600">Precio</th>
              <th className="p-4 text-gray-600">Desc.</th>
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
                <td className="p-4 text-red-500 font-bold">-{s.discountValue.toLocaleString('es-CL')}</td>
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

export function ProfessionalsView() {
  const [profs, setProfs] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', color: '#3788d8', phone: '' });
  useEffect(() => { load(); }, []);
  const load = () => axios.get(`${API_URL}/professionals`).then(r => setProfs(r.data));
  const save = async () => { await axios.post(`${API_URL}/professionals`, form); load(); setForm({name:'',email:'',password:'',color:'#3788d8',phone:''}); };
  const del = async (id) => { if(confirm('Borrar?')) { await axios.delete(`${API_URL}/professionals/${id}`); load(); } };
  return (
    <div className="p-6"><h2 className="text-2xl font-bold mb-4">Profesionales</h2>
      <div className="flex gap-2 mb-6 bg-white p-4 rounded shadow">
        <input placeholder="Nombre" className="border p-2 rounded" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input placeholder="Email" className="border p-2 rounded" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input placeholder="Pass" type="password" className="border p-2 rounded" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} />
        <input type="color" className="h-10 w-10" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} />
        <button onClick={save} className="bg-blue-600 text-white px-4 rounded">Crear</button>
      </div>
      <div className="grid gap-2">{profs.map(p => (<div key={p.id} className="bg-white p-4 rounded shadow flex justify-between"><div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full" style={{background:p.color}}></div><span>{p.name} ({p.email})</span></div><button onClick={() => del(p.id)} className="text-red-500">Eliminar</button></div>))}</div>
    </div>
  );
}
export function PatientsView() { return <div className="p-6"><h2 className="text-2xl font-bold">Pacientes</h2><p>En construcción...</p></div>; }
export function ScheduleView() { return <div className="p-6"><h2 className="text-2xl font-bold">Horarios</h2><p>En construcción...</p></div>; }