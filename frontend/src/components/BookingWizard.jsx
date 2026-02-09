import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

// --- UTILIDADES (RUT, FORMATOS) ---
const validarRut = (rut) => {
  if (!rut || rut.trim().length < 3) return false;
  const cleanRut = rut.replace(/[^0-9kK]/g, "");
  if (cleanRut.length < 2) return false;
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();
  let suma = 0; let multiplo = 2;
  for (let i = 1; i <= body.length; i++) {
    const index = multiplo * body.charAt(body.length - i);
    suma = suma + index;
    if (multiplo < 7) { multiplo = multiplo + 1; } else { multiplo = 2; }
  }
  const dvEsperado = 11 - (suma % 11);
  const dvFinal = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  return dv === dvFinal;
};

const formatRut = (rut) => {
  const clean = rut.replace(/[^0-9kK]/g, "");
  if (clean.length <= 1) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + dv;
};

// Generar los próximos N días
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

// Formateadores de fecha para el calendario
const getDayName = (date) => new Intl.DateTimeFormat('es-CL', { weekday: 'short' }).format(date); // lun
const getDayNumber = (date) => new Intl.DateTimeFormat('es-CL', { day: 'numeric' }).format(date); // 9
const getMonthName = (date) => new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(date); // feb

export default function BookingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // DATA SISTEMA
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [proSlots, setProSlots] = useState({});

  // DATA USUARIO
  const [rut, setRut] = useState('');
  const [docType, setDocType] = useState('Carnet de Identidad');
  const [passport, setPassport] = useState('');
  
  const [patientData, setPatientData] = useState({
    name: '', surname: '', email: '', phone: '',
    address: '', prevision: 'Fonasa', birthDate: ''
  });

  // SELECCIÓN
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  
  // Calendario UI
  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/services`).then(res => setServices(res.data));
    axios.get(`${API_URL}/professionals`).then(res => setProfessionals(res.data));
    setCalendarDays(getNextDays(14)); // Generar 2 semanas
  }, []);

  // --- LOGICA PASO 1 ---
  const handleNextStep1 = async () => {
    let finalRut = '';
    if (docType === 'Carnet de Identidad') {
      if (!validarRut(rut)) return alert("El RUT ingresado no es válido.");
      finalRut = formatRut(rut);
    } else {
      if (passport.length < 5) return alert("Ingrese un pasaporte válido.");
      finalRut = passport;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/patients/search/${finalRut}`);
      if (res.data) {
        setPatientData({
          ...patientData,
          rut: res.data.rut,
          name: res.data.name.split(' ')[0] || '',
          surname: res.data.name.split(' ').slice(1).join(' ') || '',
          email: res.data.email,
          phone: res.data.phone || '',
          address: res.data.address || '',
          prevision: res.data.prevision || 'Fonasa',
          birthDate: res.data.birthDate ? res.data.birthDate.split('T')[0] : ''
        });
        alert(`¡Hola de nuevo ${res.data.name}!`);
        setStep(3); 
      }
    } catch (error) {
      setPatientData({ ...patientData, rut: finalRut });
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGICA PASO 4 (CARGAR HORAS) ---
  useEffect(() => {
    if (step === 4 && selectedService) {
      loadAllSlots(selectedDate);
    }
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
      } catch (e) { newSlots[pro.id] = []; }
    });
    await Promise.all(promises);
    setProSlots(newSlots);
    setLoading(false);
  };

  // --- LOGICA PASO 5 (PAGO) ---
  const handleFinalBooking = async () => {
    setLoading(true);
    try {
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      const res = await axios.post(`${API_URL}/appointments`, {
        professionalId: selectedPro.id,
        serviceCode: selectedService.code,
        startTime: new Date(dateTimeString),
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
      alert(error.response?.data?.error || "Error al reservar.");
    } finally {
      setLoading(false);
    }
  };

  // --- COMPONENTES UI ---
  const Header = () => (
    <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">C</div>
        <span className="font-bold text-teal-800 text-lg">Agenda CISD</span>
      </div>
      <a href="#/admin" className="text-sm text-gray-500 hover:text-teal-600">Acceso Profesional</a>
    </header>
  );

  const ProgressBar = () => (
    <div className="flex justify-between items-center mb-8 px-2 md:px-10 relative">
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10"></div>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= n ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <Header />
      <main className="max-w-4xl mx-auto py-8 px-4">
        
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 min-h-[500px]">
          <h2 className="text-2xl font-bold text-teal-800 mb-2 text-center">Reserva de Hora</h2>
          <ProgressBar />

          {/* PASO 1 */}
          {step === 1 && (
            <div className="max-w-md mx-auto animate-fade-in">
              <h3 className="text-lg font-bold text-teal-700 mb-4 border-b pb-2">1. Identificación</h3>
              <select className="w-full p-3 border rounded mb-4" value={docType} onChange={e => setDocType(e.target.value)}><option>Carnet de Identidad</option><option>Pasaporte</option></select>
              {docType === 'Carnet de Identidad' ? (
                <><label className="text-xs font-bold text-red-600">RUT</label><input className="w-full p-3 border border-red-200 rounded" placeholder="12.345.678-9" value={rut} onChange={e => setRut(e.target.value)} /></>
              ) : (
                <><label className="text-xs font-bold text-teal-600">Pasaporte</label><input className="w-full p-3 border rounded" placeholder="Número" value={passport} onChange={e => setPassport(e.target.value)} /></>
              )}
              <button onClick={handleNextStep1} disabled={loading} className="w-full mt-6 bg-teal-600 text-white py-3 rounded font-bold hover:bg-teal-700">{loading ? '...' : 'CONTINUAR'}</button>
            </div>
          )}

          {/* PASO 2 */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <h3 className="text-lg font-bold text-teal-700 mb-4 border-b pb-2">2. Datos Personales</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div><label className="text-xs font-bold">RUT/ID</label><input className="w-full p-2 border rounded bg-gray-100" value={patientData.rut || rut || passport} disabled /></div>
                <div><label className="text-xs font-bold">Fecha Nacimiento</label><input type="date" className="w-full p-2 border rounded" value={patientData.birthDate} onChange={e => setPatientData({...patientData, birthDate: e.target.value})} /></div>
                <div><label className="text-xs font-bold">Nombre</label><input className="w-full p-2 border rounded" value={patientData.name} onChange={e => setPatientData({...patientData, name: e.target.value})} /></div>
                <div><label className="text-xs font-bold">Apellido</label><input className="w-full p-2 border rounded" value={patientData.surname} onChange={e => setPatientData({...patientData, surname: e.target.value})} /></div>
                <div><label className="text-xs font-bold">Email</label><input className="w-full p-2 border rounded" value={patientData.email} onChange={e => setPatientData({...patientData, email: e.target.value})} /></div>
                <div><label className="text-xs font-bold">Teléfono</label><input className="w-full p-2 border rounded" value={patientData.phone} onChange={e => setPatientData({...patientData, phone: e.target.value})} /></div>
                <div><label className="text-xs font-bold">Previsión</label><select className="w-full p-2 border rounded" value={patientData.prevision} onChange={e => setPatientData({...patientData, prevision: e.target.value})}><option>Fonasa</option><option>Isapre</option><option>Particular</option></select></div>
              </div>
              <button onClick={() => (patientData.name && patientData.email) ? setStep(3) : alert("Complete datos")} className="w-full mt-6 bg-teal-600 text-white py-3 rounded font-bold">GUARDAR Y CONTINUAR</button>
            </div>
          )}

          {/* PASO 3 */}
          {step === 3 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-teal-700 mb-4 border-b pb-2">3. Selección de Especialidad</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {services.map(srv => (
                  <button key={srv.id} onClick={() => { setSelectedService(srv); setStep(4); }} className="p-6 border rounded-xl hover:shadow-md hover:border-teal-500 transition flex flex-col items-center gap-2 bg-gray-50 hover:bg-white">
                    <span className="text-3xl">🏥</span><span className="font-bold text-center text-sm">{srv.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="mt-6 text-teal-600 font-bold text-sm">{'< VOLVER'}</button>
            </div>
          )}

          {/* --- PASO 4 MEJORADO: CALENDARIO HORIZONTAL --- */}
          {step === 4 && (
            <div className="animate-fade-in">
              <h3 className="text-lg font-bold text-teal-700 mb-2 border-b pb-2">4. Seleccionar día y hora</h3>
              <p className="text-sm text-gray-500 mb-4">Servicio: <strong>{selectedService?.name}</strong></p>

              {/* CALENDARIO ESTILO REDSALUD */}
              <div className="flex overflow-x-auto gap-2 pb-4 mb-6 scrollbar-hide">
                {calendarDays.map((date, idx) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const isSelected = selectedDate === dateStr;
                  const dayName = getDayName(date); // lun
                  const dayNum = getDayNumber(date); // 9
                  const monthName = getMonthName(date); // feb

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`
                        min-w-[80px] p-2 rounded-lg border transition flex flex-col items-center justify-center
                        ${isSelected ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-100' : 'border-gray-200 bg-white hover:border-teal-300'}
                      `}
                    >
                      <span className="text-xs uppercase text-gray-500 font-bold">{monthName}</span>
                      <span className={`text-2xl font-bold ${isSelected ? 'text-teal-700' : 'text-gray-700'}`}>{dayNum}</span>
                      <span className="text-xs capitalize text-gray-500">{dayName}</span>
                      
                      {/* Indicador visual simple de selección */}
                      {isSelected && <div className="mt-1 w-2 h-2 bg-teal-600 rounded-full"></div>}
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <div className="text-center py-10"><div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div></div>
              ) : (
                <div className="space-y-4">
                  {professionals.map(pro => {
                    const slots = proSlots[pro.id] || [];
                    // Si no tiene horas, no lo mostramos (o podríamos mostrarlo deshabilitado)
                    if (slots.length === 0) return null; 

                    return (
                      <div key={pro.id} className="border rounded-xl p-4 hover:shadow-md transition bg-white animate-fade-in-up">
                        <div className="flex items-center gap-4 mb-3 border-b pb-2">
                          <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xl border-2 border-white shadow-sm">
                            {pro.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-lg">{pro.name}</p>
                            <p className="text-xs text-teal-600 uppercase font-bold tracking-wide">Especialista CISD</p>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs font-bold text-gray-400 mb-2 uppercase">Horas Disponibles</p>
                          <div className="flex flex-wrap gap-2">
                            {slots.slice(0, 10).map(time => (
                              <button
                                key={time}
                                onClick={() => { setSelectedPro(pro); setSelectedTime(time); setStep(5); }}
                                className="px-4 py-2 bg-white text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-600 hover:text-white transition font-bold text-sm shadow-sm"
                              >
                                {time}
                              </button>
                            ))}
                            {slots.length > 10 && <span className="text-xs text-gray-400 self-center pl-2">y más...</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Mensaje si no hay ningún médico con horas */}
                  {Object.values(proSlots).every(s => s.length === 0) && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <p className="text-4xl mb-2">📅</p>
                      <p className="text-gray-500 font-bold">No hay horas disponibles para este día.</p>
                      <p className="text-sm text-gray-400">Intenta seleccionar otra fecha en el calendario de arriba.</p>
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => setStep(3)} className="mt-6 text-teal-600 font-bold text-sm hover:underline">{'< VOLVER A ESPECIALIDADES'}</button>
            </div>
          )}

          {/* PASO 5 */}
          {step === 5 && (
            <div className="animate-fade-in max-w-lg mx-auto">
              <h3 className="text-lg font-bold text-teal-700 mb-4 border-b pb-2 text-center">5. Resumen y Pago</h3>
              <div className="bg-white border-2 border-teal-50 rounded-xl p-6 mb-6 shadow-sm">
                <div className="flex justify-between border-b pb-2 mb-2"><span className="text-gray-500">Paciente</span><span className="font-bold">{patientData.name} {patientData.surname}</span></div>
                <div className="flex justify-between border-b pb-2 mb-2"><span className="text-gray-500">Profesional</span><span className="font-bold">{selectedPro?.name}</span></div>
                <div className="flex justify-between border-b pb-2 mb-2"><span className="text-gray-500">Servicio</span><span className="font-bold">{selectedService?.name}</span></div>
                <div className="flex justify-between border-b pb-2 mb-2"><span className="text-gray-500">Fecha</span><span className="font-bold text-teal-700">{selectedDate} / {selectedTime}</span></div>
                <div className="flex justify-between items-center text-xl font-bold text-teal-800 mt-4"><span>Total:</span><span>${selectedService?.price?.toLocaleString('es-CL') || 0}</span></div>
              </div>
              <button onClick={handleFinalBooking} disabled={loading} className="w-full bg-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-teal-700 shadow-lg disabled:opacity-50">{loading ? 'PROCESANDO...' : 'IR A PAGAR'}</button>
              <button onClick={() => setStep(4)} className="w-full mt-4 text-gray-400 text-sm hover:text-gray-600">Volver</button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}