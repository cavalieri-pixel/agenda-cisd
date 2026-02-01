import React from 'react';

export default function EventModal({ isOpen, onClose, event }) {
  if (!isOpen || !event) return null;

  // Extraemos los datos ocultos en "extendedProps"
  const { patient, service } = event.extendedProps;
  
  // Generamos un link simple basado en el ID de la cita (Solución temporal rápida)
  // O usamos el link real si ya lo guardamos
  const videoLink = event.extendedProps.meetLink || `https://meet.jit.si/CISD-Cita-${event.id}`;

  const isTelemedicina = service.isTelemed || service.name.toLowerCase().includes('tele');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96 border-t-4 border-blue-500">
        <h2 className="text-xl font-bold mb-2 text-gray-800">{service.name}</h2>
        <p className="text-sm text-gray-500 mb-4">
          {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleTimeString()}
        </p>

        <div className="space-y-3">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-500 uppercase font-bold">Paciente</p>
            <p className="text-gray-800 font-medium">{patient.name}</p>
            <p className="text-sm text-gray-600">{patient.rut}</p>
            <p className="text-sm text-blue-600">{patient.email}</p>
          </div>

          {/* Botón de Videollamada (Solo si es telemedicina) */}
          {isTelemedicina && (
            <div className="mt-4">
              <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Sala de Videollamada</label>
              <a 
                href={videoLink} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
              >
                📹 Unirse a la Reunión
              </a>
              <p className="text-xs text-gray-400 mt-1 text-center">Enlace seguro generado automáticamente</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}