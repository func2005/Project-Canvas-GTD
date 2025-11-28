import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { dbService } from '@/shared/api/db';

interface LoginFormProps {
    onClose?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onClose }) => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const endpoint = isRegistering ? '/auth/register' : '/auth/login';
        const url = `http://localhost:3002${endpoint}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Authentication failed');
            }

            const data = await response.json();
            await login(data.user.username, data.access_token, data.user.id);

            // Only seed default data for new registrations
            if (isRegistering) {
                try {
                    const db = dbService.getDatabase();
                    await dbService.seedDefaultData(db);
                } catch (seedError) {
                    console.error('Failed to seed default data:', seedError);
                    // Don't block login if seeding fails, but log it
                }
            }

            if (onClose) onClose();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1e1e1e] p-8 rounded-xl border border-[#333] w-96 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    {isRegistering ? 'Create Account' : 'Welcome Back'}
                </h2>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#252525] border border-[#333] rounded p-2 text-white focus:border-blue-500 outline-none transition-colors"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#252525] border border-[#333] rounded p-2 text-white focus:border-blue-500 outline-none transition-colors"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition-colors"
                    >
                        {isRegistering ? 'Sign Up' : 'Log In'}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        {isRegistering ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};
