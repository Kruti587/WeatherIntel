import React, { createContext, useContext, useState, useEffect } from 'react';

export type OnboardingStep =
  | 'INITIALIZING'
  | 'LOGIN'
  | 'WELCOME'
  | 'MAP_NAVIGATION'
  | 'LAYER_CONTROL'
  | 'TELEMETRY_PANEL'
  | 'MISSION_TIMELINE'
  | 'ANOMALY_LOGS'
  | 'COMPLETED';

interface OnboardingContextType {
  currentStep: OnboardingStep;
  setStep: (step: OnboardingStep) => void;
  isComplete: boolean;
  progress: number;
  user: { username: string; role: string } | null;
  setUser: (user: { username: string; role: string } | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('INITIALIZING');
  const [isComplete, setIsComplete] = useState(false);
  const [user, setUser] = useState<{ username: string; role: string } | null>(() => {
    try {
      const stored = localStorage.getItem('geoenv_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const steps: OnboardingStep[] = [
    'INITIALIZING',
    'LOGIN',
    'WELCOME',
    'MAP_NAVIGATION',
    'LAYER_CONTROL',
    'TELEMETRY_PANEL',
    'MISSION_TIMELINE',
    'ANOMALY_LOGS',
    'COMPLETED'
  ];

  const progress = (steps.indexOf(currentStep) / (steps.length - 1)) * 100;

  useEffect(() => {
    if (currentStep === 'COMPLETED') {
      setIsComplete(true);
      localStorage.setItem('geoenv_onboarding_complete', 'true');
    }
  }, [currentStep]);

  const handleSetUser = (u: { username: string; role: string } | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem('geoenv_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('geoenv_user');
      localStorage.removeItem('geoenv_session');
    }
  };

  return (
    <OnboardingContext.Provider value={{ currentStep, setStep: setCurrentStep, isComplete, progress, user, setUser: handleSetUser }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
};
