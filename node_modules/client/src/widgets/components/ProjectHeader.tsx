import React, { useState } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { LoginForm } from '../../features/auth/LoginForm';

interface ProjectHeaderProps {
    title: string;
    onTitleChange: (newTitle: string) => void;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ title, onTitleChange }) => {
    const { user, logout } = useAuth();
    const [showLogin, setShowLogin] = useState(false);

    return (
        <div className="flex items-center justify-between p-4 bg-[#1e1e1e] border-b border-[#333] h-16 select-none">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-white">{title}</h1>
            </div>

            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-sm font-medium text-white">{user.username}</div>
                            <div className="text-xs text-gray-500">ID: {user.id}</div>
                        </div>
                        <button
                            onClick={logout}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-sm transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowLogin(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
                    >
                        Login / Register
                    </button>
                )}
            </div>

            {showLogin && (
                <LoginForm onClose={() => setShowLogin(false)} />
            )}
        </div>
    );
};
