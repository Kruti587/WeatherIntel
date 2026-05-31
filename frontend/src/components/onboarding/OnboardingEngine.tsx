import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useOnboarding } from './OnboardingContext';
import { InitializationSequence } from './InitializationSequence';
import { LoginScreen } from './LoginScreen';

export const OnboardingEngine: React.FC = () => {
  const { currentStep, setStep, isComplete } = useOnboarding();

  if (isComplete && currentStep !== 'INITIALIZING' && currentStep !== 'LOGIN') return null;

  return (
    <AnimatePresence mode="wait">
      {currentStep === 'INITIALIZING' && (
        <InitializationSequence onComplete={() => setStep('LOGIN')} />
      )}

      {currentStep === 'LOGIN' && (
        <LoginScreen />
      )}
    </AnimatePresence>
  );
};
