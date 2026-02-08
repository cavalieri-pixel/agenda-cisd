import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

export default function BookingWizard() {
  // PASOS: 1=Identificación, 2=Servicio, 3=Profesional, 4=Hora, 5=Confirmación
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // DATOS
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  // SELECCIONES
  const [rut, setRut] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Hoy
  const [selectedTime, setSelectedTime] = useState(null);
  
  // DATOS CONTACTO FINAL
  const [contactInfo, setContactInfo] = useState({ name: '', email: '', phone: '' });

  // CARGA INICIAL
  useEffect(() => {
    axios.get(`${API_URL}/services`).then(res => setServices(res.data));
    axios.get(`${API_URL}/professionals`).then(res => setProfessionals(res.data));
  }, []);

  // CARGAR HORAS CUANDO SE ELIGE PROFESIONAL Y FECHA (PASO 4)
  useEffect(() => {
    if (step === 4 && selectedPro && selectedService) {
      loadSlots();
    }
  }, [selectedDate, step]);

  const loadSlots = async () => {
    setLoading(true);
    setAvailableSlots([]);
    try {
      const res = await axios.get(`${API_URL}/public/slots`, {
        params: {
          date: selectedDate,
          professionalId: selectedPro.id,
          duration: selectedService.durationMin
        }
      });
      setAvailableSlots(res.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleFinalBooking = async () => {
    if(!contactInfo.name || !contactInfo.email || !contactInfo.phone) return alert("Por favor complete todos los datos");
    
    setLoading(true);
    try {
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      await axios.post(`${API_URL}/appointments`, {
        professionalId: selectedPro.id,
        serviceCode: selectedService.code,
        rut: rut,
        patientName: contactInfo.name,
        patientEmail: contactInfo.email,
        startTime: new Date(dateTimeString)
      });
      alert("✅ Reserva Confirmada con Éxito");
      window.location.reload();
    } catch (error) {
      alert("Error al reservar. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- COMPONENTES VISUALES ---

  const ProgressBar = () => (
    <div className="flex justify-between items-center mb-8 px-4 md:px-20">
      {[1, 2, 3, 4, 5].map(num => (
        <div key={num} className="flex flex-col items-center relative z-10">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= num ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {num}
          </div>
          {num < 5 && <div className={`absolute top-4 left-8 w-[calc(100vw/6)] md:w-32 h-1 -z-10 ${step > num ? 'bg-teal-600' : 'bg-gray-200'}`}></div>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-700">
      {/* HEADER */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xl">C</div>
            <span className="font-bold text-xl tracking-tight text-teal-800">Agenda CISD</span>
          </div>
          <a href="#/admin" className="text-sm text-teal-600 font-medium hover:underline">Soy Profesional</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center text-teal-800 mb-2">Reserva de hora</h1>
        <p className="text-center text-gray-500 mb-8">Siga los pasos para agendar su atención</p>
        
        <ProgressBar />

        <div className="bg-white rounded-xl shadow-lg p-6 md:p-10 min-h-[400px]">
          
          {/* PASO 1: IDENTIFICACIÓN */}
          {step === 1 && (
            <div className="animate-fade-in-up">
              <h2 className="text-xl font-bold text-teal-700 mb-6 border-b pb-2">1. Identificar Paciente</h2>
              <div className="max-w-md mx-auto">
                <label className="block text-sm font-bold text-gray-600 mb-2">RUT del Paciente</label>
                <input 
                  type="text" 
                  placeholder="Ej: 12.345.678-9" 
                  className="w-full p-4 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-teal-500 outline-none transition"
                  value={rut}
                  onChange={e => setRut(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-2">Ingrese el RUT sin puntos ni guión (opcional).</p>
                
                <button 
                  onClick={() => rut.length > 3 ? setStep(2) : alert("Ingrese un RUT válido")}
                  className="w-full mt-8 bg-teal-600 text-white py-3 rounded-lg font-bold hover:bg-teal-700 transition transform active:scale-95"
                >
                  CONTINUAR
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: SELECCIÓN SERVICIO */}
          {step === 2 && (
            <div className="animate-fade-in-up">
              <h2 className="text-xl font-bold text-teal-700 mb-6 border-b pb-2">2. ¿Qué servicio necesita?</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {services.map(serv => (
                  <button 
                    key={serv.id}
                    onClick={() => { setSelectedService(serv); setStep(3); }}
                    className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition group"
                  >
                    <span className="text-3xl mb-2 group-hover:scale-110 transition">🏥</span>
                    <span className="font-bold text-center text-gray-700 group-hover:text-teal-700">{serv.name}</span>
                    {serv.isTelemed && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mt-2">Online</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="mt-8 text-gray-400 hover:text-gray-600 underline">Volver atrás</button>
            </div>
          )}

          {/* PASO 3: SELECCIÓN PROFESIONAL */}
          {step === 3 && (
            <div className="animate-fade-in-up">
              <h2 className="text-xl font-bold text-teal-700 mb-6 border-b pb-2">3. Elija Profesional</h2>
              <p className="mb-4 text-sm text-gray-500">Mostrando especialistas para: <strong>{selectedService.name}</strong></p>
              
              <div className="space-y-3">
                {professionals.map(pro => (
                  <button 
                    key={pro.id}
                    onClick={() => { setSelectedPro(pro); setStep(4); }}
                    className="w-full flex items-center p-4 border rounded-xl hover:shadow-md hover:border-teal-500 transition bg-white"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4" style={{backgroundColor: pro.color}}>
                      {pro.name.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-lg text-gray-800">{pro.name}</p>
                      <p className="text-sm text-gray-500">Especialista CISD</p>
                    </div>
                    <div className="ml-auto text-teal-600 font-bold">Seleccionar →</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="mt-8 text-gray-400 hover:text-gray-600 underline">Volver atrás</button>
            </div>
          )}

          {/* PASO 4: SELECCIÓN HORA */}
          {step === 4 && (
            <div className="animate-fade-in-up">
              <h2 className="text-xl font-bold text-teal-700 mb-6 border-b pb-2">4. Seleccione Día y Hora</h2>
              
              <div className="flex flex-col md:flex-row gap-8">
                {/* Calendario Simple */}
                <div className="md:w-1/2">
                  <label className="block font-bold text-gray-700 mb-2">Fecha:</label>
                  <input 
                    type="date" 
                    className="w-full p-3 border rounded-lg"
                    value={selectedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                  
                  {/* Tarjeta Profesional Resumen */}
                  <div className="mt-6 p-4 bg-teal-50 rounded-lg border border-teal-100">
                    <p className="text-xs text-teal-600 uppercase font-bold">Profesional</p>
                    <p className="font-bold text-lg">{selectedPro.name}</p>
                    <p className="text-sm text-gray-600 mt-2">{selectedService.name}</p>
                    <p className="text-sm text-gray-600">{selectedService.durationMin} minutos</p>
                  </div>
                </div>

                {/* Lista de Horas */}
                <div className="md:w-1/2">
                  <label className="block font-bold text-gray-700 mb-2">Horas Disponibles:</label>
                  {loading ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed">
                      <p className="text-gray-400">No hay horas para este día.</p>
                      <p className="text-sm text-gray-400">Intente otra fecha.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {availableSlots.map(time => (
                        <button 
                          key={time}
                          onClick={() => { setSelectedTime(time); setStep(5); }}
                          className="py-2 bg-white border border-teal-200 text-teal-700 rounded hover:bg-teal-600 hover:text-white transition font-bold"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setStep(3)} className="mt-8 text-gray-400 hover:text-gray-600 underline">Volver atrás</button>
            </div>
          )}

          {/* PASO 5: CONFIRMACIÓN */}
          {step === 5 && (
            <div className="animate-fade-in-up">
              <h2 className="text-xl font-bold text-teal-700 mb-6 border-b pb-2">5. Confirmar y Reservar</h2>
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6 flex gap-4 items-center">
                <div className="text-3xl">📅</div>
                <div>
                  <p className="font-bold text-gray-800">Resumen de la Cita</p>
                  <p className="text-sm text-gray-600">
                    {new Date(selectedDate).toLocaleDateString()} a las <strong>{selectedTime}</strong>
                  </p>
                  <p className="text-sm text-gray-600">{selectedService.name} con {selectedPro.name}</p>
                </div>
              </div>

              <h3 className="font-bold text-gray-700 mb-4">Datos de Contacto</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input placeholder="Nombre Completo" className="p-3 border rounded" value={contactInfo.name} onChange={e => setContactInfo({...contactInfo, name: e.target.value})} />
                <input placeholder="Email" type="email" className="p-3 border rounded" value={contactInfo.email} onChange={e => setContactInfo({...contactInfo, email: e.target.value})} />
                <input placeholder="Teléfono (+569...)" className="p-3 border rounded md:col-span-2" value={contactInfo.phone} onChange={e => setContactInfo({...contactInfo, phone: e.target.value})} />
              </div>

              <div className="mt-4 flex items-start gap-2">
                <input type="checkbox" className="mt-1" id="terms" />
                <label htmlFor="terms" className="text-sm text-gray-500">Al reservar la hora reconozco haber leído y acepto los Términos y Condiciones de CISD.</label>
              </div>

              <button 
                onClick={handleFinalBooking}
                disabled={loading}
                className="w-full mt-8 bg-teal-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-teal-700 transition shadow-lg disabled:bg-gray-400"
              >
                {loading ? 'RESERVANDO...' : 'CONFIRMAR RESERVA'}
              </button>
              <button onClick={() => setStep(4)} className="mt-4 w-full text-center text-gray-400 hover:text-gray-600 underline">Corregir datos</button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}