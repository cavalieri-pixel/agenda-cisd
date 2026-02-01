import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import AppointmentModal from './components/AppointmentModal';
import Login from './components/Login';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [profesionales, setProfesionales] = useState([]);
  const [citas, setCitas] = useState([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  
  // Nuevo estado para evitar la pantalla blanca
  const [loadingData, setLoadingData] = useState(false); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // --- 1. SI NO HAY TOKEN, LOGIN ---
  if (!token) {
    return <Login onLogin={setToken} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setProfesionales([]); // Limpiamos datos al salir
  };

  // --- 2. CARGAR PROFESIONALES (Al iniciar sesión) ---
  useEffect(() => {
    if (token) {
      setLoadingData(true); // Activamos "Cargando..."
      axios.get('https://cisd-api.onrender.com/api/professionals')
        .then((response) => {
          setProfesionales(response.data);
          if (response.data.length > 0) {
            setProfesionalSeleccionado(response.data[0].id);
          }
        })
        .catch((error) => console.error("Error cargando profesionales:", error))
        .finally(() => setLoadingData(false)); // Desactivamos al terminar
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

  // --- 4. PANTALLA DE CARGA (Para evitar el error #310) ---
  if (loadingData || profesionales.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando Agenda CISD...</p>
        </div>
      </div>
    );
  }

  // --- 5. LA APLICACIÓN PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      
      {/* Encabezado */}
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