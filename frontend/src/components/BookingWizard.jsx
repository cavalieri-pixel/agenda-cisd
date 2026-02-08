import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

export default function BookingWizard({ onCancel }) {
  const [step, setStep] = useState(1);
  
  // Datos
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  
  // Selección del usuario
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [patientForm, setPatientForm] = useState({ rut: '', name: '', email: '', phone: '' });
  
  const [loading, setLoading] = useState(false);

  // Carga inicial
  useEffect(() => {
    axios.get(`${API_URL}/professionals`).then(res => setProfessionals(res.data));
    axios.get(`${API_URL}/services`).then(res => setServices(res.data));
  }, []);

  // Cargar horas cuando cambia fecha o profesional
  useEffect(() => {
    if (step === 3 && selectedPro && selectedService && selectedDate) {
      setLoading(true);
      axios.get(`${API_URL}/public/slots`, {
        params: {
          date: selectedDate,
          professionalId: selectedPro.id,
          duration: selectedService.durationMin
        }
      })
      .then(res => setSlots(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
    }
  }, [step, selectedDate, selectedPro, selectedService]);

  // CONFIRMAR RESERVA
  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Construir fecha ISO completa (YYYY-MM-DDTHH:MM:00)
      const dateTimeString = `${selectedDate}T${selectedTime}:00`;
      
      await axios.post(`${API_URL}/appointments`, {
        professionalId: selectedPro.id,
        serviceCode: selectedService.code,
        rut: patientForm.rut,
        patientName: patientForm.name,
        patientEmail: patientForm.email,
        startTime: new Date(dateTimeString)
      });

      alert('¡Cita agendada con éxito! Revisa tu correo.');
      onCancel(); // Volver al inicio (o recargar)
    } catch (error) {
      alert('Error al agendar. Intenta otro horario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
        
        {/* BARRA LATERAL (Resumen) */}
        <div className="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-6 text-blue-400">Reserva tu hora</h2>
            <div className="space-y-4 text-sm opacity-90">
              {selectedPro && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Profesional</p>
                  <p className="font-bold text-lg">{selectedPro.name}</p>
                </div>
              )}
              {selectedService && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Servicio</p>
                  <p className="font-bold">{selectedService.name}</p>
                  <p>${selectedService.price} • {selectedService.durationMin} min</p>
                </div>
              )}
              {selectedTime && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Fecha</p>
                  <p className="font-bold">{selectedDate} a las {selectedTime}</p>
                </div>
              )}
            </div>
          </div>
          <button onClick={onCancel} className="text-sm text-gray-400 hover:text-white mt-8">← Volver al inicio</button>
        </div>

        {/* CONTENIDO PRINCIPAL (Pasos) */}
        <div className="p-8 md:w-2/3 flex flex-col">
          
          {/* PASO 1: PROFESIONAL */}
          {step === 1 && (
            <>
              <h3 className="text-xl font-bold text-gray-800 mb-4">1. Elige un Profesional</h3>
              <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[400px]">
                {professionals.map(pro => (
                  <button 
                    key={pro.id}
                    onClick={() => { setSelectedPro(pro); setStep(2); }}
                    className="flex items-center p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-full mr-3" style={{backgroundColor: pro.color}}></div>
                    <span className="font-medium text-gray-700">{pro.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* PASO 2: SERVICIO */}
          {step === 2 && (
            <>
              <h3 className="text-xl font-bold text-gray-800 mb-4">2. Elige el Servicio</h3>
              <div className="space-y-3 overflow-y-auto max-h-[400px]">
                {services.map(ser => (
                  <button 
                    key={ser.id}
                    onClick={() => { setSelectedService(ser); setStep(3); }}
                    className="w-full p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-gray-800 block">{ser.name}</span>
                      <span className="text-sm text-gray-500">{ser.durationMin} min</span>
                    </div>
                    <span className="font-bold text-blue-600">${ser.price}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="mt-4 text-gray-500">Atrás</button>
            </>
          )}

          {/* PASO 3: FECHA Y HORA */}
          {step === 3 && (
            <>
              <h3 className="text-xl font-bold text-gray-800 mb-4">3. Selecciona Horario</h3>
              <div className="mb-4">
                <input 
                  type="date" 
                  className="w-full p-2 border rounded"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                />
              </div>
              
              {loading ? <p>Buscando horas...</p> : (
                <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                  {slots.length === 0 ? <p className="col-span-3 text-center text-gray-400 py-4">No hay horas disponibles este día.</p> :
                    slots.map(time => (
                      <button 
                        key={time}
                        onClick={() => { setSelectedTime(time); setStep(4); }}
                        className="py-2 px-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 font-medium text-sm"
                      >
                        {time}
                      </button>
                    ))
                  }
                </div>
              )}
              <button onClick={() => setStep(2)} className="mt-4 text-gray-500">Atrás</button>
            </>
          )}

          {/* PASO 4: DATOS PACIENTE */}
          {step === 4 && (
            <>
              <h3 className="text-xl font-bold text-gray-800 mb-4">4. Tus Datos</h3>
              <div className="space-y-3">
                <input placeholder="RUT (Ej: 12345678-9)" className="w-full p-2 border rounded" value={patientForm.rut} onChange={e => setPatientForm({...patientForm, rut: e.target.value})} />
                <input placeholder="Nombre Completo" className="w-full p-2 border rounded" value={patientForm.name} onChange={e => setPatientForm({...patientForm, name: e.target.value})} />
                <input placeholder="Email" type="email" className="w-full p-2 border rounded" value={patientForm.email} onChange={e => setPatientForm({...patientForm, email: e.target.value})} />
                <input placeholder="Teléfono" className="w-full p-2 border rounded" value={patientForm.phone} onChange={e => setPatientForm({...patientForm, phone: e.target.value})} />
                
                <button 
                  onClick={handleConfirm}
                  disabled={loading || !patientForm.rut || !patientForm.name || !patientForm.email}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 mt-4 shadow-lg"
                >
                  {loading ? 'Confirmando...' : '✅ CONFIRMAR RESERVA'}
                </button>
              </div>
              <button onClick={() => setStep(3)} className="mt-4 text-gray-500">Atrás</button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}