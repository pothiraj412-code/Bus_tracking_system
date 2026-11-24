/**
 * SignupPage.jsx — PSG iTech Bus Tracker
 * Multi-role registration: Student (2-step) | Driver | Admin
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    GraduationCap, Bus, ShieldCheck, Eye, EyeOff, ArrowRight,
    ArrowLeft, Check, MapPin, User, Phone, Lock, IdCard,
    BookOpen, Hash, ChevronDown, AlertCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './SignupPage.css';

/* ─── Helpers ──────────────────────────────────────────────────────────── */
const DEPARTMENTS = ['CSE', 'ECE', 'MECH', 'CIVIL', 'IT', 'AIDS', 'AIML', 'EEE', 'MCT', 'BME'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const FormInput = ({ label, icon: Icon, error, ...props }) => (
    <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {label}
        </label>
        <div className="relative">
            {Icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Icon size={16} />
                </div>
            )}
            <input
                {...props}
                className={`w-full h-11 ${Icon ? 'pl-9' : 'pl-4'} pr-4 rounded-xl bg-slate-900 border ${error ? 'border-red-500/70' : 'border-slate-700/60'} text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all`}
            />
        </div>
        {error && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    </div>
);

const FormSelect = ({ label, icon: Icon, children, error, ...props }) => (
    <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {label}
        </label>
        <div className="relative">
            {Icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <Icon size={16} />
                </div>
            )}
            <select
                {...props}
                className={`w-full h-11 ${Icon ? 'pl-9' : 'pl-4'} pr-8 rounded-xl bg-slate-900 border ${error ? 'border-red-500/70' : 'border-slate-700/60'} text-slate-100 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all appearance-none`}
            >
                {children}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
        {error && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
    </div>
);

const PasswordInput = ({ label, value, onChange, error, placeholder }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
            <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder || '••••••••'}
                    className={`w-full h-11 pl-9 pr-10 rounded-xl bg-slate-900 border ${error ? 'border-red-500/70' : 'border-slate-700/60'} text-slate-100 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all`}
                />
                <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{error}</p>}
        </div>
    );
};

/* ─── Stepper ──────────────────────────────────────────────────────────── */
const Stepper = ({ current, steps }) => (
    <div className="signup-stepper">
        {steps.map((label, i) => (
            <React.Fragment key={i}>
                <div className="step-node">
                    <div className={`step-circle ${i < current ? 'done' : i === current ? 'active' : ''}`}>
                        {i < current ? <Check size={16} /> : i + 1}
                    </div>
                    <span className={`step-label ${i < current ? 'done' : i === current ? 'active' : ''}`}>{label}</span>
                </div>
                {i < steps.length - 1 && (
                    <div className={`step-connector ${i < current ? 'done' : ''}`} />
                )}
            </React.Fragment>
        ))}
    </div>
);

/* ══════════════════════════════════════════════════════════════════════════
   STUDENT SIGNUP FORM (2-step)
══════════════════════════════════════════════════════════════════════════ */
const StudentForm = ({ onSuccess, onError, loading, setLoading }) => {
    const [step, setStep] = useState(0);
    const [routes, setRoutes] = useState([]);
    const [stops, setStops] = useState([]);
    const [loadingStops, setLoadingStops] = useState(false);
    const [form, setForm] = useState({
        full_name: '', roll_no: '', dept: '', year: '', phone: '',
        bus_route_id: '', stop_id: '', password: '', confirm_password: ''
    });
    const [errors, setErrors] = useState({});

    // Load routes on mount
    useEffect(() => {
        axios.get('/api/public/routes').then(r => setRoutes(r.data.data)).catch(() => {});
    }, []);

    // Load stops when route changes
    useEffect(() => {
        if (!form.bus_route_id) { setStops([]); return; }
        setLoadingStops(true);
        setForm(f => ({ ...f, stop_id: '' }));
        axios.get(`/api/public/routes/${form.bus_route_id}/stops`)
            .then(r => setStops(r.data.data))
            .catch(() => setStops([]))
            .finally(() => setLoadingStops(false));
    }, [form.bus_route_id]);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

    const validateStep0 = () => {
        const e = {};
        if (!form.full_name.trim()) e.full_name = 'Name is required';
        if (!form.roll_no.trim()) e.roll_no = 'Roll number is required';
        else if (!/^[0-9]{2}[A-Z]{2,4}[0-9]{3,4}$/i.test(form.roll_no.trim())) e.roll_no = 'Format: 22CS001';
        if (!form.dept) e.dept = 'Select department';
        if (!form.year) e.year = 'Select year';
        if (!form.phone.trim()) e.phone = 'Phone is required';
        else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = 'Enter valid 10-digit mobile number';
        if (!form.password) e.password = 'Password required';
        else if (form.password.length < 6) e.password = 'Minimum 6 characters';
        if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateStep1 = () => {
        const e = {};
        if (!form.bus_route_id) e.bus_route_id = 'Select a bus route';
        if (!form.stop_id) e.stop_id = 'Select your boarding stop';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleNext = () => { if (validateStep0()) setStep(1); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep1()) return;
        setLoading(true);
        try {
            await onSuccess({ role: 'student', ...form, stop_id: parseInt(form.stop_id) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Stepper current={step} steps={['Personal Info', 'Bus & Stop']} />

            <AnimatePresence mode="wait">
                {step === 0 && (
                    <motion.div key="step0"
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}>
                        <div className="grid grid-cols-2 gap-x-4">
                            <div className="col-span-2">
                                <FormInput label="Full Name" icon={User} placeholder="e.g. Vikram S"
                                    value={form.full_name} onChange={e => set('full_name', e.target.value)} error={errors.full_name} />
                            </div>
                            <FormInput label="Roll Number" icon={Hash} placeholder="e.g. 22CS001"
                                value={form.roll_no} onChange={e => set('roll_no', e.target.value.toUpperCase())} error={errors.roll_no} />
                            <FormInput label="Phone" icon={Phone} placeholder="9XXXXXXXXX" type="tel" maxLength={10}
                                value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} error={errors.phone} />
                            <FormSelect label="Department" icon={BookOpen} value={form.dept}
                                onChange={e => set('dept', e.target.value)} error={errors.dept}>
                                <option value="">Select dept</option>
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </FormSelect>
                            <FormSelect label="Year" icon={GraduationCap} value={form.year}
                                onChange={e => set('year', e.target.value)} error={errors.year}>
                                <option value="">Select year</option>
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </FormSelect>
                        </div>
                        <PasswordInput label="Password" value={form.password}
                            onChange={e => set('password', e.target.value)} error={errors.password} />
                        <PasswordInput label="Confirm Password" value={form.confirm_password}
                            onChange={e => set('confirm_password', e.target.value)} error={errors.confirm_password}
                            placeholder="Re-enter password" />
                        <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={handleNext}
                            className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                            Continue <ArrowRight size={18} />
                        </motion.button>
                    </motion.div>
                )}

                {step === 1 && (
                    <motion.div key="step1"
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.25 }}>
                        <FormSelect label="Bus Route" icon={Bus} value={form.bus_route_id}
                            onChange={e => set('bus_route_id', e.target.value)} error={errors.bus_route_id}>
                            <option value="">Select your bus route</option>
                            {routes.map(r => (
                                <option key={r.id} value={r.id}>{r.id.toUpperCase()} — {r.name} ({r.bus_number})</option>
                            ))}
                        </FormSelect>

                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Your Boarding Stop
                            </label>
                            {!form.bus_route_id && (
                                <p className="text-slate-600 text-sm text-center py-6 border border-dashed border-slate-800 rounded-xl">
                                    Select a route above to see stops
                                </p>
                            )}
                            {form.bus_route_id && loadingStops && (
                                <div className="flex items-center justify-center py-6 text-slate-500 gap-2">
                                    <Loader2 size={16} className="animate-spin" /> Loading stops...
                                </div>
                            )}
                            {form.bus_route_id && !loadingStops && stops.length > 0 && (
                                <div className="stops-list">
                                    {stops.map(stop => (
                                        <label key={stop.id}
                                            className={`stop-card ${form.stop_id == stop.id ? 'selected' : ''}`}>
                                            <input type="radio" name="stop" value={stop.id}
                                                checked={form.stop_id == stop.id}
                                                onChange={() => set('stop_id', stop.id)} />
                                            <span className="stop-seq">{stop.sequence_order}</span>
                                            <span className="stop-name">{stop.name}</span>
                                            {stop.name.includes('PSG iTech') && (
                                                <span className="stop-college">🎓 College</span>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            )}
                            {errors.stop_id && (
                                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} />{errors.stop_id}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 mt-2">
                            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => setStep(0)}
                                className="flex-1 h-12 rounded-xl border border-slate-700 text-slate-400 font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                                <ArrowLeft size={18} /> Back
                            </motion.button>
                            <motion.button type="submit" whileTap={{ scale: 0.98 }} disabled={loading}
                                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-60">
                                {loading ? <><Loader2 size={18} className="animate-spin" /> Registering…</> : <>Create Account <Check size={18} /></>}
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </form>
    );
};

/* ══════════════════════════════════════════════════════════════════════════
   DRIVER SIGNUP FORM
══════════════════════════════════════════════════════════════════════════ */
const DriverForm = ({ onSuccess, loading, setLoading }) => {
    const [buses, setBuses] = useState([]);
    const [form, setForm] = useState({
        full_name: '', employee_id: '', phone: '', license_no: '',
        assigned_bus_id: '', password: '', confirm_password: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        axios.get('/api/public/buses').then(r => setBuses(r.data.data)).catch(() => {});
    }, []);

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

    const validate = () => {
        const e = {};
        if (!form.full_name.trim()) e.full_name = 'Name is required';
        if (!form.employee_id.trim()) e.employee_id = 'Employee ID required';
        if (!form.phone.trim()) e.phone = 'Phone is required';
        else if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter valid 10-digit mobile number';
        if (!form.license_no.trim()) e.license_no = 'License number required';
        if (!form.assigned_bus_id) e.assigned_bus_id = 'Select assigned bus';
        if (!form.password) e.password = 'Password required';
        else if (form.password.length < 6) e.password = 'Minimum 6 characters';
        if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            await onSuccess({ role: 'driver', ...form, assigned_bus_id: parseInt(form.assigned_bus_id) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-x-4">
                <div className="col-span-2">
                    <FormInput label="Full Name" icon={User} placeholder="e.g. Ramesh Kumar"
                        value={form.full_name} onChange={e => set('full_name', e.target.value)} error={errors.full_name} />
                </div>
                <FormInput label="Employee ID" icon={IdCard} placeholder="e.g. DRV001"
                    value={form.employee_id} onChange={e => set('employee_id', e.target.value.toUpperCase())} error={errors.employee_id} />
                <FormInput label="Phone" icon={Phone} placeholder="9XXXXXXXXX" type="tel" maxLength={10}
                    value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} error={errors.phone} />
            </div>
            <FormInput label="Driving License Number" icon={IdCard} placeholder="e.g. TN38 2026000001"
                value={form.license_no} onChange={e => set('license_no', e.target.value.toUpperCase())} error={errors.license_no} />
            <FormSelect label="Assigned Bus" icon={Bus} value={form.assigned_bus_id}
                onChange={e => set('assigned_bus_id', e.target.value)} error={errors.assigned_bus_id}>
                <option value="">Select your assigned bus</option>
                {buses.map(b => (
                    <option key={b.id} value={b.id}>
                        {b.bus_number} — Route {b.route_id.toUpperCase()} ({b.route_name})
                        {b.available ? '' : ' [Assigned]'}
                    </option>
                ))}
            </FormSelect>
            <PasswordInput label="Password" value={form.password}
                onChange={e => set('password', e.target.value)} error={errors.password} />
            <PasswordInput label="Confirm Password" value={form.confirm_password}
                onChange={e => set('confirm_password', e.target.value)} error={errors.confirm_password}
                placeholder="Re-enter password" />
            <motion.button type="submit" whileTap={{ scale: 0.98 }} disabled={loading}
                className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-60">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Registering…</> : <>Create Driver Account <Check size={18} /></>}
            </motion.button>
        </form>
    );
};

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN SIGNUP FORM
══════════════════════════════════════════════════════════════════════════ */
const AdminForm = ({ onSuccess, loading, setLoading }) => {
    const [form, setForm] = useState({
        full_name: '', email: '', phone: '', admin_code: '', password: '', confirm_password: ''
    });
    const [errors, setErrors] = useState({});

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

    const validate = () => {
        const e = {};
        if (!form.full_name.trim()) e.full_name = 'Name is required';
        if (!form.email.trim()) e.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter valid email address';
        if (!form.phone.trim()) e.phone = 'Phone is required';
        else if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = 'Enter valid 10-digit mobile number';
        if (!form.admin_code) e.admin_code = 'Admin authorization code required';
        if (!form.password) e.password = 'Password required';
        else if (form.password.length < 6) e.password = 'Minimum 6 characters';
        if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            await onSuccess({ role: 'admin', ...form });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex gap-2 items-start">
                <ShieldCheck size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-300 leading-relaxed">
                    Admin registration requires an authorization code issued by PSG iTech IT Department.
                </p>
            </div>
            <FormInput label="Full Name" icon={User} placeholder="e.g. Dr. Priya Suresh"
                value={form.full_name} onChange={e => set('full_name', e.target.value)} error={errors.full_name} />
            <div className="grid grid-cols-2 gap-x-4">
                <FormInput label="Email" icon={IdCard} placeholder="name@psgitech.ac.in" type="email"
                    value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
                <FormInput label="Phone" icon={Phone} placeholder="9XXXXXXXXX" type="tel" maxLength={10}
                    value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} error={errors.phone} />
            </div>
            <PasswordInput label="Admin Authorization Code" value={form.admin_code}
                onChange={e => set('admin_code', e.target.value)} error={errors.admin_code}
                placeholder="Enter admin secret code" />
            <PasswordInput label="Password" value={form.password}
                onChange={e => set('password', e.target.value)} error={errors.password} />
            <PasswordInput label="Confirm Password" value={form.confirm_password}
                onChange={e => set('confirm_password', e.target.value)} error={errors.confirm_password}
                placeholder="Re-enter password" />
            <motion.button type="submit" whileTap={{ scale: 0.98 }} disabled={loading}
                className="w-full h-12 mt-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-amber-500/25 transition-all disabled:opacity-60">
                {loading ? <><Loader2 size={18} className="animate-spin" /> Registering…</> : <>Create Admin Account <ShieldCheck size={18} /></>}
            </motion.button>
        </form>
    );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
const ROLES = [
    { key: 'student', label: 'Student', icon: GraduationCap },
    { key: 'driver',  label: 'Driver',  icon: Bus },
    { key: 'admin',   label: 'Admin',   icon: ShieldCheck },
];

const SignupPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [role, setRole] = useState('student');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSuccess = async (formData) => {
        setError('');
        setSuccess('');
        try {
            const res = await axios.post('/api/auth/register', formData);
            const { user, token } = res.data.data;

            // Store token and update auth context via re-login flow
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setSuccess(`Welcome, ${user.full_name}! Redirecting to your dashboard…`);

            setTimeout(() => {
                const dest = user.role === 'student' ? '/student' : user.role === 'driver' ? '/driver' : '/admin';
                // Reload so AuthContext picks up the new token from localStorage
                window.location.href = dest;
            }, 1500);
        } catch (err) {
            const msg = err.response?.data?.message || 'Registration failed. Please try again.';
            setError(msg);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 font-sans">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-500/20 mb-4 rotate-3">
                        <Bus className="text-white h-7 w-7 -rotate-3" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">PSG iTech Bus Tracker</h1>
                    <p className="text-slate-500 text-sm mt-1">Create your account to get started</p>
                </div>

                {/* Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                    {/* Role selector tabs */}
                    <div className="role-tabs">
                        {ROLES.map(({ key, label, icon: Icon }) => (
                            <button key={key} type="button"
                                className={`role-tab ${role === key ? 'active' : ''}`}
                                onClick={() => { setRole(key); setError(''); setSuccess(''); }}>
                                <Icon size={15} />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Error / Success banners */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex gap-2 items-start">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                        {success && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm flex gap-2 items-start">
                                <Check size={16} className="mt-0.5 flex-shrink-0" />
                                {success}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Forms */}
                    <AnimatePresence mode="wait">
                        <motion.div key={role}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                            {role === 'student' && (
                                <StudentForm onSuccess={handleSuccess} onError={setError} loading={loading} setLoading={setLoading} />
                            )}
                            {role === 'driver' && (
                                <DriverForm onSuccess={handleSuccess} loading={loading} setLoading={setLoading} />
                            )}
                            {role === 'admin' && (
                                <AdminForm onSuccess={handleSuccess} loading={loading} setLoading={setLoading} />
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Login link */}
                    <p className="text-center text-slate-500 text-sm mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-700 mt-6">
                    © 2026 PSG Institute of Technology and Applied Research, Coimbatore
                </p>
            </motion.div>
        </div>
    );
};

export default SignupPage;

