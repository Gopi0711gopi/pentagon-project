'use client';

import { useRef, useState } from 'react';

export default function FileUploader({ onUploadComplete }) {
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('ecomind_token');
            const res = await fetch('http://localhost:8000/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                if (onUploadComplete) onUploadComplete(data);
            } else {
                console.error("Upload failed", await res.text());
                if (onUploadComplete) onUploadComplete({ error: 'Upload failed' });
            }
        } catch (error) {
            console.error("Upload error", error);
            if (onUploadComplete) onUploadComplete({ error: 'Network error' });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".txt,.pdf,.csv,.md,.json"
                onChange={handleFileChange}
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: isUploading ? 'var(--text-muted)' : 'var(--text-primary)',
                    transition: 'all 0.2s',
                    opacity: isUploading ? 0.5 : 1
                }}
                onMouseOver={(e) => { if (!isUploading) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                onMouseOut={(e) => { if (!isUploading) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                title="Upload Document"
            >
                {isUploading ? '⏳' : '📎'}
            </button>
        </div>
    );
}
