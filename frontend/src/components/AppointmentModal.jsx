import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

// --- UTILIDAD: Formatear RUT automáticamente ---
const formatRut = (rut) => {
  // 1. Limpiar: dejar solo números y k
  const clean = rut.replace(/[^0-9kK]/g, "");
  // 2. Si es muy corto, devolver limpio
  if (clean.length <= 1) return clean;
  // 3. Separar cuerpo y dígito verificador
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  // 4. Formatear con puntos
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
};

// --- UTILIDAD: Formatear Fecha para Input (YYYY-MM-DDTHH:mm) ---
const toInputDate = (dateObj) => {
  if (!dateObj) return '';
  // Truco para ajustar a hora local sin líos de zona horaria
  const offset = dateObj.getTimezoneOffset() * 60000;
  const localDate = new Date(dateObj.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

export default function AppointmentModal({ isOpen, onClose, professionalId, startTime, onSuccess }) {
  const [activeTab, setActiveTab] = useState('patient'); 
  
  // ESTADOS PACIENTE
  const [services, setServices] = useState([]);
  const [rut, setRut] = useState('');
  const [patientData, setPatientData] = useState({ name: '', email: '', phone: '' });
  const [serviceCode, setServiceCode] = useState('');
  
  // ESTADOS BLOQUEO
  const [blockTitle, setBlockTitle] = useState('Bloqueo Administrativo');
  const [blockStartTime, setBlockStartTime] = useState(''); // Nuevo: Inicio editable
  const [blockEndTime, setBlockEndTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      // 1. Cargar Servicios
      axios.get(`${API_URL}/services`).then(res => {
        setServices(res.data);
        if (res.data.length > 0) setServiceCode(res.data[0].code);
      });

      // 2. Configurar Horas Iniciales (Inicio y Fin)
      if (startTime) {
        const startObj = new Date(startTime);
        const endObj = new Date(startTime);
        endObj.setHours(endObj.getHours() + 1); // Por defecto 1 hora después

        setBlockStartTime(toInputDate(startObj));
        setBlockEndTime(toInputDate(endObj));
      }
    }
  }, [isOpen, startTime]);

  // Manejador inteligente de RUT
  const handleRutChange = (e) => {
    const raw = e.target.value;
    const formatted = formatRut(raw);
    setRut(formatted);
  };

  const handleSearch = async () => {
    if (rut.length < 8) return alert("Ingrese un RUT válido");
    try {
      const res = await axios.get(`${API_URL}/patients/search/${rut}`);
      setPatientData(res.data);
    } catch { 
      alert('Paciente no encontrado (se creará uno nuevo al agendar)'); 
      // No limpiamos los datos para permitir que los llenen manual
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'patient') {
        // CREAR CITA PACIENTE
        await axios.post(`${API_URL}/appointments`, {
          type: 'APPOINTMENT',
          professionalId,
          serviceCode,
          startTime, // Para paciente mantenemos la hora del click original (o podrías hacerla editable también)
          rut, ...patientData
        });
      } else {
        // CREAR BLOQUEO
        // Validamos que el fin sea después del inicio
        if (new Date(blockEndTime) <= new Date(blockStartTime)) {
          return alert("La hora de término debe ser posterior al inicio.");
        }

        await axios.post(`${API_URL}/appointments`, {
          type: 'BLOCK',
          professionalId,
          startTime: new Date(blockStartTime), // Usamos la hora editable
          endTime: new Date(blockEndTime),
          title: blockTitle
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
        
        {/* TABS */}
        <div className="flex mb-4 border-b">
          <button className={`flex-1 pb-2 font-bold ${activeTab === 'patient' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-400'}`} onClick={() => setActiveTab('patient')}>Agendar Paciente</button>
          <button className={`flex-1 pb-2 font-bold ${activeTab === 'block' ? 'text-red-500 border-b-2 border-red-500' : 'text-gray-400'}`} onClick={() => setActiveTab('block')}>Bloquear Horario</button>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* MODO PACIENTE */}
          {activeTab === 'patient' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500">RUT Paciente</label>
                <div className="flex gap-2">
                  <input 
                    className="border p-2 rounded w-full font-mono" 
                    value={rut} 
                    onChange={handleRutChange} // Usamos el nuevo manejador
                    placeholder="12.345.678-9" 
                    maxLength={12}
                    required 
                  />
                  <button type="button" onClick={handleSearch} className="bg-blue-100 text-blue-600 px-3 rounded hover:bg-blue-200">🔍</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="border p-2 rounded" placeholder="Nombre" value={patientData.name} onChange={e => setPatientData({...patientData, name: e.target.value})} required />
                <input className="border p-2 rounded" placeholder="Email" value={patientData.email} onChange={e => setPatientData({...patientData, email: e.target.value})} required />
                <input className="border p-2 rounded" placeholder="Teléfono" value={patientData.phone} onChange={e => setPatientData({...patientData, phone: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Servicio</label>
                <select className="border p-2 rounded w-full" value={serviceCode} onChange={e => setServiceCode(e.target.value)}>
                  {services.map(s => <option key={s.code} value={s.code}>{s.name} (${s.price})</option>)}
                </select>
              </div>
              <p className="text-sm text-gray-500 mt-2">Inicio: {new Date(startTime).toLocaleString()}</p>
            </div>
          )}

          {/* MODO BLOQUEO */}
          {activeTab === 'block' && (
            <div className="space-y-4 bg-red-50 p-4 rounded-lg border border-red-100">
              <p className="text-sm text-red-800">Esta acción impedirá que los pacientes reserven en este rango.</p>
              
              <div>
                <label className="text-xs font-bold text-gray-600">Motivo del Bloqueo</label>
                <input 
                  className="border p-2 rounded w-full" 
                  value={blockTitle} 
                  onChange={e => setBlockTitle(e.target.value)} 
                  placeholder="Ej: Almuerzo, Congreso..." 
                />
              </div>

              {/* AHORA SON EDITABLES AMBOS CAMPOS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600">Bloquear Desde</label>
                  <input 
                    type="datetime-local" 
                    className="border p-2 rounded w-full bg-white" 
                    value={blockStartTime} 
                    onChange={e => setBlockStartTime(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Bloquear Hasta</label>
                  <input 
                    type="datetime-local" 
                    className="border p-2 rounded w-full bg-white" 
                    value={blockEndTime} 
                    onChange={e => setBlockEndTime(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className={`flex-1 py-2 text-white rounded font-bold ${activeTab === 'patient' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-red-500 hover:bg-red-600'}`}>{activeTab === 'patient' ? 'Agendar Cita' : 'Confirmar Bloqueo'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}