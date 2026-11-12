import React from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { OFFICIAL_PHONE } from '../constants';
import OptimizedImage from './OptimizedImage';

interface Post {
    id: string;
    title: string;
    status: string;
    imageUrl?: string;
    description?: string;
    tags?: string[];
}

export function PostItem({ post }: { post: Post }) {
    const { isAdmin, handleApprove, handleReject, openWhatsApp } = useAdmin();

    return (
        <div className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white rtl text-right" dir="rtl">
            {post.imageUrl && (
                <div className="w-full h-48 rounded-md mb-4 overflow-hidden">
                    <OptimizedImage
                        src={post.imageUrl}
                        alt={post.title}
                        fallbackTitle={post.title}
                        sizes="(max-width: 640px) 100vw, 50vw"
                        objectFit="cover"
                    />
                </div>
            )}
            <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
            {post.description && <p className="text-gray-600 text-sm mb-4">{post.description}</p>}
            
            {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">#{tag}</span>
                    ))}
                </div>
            )}
            
            <div className="flex gap-2 mt-4">
                {/* يظهر فقط إذا كان الإيميل هو المسؤول */}
                {isAdmin && (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleApprove(post.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm transition-colors"
                        >
                            موافقة
                        </button>
                        <button 
                            onClick={() => handleReject(post.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
                        >
                            رفض (حذف)
                        </button>
                    </div>
                )}

                <button 
                    onClick={() => openWhatsApp('222' + OFFICIAL_PHONE)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                    اطلب فوراً
                </button>
            </div>
        </div>
    );
}
