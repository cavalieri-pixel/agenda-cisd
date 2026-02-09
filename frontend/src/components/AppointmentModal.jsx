import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';
const formatRut = (rut) => { const clean = rut.replace(/[^0-9kK]/g, ""); if (clean.length <= 1) return clean; const body = clean.slice(0, -1); const dv = clean.slice(-1).toUpperCase(); return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv; };
const toInputDate = (dateObj) => { if (!dateObj) return ''; const offset = dateObj.getTimezoneOffset() * 60000; return new Date(dateObj.getTime() - offset).toISOString().slice(0, 16); };

export default function AppointmentModal({ isOpen, onClose, professionalId, startTime, onSuccess }) {
  const [activeTab, setActiveTab] = useState('patient'); 
  const [services, setServices] = useState([]);
  const [rut, setRut] = useState('');
  const [patientData, setPatientData] = useState({ name: '', email: '', phone: '' });
  const [serviceId, setServiceId] = useState(''); // ID
  const [blockTitle, setBlockTitle] = useState('Bloqueo Administrativo');
  const [blockStartTime, setBlockStartTime] = useState(''); 
  const [blockEndTime, setBlockEndTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      axios.get(`${API_URL}/services`).then(res => {
        setServices(res.data);
        if (res.data.length > 0) setServiceId(res.data[0].id);
      });
      if (startTime) {
        const startObj = new Date(startTime); const endObj = new Date(startTime); endObj.setHours(endObj.getHours() + 1); 
        setBlockStartTime(toInputDate(startObj)); setBlockEndTime(toInputDate(endObj));
      }
    }
  }, [isOpen, startTime]);

  const handleSearch = async () => {
    if (rut.length < 8) return alert("RUT inválido");
    try { const res = await axios.get(`${API_URL}/patients/search/${rut}`); setPatientData(res.data); } catch { alert('Paciente nuevo'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'patient') {
        await axios.post(`${API_URL}/appointments`, { type: 'APPOINTMENT', professionalId, serviceId: parseInt(serviceId), startTime, rut, ...patientData });
      } else {
        if (new Date(blockEndTime) <= new Date(blockStartTime)) return alert("Error hora fin");
        await axios.post(`${API_URL}/appointments`, { type: 'BLOCK', professionalId, startTime: new Date(blockStartTime), endTime: new Date(blockEndTime), title: blockTitle });
      }
      onSuccess(); onClose();
    } catch { alert('Error al guardar'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex mb-4 border-b">
          <button className={`flex-1 pb-2 font-bold ${activeTab === 'patient' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-400'}`} onClick={() => setActiveTab('patient')}>Agendar Paciente</button>
          <button className={`flex-1 pb-2 font-bold ${activeTab === 'block' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`} onClick={() => setActiveTab('block')}>Bloquear</button>
        </div>
        <form onSubmit={handleSubmit}>
          {activeTab === 'patient' && (
            <div className="space-y-3">
              <div className="flex gap-2"><input className="border p-2 w-full" value={rut} onChange={e=>setRut(formatRut(e.target.value))} placeholder="RUT" /><button type="button" onClick={handleSearch} className="bg-blue-100 text-blue-600 px-3 rounded">🔍</button></div>
              <input className="border p-2 w-full" placeholder="Nombre" value={patientData.name} onChange={e=>setPatientData({...patientData,name:e.target.value})} />
              <input className="border p-2 w-full" placeholder="Email" value={patientData.email} onChange={e=>setPatientData({...patientData,email:e.target.value})} />
              <select className="border p-2 w-full" value={serviceId} onChange={e=>setServiceId(e.target.value)}>{services.map(s=><option key={s.id} value={s.id}>{s.name} (${s.price})</option>)}</select>
            </div>
          )}
          {activeTab === 'block' && (
            <div className="space-y-3 bg-red-50 p-4 rounded border-red-100">
              <input className="border p-2 w-full" value={blockTitle} onChange={e=>setBlockTitle(e.target.value)} placeholder="Motivo" />
              <input type="datetime-local" className="border p-2 w-full" value={blockStartTime} onChange={e=>setBlockStartTime(e.target.value)} />
              <input type="datetime-local" className="border p-2 w-full" value={blockEndTime} onChange={e=>setBlockEndTime(e.target.value)} />
            </div>
          )}
          <div className="flex gap-2 mt-4"><button type="button" onClick={onClose} className="flex-1 py-2 border rounded">Cancelar</button><button type="submit" className={`flex-1 py-2 text-white rounded font-bold ${activeTab==='patient'?'bg-teal-600':'bg-red-500'}`}>Guardar</button></div>
        </form>
      </div>
    </div>
  );
}