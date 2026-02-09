import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

// --- UTILIDADES ---
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
  // --- ESTADOS ---
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // DATOS API
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [proSlots, setProSlots] = useState({});

  // DATOS FORMULARIO
  const [rut, setRut] = useState('');
  const [patientData, setPatientData] = useState({ name: '', surname: '', email: '', phone: '', address: '', prevision: 'Fonasa', birthDate: '' });
  
  // SELECCIONES DE NAVEGACIÓN
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);

  // --- CARGA INICIAL ---
  useEffect(() => { 
    axios.get(`${API_URL}/services`).then(res => setServices(res.data)); 
    axios.get(`${API_URL}/professionals`).then(res => setProfessionals(res.data)); 
    setCalendarDays(getNextDays(14)); 
  }, []);

  // --- LÓGICA DE AGRUPACIÓN (Categoría -> Especialidad -> Servicios) ---
  const groupedServices = useMemo(() => {
    return services.reduce((acc, service) => {
      const cat = service.category || 'General';
      const spec = service.specialty || 'General';
      
      if (!acc[cat]) acc[cat] = {};
      if (!acc[cat][spec]) acc[cat][spec] = [];
      
      acc[cat][spec].push(service);
      return acc;
    }, {});
  }, [services]);

  // --- HANDLERS ---
  const handleNextStep1 = async () => {
    if (rut.length < 8) return alert("Por favor ingrese un RUT válido");
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
        setStep(3); // Salta directo a Categorías si ya existe
      } 
    } catch { 
      setStep(2); // Si no existe, va al formulario de registro
    } finally { 
      setLoading(false); 
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Cargar disponibilidad cuando llegamos al paso del calendario (Paso 6)
  useEffect(() => { 
    if (step === 6 && selectedService) loadAllSlots(selectedDate); 
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
      <header className="bg-white shadow p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="font-bold text-teal-800 text-lg">Agenda CISD</div>
        {step > 1 && (
          <button onClick={handleBack} className="text-sm text-gray-500 hover:text-teal-600 font-bold flex items-center gap-1">
            ← Volver
          </button>
        )}
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 min-h-[400px]">
          
          {/* PASO 1: RUT */}
          {step === 1 && (
            <div className="max-w-md mx-auto py-10">
              <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Bienvenido/a</h2>
              <p className="text-center text-gray-500 mb-6">Ingrese su RUT para comenzar la reserva</p>
              <input 
                className="border-2 border-gray-200 p-4 w-full mb-6 rounded-xl text-center text-xl tracking-wider font-mono focus:border-teal-500 outline-none transition" 
                placeholder="12.345.678-9" 
                value={rut} 
                onChange={e=>setRut(formatRut(e.target.value))} 
              />
              <button onClick={handleNextStep1} className="bg-teal-600 text-white w-full py-4 rounded-xl hover:bg-teal-700 font-bold text-lg shadow-lg shadow-teal-200 transition transform hover:scale-[1.02]">
                {loading ? 'Verificando...' : 'CONTINUAR'}
              </button>
            </div>
          )}

          {/* PASO 2: DATOS NUEVO PACIENTE */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold mb-6 border-b pb-4">Datos del Paciente</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className="border p-3 rounded-lg" placeholder="Nombre" value={patientData.name} onChange={e=>setPatientData({...patientData,name:e.target.value})}/>
                <input className="border p-3 rounded-lg" placeholder="Apellido" value={patientData.surname} onChange={e=>setPatientData({...patientData,surname:e.target.value})}/>
                <input className="border p-3 rounded-lg" placeholder="Email" value={patientData.email} onChange={e=>setPatientData({...patientData,email:e.target.value})}/>
                <input className="border p-3 rounded-lg" placeholder="Teléfono (+569...)" value={patientData.phone} onChange={e=>setPatientData({...patientData,phone:e.target.value})}/>
              </div>
              <button onClick={()=>setStep(3)} className="bg-teal-600 text-white w-full py-4 rounded-xl hover:bg-teal-700 font-bold mt-6">GUARDAR DATOS</button>
            </div>
          )}

          {/* PASO 3: SELECCIONAR CATEGORÍA (Nivel 1) */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold mb-6 text-center">¿Qué tipo de atención necesita?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(groupedServices).map(category => (
                  <button 
                    key={category} 
                    onClick={() => { setSelectedCategory(category); setStep(4); }} 
                    className="p-6 border-2 border-gray-100 rounded-xl hover:border-teal-500 hover:bg-teal-50 text-left transition group"
                  >
                    <span className="block text-xl font-bold text-gray-800 group-hover:text-teal-700">{category}</span>
                    <span className="text-sm text-gray-400">Ver especialidades disponibles</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 4: SELECCIONAR ESPECIALIDAD (Nivel 2) */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold mb-2 text-center text-teal-800">{selectedCategory}</h2>
              <p className="text-center text-gray-500 mb-6">Seleccione una especialidad</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(groupedServices[selectedCategory] || {}).map(specialty => (
                  <button 
                    key={specialty} 
                    onClick={() => { setSelectedSpecialty(specialty); setStep(5); }} 
                    className="p-5 border rounded-xl hover:shadow-md hover:border-teal-400 hover:bg-white text-left transition flex justify-between items-center bg-gray-50"
                  >
                    <span className="font-bold text-gray-700">{specialty}</span>
                    <span className="text-gray-400">➝</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 5: SELECCIONAR SERVICIO (Nivel 3) */}
          {step === 5 && (
            <div>
              <h2 className="text-xl font-bold mb-2 text-center text-teal-800">{selectedSpecialty}</h2>
              <p className="text-center text-gray-500 mb-6">Seleccione el tratamiento específico</p>
              
              <div className="space-y-3">
                {(groupedServices[selectedCategory]?.[selectedSpecialty] || []).map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => { setSelectedService(s); setStep(6); }} 
                    className="w-full p-4 border rounded-xl hover:border-teal-500 hover:bg-teal-50 text-left transition flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-bold text-gray-800 group-hover:text-teal-800">{s.name}</div>
                      {s.description && <div className="text-xs text-gray-500 mt-1">{s.description}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-teal-600">${s.price.toLocaleString('es-CL')}</div>
                      {s.discountValue > 0 && <div className="text-xs text-red-400 line-through">Desc. disponible</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 6: CALENDARIO (Horarios) */}
          {step === 6 && (
            <div>
              <h2 className="text-xl font-bold mb-4">Seleccione Horario</h2>
              <div className="flex overflow-x-auto gap-3 mb-8 pb-4 scrollbar-hide">
                {calendarDays.map((d,i)=>(
                  <button 
                    key={i} 
                    onClick={()=>setSelectedDate(d.toISOString().split('T')[0])} 
                    className={`min-w-[80px] p-3 border rounded-xl text-center transition ${selectedDate===d.toISOString().split('T')[0]?'bg-teal-600 text-white shadow-lg scale-105':'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className="block text-2xl font-bold">{getDayNumber(d)}</span>
                    <span className="text-xs uppercase font-bold tracking-wider">{getDayName(d)}</span>
                  </button>
                ))}
              </div>
              
              {loading ? (
                <div className="text-center py-10">
                   <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3"></div>
                   <p className="text-gray-500">Buscando horas disponibles...</p>
                </div>
              ) : (
                professionals.length === 0 || Object.keys(proSlots).every(k => proSlots[k].length === 0) ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">No hay horas disponibles para esta fecha.</p>
                  </div>
                ) : (
                  professionals.map(p => proSlots[p.id]?.length > 0 && (
                    <div key={p.id} className="mb-6 border border-gray-100 p-5 rounded-xl shadow-sm bg-white">
                      <div className="font-bold text-lg mb-4 flex items-center gap-3 border-b pb-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{background: p.color || '#3788d8'}}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-500 font-normal">Profesional disponible</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {proSlots[p.id].map(t => (
                          <button 
                            key={t} 
                            onClick={()=>{setSelectedPro(p);setSelectedTime(t);setStep(7)}} 
                            className="px-2 py-3 border border-teal-100 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-600 hover:text-white transition font-bold text-sm"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )
              )}
            </div>
          )}

          {/* PASO 7: CONFIRMACIÓN Y PAGO */}
          {step === 7 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Resumen de la Reserva</h2>
              
              <div className="bg-gray-50 p-6 rounded-2xl space-y-4 mb-8 border border-gray-200">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500">Tratamiento</span>
                  <span className="font-bold text-gray-900 text-right">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500">Profesional</span>
                  <span className="font-bold text-gray-900">{selectedPro?.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500">Fecha y Hora</span>
                  <span className="font-bold text-teal-700">{selectedDate} — {selectedTime} hrs</span>
                </div>
                 <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-gray-500">Paciente</span>
                  <span className="font-bold text-gray-900">{patientData.name} {patientData.surname}</span>
                </div>
                
                <div className="pt-2 flex justify-between items-center text-xl">
                  <span className="font-bold text-gray-800">Total a Pagar</span>
                  <span className="font-bold text-teal-700">${selectedService?.price.toLocaleString('es-CL')}</span>
                </div>
              </div>

              <button 
                onClick={handleFinalBooking} 
                disabled={loading}
                className="bg-teal-600 text-white w-full py-4 rounded-xl hover:bg-teal-700 font-bold text-lg shadow-xl shadow-teal-100 transition transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : (selectedService?.price > 0 ? 'IR A PAGAR' : 'CONFIRMAR RESERVA')}
              </button>
              
              <p className="text-center text-xs text-gray-400 mt-4">
                Al confirmar, aceptas nuestros términos y condiciones de atención.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}