import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Lock, User, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle, Mail } from 'lucide-react';
import { useOnboarding } from './OnboardingContext';
import { MagicCard } from '@/registry/magicui/magic-card';

const API = 'http://localhost:3001';

type Screen = 'login' | 'forgot' | 'forgot-sent';

export const LoginScreen: React.FC = () => {
    const { setStep, setUser } = useOnboarding();
    const [screen, setScreen] = useState<Screen>('login');
    const [email, setEmail] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed. Check your credentials.');
                return;
            }

            localStorage.setItem('geoenv_session', data.session_id);
            setUser({ username: data.user.username, role: data.user.role });
            setStep('COMPLETED');
        } catch {
            setError('Cannot reach server. Make sure node server.js is running on :3001.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgot = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await new Promise((r) => setTimeout(r, 1200));
        setLoading(false);
        setScreen('forgot-sent');
    };

    /* ── Roti palette tokens ── */
    const R = {
        50:  '#F9F7ED',
        100: '#F1EDD1',
        200: '#E4DCA7',
        300: '#D4C575',
        400: '#C5AE4D',
        500: '#BFA440',
        600: '#977B30',
        700: '#775D29',
        800: '#644D27',
        900: '#564226',
        950: '#312312',
    };

    const inputStyle: React.CSSProperties = {
        background: R[50],
        border: `1.5px solid ${R[200]}`,
        color: R[950],
        outline: 'none',
        width: '100%',
        borderRadius: '12px',
        padding: '12px 12px 12px 36px',
        fontSize: '13px',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = R[500];
        e.target.style.boxShadow = `0 0 0 3px rgba(191,164,64,0.15)`;
    };
    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = R[200];
        e.target.style.boxShadow = 'none';
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden"
            style={{
                background: `linear-gradient(145deg, ${R[50]} 0%, ${R[100]} 40%, #f5f0e2 70%, ${R[50]} 100%)`,
                fontFamily: "'Inter', system-ui, sans-serif",
            }}
        >
            {/* ── Decorative BG ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Warm grid */}
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `linear-gradient(to right, rgba(191,164,64,0.07) 1px, transparent 1px),
                                          linear-gradient(to bottom, rgba(191,164,64,0.07) 1px, transparent 1px)`,
                        backgroundSize: '48px 48px',
                    }}
                />
                {/* Soft Roti glow orbs */}
                <div
                    className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
                    style={{ background: `radial-gradient(circle, rgba(197,174,77,0.18) 0%, transparent 65%)` }}
                />
                <div
                    className="absolute -bottom-40 -right-32 w-[420px] h-[420px] rounded-full"
                    style={{ background: `radial-gradient(circle, rgba(151,123,48,0.12) 0%, transparent 65%)` }}
                />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full"
                    style={{ background: `radial-gradient(ellipse, rgba(212,197,117,0.08) 0%, transparent 70%)` }}
                />
                {/* Floating Roti 500 circle ornament */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                    className="absolute top-8 right-12 w-24 h-24 rounded-full opacity-[0.06]"
                    style={{ border: `2px solid ${R[500]}` }}
                />
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
                    className="absolute bottom-12 left-8 w-16 h-16 rounded-full opacity-[0.07]"
                    style={{ border: `2px solid ${R[600]}` }}
                />
            </div>

            <div className="relative z-10 w-[440px]">
                {/* ── Logo ── */}
                <div className="flex flex-col items-center mb-8">
                    <motion.div
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                        style={{
                            background: `linear-gradient(135deg, ${R[700]} 0%, ${R[500]} 100%)`,
                            boxShadow: `0 8px 32px rgba(119,93,41,0.30), 0 2px 8px rgba(119,93,41,0.18)`,
                        }}
                    >
                        <Activity size={28} color={R[100]} />
                    </motion.div>
                    <h1
                        className="text-xl font-black tracking-[0.3em] uppercase"
                        style={{ color: R[950] }}
                    >
                        GeoEnv-IP
                    </h1>
                    <p
                        className="text-[10px] font-bold tracking-[0.2em] uppercase mt-1"
                        style={{ color: R[600] }}
                    >
                        Environmental Intelligence Platform
                    </p>
                </div>

                {/* ── Card ── */}
                <MagicCard
                    gradientColor="rgba(191, 164, 64, 0.15)"
                    gradientSize={350}
                    gradientOpacity={0.85}
                    className="rounded-2xl overflow-hidden"
                    style={{
                        background: 'rgba(255, 255, 255, 0.92)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: `1px solid rgba(197, 174, 77, 0.25)`,
                        boxShadow: `0 20px 60px rgba(119,93,41,0.12), 0 4px 16px rgba(119,93,41,0.08)`,
                    }}
                >
                    <AnimatePresence mode="wait">

                        {/* ─────────── LOGIN ─────────── */}
                        {screen === 'login' && (
                            <motion.div
                                key="login"
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 16 }}
                                transition={{ duration: 0.22 }}
                                className="p-8"
                            >
                                {/* Card top accent bar */}
                                <div
                                    className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl"
                                    style={{
                                        background: `linear-gradient(90deg, ${R[400]}, ${R[500]}, ${R[300]}, ${R[500]})`,
                                        backgroundSize: '200% 100%',
                                        animation: 'shimmer-bar 3s linear infinite',
                                    }}
                                />

                                <div className="mb-6">
                                    <h2
                                        className="text-base font-black uppercase tracking-widest mb-1"
                                        style={{ color: R[950] }}
                                    >
                                        Operator Login
                                    </h2>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 mb-5 p-3 rounded-xl text-[11px] font-semibold"
                                        style={{
                                            background: 'rgba(220,38,38,0.06)',
                                            border: '1px solid rgba(220,38,38,0.20)',
                                            color: '#dc2626',
                                        }}
                                    >
                                        <AlertCircle size={14} className="flex-shrink-0" />
                                        {error}
                                    </motion.div>
                                )}

                                <form onSubmit={handleLogin} className="space-y-4">
                                    {/* Email */}
                                    <div>
                                        <label
                                            className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                                            style={{ color: R[700] }}
                                        >
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <User
                                                size={14}
                                                className="absolute left-3 top-1/2 -translate-y-1/2"
                                                style={{ color: R[400] }}
                                            />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="admin@weatherintel.local"
                                                required
                                                autoComplete="email"
                                                style={inputStyle}
                                                onFocus={handleInputFocus}
                                                onBlur={handleInputBlur}
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label
                                                className="block text-[10px] font-bold uppercase tracking-widest"
                                                style={{ color: R[700] }}
                                            >
                                                Password
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => { setScreen('forgot'); setError(''); }}
                                                className="text-[10px] font-semibold transition-colors"
                                                style={{ color: R[600] }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = R[800])}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = R[600])}
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <Lock
                                                size={14}
                                                className="absolute left-3 top-1/2 -translate-y-1/2"
                                                style={{ color: R[400] }}
                                            />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Enter password"
                                                required
                                                autoComplete="current-password"
                                                style={{ ...inputStyle, paddingRight: '40px' }}
                                                onFocus={handleInputFocus}
                                                onBlur={handleInputBlur}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                                                style={{ color: R[400] }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = R[600])}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = R[400])}
                                            >
                                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit */}
                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full mt-2 py-3 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] transition-all flex items-center justify-center gap-2"
                                        style={{
                                            background: loading
                                                ? `rgba(191,164,64,0.4)`
                                                : `linear-gradient(135deg, ${R[700]} 0%, ${R[500]} 60%, ${R[400]} 100%)`,
                                            color: R[50],
                                            boxShadow: loading
                                                ? 'none'
                                                : `0 4px 18px rgba(119,93,41,0.32)`,
                                        }}
                                    >
                                        {loading ? (
                                            <>
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                                />
                                                Authenticating...
                                            </>
                                        ) : (
                                            'Sign In'
                                        )}
                                    </motion.button>
                                </form>


                            </motion.div>
                        )}

                        {/* ─────────── FORGOT PASSWORD ─────────── */}
                        {screen === 'forgot' && (
                            <motion.div
                                key="forgot"
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -16 }}
                                transition={{ duration: 0.22 }}
                                className="p-8"
                            >
                                <button
                                    type="button"
                                    onClick={() => { setScreen('login'); setError(''); }}
                                    className="flex items-center gap-1.5 text-[11px] font-semibold mb-6 transition-colors"
                                    style={{ color: R[500] }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = R[700])}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = R[500])}
                                >
                                    <ArrowLeft size={13} /> Back to Login
                                </button>

                                <div className="mb-6">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                                        style={{ background: `rgba(197,174,77,0.14)` }}
                                    >
                                        <Mail size={22} style={{ color: R[600] }} />
                                    </div>
                                    <h2
                                        className="text-base font-black uppercase tracking-widest mb-1"
                                        style={{ color: R[950] }}
                                    >
                                        Reset Password
                                    </h2>
                                    <p className="text-[11px] leading-relaxed" style={{ color: R[600] }}>
                                        Enter your email and we'll send you a secure reset link.
                                    </p>
                                </div>

                                <form onSubmit={handleForgot} className="space-y-4">
                                    <div>
                                        <label
                                            className="block text-[10px] font-bold uppercase tracking-widest mb-2"
                                            style={{ color: R[700] }}
                                        >
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <Mail
                                                size={14}
                                                className="absolute left-3 top-1/2 -translate-y-1/2"
                                                style={{ color: R[400] }}
                                            />
                                            <input
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                placeholder="your@email.com"
                                                required
                                                autoComplete="email"
                                                style={inputStyle}
                                                onFocus={handleInputFocus}
                                                onBlur={handleInputBlur}
                                            />
                                        </div>
                                    </div>

                                    <motion.button
                                        type="submit"
                                        disabled={loading}
                                        whileTap={{ scale: 0.98 }}
                                        className="w-full py-3 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] flex items-center justify-center gap-2 transition-all"
                                        style={{
                                            background: loading
                                                ? `rgba(191,164,64,0.4)`
                                                : `linear-gradient(135deg, ${R[700]} 0%, ${R[500]} 60%, ${R[400]} 100%)`,
                                            color: R[50],
                                            boxShadow: loading ? 'none' : `0 4px 18px rgba(119,93,41,0.32)`,
                                        }}
                                    >
                                        {loading ? (
                                            <>
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                                />
                                                Sending...
                                            </>
                                        ) : (
                                            'Send Reset Link'
                                        )}
                                    </motion.button>
                                </form>
                            </motion.div>
                        )}

                        {/* ─────────── CONFIRMATION ─────────── */}
                        {screen === 'forgot-sent' && (
                            <motion.div
                                key="forgot-sent"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                className="p-8 text-center"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                                    style={{ background: `rgba(197,174,77,0.16)` }}
                                >
                                    <CheckCircle size={32} style={{ color: R[500] }} />
                                </motion.div>
                                <h2
                                    className="text-base font-black uppercase tracking-widest mb-2"
                                    style={{ color: R[950] }}
                                >
                                    Email Sent!
                                </h2>
                                <p
                                    className="text-[12px] leading-relaxed mb-6"
                                    style={{ color: R[600] }}
                                >
                                    A password reset link has been sent to{' '}
                                    <span className="font-bold" style={{ color: R[700] }}>
                                        {forgotEmail}
                                    </span>
                                    . Check your inbox and follow the instructions.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setScreen('login'); setForgotEmail(''); }}
                                    className="w-full py-3 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] transition-all"
                                    style={{
                                        background: `linear-gradient(135deg, ${R[700]} 0%, ${R[500]} 60%, ${R[400]} 100%)`,
                                        color: R[50],
                                        boxShadow: `0 4px 18px rgba(119,93,41,0.32)`,
                                    }}
                                >
                                    Back to Login
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </MagicCard>

                <p
                    className="text-center text-[9px] mt-4 uppercase tracking-widest"
                    style={{ color: R[500] }}
                >
                    GeoEnv-IP v2.4.1 · All access is audited
                </p>
            </div>

            {/* Shimmer animation for top bar */}
            <style>{`
              @keyframes shimmer-bar {
                0%   { background-position: 0%   50%; }
                100% { background-position: 200% 50%; }
              }
            `}</style>
        </motion.div>
    );
};
