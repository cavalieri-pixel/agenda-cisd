import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

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

// --- MODULO 1: PROFESIONALES ---
export function ProfessionalsView() {
  const [pros, setPros] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', color: '#3788d8', phone: '' });
  const fileInputRef = useRef(null);

  useEffect(() => { load(); }, []);
  const load = async () => { const res = await axios.get(`${API_URL}/professionals`); setPros(res.data); };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.id) await axios.post(`${API_URL}/professionals`, form);
      else await axios.put(`${API_URL}/professionals/${form.id}`, form);
      setForm({ name: '', email: '', password: '', color: '#3788d8', phone: '' }); load(); alert('Guardado');
    } catch { alert('Error'); }
  };
  const handleDelete = async (id) => { if(window.confirm('¿Borrar?')) { await axios.delete(`${API_URL}/professionals/${id}`); load(); } };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try { await axios.post(`${API_URL}/professionals/import`, { data: parseCSV(evt.target.result) }); load(); alert('Importado'); } catch { alert('Error import'); }
    };
    reader.readAsText(file); e.target.value='';
  };

  return (
    <div className="p-8">
      <div className="flex justify-between mb-6 border-b pb-2"><h2 className="text-2xl font-bold">Profesionales</h2><div className="flex gap-2"><button onClick={()=>window.open(`${API_URL}/professionals/export`)} className="bg-green-600 text-white px-3 py-1 rounded">⬇ CSV</button><button onClick={()=>fileInputRef.current.click()} className="bg-orange-500 text-white px-3 py-1 rounded">⬆ CSV</button><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv"/></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow h-fit space-y-3">
            <input placeholder="Nombre" className="w-full p-2 border rounded" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
            <input placeholder="Email" className="w-full p-2 border rounded" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
            <input placeholder="Password" type="password" className="w-full p-2 border rounded" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
            <div className="flex items-center gap-2"><span>Color:</span><input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} className="h-8 flex-1"/></div>
            <button className="w-full bg-blue-600 text-white p-2 rounded">Guardar</button>
        </form>
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-4">{pros.map(p=>(<div key={p.id} className="bg-white p-4 rounded shadow border flex justify-between items-center"><div className="w-2 h-full mr-2" style={{backgroundColor:p.color}}></div><div><p className="font-bold">{p.name}</p><p className="text-sm">{p.email}</p></div><div className="flex gap-2"><button onClick={()=>setForm(p)}>✏️</button><button onClick={()=>handleDelete(p.id)}>🗑️</button></div></div>))}</div>
      </div>
    </div>
  );
}

// --- MODULO 2: ESPECIALIDADES ---
export function ServicesView() {
  const [servs, setServs] = useState([]);
  const [form, setForm] = useState({ name: '', code: '', durationMin: 30, price: 0, isTelemed: false });
  const fileInputRef = useRef(null);

  useEffect(() => { load(); }, []);
  const load = async () => { const res = await axios.get(`${API_URL}/services`); setServs(res.data); };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try { if(!form.id) await axios.post(`${API_URL}/services`, form); else await axios.put(`${API_URL}/services/${form.id}`, form); setForm({name:'',code:'',durationMin:30,price:0,isTelemed:false}); load(); } catch { alert('Error'); }
  };
  const handleDelete = async (id) => { if(window.confirm('¿Borrar?')) { await axios.delete(`${API_URL}/services/${id}`); load(); } };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => { try { await axios.post(`${API_URL}/services/import`, { data: parseCSV(evt.target.result) }); load(); alert('Importado'); } catch { alert('Error import'); } };
    reader.readAsText(file); e.target.value='';
  };

  return (
    <div className="p-8">
      <div className="flex justify-between mb-6 border-b pb-2"><h2 className="text-2xl font-bold">Especialidades</h2><div className="flex gap-2"><button onClick={()=>window.open(`${API_URL}/services/export`)} className="bg-green-600 text-white px-3 py-1 rounded">⬇ CSV</button><button onClick={()=>fileInputRef.current.click()} className="bg-orange-500 text-white px-3 py-1 rounded">⬆ CSV</button><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".csv"/></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow h-fit space-y-3">
            <input placeholder="Nombre" className="w-full p-2 border rounded" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
            <input placeholder="Código" className="w-full p-2 border rounded" value={form.code} onChange={e=>setForm({...form,code:e.target.value})} required/>
            <div className="grid grid-cols-2 gap-2"><input type="number" placeholder="Min" className="p-2 border rounded" value={form.durationMin} onChange={e=>setForm({...form,durationMin:e.target.value})}/><input type="number" placeholder="Precio" className="p-2 border rounded" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isTelemed} onChange={e=>setForm({...form,isTelemed:e.target.checked})}/> Telemedicina</label>
            <button className="w-full bg-indigo-600 text-white p-2 rounded">Guardar</button>
        </form>
        <div className="lg:col-span-2"><div className="bg-white rounded shadow overflow-hidden"><table className="w-full text-left"><thead className="bg-gray-100 border-b"><tr><th className="p-3">Nombre</th><th className="p-3">Código</th><th className="p-3">Acción</th></tr></thead><tbody>{servs.map(s=>(<tr key={s.id} className="border-b"><td className="p-3">{s.name}</td><td className="p-3">{s.code}</td><td className="p-3 flex gap-2"><button onClick={()=>setForm(s)}>✏️</button><button onClick={()=>handleDelete(s.id)}>🗑️</button></td></tr>))}</tbody></table></div></div>
      </div>
    </div>
  );
}

// --- MODULO 3: HORARIOS ---
export function ScheduleView() {
    const [pros, setPros] = useState([]); const [sel, setSel] = useState(''); const [sch, setSch] = useState([]);
    const [d, setD] = useState(1); const [s, setS] = useState('09:00'); const [e, setE] = useState('13:00');
    useEffect(()=>{ axios.get(`${API_URL}/professionals`).then(r=>{setPros(r.data); if(r.data.length) setSel(r.data[0].id)}); },[]);
    useEffect(()=>{ if(sel) axios.get(`${API_URL}/availability/${sel}`).then(r=>setSch(r.data)); },[sel]);
    const save = async () => { try { await axios.post(`${API_URL}/availability`, { professionalId: sel, schedules: sch }); alert('Guardado'); } catch { alert('Error'); } };
    const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    return (
        <div className="p-8"><h2 className="text-2xl font-bold mb-6">Horarios</h2>
             <select className="mb-6 p-2 border rounded" value={sel} onChange={ev=>setSel(ev.target.value)}>{pros.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
             <div className="grid md:grid-cols-2 gap-8"><div className="bg-white p-6 rounded shadow space-y-4"><select className="w-full p-2 border rounded" value={d} onChange={ev=>setD(ev.target.value)}>{days.map((x,i)=><option key={i} value={i}>{x}</option>)}</select><div className="flex gap-2"><input type="time" className="w-full p-2 border" value={s} onChange={ev=>setS(ev.target.value)}/><input type="time" className="w-full p-2 border" value={e} onChange={ev=>setE(ev.target.value)}/></div><button onClick={()=>setSch([...sch,{dayOfWeek:parseInt(d),startTime:s,endTime:e}])} className="w-full bg-blue-100 text-blue-700 p-2 rounded">+ Agregar</button></div>
             <div className="bg-white p-6 rounded shadow"><ul>{sch.map((x,i)=>(<li key={i} className="flex justify-between p-2 border-b"><span>{days[x.dayOfWeek]} {x.startTime}-{x.endTime}</span><button onClick={()=>{const n=[...sch];n.splice(i,1);setSch(n)}} className="text-red-500">×</button></li>))}</ul><button onClick={save} className="w-full mt-4 bg-green-600 text-white p-2 rounded">Guardar Cambios</button></div></div>
        </div>
    );
}

// --- MODULO 4: PACIENTES (NUEVO CON HISTORIAL DE NOTAS) ---
export function PatientsView() {
  const [pats, setPats] = useState([]); const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name:'', rut:'', email:'', phone:'' }); const [isEdit, setIsEdit] = useState(false);
  const [selPat, setSelPat] = useState(null); const [hist, setHist] = useState([]);
  
  useEffect(() => { load(); }, []);
  const load = async () => { const res = await axios.get(`${API_URL}/patients`); setPats(res.data); };
  
  const submit = async (e) => {
    e.preventDefault();
    try { if(isEdit) await axios.put(`${API_URL}/patients/${form.id}`, form); else await axios.post(`${API_URL}/patients`, form); setForm({name:'',rut:'',email:'',phone:''}); setIsEdit(false); load(); alert('OK'); } catch (err) { alert(err.response?.data?.error || 'Error'); }
  };
  const del = async (id) => { if(window.confirm('¿Borrar?')) { try { await axios.delete(`${API_URL}/patients/${id}`); load(); } catch { alert('No se puede borrar (tiene historial)'); } } };
  const viewProfile = async (p) => { setSelPat(p); setHist([]); try { const res = await axios.get(`${API_URL}/patients/${p.id}/history`); setHist(res.data); } catch {} };

  const filtered = pats.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.rut.includes(search));

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 border-b pb-2">Pacientes</h2>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded shadow h-fit">
          <h3 className="font-bold mb-4">{isEdit?'Editar':'Nuevo'}</h3>
          <form onSubmit={submit} className="space-y-3">
            <input placeholder="RUT" className="w-full p-2 border rounded" value={form.rut} onChange={e=>setForm({...form,rut:e.target.value})} required/>
            <input placeholder="Nombre" className="w-full p-2 border rounded" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
            <input placeholder="Email" type="email" className="w-full p-2 border rounded" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
            <input placeholder="Teléfono" className="w-full p-2 border rounded" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
            <div className="flex gap-2"><button className="flex-1 bg-blue-600 text-white p-2 rounded">Guardar</button>{isEdit&&<button type="button" onClick={()=>{setIsEdit(false);setForm({name:'',rut:'',email:'',phone:''})}} className="bg-gray-400 text-white p-2 rounded">Cancelar</button>}</div>
          </form>
        </div>
        <div className="lg:col-span-2">
          <input placeholder="🔍 Buscar..." className="w-full p-2 border rounded mb-4" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="bg-white rounded shadow overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="w-full text-left"><thead className="bg-gray-50 sticky top-0"><tr><th className="p-3">Paciente</th><th className="p-3">Contacto</th><th className="p-3 text-right">Acciones</th></tr></thead>
              <tbody>{filtered.map(p=>(<tr key={p.id} className="border-b"><td className="p-3 font-bold">{p.name}<br/><span className="text-xs font-normal text-gray-500">{p.rut}</span></td><td className="p-3 text-sm">{p.email}<br/>{p.phone}</td><td className="p-3 flex justify-end gap-2"><button onClick={()=>viewProfile(p)} className="bg-indigo-100 text-indigo-700 px-2 rounded text-sm">👁️</button><button onClick={()=>{setForm(p);setIsEdit(true)}} className="text-blue-600">✏️</button><button onClick={()=>del(p.id)} className="text-red-600">🗑️</button></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      </div>
      {selPat && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded shadow-2xl flex flex-col max-h-[80vh]">
            <div className="bg-slate-800 text-white p-4 flex justify-between"><div><h3 className="text-xl font-bold">{selPat.name}</h3><p className="text-sm">{selPat.rut}</p></div><button onClick={()=>setSelPat(null)}>✕</button></div>
            <div className="p-6 overflow-y-auto flex-1">
              <h4 className="font-bold border-b pb-2 mb-3">Historial Clínico</h4>
              {hist.length===0?<p className="text-gray-400 text-center">Sin historial.</p>:hist.map(c=>(
                <div key={c.id} className="bg-white p-3 rounded border-l-4 border-blue-500 shadow-sm mb-3">
                    <div className="flex justify-between font-bold text-gray-800">
                        <span>{c.service.name}</span>
                        <span className="text-xs font-normal text-gray-500">{new Date(c.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">Prof: {c.professional.name}</div>
                    
                    {/* AQUI MOSTRAMOS LA NOTA */}
                    {c.clinicalNote ? (
                        <div className="bg-yellow-50 p-2 rounded text-sm text-gray-800 border border-yellow-100 mt-1">
                            <span className="font-bold text-xs uppercase text-yellow-700 block mb-1">Evolución:</span>
                            {c.clinicalNote}
                        </div>
                    ) : <span className="text-xs text-gray-400 italic">Sin notas.</span>}
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-gray-100 text-right"><button onClick={()=>setSelPat(null)} className="px-4 py-2 bg-gray-300 rounded">Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}