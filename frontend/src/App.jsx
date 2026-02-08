import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import AppointmentModal from './components/AppointmentModal';
import Login from './components/Login';
import EventModal from './components/EventModal';
import Sidebar from './components/Sidebar';
import { ProfessionalsView, ServicesView, ScheduleView, PatientsView } from './components/AdminModules';
import BookingWizard from './components/BookingWizard';

function App() {
  // 1. HOOKS PRIMERO (SIEMPRE ARRIBA)
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  
  // Admin States
  const [activeView, setActiveView] = useState('agenda');
  const [profesionales, setProfesionales] = useState([]); 
  const [citas, setCitas] = useState([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  
  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 2. EFECTOS (Side Effects)
  
  // Detectar cambio de URL (Hash)
  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Cargar datos administrativos (Solo si hay token y estamos en admin)
  useEffect(() => {
    if (token && currentHash === '#/admin') {
      axios.get('https://cisd-api.onrender.com/api/professionals')
        .then((res) => {
          setProfesionales(res.data);
          if (res.data.length > 0 && !profesionalSeleccionado) {
            setProfesionalSeleccionado(res.data[0].id);
          }
        })
        .catch((e) => { 
          if (e.response && e.response.status === 401) handleLogout(); 
        });
    }
  }, [token, currentHash]);

  // Cargar citas cuando cambia el profesional
  useEffect(() => {
    if (token && currentHash === '#/admin' && profesionalSeleccionado) {
      cargarCitas();
    }
  }, [profesionalSeleccionado, activeView, token, currentHash]);

  // 3. FUNCIONES AUXILIARES
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    window.location.href = '/'; // Redirigir al home
  };

  const cargarCitas = () => {
    if (!profesionalSeleccionado) return;
    axios.get('https://cisd-api.onrender.com/api/appointments', {
      params: { professionalId: profesionalSeleccionado, start: '2025-01-01', end: '2026-12-31' }
    })
    .then((res) => {
      const eventos = res.data.map(cita => ({
        id: cita.id,
        title: cita.service ? `${cita.patient.name} - ${cita.service.name}` : 'Bloqueado',
        start: cita.startTime,
        end: cita.endTime,
        backgroundColor: obtenerColorProfesional(profesionalSeleccionado),
        extendedProps: { ...cita } 
      }));
      setCitas(eventos);
    });
  };

  const obtenerColorProfesional = (id) => {
    if (!profesionales.length) return '#3788d8';
    const prof = profesionales.find(p => p.id === parseInt(id));
    return prof ? prof.color : '#3788d8';
  }

  // Manejadores de Calendario
  const handleDateClick = (arg) => { setSelectedDate(arg.dateStr); setIsModalOpen(true); }
  const handleEventClick = (info) => { setSelectedEvent(info.event); setIsEventModalOpen(true); }
  const handleEventDrop = async (info) => {
    try { await axios.put(`https://cisd-api.onrender.com/api/appointments/${info.event.id}`, { newStartTime: info.event.start }); }
    catch { info.revert(); alert("Error al mover"); }
  };

  // 4. RENDERIZADO CONDICIONAL (AL FINAL)

  // A. MODO PACIENTE (Si la URL no es #/admin)
  if (currentHash !== '#/admin') {
    return <BookingWizard />;
  }

  // B. MODO ADMIN - LOGIN (Si es #/admin pero no hay token)
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <Login onLogin={(t) => setToken(t)} />
        <a href="/" className="mt-6 text-teal-600 font-medium hover:underline">← Volver a Reserva de Horas</a>
      </div>
    );
  }

  // C. MODO ADMIN - DASHBOARD (Si es #/admin y hay token)
  if (!profesionales) return <div className="h-screen flex items-center justify-center">Cargando sistema...</div>;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar activeView={activeView} setActiveView={setActiveView} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto relative">
        {activeView === 'agenda' && (
          <div className="p-6">
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center border border-gray-100">
               <div><h2 className="text-2xl font-bold text-gray-800">Agenda Médica</h2><p className="text-gray-500 text-sm">Vista semanal</p></div>
               <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border">
                 <span className="text-sm font-bold text-gray-600">Ver Agenda de:</span>
                 <select className="bg-transparent font-medium text-blue-700 outline-none" value={profesionalSeleccionado || ''} onChange={(e) => setProfesionalSeleccionado(e.target.value)}>
                   {profesionales.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
               </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="timeGridWeek" headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }} locale="es" slotMinTime="08:00:00" slotMaxTime="20:00:00" slotDuration="00:30:00" allDaySlot={false} height="auto" events={citas} editable={true} eventDrop={handleEventDrop} dateClick={handleDateClick} eventClick={handleEventClick} nowIndicator={true} />
            </div>
            <AppointmentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} professionalId={profesionalSeleccionado} startTime={selectedDate} onSuccess={cargarCitas} />
            <EventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} event={selectedEvent} onDeleteSuccess={cargarCitas} />
          </div>
        )}
        {activeView === 'patients' && <PatientsView />}
        {activeView === 'professionals' && <ProfessionalsView />}
        {activeView === 'services' && <ServicesView />}
        {activeView === 'schedule' && <ScheduleView />}
      </main>
    </div>
  );
}

export default App;