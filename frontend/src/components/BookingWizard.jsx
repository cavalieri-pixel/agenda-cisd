import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

const formatRut = (rut) => { 
  const clean = rut.replace(/[^0-9kK]/g, ""); 
  if (clean.length <= 1) return clean; 
  const body = clean.slice(0, -1); 
  const dv = clean.slice(-1).toUpperCase(); 
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv; 
};

const getNextDays = (days = 15) => { 
  const dates = []; 
  const today = new Date(); 
  for (let i = 0; i < days; i++) { 
    const d = new Date(today); 
    d.setDate(today.getDate() + i); 
    dates.push(d); 
  } 
  return dates; 
};

const getDayName = (d) => new Intl.DateTimeFormat('es-CL', { weekday: 'short' }).format(d);
const getDayNumber = (d) => new Intl.DateTimeFormat('es-CL', { day: 'numeric' }).format(d);

export default function BookingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [proSlots, setProSlots] = useState({});
  const [rut, setRut] = useState('');
  const [patientData, setPatientData] = useState({ name: '', surname: '', email: '', phone: '', address: '', prevision: 'Fonasa', birthDate: '' });
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => { 
    axios.get(`${API_URL}/services`).then(res => setServices(res.data)); 
    axios.get(`${API_URL}/professionals`).then(res => setProfessionals(res.data)); 
    setCalendarDays(getNextDays(14)); 
  }, []);

  const handleNextStep1 = async () => {
    setLoading(true);
    try { 
      const res = await axios.get(`${API_URL}/patients/search/${formatRut(rut)}`); 
      if (res.data) { 
        setPatientData({ 
          ...res.data, 
          surname: res.data.name.split(' ').slice(1).join(' '), 
          name: res.data.name.split(' ')[0], 
          birthDate: res.data.birthDate ? res.data.birthDate.split('T')[0] : '' 
        }); 
        setStep(3); 
      } 
    } catch { 
      setStep(2); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    if (step === 4 && selectedService) loadAllSlots(selectedDate); 
  }, [step, selectedDate, selectedService]);

  const loadAllSlots = async (dateStr) => {
    setLoading(true); 
    const newSlots = {};
    const promises = professionals.map(async (pro) => { 
      try { 
        const res = await axios.get(`${API_URL}/public/slots`, { 
          params: { date: dateStr, professionalId: pro.id, duration: selectedService?.durationMin || 30 } 
        }); 
        newSlots[pro.id] = res.data; 
      } catch { 
        newSlots[pro.id] = []; 
      } 
    });
    await Promise.all(promises); 
    setProSlots(newSlots); 
    setLoading(false);
  };

  const handleFinalBooking = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/appointments`, {
        professionalId: selectedPro.id,
        serviceId: selectedService.id, 
        startTime: new Date(`${selectedDate}T${selectedTime}:00`),
        rut: patientData.rut || formatRut(rut),
        name: `${patientData.name} ${patientData.surname}`,
        email: patientData.email,
        phone: patientData.phone,
        address: patientData.address,
        prevision: patientData.prevision,
        birthDate: patientData.birthDate
      });
      if (res.data.paymentLink) window.location.href = res.data.paymentLink;
      else { alert("✅ Reserva Confirmada"); window.location.reload(); }
    } catch { 
      alert("Error al reservar."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-white shadow p-4 flex justify-between">
        <div className="font-bold text-teal-800">Agenda CISD</div>
      </header>
      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded shadow p-6">
          
          {/* PASO 1: RUT */}
          {step===1 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Ingrese su RUT</h2>
              <input className="border p-2 w-full mb-4" placeholder="12.345.678-9" value={rut} onChange={e=>setRut(e.target.value)} />
              <button onClick={handleNextStep1} className="bg-teal-600 text-white w-full py-3 rounded hover:bg-teal-700 font-bold">CONTINUAR</button>
            </div>
          )}

          {/* PASO 2: DATOS NUEVO PACIENTE */}
          {step===2 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Datos Personales</h2>
              <input className="border p-2 w-full mb-2" placeholder="Nombre" value={patientData.name} onChange={e=>setPatientData({...patientData,name:e.target.value})}/>
              <input className="border p-2 w-full mb-2" placeholder="Apellido" value={patientData.surname} onChange={e=>setPatientData({...patientData,surname:e.target.value})}/>
              <input className="border p-2 w-full mb-2" placeholder="Email" value={patientData.email} onChange={e=>setPatientData({...patientData,email:e.target.value})}/>
              <input className="border p-2 w-full mb-2" placeholder="Teléfono" value={patientData.phone} onChange={e=>setPatientData({...patientData,phone:e.target.value})}/>
              <button onClick={()=>setStep(3)} className="bg-teal-600 text-white w-full py-3 rounded hover:bg-teal-700 font-bold">GUARDAR Y CONTINUAR</button>
            </div>
          )}

          {/* PASO 3: SERVICIO */}
          {step===3 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Seleccione Tratamiento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map(s=>(
                  <button key={s.id} onClick={()=>{setSelectedService(s);setStep(4)}} className="p-4 border rounded hover:bg-teal-50 text-center font-bold text-gray-700 transition">
                    {s.name} (${s.price.toLocaleString('es-CL')})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 4: AGENDA */}
          {step===4 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Seleccione Horario</h2>
              <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
                {calendarDays.map((d,i)=>(
                  <button 
                    key={i} 
                    onClick={()=>setSelectedDate(d.toISOString().split('T')[0])} 
                    className={`min-w-[70px] p-2 border rounded-lg text-center ${selectedDate===d.toISOString().split('T')[0]?'bg-teal-600 text-white border-teal-600':'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="block text-xl font-bold">{getDayNumber(d)}</span>
                    <span className="text-xs uppercase">{getDayName(d)}</span>
                  </button>
                ))}
              </div>
              
              {loading ? <div className="text-center py-10">Cargando disponibilidad...</div> : (
                professionals.map(p => proSlots[p.id]?.length > 0 && (
                  <div key={p.id} className="mb-6 border p-4 rounded-xl">
                    <div className="font-bold text-lg mb-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full" style={{background: p.color || '#ccc'}}></div>
                      {p.name}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {proSlots[p.id].map(t => (
                        <button key={t} onClick={()=>{setSelectedPro(p);setSelectedTime(t);setStep(5)}} className="px-4 py-2 border rounded hover:bg-teal-600 hover:text-white transition font-mono">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PASO 5: CONFIRMACIÓN */}
          {step===5 && (
            <div>
              <h2 className="text-xl font-bold mb-4 text-center">Confirmar Reserva</h2>
              <div className="bg-gray-50 p-6 rounded-xl space-y-3 mb-6">
                <p><strong>Tratamiento:</strong> {selectedService?.name}</p>
                <p><strong>Profesional:</strong> {selectedPro?.name}</p>
                <p><strong>Fecha:</strong> {selectedDate} a las {selectedTime}</p>
                <p><strong>Paciente:</strong> {patientData.name} {patientData.surname}</p>
                <p className="text-xl font-bold text-teal-700 mt-4 text-right">Total: ${selectedService?.price.toLocaleString('es-CL')}</p>
              </div>
              <button onClick={handleFinalBooking} className="bg-teal-600 text-white w-full py-4 rounded-xl hover:bg-teal-700 font-bold text-lg">
                {selectedService?.price > 0 ? 'IR A PAGAR' : 'CONFIRMAR RESERVA'}
              </button>
              <button onClick={()=>setStep(4)} className="w-full text-center text-gray-500 mt-4 underline">Volver atrás</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}