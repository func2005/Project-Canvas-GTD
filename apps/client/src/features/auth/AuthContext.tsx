import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../../shared/api/db';

interface User {
    id: string;
    username: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, token: string, userId: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isDbReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isDbReady, setIsDbReady] = useState(false);

    useEffect(() => {
        // Restore session from localStorage
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');

        if (storedToken && storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setToken(storedToken);
            setUser(parsedUser);
            // Initialize DB with user ID
            dbService.initialize(parsedUser.id)
                .then(() => setIsDbReady(true))
                .catch(console.error);
        }

        // Listen for unauthorized events (401) from DB sync
        const handleUnauthorized = () => {
            console.log('Received auth:unauthorized event, logging out...');
            logout();
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);

        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, []);

    const login = async (username: string, newToken: string, userId: string) => {
        const newUser = { id: userId, username };
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('auth_user', JSON.stringify(newUser));

        // Re-initialize DB for this user
        await dbService.initialize(userId);
        setIsDbReady(true);
    };

    const logout = async () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setIsDbReady(false);

        // Close DB
        await dbService.destroy();
        window.location.reload(); // Force reload to clear state
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, isDbReady }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
