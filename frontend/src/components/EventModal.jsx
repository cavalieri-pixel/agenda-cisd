import React from 'react';
import axios from 'axios';

const API_URL = 'https://cisd-api.onrender.com/api';

export default function EventModal({ isOpen, onClose, event, onDeleteSuccess }) {
  if (!isOpen || !event) return null;

  // Los datos reales de la base de datos vienen en extendedProps
  const data = event.extendedProps;
  const isBlock = data.status === 'BLOCKED';

  const handleDelete = async () => {
    if (confirm(isBlock ? '¿Eliminar este bloqueo de horario?' : '¿Eliminar esta cita y liberar el horario?')) {
      try {
        await axios.delete(`${API_URL}/appointments/${data.id}`);
        onDeleteSuccess();
        onClose();
      } catch (error) {
        alert('Error al eliminar');
      }
    }
  };

  // Formatear fechas
  const start = event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const end = event.end ? event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl relative">
        
        {/* Botón Cerrar */}
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

        {/* --- CASO 1: ES UN BLOQUEO --- */}
        {isBlock ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ⛔
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{data.title || 'Horario Bloqueado'}</h2>
            <p className="text-red-600 font-bold mb-6">{start} - {end}</p>
            
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500 mb-6">
              Este horario no está disponible para reservas públicas.
            </div>

            <button 
              onClick={handleDelete}
              className="w-full py-3 bg-white border-2 border-red-100 text-red-600 font-bold rounded-lg hover:bg-red-50 transition"
            >
              Eliminar Bloqueo
            </button>
          </div>
        ) : (
          /* --- CASO 2: ES UNA CITA NORMAL --- */
          <div>
            <div className="flex items-center gap-3 mb-4 border-b pb-4">
              <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-xl">
                {data.patient?.name?.charAt(0) || '?'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{data.patient?.name}</h2>
                <p className="text-sm text-gray-500">{data.patient?.email}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Tratamiento:</span>
                <span className="font-bold text-gray-800">{data.service?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Horario:</span>
                <span className="font-bold text-teal-700">{start} - {end}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Modalidad:</span>
                <span className="font-bold text-gray-800">
                  {data.service?.isTelemed ? '💻 Online (Meet)' : '🏥 Presencial'}
                </span>
              </div>
              {data.service?.price > 0 && (
                 <div className="flex justify-between">
                   <span className="text-gray-500 text-sm">Valor:</span>
                   <span className="font-bold text-gray-800">${data.service?.price.toLocaleString('es-CL')}</span>
                 </div>
              )}
              {data.meetLink && (
                <div className="mt-2">
                  <a href={data.meetLink} target="_blank" rel="noreferrer" className="block w-full text-center py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">
                    Unirse a Google Meet
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 border rounded text-gray-600 hover:bg-gray-50">Cerrar</button>
              <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700">Cancelar Cita</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}