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
  const [patientData, setPatientData] = useState({ rut: '', name: '', email: '', phone: '' });
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPro, setSelectedPro] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/services`).then(res => setServices(res.data));
    axios.get(`${API_URL}/professionals`).then(res => setProfessionals(res.data));
  }, []);

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
      const res = await axios.post(`${API_URL}/appointments`, {
        professionalId: selectedPro.id,
        serviceCode: selectedService.code,
        rut: patientData.rut,
        patientName: patientData.name || 'Paciente Web',
        patientEmail: patientData.email,
        startTime: new Date(dateTimeString)
      });

      if (res.data.paymentLink) {
        alert("✅ Reserva creada. Redirigiendo al pago...");
        window.location.href = res.data.paymentLink;
      } else {
        alert("✅ Reserva Confirmada Correctamente");
        window.location.reload();
      }
    } catch (error) {
      alert("Error al reservar. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  const StepHeader = ({ num, title }) => (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-teal-800">Reserva de hora</h2>
      <p className="text-sm text-gray-600 mb-4">Paso {num}: {title}</p>
      <div className="flex justify-between items-center mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10"></div>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= n ? 'bg-teal-700 text-white' : 'bg-gray-200 text-gray-500'}`}>{n}</div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">C</div>
          <span className="font-bold text-teal-800 text-lg">Centro CISD</span>
        </div>
        <a href="#/admin" className="text-sm text-gray-500 hover:text-teal-600 font-medium">Acceso Profesional</a>
      </header>

      <main className="max-w-4xl mx-auto mt-8 p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-10 min-h-[500px]">
          
          {step === 1 && (
            <div className="animate-fade-in">
              <StepHeader num="1" title="Identificar paciente" />
              <div className="max-w-lg mx-auto text-center">
                <h3 className="text-teal-600 font-bold text-xl mb-2">¿PARA QUIÉN ES LA HORA?</h3>
                <div className="text-left space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-teal-700 mb-1">Documento</label>
                    <select className="w-full p-3 border rounded-lg bg-white"><option>Carnet de Identidad</option></select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-red-700 mb-1">RUT del Paciente</label>
                    <input type="text" placeholder="Ej: 12.345.678-9" className="w-full p-3 border border-red-300 rounded-lg" value={patientData.rut} onChange={e => setPatientData({...patientData, rut: e.target.value})} />
                  </div>
                  <button onClick={() => patientData.rut.length > 3 ? setStep(2) : alert("Ingrese un RUT")} className="w-full mt-6 bg-gray-300 hover:bg-teal-600 text-white font-bold py-3 rounded-full transition-colors">CONTINUAR</button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <StepHeader num="2" title="Seleccionar servicio" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {services.map(srv => (
                  <button key={srv.id} onClick={() => { setSelectedService(srv); setStep(3); }} className="flex flex-col items-center justify-center p-6 bg-teal-50 rounded-lg hover:bg-teal-600 hover:text-white transition group border border-teal-100 h-32">
                    <span className="text-3xl mb-2">🏥</span><span className="font-bold text-sm text-center leading-tight">{srv.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="mt-8 text-teal-600 text-sm font-bold">{'< VOLVER'}</button>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <StepHeader num="3" title="Seleccionar profesional" />
              <div className="space-y-3">
                {professionals.map(pro => (
                  <div key={pro.id} className="border rounded-lg p-4 flex justify-between items-center hover:shadow-md transition bg-white">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">{pro.name.charAt(0)}</div>
                      <div><p className="font-bold text-gray-800">{pro.name}</p><p className="text-sm text-gray-500">Especialista en {selectedService.name}</p></div>
                    </div>
                    <button onClick={() => { setSelectedPro(pro); setStep(4); }} className="bg-gray-200 hover:bg-teal-600 hover:text-white text-gray-700 font-bold py-2 px-6 rounded-full text-sm transition">VER HORAS</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="mt-8 text-teal-600 text-sm font-bold">{'< VOLVER'}</button>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in">
              <StepHeader num="4" title="Seleccionar día y hora" />
              <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/2">
                  <div className="bg-teal-50 border border-teal-100 rounded-lg p-4 mb-4"><p className="text-teal-800 font-bold">{selectedPro?.name}</p><p className="text-sm text-teal-600">{selectedService?.name}</p></div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Fecha:</label>
                  <input type="date" className="w-full p-3 border rounded-lg" value={selectedDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
                <div className="md:w-1/2">
                  <label className="block font-bold text-gray-700 mb-2">Horas:</label>
                  {loading ? <div className="text-center py-10">Cargando...</div> : slots.length === 0 ? <div className="text-center p-6 bg-gray-50 border border-dashed text-gray-500">Sin horas.</div> : 
                    <div className="grid grid-cols-2 gap-3">{slots.map(time => (<button key={time} onClick={() => { setSelectedTime(time); setStep(5); }} className="py-2 px-4 bg-teal-600 text-white rounded-full font-bold hover:bg-teal-700 hover:shadow-lg transition">{time}</button>))}</div>
                  }
                </div>
              </div>
              <button onClick={() => setStep(3)} className="mt-8 text-teal-600 text-sm font-bold">{'< VOLVER'}</button>
            </div>
          )}

          {step === 5 && (
            <div className="animate-fade-in">
              <StepHeader num="5" title="Confirmar" />
              <div className="bg-gray-50 border rounded-lg p-4 mb-6 flex items-center justify-center gap-6">
                <div className="text-center border-r pr-6"><p className="text-3xl font-bold text-gray-700">{selectedDate.split('-')[2]}</p><p className="text-teal-600 font-bold text-lg">{selectedTime}</p></div>
                <div className="text-sm"><p><strong>Prof:</strong> {selectedPro?.name}</p><p><strong>Serv:</strong> {selectedService?.name}</p></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <input className="p-3 border rounded" value={patientData.name} onChange={e => setPatientData({...patientData, name: e.target.value})} placeholder="Nombre Completo" />
                <input className="p-3 border rounded" type="email" value={patientData.email} onChange={e => setPatientData({...patientData, email: e.target.value})} placeholder="Email" />
                <input className="p-3 border rounded md:col-span-2" value={patientData.phone} onChange={e => setPatientData({...patientData, phone: e.target.value})} placeholder="Teléfono" />
              </div>
              <button onClick={handleFinalSubmit} disabled={loading} className="w-full mt-8 bg-teal-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-teal-700 transition shadow-lg disabled:bg-gray-400">{loading ? '...' : 'CONFIRMAR Y PAGAR'}</button>
              <button onClick={() => setStep(4)} className="mt-4 w-full text-center text-gray-400 hover:text-gray-600 underline">Volver</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}