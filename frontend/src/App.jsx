import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import AppointmentModal from './components/AppointmentModal';
import Login from './components/Login'; // <--- Importamos el Login

function App() {
  // Estado para saber si estamos logueados (buscamos en la memoria del navegador)
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const [profesionales, setProfesionales] = useState([]);
  const [citas, setCitas] = useState([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // --- SI NO HAY TOKEN, MOSTRAMOS EL LOGIN ---
  if (!token) {
    return <Login onLogin={setToken} />;
  }

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('token'); // Borrar credencial
    setToken(null); // Volver al login
  };

  // 1. Cargar Profesionales
  useEffect(() => {
    if (token) {
      axios.get('https://cisd-api.onrender.com/api/professionals')
        .then((response) => {
          setProfesionales(response.data);
          if (response.data.length > 0) {
            setProfesionalSeleccionado(response.data[0].id);
          }
        })
        .catch((error) => console.error("Error cargando profesionales:", error));
    }
  }, [token]);

  // 2. Función para cargar citas
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
    const prof = profesionales.find(p => p.id === parseInt(id));
    return prof ? prof.color : '#3788d8';
  }

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    setIsModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      
      {/* Encabezado con Botón de Salir */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex justify-between items-center border-l-4 border-blue-600">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Agenda CISD</h1>
          <p className="text-sm text-gray-500">Sistema Seguro</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Selector de Profesional */}
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

          {/* Botón Cerrar Sesión */}
          <button 
            onClick={handleLogout}
            className="text-sm text-red-600 hover:text-red-800 font-medium border border-red-200 px-3 py-1 rounded hover:bg-red-50"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Calendario */}
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
          dateClick={handleDateClick}
          nowIndicator={true}
        />
      </div>

      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        professionalId={profesionalSeleccionado}
        startTime={selectedDate}
        onSuccess={cargarCitas} 
      />

    </div>
  );
}

export default App;