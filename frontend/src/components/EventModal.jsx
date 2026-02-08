import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function EventModal({ isOpen, onClose, event, onDeleteSuccess }) {
  if (!isOpen || !event) return null;

  const [deleting, setDeleting] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  
  const { patient, service } = event.extendedProps;
  
  // Cargamos la nota existente o cadena vacía
  const [note, setNote] = useState(event.extendedProps.clinicalNote || '');

  useEffect(() => {
    setNote(event.extendedProps.clinicalNote || '');
  }, [event]);

  const isTelemedicina = service.isTelemed || service.name.toLowerCase().includes('tele');
  const videoLink = event.extendedProps.meetLink;

  // Guardar Ficha
  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await axios.put(`https://cisd-api.onrender.com/api/appointments/${event.id}`, {
        clinicalNote: note
      });
      alert('Evolución guardada correctamente ✅');
      onDeleteSuccess(); // Refresca el calendario
    } catch (error) {
      alert('Error al guardar la evolución ❌');
    } finally {
      setSavingNote(false);
    }
  };

  // Borrar Cita
  const handleDelete = async () => {
    if (!window.confirm(`¿Estás seguro de que quieres cancelar la cita de ${patient.name}?`)) return;
    setDeleting(true);
    try {
      await axios.delete(`https://cisd-api.onrender.com/api/appointments/${event.id}`);
      alert('Cita cancelada correctamente.');
      onDeleteSuccess();
      onClose();
    } catch (error) {
      alert('Error al cancelar la cita.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md border-t-4 border-blue-600 relative flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
            <h2 className="text-xl font-bold text-gray-800">{service.name}</h2>
            <p className="text-sm text-blue-600 font-medium">
            {new Date(event.start).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
            </p>
        </div>

        <div className="p-6 overflow-y-auto">
            <div className="bg-gray-50 p-3 rounded border border-gray-100 mb-4">
                <p className="text-xs text-gray-500 uppercase font-bold">Paciente</p>
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-gray-800 font-bold text-lg">{patient.name}</p>
                        <p className="text-sm text-gray-600">{patient.email}</p>
                    </div>
                    <div className="text-right">
                         <p className="text-xs font-mono bg-white px-2 py-1 rounded border">{patient.rut}</p>
                    </div>
                </div>
            </div>

            {isTelemedicina && videoLink && (
                <div className="mb-6">
                <a href={videoLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition shadow-sm font-medium">
                    📹 Unirse a Google Meet
                </a>
                </div>
            )}

            <div className="mb-2">
                <label className="block text-sm font-bold text-gray-700 mb-2 flex justify-between">
                    <span>📝 Evolución / Nota Clínica</span>
                </label>
                <textarea 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-700 min-h-[120px]"
                    placeholder="Escribe aquí los detalles de la sesión, progreso..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </div>
            
            <button 
                onClick={handleSaveNote}
                disabled={savingNote}
                className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
                {savingNote ? 'Guardando...' : '💾 Guardar Evolución'}
            </button>
        </div>

        <div className="p-4 bg-gray-50 border-t flex justify-between items-center rounded-b-lg">
          <button onClick={handleDelete} disabled={deleting} className="text-red-500 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-3 py-2 rounded transition">
            {deleting ? 'Cancelando...' : '🗑️ Cancelar Cita'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-gray-600 bg-white border rounded hover:bg-gray-100 font-medium text-sm">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}