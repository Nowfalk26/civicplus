import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
import { getEffectiveGoogleClientId } from './components/auth/GoogleOAuthModal';


const Root: React.FC = () => {
  const [clientId, setClientId] = useState<string>(getEffectiveGoogleClientId);

  useEffect(() => {
    const handleUpdate = () => {
      setClientId(getEffectiveGoogleClientId());
    };
    window.addEventListener('civics_google_client_id_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('civics_google_client_id_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return (
    <React.StrictMode>
      <GoogleOAuthProvider key={clientId} clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />);

