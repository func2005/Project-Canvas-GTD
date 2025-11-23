import React from 'react';

export const Button = ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => {
    return <button onClick={onClick} disabled={disabled} style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}>{children}</button>;
};

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
    return <input {...props} style={{ padding: '8px', borderRadius: '44px', border: '1px solid #ccc' }
    } />;
};
