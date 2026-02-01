import { useState, useEffect } from 'react';
import axios from 'axios';

export default function AppointmentModal({ isOpen, onClose, professionalId, startTime, onSuccess }) {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    rut: '',
    patientName: '',
    patientEmail: '',
    serviceCode: ''
  });
  const [loading, setLoading] = useState(false);

  // 1. Cargar la lista de servicios médicos al abrir
  useEffect(() => {
    if (isOpen) {
      axios.get('https://cisd-api.onrender.com/api/services')
        .then(res => {
          setServices(res.data);
          if (res.data.length > 0) {
            setFormData(prev => ({ ...prev, serviceCode: res.data[0].code }));
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  // 2. Manejar cambios en los inputs
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Guardar la cita
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('https://cisd-api.onrender.com/api/appointments', {
        professionalId,
        rut: formData.rut,
        patientName: formData.patientName,
        patientEmail: formData.patientEmail,
        serviceCode: formData.serviceCode,
        startTime: startTime // La hora donde hiciste clic
      });
      alert('✅ Cita agendada con éxito');
      onSuccess(); // Recargar el calendario
      onClose(); // Cerrar modal
    } catch (error) {
      alert('❌ Error al agendar: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Nueva Cita</h2>
        <p className="text-sm text-gray-500 mb-4">
          Fecha: {new Date(startTime).toLocaleString()}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">RUT Paciente</label>
            <input
              name="rut"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              placeholder="12.345.678-9"
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
            <input
              name="patientName"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              name="patientEmail"
              type="email"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Servicio</label>
            <select
              name="serviceCode"
              className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              onChange={handleChange}
              value={formData.serviceCode}
            >
              {services.map(s => (
                <option key={s.id} value={s.code}>
                  {s.name} ({s.durationMin} min)
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}