import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

export default function BookingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // DATA
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [slots, setSlots] = useState([]);

  // USER SELECTION
  const [patientData, setPatientData] = useState({ rut: '', docType: 'Carnet de Identidad', name: '', email: '', phone: '' });
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/services`).then(res => setServices(res.data));
    axios.get(`${API_URL}/professionals`).then(res => setProfessionals(res.data));
  }, []);

  // Cargar horas
  const loadSlots = async (proId, dateStr) => {
    setLoading(true);
    setSlots([]);
    try {
      const res = await axios.get(`${API_URL}/public/slots`, {
        params: { date: dateStr, professionalId: proId, duration: selectedService?.durationMin || 30 }
      });
      setSlots(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (step === 4 && selectedPro) {
      loadSlots(selectedPro.id, selectedDate);
    }
  }, [step, selectedDate, selectedPro]);

  const handleFinalSubmit = async () => {
    if (!patientData.email || !patientData.phone) return alert("Complete los datos de contacto");
    setLoading(true);
    try {
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      await axios.post(`${API_URL}/appointments`, {
        professionalId: selectedPro.id,
        serviceCode: selectedService.code,
        rut: patientData.rut,
        patientName: patientData.name || 'Paciente Web', // Nombre opcional si solo piden RUT al inicio
        patientEmail: patientData.email,
        startTime: new Date(dateTimeString)
      });
      alert("✅ Reserva Confirmada Correctamente");
      window.location.reload();
    } catch (error) {
      alert("Error al reservar. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- COMPONENTES UI ---
  const StepHeader = ({ num, title }) => (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-teal-800">Reserva de hora</h2>
      <p className="text-sm text-gray-600 mb-4">Paso {num}: {title}</p>
      {/* Progress Bar */}
      <div className="flex justify-between items-center mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10"></div>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= n ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {n}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* TOP HEADER */}
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">C</div>
          <span className="font-bold text-teal-800 text-lg">Centro CISD</span>
        </div>
        <a href="#/admin" className="text-sm text-gray-500 hover:text-teal-600 font-medium">Acceso Profesional</a>
      </header>

      {/* MAIN CONTENT CARD */}
      <main className="max-w-4xl mx-auto mt-8 p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-10 min-h-[500px]">
          
          {/* PASO 1: IDENTIFICACIÓN */}
          {step === 1 && (
            <div className="animate-fade-in">
              <StepHeader num="1" title="Identificar paciente" />
              
              <div className="max-w-lg mx-auto text-center">
                <h3 className="text-teal-600 font-bold text-xl mb-2">¿PARA QUIÉN ES LA HORA?</h3>
                <p className="text-gray-500 mb-8 text-sm">Complete los datos del Paciente que será atendido:</p>

                <div className="text-left space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-teal-700 mb-1">Documento de Identificación</label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                      <option>Carnet de Identidad</option>
                      <option>Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-red-700 mb-1">RUT del Paciente</label>
                    <input 
                      type="text" 
                      placeholder="Ej: 12.345.678-9" 
                      className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-200 outline-none"
                      value={patientData.rut}
                      onChange={e => setPatientData({...patientData, rut: e.target.value})}
                    />
                    <p className="text-xs text-gray-400 mt-1">Ingrese RUT del paciente</p>
                  </div>

                  <button 
                    onClick={() => patientData.rut.length > 3 ? setStep(2) : alert("Ingrese un RUT válido")}
                    className="w-full mt-6 bg-gray-300 hover:bg-teal-600 text-white font-bold py-3 rounded-full transition-colors"
                  >
                    CONTINUAR
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASO 2: SELECCIONAR SERVICIO (GRID) */}
          {step === 2 && (
            <div className="animate-fade-in">
              <StepHeader num="2" title="Seleccionar servicio" />
              
              <h3 className="text-center text-teal-600 font-bold text-xl mb-6">¿QUÉ SERVICIO NECESITA AGENDAR?</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {services.map(srv => (
                  <button 
                    key={srv.id}
                    onClick={() => { setSelectedService(srv); setStep(3); }}
                    className="flex flex-col items-center justify-center p-6 bg-teal-50 rounded-lg hover:bg-teal-600 hover:text-white transition group border border-teal-100 h-32"
                  >
                    <span className="text-3xl mb-2">🏥</span>
                    <span className="font-bold text-sm text-center leading-tight">{srv.name}</span>
                  </button>
                ))}
              </div>
              
              <button onClick={() => setStep(1)} className="mt-8 text-teal-600 text-sm font-bold">{'< VOLVER AL PASO ANTERIOR'}</button>
            </div>
          )}

          {/* PASO 3: SELECCIONAR ESPECIALIDAD/PROFESIONAL */}
          {step === 3 && (
            <div className="animate-fade-in">
              <StepHeader num="3" title="Seleccionar profesional" />
              
              <div className="bg-gray-100 p-1 rounded-lg flex mb-6 max-w-md mx-auto">
                <button className="flex-1 bg-white shadow-sm py-2 rounded-md font-bold text-teal-700 text-sm">Búsqueda por profesional</button>
              </div>

              <div className="space-y-3">
                {professionals.map(pro => (
                  <div key={pro.id} className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition bg-white">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">
                        {pro.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{pro.name}</p>
                        <p className="text-sm text-gray-500">Especialista en {selectedService.name}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setSelectedPro(pro); setStep(4); }}
                      className="bg-gray-200 hover:bg-teal-600 hover:text-white text-gray-700 font-bold py-2 px-6 rounded-full text-sm transition"
                    >
                      VER HORAS
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="mt-8 text-teal-600 text-sm font-bold">{'< VOLVER AL PASO ANTERIOR'}</button>
            </div>
          )}

          {/* PASO 4: SELECCIONAR HORA */}
          {step === 4 && (
            <div className="animate-fade-in">
              <StepHeader num="4" title="Seleccionar día y hora" />
              
              <div className="flex flex-col md:flex-row gap-8">
                {/* CALENDARIO IZQUIERDA */}
                <div className="md:w-1/2">
                  <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 mb-4">
                    <p className="text-teal-800 font-bold">{selectedPro?.name}</p>
                    <p className="text-sm text-teal-600">{selectedService?.name}</p>
                  </div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Seleccione Fecha:</label>
                  <input 
                    type="date" 
                    className="w-full p-3 border rounded-lg"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                {/* HORAS DERECHA */}
                <div className="md:w-1/2">
                  <h4 className="font-bold text-gray-700 mb-4 text-center">Horas Disponibles</h4>
                  {loading ? (
                    <div className="text-center py-10"><div className="inline-block w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : slots.length === 0 ? (
                    <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <p className="text-gray-500 text-sm">No hay horas disponibles para este día.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {slots.map(time => (
                        <button 
                          key={time}
                          onClick={() => { setSelectedTime(time); setStep(5); }}
                          className="py-2 px-4 bg-teal-600 text-white rounded-full font-bold hover:bg-teal-700 hover:shadow-lg transition transform hover:-translate-y-1"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setStep(3)} className="mt-8 text-teal-600 text-sm font-bold">{'< VOLVER AL PASO ANTERIOR'}</button>
            </div>
          )}

          {/* PASO 5: CONFIRMACIÓN */}
          {step === 5 && (
            <div className="animate-fade-in">
              <StepHeader num="5" title="Confirmar y reservar" />
              
              <div className="text-center mb-8">
                <h3 className="text-teal-700 font-bold text-lg">¡Ya casi terminas!</h3>
                <p className="text-gray-600">Completa tus datos y finaliza la reserva:</p>
              </div>

              {/* Resumen Card */}
              <div className="bg-gray-50 border rounded-lg p-4 mb-6 flex items-center justify-center gap-6">
                <div className="text-center border-r pr-6">
                  <p className="text-3xl font-bold text-gray-700">{selectedDate.split('-')[2]}</p>
                  <p className="uppercase text-xs font-bold text-gray-500">MES {selectedDate.split('-')[1]}</p>
                  <p className="text-teal-600 font-bold text-lg">{selectedTime}</p>
                </div>
                <div className="text-sm">
                  <p><span className="font-bold text-gray-700">Profesional:</span> {selectedPro?.name}</p>
                  <p><span className="font-bold text-gray-700">Especialidad:</span> {selectedService?.name}</p>
                  <p><span className="font-bold text-gray-700">Paciente:</span> {patientData.rut}</p>
                </div>
              </div>

              {/* Formulario Contacto */}
              <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div>
                  <label className="text-xs font-bold text-teal-700">Nombre Completo</label>
                  <input className="w-full p-2 border rounded" value={patientData.name} onChange={e => setPatientData({...patientData, name: e.target.value})} placeholder="Nombre Apellido" />
                </div>
                <div>
                  <label className="text-xs font-bold text-teal-700">Correo electrónico</label>
                  <input className="w-full p-2 border rounded" type="email" value={patientData.email} onChange={e => setPatientData({...patientData, email: e.target.value})} placeholder="ejemplo@correo.com" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-teal-700">Teléfono principal</label>
                  <div className="flex">
                    <span className="p-2 bg-gray-100 border border-r-0 rounded-l text-gray-500">🇨🇱 +56</span>
                    <input className="w-full p-2 border rounded-r" value={patientData.phone} onChange={e => setPatientData({...patientData, phone: e.target.value})} placeholder="9 1234 5678" />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 text-teal-600" />
                  <span className="text-sm text-gray-600">Al reservar reconozco haber leído los <strong>Términos y Condiciones</strong>.</span>
                </label>
              </div>

              <div className="mt-8 flex justify-center gap-4">
                <button onClick={() => setStep(4)} className="text-teal-600 font-bold text-sm uppercase">Volver</button>
                <button 
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="bg-gray-300 hover:bg-teal-600 text-white font-bold py-3 px-10 rounded-full transition-colors shadow-lg"
                >
                  {loading ? 'RESERVANDO...' : 'RESERVAR HORA'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}