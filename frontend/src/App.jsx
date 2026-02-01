import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import AppointmentModal from './components/AppointmentModal';
import Login from './components/Login';
import EventModal from './components/EventModal'; // <--- IMPORTANTE: Importamos el nuevo modal

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  // Estado de datos
  const [profesionales, setProfesionales] = useState(null); 
  const [citas, setCitas] = useState([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  
  // Estado para Crear Cita (Modal de Agendar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Estado para Ver Detalles (Modal de Video/Info)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- 1. FUNCIÓN DE SALIDA (LOGOUT) ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload(); 
  };

  // --- 2. CARGAR DATOS (Solo si hay token) ---
  useEffect(() => {
    if (token) {
      axios.get('https://cisd-api.onrender.com/api/professionals')
        .then((response) => {
          setProfesionales(response.data);
          if (response.data.length > 0) {
            setProfesionalSeleccionado(response.data[0].id);
          }
        })
        .catch((error) => {
          console.error("Error cargando profesionales:", error);
          if (error.response && error.response.status === 401) {
            handleLogout();
          }
        });
    }
  }, [token]);

  // --- 3. CARGAR CITAS ---
  const cargarCitas = () => {
    if (profesionalSeleccionado) {
      const start = '2025-01-01'; 
      const end = '2026-12-31';
      
      axios.get('https://cisd-api.onrender.com/api/appointments', {
        params: { professionalId: profesionalSeleccionado, start, end }
      })
      .then((response) => {
        const eventosFormateados = response.data.map(cita => ({
          id: cita.id,
          title: cita.service ? `${cita.patient.name} - ${cita.service.name}` : 'Bloqueado',
          start: cita.startTime,
          end: cita.endTime,
          backgroundColor: obtenerColorProfesional(profesionalSeleccionado),
          borderColor: obtenerColorProfesional(profesionalSeleccionado),
          extendedProps: { ...cita } // <--- Guardamos toda la info oculta para usarla en el modal
        }));
        setCitas(eventosFormateados);
      })
      .catch(error => console.error("Error cargando citas:", error));
    }
  };

  useEffect(() => {
    cargarCitas();
  }, [profesionalSeleccionado]);

  const obtenerColorProfesional = (id) => {
    if (!profesionales) return '#3788d8';
    const prof = profesionales.find(p => p.id === parseInt(id));
    return prof ? prof.color : '#3788d8';
  }

  // --- MANEJADORES DE CLIC ---

  // Clic en espacio vacío -> Crear Cita
  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    setIsModalOpen(true);
  }

  // Clic en evento existente -> Ver Detalles/Video
  const handleEventClick = (clickInfo) => {
    setSelectedEvent(clickInfo.event);
    setIsEventModalOpen(true);
  }

  // --- RENDERIZADO CONDICIONAL ---

  if (!token) {
    return <Login onLogin={setToken} />;
  }

  if (!profesionales) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Conectando con CISD...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row justify-between items-center border-l-4 border-blue-600 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Agenda CISD</h1>
          <p className="text-sm text-gray-500">Sistema Seguro</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700 hidden sm:inline">Ver agenda de:</span>
            <select 
              className="p-2 border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              value={profesionalSeleccionado || ''}
              onChange={(e) => setProfesionalSeleccionado(e.target.value)}
            >
              {profesionales.map(prof => (
                <option key={prof.id} value={prof.id}>
                  {prof.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 px-3 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locale="es"
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          allDaySlot={false}
          height="auto"
          events={citas}
          dateClick={handleDateClick}  // Clic en blanco
          eventClick={handleEventClick} // Clic en evento (NUEVO)
          nowIndicator={true}
        />
      </div>

      {/* Modal para Crear Cita */}
      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        professionalId={profesionalSeleccionado}
        startTime={selectedDate}
        onSuccess={cargarCitas} 
      />

      {/* Modal para Ver Detalles y Video (NUEVO) */}
      <EventModal 
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        event={selectedEvent}
      />

    </div>
  );
}

export default App;