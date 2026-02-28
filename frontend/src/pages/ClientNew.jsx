import { useNavigate } from 'react-router-dom'
import ClientForm from '../components/ClientForm'

export default function ClientNew() {
  const navigate = useNavigate()
  return (
    <ClientForm
      onClose={() => navigate('/')}
      onSaved={client => navigate(`/clients/${client.id}`)}
      inline
    />
  )
}
