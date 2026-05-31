import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => (
  <div className="space-y-1">
    {label && <label className="text-[11px] font-medium text-gray-300">{label}</label>}
    <input
      className={`w-full px-3 py-2 border border-slate-600 rounded-lg text-sm text-white 
        placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
        transition-shadow bg-slate-800/50 ${error ? 'border-red-500/50' : ''} ${className}`}
      {...props}
    />
    {error && <p className="text-[10px] text-red-400">{error}</p>}
  </div>
);
