import React, { useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { OnboardingProvider, useOnboarding } from './components/onboarding/OnboardingContext';
import { OnboardingEngine } from './components/onboarding/OnboardingEngine';

const AppContent: React.FC = () => {
  const { setStep } = useOnboarding();

  // If user already has a valid session, skip init + login and go straight to dashboard
  useEffect(() => {
    const session = localStorage.getItem('geoenv_session');
    if (!session) return;

    // Verify session is still valid
    fetch('http://localhost:3001/api/auth/me', {
      headers: { 'X-Session-Id': session },
      credentials: 'include',
    })
      .then((r) => {
        if (r.ok) {
          setStep('COMPLETED'); // skip straight to dashboard
        } else {
          // Session expired — clear and show init + login
          localStorage.removeItem('geoenv_session');
          localStorage.removeItem('geoenv_user');
        }
      })
      .catch(() => {
        // Server unreachable — still show dashboard (offline mode)
        if (session) setStep('COMPLETED');
      });
  }, []);

  return (
    <div className="h-screen w-screen bg-[#0a0a0f] font-sans overflow-hidden flex flex-col">
      <Dashboard />
      <OnboardingEngine />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <OnboardingProvider>
      <AppContent />
    </OnboardingProvider>
  );
};

export default App;
