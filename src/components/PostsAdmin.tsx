import React, { useEffect, useState } from 'react';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { collection, doc, addDoc, deleteDoc, updateDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { CheckCircle, Trash2, Clock, FileText, Plus, X, Tag, DollarSign, FileEdit, MessageCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { cn, compressImage } from '../lib/utils';
import { uploadFileWithProgress } from '../services/fileUpload';
import { cacheService } from '../lib/cache';
import { ImageUploader } from './ImageUploader';
import { PostsAdminSkeleton } from './Skeleton';

interface Post {
    id: string;
    title: string;
    status: string;
    imageUrl?: string;
    description?: string;
    price?: number;
    isWhatsAppOffer?: boolean;
    badge?: string;
    createdAt?: any;
}

const PostsAdmin = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { isAdmin } = useAuth();
    const { showToast } = useToast();

    // Form states
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [badge, setBadge] = useState('');
    const [status, setStatus] = useState('approved');
    const [submitting, setSubmitting] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [postToDelete, setPostToDelete] = useState<Post | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchPosts = async () => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
            setPosts(data);
        } catch (err) {
            console.error("Error fetching posts:", err);
            showToast("فشل تحميل العروض", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [isAdmin]);

    const handleEdit = (post: Post) => {
        setEditingPostId(post.id);
        setTitle(post.title);
        setPrice(post.price ? String(post.price) : '');
        setDescription(post.description || '');
        setImageUrl(post.imageUrl || '');
        setBadge(post.badge || '');
        setStatus(post.status || 'approved');
        setIsFormOpen(true);
        // Scroll smoothly to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreateOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            showToast("يرجى كتابة عنوان العرض", "error");
            return;
        }
        if (price.trim() && isNaN(Number(price))) {
            showToast("يرجى كتابة سعر صحيح بالـ MRU أو تركه فارغاً", "error");
            return;
        }
        if (!imageUrl) {
            showToast("يرجى رفع صورة احترافية للعرض", "error");
            return;
        }

        setSubmitting(true);
        try {
            const parsedPrice = price.trim() ? Number(price) : null;
            let finalImageUrl = imageUrl;
            
            if (finalImageUrl.startsWith("data:")) {
                try {
                    // Compress first to guarantee compact web-optimized size
                    const compressedBase64 = await compressImage(finalImageUrl, 800, 800, 0.75);
                    const imageId = editingPostId || doc(collection(db, "posts")).id;
                    const storagePath = `posts/${imageId}_${Date.now()}.webp`;
                    
                    const uploadedUrl = await uploadFileWithProgress(compressedBase64, storagePath);
                    if (!uploadedUrl) {
                        throw new Error("لم يتم استلام رابط التخزين السحابي للصورة");
                    }
                    finalImageUrl = uploadedUrl;
                } catch (storageErr: any) {
                    console.error("Storage upload error for post:", storageErr);
                    showToast(`فشل رفع صورة العرض سحابياً: ${storageErr?.message || "خطأ في الشبكة"}`, "error");
                    setSubmitting(false);
                    return;
                }
            }

            if (editingPostId) {
                await updateDoc(doc(db, "posts", editingPostId), {
                    title: title.trim(),
                    price: parsedPrice,
                    description: description.trim(),
                    imageUrl: finalImageUrl,
                    isWhatsAppOffer: true,
                    badge: badge.trim(),
                    status: status
                });
                showToast("تم تحديث العرض بنجاح!", "success");
            } else {
                await addDoc(collection(db, "posts"), {
                    title: title.trim(),
                    price: parsedPrice,
                    description: description.trim(),
                    imageUrl: finalImageUrl,
                    status: status, // Auto-approve or draft
                    isWhatsAppOffer: true,
                    badge: badge.trim(),
                    createdAt: serverTimestamp()
                });
                showToast("تم نشر العرض بنجاح على المنصة!", "success");
            }

            // Invalidate offers cache so storefront instantly displays updated offers
            cacheService.remove("whatsapp_offers");

            // Instantly re-fetch posts to keep the admin UI in sync
            await fetchPosts();

            // Reset form
            setTitle('');
            setPrice('');
            setDescription('');
            setImageUrl('');
            setBadge('');
            setStatus('approved');
            setIsFormOpen(false);
            setEditingPostId(null);
        } catch (err) {
            console.error("Error creating/editing offer:", err);
            showToast("فشل تنفيذ العملية، يرجى المحاولة مرة أخرى", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDeletePost = async () => {
        if (!postToDelete) return;
        setIsDeleting(true);
        try {
            if (postToDelete.imageUrl && postToDelete.imageUrl.includes("firebasestorage.googleapis.com")) {
                try {
                    const oldImageRef = ref(storage, postToDelete.imageUrl);
                    await deleteObject(oldImageRef);
                } catch (e) {
                    console.warn("Failed to delete old image:", e);
                }
            }
            await deleteDoc(doc(db, "posts", postToDelete.id));
            setPosts(prev => prev.filter(p => p.id !== postToDelete.id));
            // Invalidate offers cache
            cacheService.remove("whatsapp_offers");
            showToast("تم حذف العرض بنجاح", "success");
            setPostToDelete(null);
        } catch (err: any) {
            console.error("Delete post error:", err);
            showToast("فشل حذف العرض", "error");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <PostsAdminSkeleton />;
    if (!isAdmin) return <div className="p-12 text-center text-red-500 font-bold">غير مصرح لك بالدخول.</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 text-right" dir="rtl">
            {/* Header section with add button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111B2E] border border-white/5 p-6 rounded-3xl">
                <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <MessageCircle className="text-emerald-400 w-5 h-5" />
                        عروض واتساب الحصرية (المنشورات)
                    </h2>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                        قم بإنشاء ونشر عروض مميزة وبانرات ترويجية تظهر مباشرة للمستخدمين وتوجههم للطلب المباشر عبر واتساب.
                    </p>
                </div>
                <button
                    onClick={() => {
                        if (isFormOpen) {
                            setTitle('');
                            setPrice('');
                            setDescription('');
                            setImageUrl('');
                            setEditingPostId(null);
                        }
                        setIsFormOpen(!isFormOpen);
                    }}
                    className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer",
                        isFormOpen 
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20" 
                            : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/15"
                    )}
                >
                    {isFormOpen ? (
                        <>
                            <X size={16} />
                            <span>إلغاء</span>
                        </>
                    ) : (
                        <>
                            <Plus size={16} />
                            <span>إضافة عرض واتساب جديد</span>
                        </>
                    )}
                </button>
            </div>

            {/* Form to create/add a new offer */}
            {isFormOpen && (
                <form onSubmit={handleCreateOffer} className="bg-white border border-slate-200 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-sm animate-in slide-in-from-top duration-300">
                    <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                        <FileEdit className="text-cyan-500 w-5 h-5" />
                        {editingPostId ? "تعديل تفاصيل العرض" : "تفاصيل المنشور / العرض الجديد"}
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mr-1">العنوان أو الخدمة</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="مثال: عرض شحن 5000 جوهرة فري فاير + هدايا حصرية"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 outline-none focus:border-cyan-500/50 transition-all font-bold text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mr-1">السعر بالـ MRU (اختياري)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="مثال: 450 (اتركه فارغاً للتفاوض)"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-12 pl-5 py-4 text-slate-800 outline-none focus:border-cyan-500/50 transition-all font-black text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mr-1">شارة ترويجية مخصصة (اختياري)</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: عرض محدود ⏳، شائع 🔥، خصم 30%"
                                        value={badge}
                                        onChange={(e) => setBadge(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 outline-none focus:border-cyan-500/50 transition-all font-bold text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mr-1">حالة العرض والظهور في الموقع</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 outline-none focus:border-cyan-500/50 transition-all font-bold text-sm cursor-pointer"
                                >
                                    <option value="approved">نشط (منشور ومباشر في واجهة الموقع)</option>
                                    <option value="draft">مسودة (محفوظ ومخفي في لوحة التحكم للتعديل لاحقاً)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mr-1">تفاصيل ومميزات العرض (الوصف)</label>
                                <textarea
                                    placeholder="اكتب تفاصيل وميزات العرض المميزة التي تجذب المستخدم للطلب..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-800 outline-none focus:border-cyan-500/50 transition-all font-bold text-sm min-h-[120px] leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Image Uploader side */}
                        <div className="flex flex-col justify-between">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mr-1">صورة العرض الاحترافية</label>
                                <ImageUploader
                                    onImageSelected={(base64) => setImageUrl(base64)}
                                    initialPreview={imageUrl}
                                    label="ارفع صورة ذات جودة عالية وتصميم جذاب للعرض"
                                    imageFit="cover"
                                    aspect={16/9}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/10 cursor-pointer mt-6"
                            >
                                {submitting ? "جاري الحفظ..." : (
                                    <>
                                        <CheckCircle size={18} />
                                        <span>{editingPostId ? "حفظ التعديلات" : "نشر العرض وتفعيله على المنصة"}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            )}

            {/* List of existing offers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map(post => (
                    <div key={post.id} className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm group hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                            {post.imageUrl ? (
                                <div className="aspect-video overflow-hidden relative bg-slate-50">
                                    <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                                    
                                    {/* Action Type Badge */}
                                    <div className="absolute top-4 left-4 bg-emerald-500 text-slate-950 font-black text-[9px] px-3 py-1.5 rounded-full flex items-center gap-1 shadow-md uppercase tracking-wider">
                                        <MessageCircle size={12} fill="currentColor" />
                                        <span>طلب واتساب</span>
                                    </div>
                                    
                                    {/* Custom Badge or Fallback */}
                                    {post.badge && (
                                        <div className="absolute top-4 right-4 bg-cyan-600 text-white font-black text-[9px] px-3 py-1.5 rounded-full shadow-md uppercase tracking-wider">
                                            {post.badge}
                                        </div>
                                    )}

                                    {/* Status Badge */}
                                    <div className={cn(
                                        "absolute bottom-4 left-4 px-3 py-1.5 rounded-full text-[9px] font-black shadow-md flex items-center gap-1 uppercase tracking-wider",
                                        post.status === 'approved' ? 'bg-green-600 text-white' : 'bg-amber-600 text-white'
                                    )}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span>{post.status === 'approved' ? 'منشور' : 'مسودة'}</span>
                                    </div>

                                    {post.price && (
                                        <div className="absolute bottom-4 right-4 bg-[#111B2E] text-emerald-400 font-black text-sm px-4 py-2 rounded-2xl border border-white/5 shadow-lg italic">
                                            {post.price} <span className="text-[10px] not-italic text-slate-400">MRU</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-6 pb-0 flex justify-between items-start">
                                    <div className={cn(
                                        "px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1",
                                        post.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    )}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                        <span>{post.status === 'approved' ? 'منشور' : 'مسودة'}</span>
                                    </div>
                                    
                                    {post.badge && (
                                        <div className="bg-cyan-100 text-cyan-800 font-black text-[10px] px-3 py-1 rounded-full">
                                            {post.badge}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="p-6 space-y-3">
                                <h3 className="font-black text-slate-800 text-base leading-snug line-clamp-2 uppercase">{post.title}</h3>
                                
                                {post.price && !post.imageUrl && (
                                    <p className="text-sm font-black text-emerald-600">السعر: {post.price} MRU</p>
                                )}
                                
                                {post.description && (
                                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-bold">
                                        {post.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 pt-0 border-t border-slate-50 flex items-center justify-between mt-4">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                                <Clock size={12} />
                                <span>تم النشر: {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('ar-MA') : 'الآن'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleEdit(post)}
                                    className="p-2 px-3 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-cyan-100"
                                    title="تعديل العرض"
                                >
                                    <FileEdit size={14} />
                                    <span className="text-xs font-black">تعديل</span>
                                </button>
                                <button 
                                    onClick={() => setPostToDelete(post)}
                                    className="p-2 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-transparent hover:border-red-100"
                                    title="حذف العرض"
                                >
                                    <Trash2 size={14} />
                                    <span className="text-xs font-black">حذف</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {posts.length === 0 && (
                    <div className="col-span-full bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 p-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100">
                            <FileText size={40} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">لا توجد عروض منشورة</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">اضغط على زر "إضافة عرض واتساب جديد" للبدء بنشر أول عروضك الحصرية.</p>
                    </div>
                )}
            </div>

            {/* Delete Offer Confirmation Modal */}
            {postToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-right">
                        <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                            <Trash2 className="w-7 h-7 stroke-[2]" />
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-black text-slate-900">
                                حذف عرض واتساب
                            </h3>
                            <p className="text-xs text-slate-600 font-bold leading-relaxed">
                                هل أنت متأكد من رغبتك في حذف العرض{" "}
                                <span className="text-rose-600 font-black">"{postToDelete.title}"</span>{" "}
                                نهائياً من قائمة العروض؟
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={confirmDeletePost}
                                className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl font-black text-xs transition-all shadow-md shadow-rose-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting ? "جاري الحذف..." : "نعم، تأكيد الحذف"}
                            </button>

                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setPostToDelete(null)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostsAdmin;
