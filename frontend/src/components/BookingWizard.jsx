import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

// --- UTILIDAD: VALIDAR RUT CHILENO ---
const validarRut = (rut) => {
  if (!rut || rut.trim().length < 3) return false;
  const cleanRut = rut.replace(/[^0-9kK]/g, "");
  if (cleanRut.length < 2) return false;
  
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();
  
  let suma = 0;
  let multiplo = 2;
  
  for (let i = 1; i <= body.length; i++) {
    const index = multiplo * body.charAt(body.length - i);
    suma = suma + index;
    if (multiplo < 7) { multiplo = multiplo + 1; } else { multiplo = 2; }
  }
  
  const dvEsperado = 11 - (suma % 11);
  const dvFinal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  
  return dv === dvFinal;
};

// --- UTILIDAD: FORMATEAR RUT ---
const formatRut = (rut) => {
  const clean = rut.replace(/[^0-9kK]/g, "");
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
};

export default function BookingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // DATOS SISTEMA
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [proSlots, setProSlots] = useState({}); // Cache de slots { proId: [hours] }

  // DATOS USUARIO
  const [rut, setRut] = useState('');
  const [docType, setDocType] = useState('Carnet de Identidad');
  const [passport, setPassport] = useState('');
  
  const [patientData, setPatientData] = useState({
    name: '', surname: '', email: '', phone: '',
    address: '', prevision: 'Fonasa', birthDate: ''
  });

  // SELECCIÓN CITA
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);

  // CARGA INICIAL
  useEffect(() => {
    axios.get(`${API_URL}/services`).then(res => setServices(res.data));
    axios.get(`${API_URL}/professionals`).then(res => setProfessionals(res.data));
  }, []);

  // --- LOGICA PASO 1: VALIDACION ---
  const handleNextStep1 = () => {
    if (docType === 'Carnet de Identidad') {
      if (!validarRut(rut)) return alert("El RUT ingresado no es válido.");
      setPatientData({ ...patientData, rut: formatRut(rut) });
    } else {
      if (passport.length < 5) return alert("Ingrese un número de pasaporte válido.");
      setPatientData({ ...patientData, rut: passport }); // Usamos campo rut para guardar pasaporte en BD
    }
    setStep(2);
  };

  // --- LOGICA PASO 4: CARGAR BLOQUES DE TODOS LOS MEDICOS ---
  useEffect(() => {
    if (step === 4 && selectedService) {
      // Filtrar profesionales que dan este servicio (En este modelo simple, asumimos todos o filtramos manualmente)
      // Idealmente el backend diría qué prof hace qué servicio. Aquí mostramos todos los disponibles.
      loadAllSlots(selectedDate);
    }
  }, [step, selectedDate, selectedService]);

  const loadAllSlots = async (dateStr) => {
    setLoading(true);
    const newSlots = {};
    
    // Iteramos por los profesionales para buscar sus horas (simulado en frontend para efecto visual)
    const promises = professionals.map(async (pro) => {
      try {
        const res = await axios.get(`${API_URL}/public/slots`, {
          params: { date: dateStr, professionalId: pro.id, duration: selectedService?.durationMin || 30 }
        });
        newSlots[pro.id] = res.data; // Array de horas ['09:00', '09:30']
      } catch (e) {
        newSlots[pro.id] = [];
      }
    });

    await Promise.all(promises);
    setProSlots(newSlots);
    setLoading(false);
  };

  // --- LOGICA PASO 5: PAGO ---
  const handleFinalBooking = async () => {
    setLoading(true);
    try {
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      
      const res = await axios.post(`${API_URL}/appointments`, {
        professionalId: selectedPro.id,
        serviceCode: selectedService.code,
        startTime: new Date(dateTimeString),
        // Datos Paciente Completos
        rut: patientData.rut || rut,
        name: `${patientData.name} ${patientData.surname}`,
        email: patientData.email,
        phone: patientData.phone,
        address: patientData.address,
        prevision: patientData.prevision,
        birthDate: patientData.birthDate
      });

      if (res.data.paymentLink) {
        alert("✅ Redirigiendo al pago...");
        window.location.href = res.data.paymentLink;
      } else {
        alert("✅ Reserva Confirmada");
        window.location.reload();
      }
    } catch (error) {
      alert("Error al reservar. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- HEADER COMPONENT ---
  const Header = () => (
    <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">C</div>
        <span className="font-bold text-teal-800 text-lg">Agenda CISD</span>
      </div>
      <a href="#/admin" className="text-sm text-gray-500 hover:text-teal-600">Acceso Profesional</a>
    </header>
  );

  // --- PROGRESS BAR ---
  const ProgressBar = () => (
    <div className="flex justify-between items-center mb-8 px-2 md:px-10 relative">
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10"></div>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= n ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
          {n}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      <main className="max-w-4xl mx-auto py-8 px-4">
        
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 min-h-[500px]">
          <h2 className="text-2xl font-bold text-teal-800 mb-2 text-center">Reserva de Hora</h2>
          <ProgressBar />

          {/* --- PASO 1: IDENTIFICACIÓN --- */}
          {step === 1 && (
            <div className="max-w-md mx-auto animate-fade-in">
              <h3 className="text-lg font-bold text-teal-700 mb-4 border-b pb-2">1. Identificación del Paciente</h3>
              
              <label className="block text-xs font-bold text-gray-600 mb-1">Documento</label>
              <select className="w-full p-3 border rounded mb-4" value={docType} onChange={e => setDocType(e.target.value)}>
                <option>Carnet de Identidad</option>
                <option>Pasaporte</option>
              </select>

              {docType === 'Carnet de Identidad' ? (
                <>
                  <label className="block text-xs font-bold text-red-600 mb-1">RUT</label>
                  <input 
                    className="w-full p-3 border border-red-200 rounded focus:ring-2 focus:ring-red-200 outline-none"
                    placeholder="12.345.678-9"
                    value={rut}
                    onChange={e => setRut(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Sin puntos ni guión (el sistema lo formatea).</p>
                </>
              ) : (
                <>
                  <label className="block text-xs font-bold text-teal-600 mb-1">Pasaporte</label>
                  <input className="w-full p-3 border rounded" placeholder="Número de Pasaporte" value={passport} onChange={e => setPassport(e.target.value)} />
                </>
              )}

              <button onClick={handleNextStep1} className="w-full mt-6 bg-teal-600 text-white py-3 rounded font-bold hover:bg-teal-700">CONTINUAR</button>
            </div>
          )}

          {/* --- PASO 2: DATOS PERSONALES --- */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <h3 className="text-lg font-bold text-teal-700 mb-4 border-b pb-2">2. Datos Personales</h3>
              <p className="text-sm text-gray-500 mb-4">Complete la ficha del paciente para continuar.</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600">RUT/ID</label>
                  <input className="w-full p-2 border rounded bg-gray-100" value={patientData.rut || rut || passport} disabled />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Fecha Nacimiento</label>
                  <input type="date" className="w-full p-2 border rounded" value={patientData.birthDate} onChange={e => setPatientData({...patientData, birthDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Nombre</label>
                  <input className="w-full p-2 border rounded" value={patientData.name} onChange={e => setPatientData({...patientData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Apellido</label>
                  <input className="w-full p-2 border rounded" value={patientData.surname} onChange={e => setPatientData({...patientData, surname: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Email</label>
                  <input type="email" className="w-full p-2 border rounded" value={patientData.email} onChange={e => setPatientData({...patientData, email: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Teléfono</label>
                  <input className="w-full p-2 border rounded" value={patientData.phone} onChange={e => setPatientData({...patientData, phone: e.target.value})} placeholder="+569..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Previsión</label>
                  <select className="w-full p-2 border rounded" value={patientData.prevision} onChange={e => setPatientData({...patientData, prevision: e.target.value})}>
                    <option>Fonasa</option><option>Isapre</option><option>Particular</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Dirección</label>
                  <input className="w-full p-2 border rounded" value={patientData.address} onChange={e => setPatientData({...patientData, address: e.target.value})} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="px-4 py-2 border rounded text-gray-600">Volver</button>
                <button 
                  onClick={() => (patientData.name && patientData.email && patientData.phone) ? setStep(3) : alert("Complete los campos obligatorios")}
                  className="flex-1 bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700"
                >
                  GUARDAR Y CONTINUAR
                </button>
              </div>
            </div>
          )}

          {/* --- PASO 3: SELECCIÓN DE ESPECIALIDAD --- */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-teal-700 mb-4 border-b pb-2">3. Selección de Especialidad</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {services.map(srv => (
                  <button 
                    key={srv.id} 
                    onClick={() => { setSelectedService(srv); setStep(4); }}
                    className="p-6 border rounded-xl hover:shadow-md hover:border-teal-500 transition flex flex-col items-center gap-2 bg-gray-50 hover:bg-white"
                  >
                    <span className="text-3xl">🏥</span>
                    <span className="font-bold text-center text-sm">{srv.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="mt-6 text-teal-600 font-bold text-sm">{'< VOLVER'}</button>
            </div>
          )}

          {/* --- PASO 4: SELECCIÓN DE PROFESIONAL Y HORA (BLOQUES) --- */}
          {step === 4 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-teal-700 mb-4 border-b pb-2">4. Profesional y Hora</h3>
              
              {/* Selector de Fecha */}
              <div className="flex justify-center mb-6">
                <input 
                  type="date" 
                  className="p-2 border rounded shadow-sm text-teal-800 font-bold"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="text-center py-10"><div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div></div>
              ) : (
                <div className="space-y-4">
                  {professionals.map(pro => {
                    const slots = proSlots[pro.id] || [];
                    if (slots.length === 0) return null; // No mostrar doctores sin horas

                    return (
                      <div key={pro.id} className="border rounded-xl p-4 hover:shadow-md transition bg-white">
                        <div className="flex items-center gap-4 mb-3 border-b pb-2">
                          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xl">
                            {pro.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{pro.name}</p>
                            <p className="text-xs text-gray-500 uppercase">Especialista CISD</p>
                          </div>
                        </div>
                        
                        {/* Bloques de Horario */}
                        <div className="flex flex-wrap gap-2">
                          {slots.slice(0, 8).map(time => (
                            <button
                              key={time}
                              onClick={() => { setSelectedPro(pro); setSelectedTime(time); setStep(5); }}
                              className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-600 hover:text-white transition font-bold text-sm"
                            >
                              {time}
                            </button>
                          ))}
                          {slots.length > 8 && <span className="text-xs text-gray-400 self-center">Ver más...</span>}
                        </div>
                      </div>
                    );
                  })}
                  
                  {Object.values(proSlots).every(s => s.length === 0) && (
                    <div className="text-center py-10 bg-gray-50 rounded border border-dashed">
                      <p className="text-gray-500">No hay horas disponibles para esta fecha.</p>
                      <button className="text-teal-600 underline mt-2" onClick={() => {
                         const d = new Date(selectedDate); d.setDate(d.getDate() + 1);
                         setSelectedDate(d.toISOString().split('T')[0]);
                      }}>Ver día siguiente</button>
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => setStep(3)} className="mt-6 text-teal-600 font-bold text-sm">{'< VOLVER'}</button>
            </div>
          )}

          {/* --- PASO 5: RESUMEN Y PAGO --- */}
          {step === 5 && (
            <div className="animate-fade-in max-w-lg mx-auto">
              <h3 className="text-lg font-bold text-teal-700 mb-4 border-b pb-2 text-center">5. Resumen y Pago</h3>
              
              <div className="bg-gray-50 p-6 rounded-xl border mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700">Paciente:</span>
                  <span>{patientData.name} {patientData.surname}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700">Profesional:</span>
                  <span>{selectedPro?.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-700">Servicio:</span>
                  <span>{selectedService?.name}</span>
                </div>
                <div className="flex justify-between items-center mb-4 border-b pb-4">
                  <span className="font-bold text-gray-700">Fecha:</span>
                  <span>{selectedDate} a las {selectedTime}</span>
                </div>
                <div className="flex justify-between items-center text-xl font-bold text-teal-800">
                  <span>Total a Pagar:</span>
                  <span>${selectedService?.price?.toLocaleString('es-CL') || 0}</span>
                </div>
              </div>

              <button 
                onClick={handleFinalBooking}
                disabled={loading}
                className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 shadow-lg disabled:opacity-50"
              >
                {loading ? 'PROCESANDO...' : 'IR A PAGAR'}
              </button>
              <button onClick={() => setStep(4)} className="w-full mt-4 text-gray-500 text-sm hover:underline">Volver a cambiar hora</button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}