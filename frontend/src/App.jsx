import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';
import AppointmentModal from './components/AppointmentModal'; // <--- Importamos el modal

function App() {
  const [profesionales, setProfesionales] = useState([]);
  const [citas, setCitas] = useState([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState(null);
  
  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // 1. Cargar Profesionales
  useEffect(() => {
    axios.get('https://cisd-api.onrender.com/api/professionals')
      .then((response) => {
        setProfesionales(response.data);
        if (response.data.length > 0) {
          setProfesionalSeleccionado(response.data[0].id);
        }
      })
      .catch((error) => console.error("Error cargando profesionales:", error));
  }, []);

  // 2. Función para cargar citas (Reutilizable)
  const cargarCitas = () => {
    if (profesionalSeleccionado) {
      const start = '2025-01-01'; // En prod esto sería dinámico
      const end = '2026-12-31';
      
      axios.get('http://localhost:3000/api/appointments', {
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

  // Cargar citas cuando cambia el profesional
  useEffect(() => {
    cargarCitas();
  }, [profesionalSeleccionado]);

  const obtenerColorProfesional = (id) => {
    const prof = profesionales.find(p => p.id === parseInt(id));
    return prof ? prof.color : '#3788d8';
  }

  // 3. Al hacer clic en el calendario
  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr); // Guardamos la hora del clic
    setIsModalOpen(true);         // Abrimos el modal
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      
      {/* Encabezado */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex justify-between items-center border-l-4 border-blue-600">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Agenda CISD</h1>
          <p className="text-sm text-gray-500">Gestión de horas médicas</p>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700">Profesional:</span>
          <select 
            className="p-2 border border-gray-300 rounded shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
      </div>

      {/* Calendario */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek" // Vista semanal por defecto
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
          dateClick={handleDateClick} // <--- Aquí conectamos el clic
          nowIndicator={true}
        />
      </div>

      {/* El Modal Oculto (Aparece solo al hacer clic) */}
      <AppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        professionalId={profesionalSeleccionado}
        startTime={selectedDate}
        onSuccess={cargarCitas} // Recargar calendario al guardar
      />

    </div>
  );
}

export default App;