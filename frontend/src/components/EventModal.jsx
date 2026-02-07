import React, { useState } from 'react';
import axios from 'axios';

export default function EventModal({ isOpen, onClose, event, onDeleteSuccess }) {
  if (!isOpen || !event) return null;

  const [deleting, setDeleting] = useState(false);

  // Extraemos datos
  const { patient, service } = event.extendedProps;
  const isTelemedicina = service.isTelemed || service.name.toLowerCase().includes('tele');
  const videoLink = event.extendedProps.meetLink;

  // Función para borrar
  const handleDelete = async () => {
    // 1. Confirmación de seguridad
    if (!window.confirm(`¿Estás seguro de que quieres cancelar la cita de ${patient.name}? Esta acción borrará el evento de Google Calendar también.`)) {
      return;
    }

    setDeleting(true);
    try {
      // 2. Llamada al servidor
      await axios.delete(`https://cisd-api.onrender.com/api/appointments/${event.id}`);
      
      // 3. Éxito
      alert('Cita cancelada correctamente.');
      onDeleteSuccess(); // Avisamos a App.jsx para que recargue el calendario
      onClose(); // Cerramos el modal
      
    } catch (error) {
      console.error(error);
      alert('Error al cancelar la cita.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96 border-t-4 border-blue-500 relative">
        
        {/* Botón X para cerrar */}
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
          ✕
        </button>

        <h2 className="text-xl font-bold mb-1 text-gray-800">{service.name}</h2>
        <p className="text-sm text-blue-600 font-medium mb-4">
          {new Date(event.start).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
        </p>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded border border-gray-100">
            <p className="text-xs text-gray-500 uppercase font-bold">Paciente</p>
            <p className="text-gray-800 font-bold text-lg">{patient.name}</p>
            <p className="text-sm text-gray-600">RUT: {patient.rut}</p>
            <p className="text-sm text-blue-500">{patient.email}</p>
          </div>

          {/* Botón de Videollamada */}
          {isTelemedicina && videoLink && (
            <div>
              <a 
                href={videoLink} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition shadow-sm"
              >
                📹 Unirse a Google Meet
              </a>
            </div>
          )}
        </div>

        {/* Acciones del pie de página */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-3 py-2 rounded transition"
          >
            {deleting ? 'Cancelando...' : '🗑️ Cancelar Cita'}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 font-medium text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}