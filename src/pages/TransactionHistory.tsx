import React, { useState, useEffect } from 'react';
import { History, Search, Filter, CheckCircle2, Clock, XCircle, ShoppingBag, ArrowDownCircle, X, ExternalLink, Calendar, User, Phone, Hash, CreditCard, Info, Copy, Crown, Plus, ShieldCheck, Eye, MessageSquare, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { formatMRU, cn, handleFirestoreError, OperationType, haptic, formatDateSafe, parseDateSafe, normalizeOrderStatus } from '../lib/utils';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import SEO from "../components/SEO";
import { useLanguage } from "../contexts/LanguageContext";
import TransactionHistorySkeleton from "../components/TransactionHistorySkeleton";
import { ServiceSubscriptionCard, SubscriptionService, ServiceType } from '../components/ServiceSubscriptionCard';
import { getFallbackServiceImage } from '../lib/serviceImages';
import { EmptyState } from '../components/EmptyState';
import { OrderDetailsModal } from "../components/OrderDetailsModal";
import OptimizedImage from "../components/OptimizedImage";

const TransactionHistory: React.FC = () => {
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const isArabic = language === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Completed' | 'Pending' | 'Rejected' | 'Approved'>('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'subscriptions' | 'cards'>('history');
  const [showModal, setShowModal] = useState(false);
  const [servicesMap, setServicesMap] = useState<Record<string, { image: string; imageFit?: 'cover' | 'contain'; imagePadding?: number }>>({});

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const q = query(collection(db, "services"));
        const snap = await getDocs(q);
        const mapping: Record<string, { image: string; imageFit?: 'cover' | 'contain'; imagePadding?: number }> = {};
        snap.docs.forEach((doc) => {
          const data = doc.data();
          const img = data.imageUrl || data.image;
          if (img) {
            mapping[doc.id] = {
              image: img,
              imageFit: data.imageFit || "cover",
              imagePadding: data.imagePadding !== undefined ? Number(data.imagePadding) : 0,
            };
          }
        });
        setServicesMap(mapping);
      } catch (err) {
        console.error("Error fetching services: ", err);
      }
    };
    fetchServices();
  }, []);

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedOrder(null), 300);
  };

  const getServiceType = (serviceId: string): ServiceType => {
    const id = (serviceId || "").toLowerCase();
    if (id.includes("netflix")) return "netflix";
    if (id.includes("pubg")) return "pubg";
    if (id.includes("freefire") || id.includes("free") || id.includes("ff")) return "freefire";
    if (id.includes("apple") || id.includes("itunes")) return "apple";
    return "other";
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const fetchOrders = async () => {
      try {
        const snapshot = await getDocs(q);
        const rawOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const uniqueOrders: any[] = [];
        const seenIds = new Set<string>();
        
        for (const order of rawOrders) {
          if (order.id && !seenIds.has(order.id)) {
            seenIds.add(order.id);
            uniqueOrders.push(order);
          }
        }
        
        setOrders(uniqueOrders);
        setLoading(false);
      } catch (error) {
        console.warn("Error fetching orders: ", error);
        handleFirestoreError(error, OperationType.LIST, 'orders');
        setLoading(false);
      }
    };

    fetchOrders();
    // No unsubscribe needed for getDocs
  }, [user, isArabic]);

  const { subscriptions, cards } = React.useMemo(() => {
    const completedOrders = orders.filter(
      (o) => o.status?.toLowerCase() === "completed",
    );

    const subscriptions: any[] = [];
    const cards: any[] = [];
    const seenServices = new Set<string>();

    completedOrders.forEach((o) => {
      const serviceKey = o.serviceId || o.serviceType || o.serviceName || "unknown";
      if (seenServices.has(serviceKey)) {
        return;
      }
      seenServices.add(serviceKey);

      const ordId = o.id;
      const serviceName = o.serviceType || o.serviceName || "خدمة رقمية";
      const lowercaseName = serviceName.toLowerCase();

      const purchaseTime =
        o.updatedAt?.toMillis?.() || o.createdAt?.toMillis?.() || Date.now();
      const pDate = new Date(purchaseTime);

      const isSubscription =
        lowercaseName.includes("netflix") ||
        lowercaseName.includes("نتفليكس") ||
        lowercaseName.includes("سناب") ||
        lowercaseName.includes("snapchat") ||
        lowercaseName.includes("chatgpt") ||
        lowercaseName.includes("gpt") ||
        lowercaseName.includes("اشتراك");

      const dbService = servicesMap[o.serviceId || ""];
      const finalImage = dbService?.image || getFallbackServiceImage(serviceName, o.serviceId);
      const finalFit = dbService?.imageFit || o.imageFit || "cover";
      const finalPadding = dbService?.imagePadding !== undefined ? Number(dbService.imagePadding) : undefined;

      if (isSubscription) {
        const durationDays = 30;
        const expiryTime = purchaseTime + durationDays * 24 * 60 * 60 * 1000;
        const expDate = new Date(expiryTime);
        const isExpired = Date.now() > expiryTime;

        subscriptions.push({
          id: ordId,
          serviceId: o.serviceId || "other",
          name: serviceName,
          nameAr: serviceName,
          image: finalImage,
          startDate: pDate,
          endDate: expDate,
          price: o.amount || 0,
          email: "حسابك",
          pass: o.pinCode || o.adminNote || "",
          status: isExpired ? "Expired" : "Active",
          isReal: true,
          imageFit: finalFit as any,
          imagePadding: finalPadding,
        });
      } else {
        cards.push({
          id: ordId,
          serviceId: o.serviceId || "other",
          name: serviceName,
          nameAr: serviceName,
          image: finalImage,
          price: o.amount || 0,
          code: o.pinCode || o.adminNote || "",
          purchaseDate: pDate,
          isReal: true,
          imageFit: finalFit as any,
          imagePadding: finalPadding,
          playerId: o.fields ? (o.fields.id || o.fields.ID || o.fields["معرف اللاعب"] || o.fields["ID اللاعب"] || o.fields["رقم الحساب"] || Object.values(o.fields)[0]) : undefined,
        });
      }
    });

    subscriptions.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    cards.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());

    return { subscriptions, cards };
  }, [orders, servicesMap]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.serviceType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || normalizeOrderStatus(order.status) === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const handleDownloadPDF = () => {
    try {
      const activeList = filteredOrders.length > 0 ? filteredOrders : orders;
      const totalSpent = activeList
        .filter((o) => o.status?.toLowerCase() === "completed" || o.status?.toLowerCase() === "approved")
        .reduce((sum, o) => sum + (o.total || o.amount || 0), 0);

      const completedCount = activeList.filter((o) => o.status?.toLowerCase() === "completed").length;
      const pendingCount = activeList.filter((o) => o.status?.toLowerCase() === "pending").length;

      const userEmail = user?.email || "غير معروف";
      const userName = user?.displayName || userEmail.split('@')[0];

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'fr'}">
        <head>
          <meta charset="UTF-8">
          <title>${isArabic ? 'كشف حساب الطلبات - MauriTop' : 'Relevé de Compte - MauriTop'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Inter:wght@400;500;600;700;800&display=swap');
            * {
              box-sizing: border-box;
            }
            body {
              font-family: ${isArabic ? "'Tajawal', sans-serif" : "'Inter', sans-serif"};
              margin: 0;
              padding: 40px;
              color: #0f172a;
              background-color: #ffffff;
              direction: ${isArabic ? 'rtl' : 'ltr'};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .logo-container {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo-mark {
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 900;
              font-size: 20px;
            }
            .brand-name {
              font-size: 24px;
              font-weight: 900;
              color: #0891b2;
            }
            .doc-title {
              font-size: 16px;
              font-weight: 800;
              color: #475569;
              text-align: ${isArabic ? 'left' : 'right'};
            }
            .user-meta {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 20px;
              margin-bottom: 30px;
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 16px;
            }
            .meta-item {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .meta-label {
              font-size: 11px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
            }
            .meta-value {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-bottom: 30px;
            }
            .stat-card {
              border-radius: 16px;
              padding: 16px;
              text-align: center;
              border: 1px solid #e2e8f0;
            }
            .stat-card.primary {
              background-color: #ecfeff;
              border-color: #cffafe;
            }
            .stat-card.success {
              background-color: #f0fdf4;
              border-color: #dcfce7;
            }
            .stat-card.warning {
              background-color: #fffde7;
              border-color: #fef9c3;
            }
            .stat-label {
              font-size: 10px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .stat-value {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th, td {
              border-bottom: 1px solid #e2e8f0;
              padding: 14px 16px;
              text-align: ${isArabic ? 'right' : 'left'};
              font-size: 12px;
            }
            th {
              background-color: #f8fafc;
              font-weight: 800;
              color: #334155;
              border-top: 1px solid #e2e8f0;
              border-bottom: 2px solid #e2e8f0;
            }
            .order-id {
              font-family: monospace;
              font-weight: 700;
              color: #0891b2;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 12px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
            }
            .status-completed {
              background-color: #dcfce7;
              color: #166534;
            }
            .status-pending {
              background-color: #fef9c3;
              color: #854d0e;
            }
            .status-rejected {
              background-color: #fee2e2;
              color: #991b1b;
            }
            .status-approved {
              background-color: #e0f2fe;
              color: #075985;
            }
            .status-shipped {
              background-color: #ffedd5;
              color: #9a3412;
            }
            .footer {
              margin-top: 60px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 24px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <div class="logo-mark">M</div>
              <div class="brand-name">MauriTop</div>
            </div>
            <div class="doc-title">
              <div>${isArabic ? 'كشف حساب العمليات والطلبات' : 'Relevé des Transactions et Commandes'}</div>
              <div style="font-size: 11px; font-weight: normal; margin-top: 4px; color: #64748b;">
                ${new Date().toLocaleDateString(isArabic ? 'ar' : 'fr', { dateStyle: 'long' })}
              </div>
            </div>
          </div>

          <div class="user-meta">
            <div class="meta-item">
              <span class="meta-label">${isArabic ? 'صاحب الحساب' : 'Titulaire du compte'}</span>
              <span class="meta-value">${userName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">${isArabic ? 'البريد الإلكتروني' : 'Adresse Email'}</span>
              <span class="meta-value">${userEmail}</span>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card primary">
              <div class="stat-label">${isArabic ? 'إجمالي المدفوعات' : 'Total payé'}</div>
              <div class="stat-value" style="color: #0891b2;">${totalSpent} MRU</div>
            </div>
            <div class="stat-card success">
              <div class="stat-label">${isArabic ? 'الطلبات المكتملة' : 'Commandes complétées'}</div>
              <div class="stat-value" style="color: #166534;">${completedCount}</div>
            </div>
            <div class="stat-card warning">
              <div class="stat-label">${isArabic ? 'الطلبات قيد المراجعة' : 'Commandes en attente'}</div>
              <div class="stat-value" style="color: #854d0e;">${pendingCount}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${isArabic ? 'رقم الطلب' : 'ID Commande'}</th>
                <th>${isArabic ? 'تاريخ الطلب' : 'Date'}</th>
                <th>${isArabic ? 'الخدمة' : 'Service'}</th>
                <th>${isArabic ? 'طريقة الدفع' : 'Paiement'}</th>
                <th>${isArabic ? 'المبلغ' : 'Montant'}</th>
                <th>${isArabic ? 'الحالة' : 'Statut'}</th>
              </tr>
            </thead>
            <tbody>
              ${activeList.map(order => {
                const formattedDate = formatDateSafe(order.createdAt, isArabic ? 'ar-MR' : 'fr-FR');
                const orderStatus = order.status?.toLowerCase() || 'pending';
                const statusLabel = 
                  orderStatus === 'completed' ? (isArabic ? 'مكتمل' : 'Terminé') :
                  orderStatus === 'approved' ? (isArabic ? 'مقبول' : 'Approuvé') :
                  orderStatus === 'shipped' ? (isArabic ? 'تم الشحن' : 'Expédié') :
                  orderStatus === 'pending' ? (isArabic ? 'قيد المراجعة' : 'En attente') : 
                  (isArabic ? 'مرفوض' : 'Rejeté');
                
                return `
                  <tr>
                    <td class="order-id">#${order.id.slice(0, 8).toUpperCase()}</td>
                    <td>${formattedDate}</td>
                    <td style="font-weight: 700;">${order.serviceType || order.serviceName}</td>
                    <td>${order.paymentMethod === 'bankily' ? (isArabic ? 'بنكيلي' : 'Bankily') : order.paymentMethod === 'sadad' ? (isArabic ? 'سداد' : 'Sadad') : order.paymentMethod === 'gaza' ? (isArabic ? 'غزة باي' : 'Gaza Pay') : order.paymentMethod}</td>
                    <td style="font-weight: 800; color: #166534;">${order.total || order.amount || 0} MRU</td>
                    <td>
                      <span class="status-badge status-${orderStatus}">
                        ${statusLabel}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>${isArabic ? 'تم توليد هذا المستند إلكترونياً وصادر عن MauriTop لشحن الألعاب والخدمات الرقمية بموريتانيا' : 'Ce document est généré électroniquement par MauriTop pour le chargement de jeux et services numériques.'}</p>
            <p style="font-size: 10px; margin-top: 8px;">© ${new Date().getFullYear()} MauriTop. All Rights Reserved.</p>
          </div>
        </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      }
    } catch (err) {
      console.error("Error generating PDF:", err);
      showToast(isArabic ? "حدث خطأ أثناء تحميل كشف الحساب كـ PDF" : "Erreur lors du téléchargement de l'historique PDF", "error");
    }
  };

  const handleDownloadInvoicePDF = (order: any) => {
    try {
      if (!order) return;
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
      const formattedDate = orderDate.toLocaleDateString(isArabic ? 'ar' : 'fr', { dateStyle: 'long' });
      const formattedTime = orderDate.toLocaleTimeString(isArabic ? 'ar' : 'fr', { timeStyle: 'short' });
      const orderStatus = order.status?.toLowerCase() || 'pending';
      const statusLabel = 
        orderStatus === 'completed' ? (isArabic ? 'مكتمل' : 'Terminé') :
        orderStatus === 'approved' ? (isArabic ? 'مقبول' : 'Approuvé') :
        orderStatus === 'shipped' ? (isArabic ? 'تم الشحن' : 'Expédié') :
        orderStatus === 'pending' ? (isArabic ? 'قيد المراجعة' : 'En attente') : 
        (isArabic ? 'مرفوض' : 'Rejeté');

      const userEmail = user?.email || "غير معروف";
      const userName = user?.displayName || userEmail.split('@')[0];

      let fieldsHtml = '';
      if (order.fields) {
        Object.entries(order.fields).forEach(([key, value]) => {
          fieldsHtml += `
            <div class="invoice-row">
              <span class="row-label">${key}</span>
              <span class="row-value font-mono">${String(value)}</span>
            </div>
          `;
        });
      } else if (order.accountDetails) {
        fieldsHtml += `
          <div class="invoice-row">
            <span class="row-label">${isArabic ? 'تفاصيل الحساب' : 'Détails du compte'}</span>
            <span class="row-value">${order.accountDetails}</span>
          </div>
        `;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'fr'}">
        <head>
          <meta charset="UTF-8">
          <title>${isArabic ? 'فاتورة طلب' : 'Facture de commande'} #${order.id.slice(0, 8).toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Inter:wght@400;500;600;700;800&display=swap');
            * {
              box-sizing: border-box;
            }
            body {
              font-family: ${isArabic ? "'Tajawal', sans-serif" : "'Inter', sans-serif"};
              margin: 0;
              padding: 40px;
              color: #1e293b;
              background-color: #ffffff;
              direction: ${isArabic ? 'rtl' : 'ltr'};
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .invoice-card {
              max-width: 600px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 24px;
              padding: 40px;
              background-color: #ffffff;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px dashed #e2e8f0;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .brand-logo {
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 900;
              font-size: 18px;
            }
            .brand-name {
              font-size: 20px;
              font-weight: 900;
              color: #059669;
            }
            .invoice-tag {
              background-color: #f1f5f9;
              color: #475569;
              padding: 6px 14px;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-section {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .meta-block h4 {
              margin: 0 0 6px 0;
              font-size: 11px;
              font-weight: 800;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-block p {
              margin: 0;
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
            }
            .service-banner {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 20px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .service-title {
              font-size: 16px;
              font-weight: 900;
              color: #0f172a;
            }
            .service-status {
              font-size: 11px;
              font-weight: 800;
              padding: 4px 10px;
              border-radius: 12px;
              text-transform: uppercase;
            }
            .status-completed {
              background-color: #dcfce7;
              color: #166534;
            }
            .status-pending {
              background-color: #fef9c3;
              color: #854d0e;
            }
            .status-rejected {
              background-color: #fee2e2;
              color: #991b1b;
            }
            .status-approved {
              background-color: #e0f2fe;
              color: #075985;
            }
            .status-shipped {
              background-color: #ffedd5;
              color: #9a3412;
            }
            .invoice-details {
              border-top: 1px solid #f1f5f9;
              padding-top: 20px;
              margin-bottom: 30px;
            }
            .invoice-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #f8fafc;
              font-size: 13px;
            }
            .row-label {
              color: #64748b;
              font-weight: 500;
            }
            .row-value {
              color: #0f172a;
              font-weight: 700;
            }
            .font-mono {
              font-family: monospace;
              letter-spacing: 0.5px;
            }
            .total-section {
              background-color: #f0fdf4;
              border: 1px solid #dcfce7;
              border-radius: 16px;
              padding: 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
            }
            .total-label {
              font-size: 14px;
              font-weight: 800;
              color: #166534;
            }
            .total-value {
              font-size: 24px;
              font-weight: 900;
              color: #15803d;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px dashed #e2e8f0;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="header">
              <div class="brand">
                <div class="brand-logo">M</div>
                <div class="brand-name">MauriTop</div>
              </div>
              <div class="invoice-tag">${isArabic ? 'إيصال دفع رسمي' : 'Reçu de paiement'}</div>
            </div>

            <div class="meta-section">
              <div class="meta-block">
                <h4>${isArabic ? 'رقم الفاتورة' : 'N° de Facture'}</h4>
                <p class="font-mono">#${order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div class="meta-block" style="text-align: ${isArabic ? 'left' : 'right'};">
                <h4>${isArabic ? 'التاريخ والوقت' : 'Date & Heure'}</h4>
                <p>${formattedDate} - ${formattedTime}</p>
              </div>
            </div>

            <div class="meta-section" style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
              <div class="meta-block">
                <h4>${isArabic ? 'العميل' : 'Client'}</h4>
                <p>${userName}</p>
              </div>
              <div class="meta-block" style="text-align: ${isArabic ? 'left' : 'right'};">
                <h4>${isArabic ? 'البريد الإلكتروني' : 'Adresse Email'}</h4>
                <p>${userEmail}</p>
              </div>
            </div>

            <div class="service-banner">
              <span class="service-title">${order.serviceType || order.serviceName}</span>
              <span class="service-status status-${orderStatus}">${statusLabel}</span>
            </div>

            <div class="invoice-details">
              ${fieldsHtml}
              <div class="invoice-row">
                <span class="row-label">${isArabic ? 'طريقة الدفع' : 'Moyen de paiement'}</span>
                <span class="row-value">${order.paymentMethod === 'bankily' ? (isArabic ? 'بنكيلي' : 'Bankily') : order.paymentMethod === 'sadad' ? (isArabic ? 'سداد' : 'Sadad') : order.paymentMethod === 'gaza' ? (isArabic ? 'غزة باي' : 'Gaza Pay') : order.paymentMethod}</span>
              </div>
              ${order.senderPhone ? `
                <div class="invoice-row">
                  <span class="row-label">${isArabic ? 'رقم الهاتف المرسل' : 'Téléphone Expéditeur'}</span>
                  <span class="row-value font-mono">${order.senderPhone}</span>
                </div>
              ` : ''}
              ${order.senderRef ? `
                <div class="invoice-row">
                  <span class="row-label">${isArabic ? 'الرقم المرجعي (Ref)' : 'N° de Référence'}</span>
                  <span class="row-value font-mono">${order.senderRef}</span>
                </div>
              ` : ''}
            </div>

            <div class="total-section">
              <span class="total-label">${isArabic ? 'المبلغ الإجمالي المدفوع' : 'Montant Total Payé'}</span>
              <span class="total-value">${order.total || order.amount || 0} MRU</span>
            </div>

            <div class="footer">
              <p>${isArabic ? 'نشكرك على ثقتك بـ MauriTop لخدمات الشحن الرقمية!' : 'Merci pour votre confiance en MauriTop !'}</p>
              <p style="font-size: 10px; margin-top: 6px;">© ${new Date().getFullYear()} MauriTop. All Rights Reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      }
    } catch (err) {
      console.error("Error generating invoice PDF:", err);
      showToast(isArabic ? "حدث خطأ أثناء تحميل الفاتورة" : "Erreur lors du téléchargement de la facture", "error");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 text-white pb-6 md:pb-10" dir={isArabic ? "rtl" : "ltr"}>
      <SEO 
        title="سجل الطلبات والمعاملات | موري توب MauriTop"
        description="متابعة واستعراض جميع عمليات شحن الألعاب وسجل المعاملات مع إمكانية تحميل الفواتير الرسمية من موري توب."
        noindex={true}
      />
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3.5">
          {/* User Google / Account Profile Avatar */}
          {profile?.photoURL || profile?.avatarUrl || user?.photoURL ? (
            <div className="relative shrink-0">
              <img
                src={profile?.photoURL || profile?.avatarUrl || user?.photoURL}
                alt={user?.displayName || "User"}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-2xl object-cover border border-white/15 shadow-md"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#070B14] rounded-full" />
            </div>
          ) : (
            <div className="relative shrink-0 w-12 h-12 rounded-2xl bg-[#0E1626] border border-white/15 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-md">
              {(user?.displayName || user?.email || "U").charAt(0).toUpperCase()}
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#070B14] rounded-full" />
            </div>
          )}

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {user?.displayName || (user?.email ? user.email.split('@')[0] : (isArabic ? 'حسابك' : 'Compte'))}
              </h2>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.6} />
            </div>
            <p className="text-xs text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
              <span className="dir-ltr text-left">{user?.email}</span>
              <span className="opacity-40">•</span>
              <span className="text-emerald-400 font-medium">{isArabic ? "سجل العمليات" : "Historique"}</span>
            </p>
          </div>
        </div>

        {orders.length > 0 && (
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-98 cursor-pointer shrink-0"
          >
            <ArrowDownCircle size={15} strokeWidth={1.75} />
            <span>{isArabic ? "تحميل كشف الحساب (PDF)" : "Télécharger l'historique (PDF)"}</span>
          </button>
        )}
      </header>

      {/* Control Bar */}
      <div className="bg-[#0E1626] border border-white/10 p-4 rounded-2xl shadow-md flex flex-col sm:flex-row gap-3 items-center justify-between relative overflow-hidden">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            className="w-full py-2.5 pr-9 pl-3 bg-[#070B14] border border-white/10 rounded-xl text-white font-medium text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all placeholder:text-slate-500"
            placeholder={isArabic ? "بحث بمعرّف الطلب أو الخدمة..." : "Rechercher une commande..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" strokeWidth={1.6} />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-[#070B14] border border-white/10 px-3 py-2 rounded-xl w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.6} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent border-none text-xs font-bold text-slate-300 outline-none cursor-pointer flex-1"
            >
              <option value="all" className="bg-[#070B14] text-white">{isArabic ? "كل الحالات" : "Tous les statuts"}</option>
              <option value="Completed" className="bg-[#070B14] text-white">{isArabic ? "مكتمل" : "Terminé"}</option>
              <option value="Approved" className="bg-[#070B14] text-white">{isArabic ? "تم القبول" : "Approuvé"}</option>
              <option value="Pending" className="bg-[#070B14] text-white">{isArabic ? "قيد المراجعة" : "En attente"}</option>
              <option value="Rejected" className="bg-[#070B14] text-white">{isArabic ? "مرفوض" : "Rejeté"}</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <TransactionHistorySkeleton />
      ) : (
        <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredOrders.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState
                    type={searchTerm ? "search" : "history"}
                    title={searchTerm 
                      ? (isArabic ? "لم نجد نتائج" : "Aucun résultat")
                      : (isArabic ? "لا توجد سجلات طلبات حتى الآن." : "Aucune commande enregistrée pour le moment.")}
                    description={searchTerm 
                      ? (isArabic ? 'لا توجد نتائج لعملية البحث.' : 'Aucun résultat trouvé.') 
                      : (isArabic ? 'لم تقم بأي عمليات بعد.' : 'Aucune commande effectuée.')}
                  />
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const dbService = servicesMap[order.serviceId || ""];
                  const finalImage = dbService?.image || getFallbackServiceImage(order.serviceType || order.serviceName || "", order.serviceId);
                  const finalFit = dbService?.imageFit || order.imageFit || "cover";
                  const finalPadding = dbService?.imagePadding !== undefined ? Number(dbService.imagePadding) : undefined;
                  const itemDate = parseDateSafe(order.createdAt);
                  const serviceName = order.serviceType || order.serviceName || (isArabic ? "خدمة رقمية" : "Service Numérique");

                  return (
                    <div 
                      key={order.id} 
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0E1626] hover:bg-[#121D31] p-3.5 sm:p-4 transition-all hover:border-emerald-500/30 cursor-pointer active:scale-[0.99] select-none flex flex-col justify-between gap-3 h-full shadow-sm hover:shadow-md hover:shadow-emerald-500/10"
                      onClick={() => {
                        haptic.light();
                        openOrderDetails(order);
                      }}
                    >
                      {/* Top Section: Service Image & Primary Information */}
                      <div className="flex items-start gap-3 sm:gap-3.5">
                        {/* 1. Game/Service Image (80px on mobile, bold & prominent, zero shrinkage) */}
                        <div 
                          className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-[#070B14] flex items-center justify-center border border-white/10 shadow-inner overflow-hidden shrink-0 group-hover:border-emerald-500/30 transition-all relative p-0"
                        >
                          <OptimizedImage 
                            src={finalImage} 
                            alt={serviceName} 
                            fallbackTitle={serviceName}
                            fallbackId={order.serviceId}
                            aspectRatio="1/1"
                            objectFit="cover"
                            padding={0}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 scale-105"
                          />
                        </div>

                        {/* 2. Text Info Column */}
                        <div className="min-w-0 flex-1 flex flex-col justify-between min-h-[4rem] sm:min-h-[5rem]">
                          <div>
                            <h4 className="text-sm sm:text-base font-black text-white group-hover:text-emerald-300 transition-colors leading-snug line-clamp-2 break-words">
                              {serviceName}
                            </h4>

                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                              <span className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md shrink-0">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </span>
                              {itemDate && (
                                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium flex items-center gap-1 shrink-0">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>{formatDateSafe(itemDate)}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Extra order details (package, player id) */}
                          {(order.packageTitle || order.playerId || order.accountName) && (
                            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate mt-1">
                              {order.packageTitle && (
                                <span className="text-emerald-400/90 font-bold">{order.packageTitle}</span>
                              )}
                              {(order.playerId || order.accountName) && (
                                <span className="text-slate-400"> • {order.playerId || order.accountName}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Section: Amount & Status Badge */}
                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400">
                            {isArabic ? "المبلغ" : "Montant"}
                          </span>
                          <span className="text-sm sm:text-base font-black text-emerald-400 tracking-tight">
                            {formatMRU(order.total || order.amount || 0)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold border shadow-xs tracking-tight",
                            normalizeOrderStatus(order.status) === 'completed' ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                            normalizeOrderStatus(order.status) === 'approved' ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" :
                            normalizeOrderStatus(order.status) === 'shipped' ? "bg-blue-500/15 text-blue-300 border-blue-500/30" :
                            normalizeOrderStatus(order.status) === 'pending' ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                            "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              normalizeOrderStatus(order.status) === 'completed' ? "bg-emerald-400" :
                              normalizeOrderStatus(order.status) === 'approved' ? "bg-cyan-400" :
                              normalizeOrderStatus(order.status) === 'shipped' ? "bg-blue-400" :
                              normalizeOrderStatus(order.status) === 'pending' ? "bg-amber-400 animate-pulse" :
                              "bg-rose-400"
                            )} />
                            {normalizeOrderStatus(order.status) === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={2} />}
                            {normalizeOrderStatus(order.status) === 'approved' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" strokeWidth={2} />}
                            {normalizeOrderStatus(order.status) === 'shipped' && <ShoppingBag className="w-3.5 h-3.5 text-blue-300 shrink-0" strokeWidth={2} />}
                            {normalizeOrderStatus(order.status) === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" strokeWidth={2} />}
                            {normalizeOrderStatus(order.status) === 'rejected' && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" strokeWidth={2} />}
                            <span>
                              {normalizeOrderStatus(order.status) === 'completed' ? (isArabic ? 'مكتمل بنجاح' : 'Terminé') : 
                               normalizeOrderStatus(order.status) === 'approved' ? (isArabic ? 'تم القبول (جاري التنفيذ)' : 'Approuvé') :
                               normalizeOrderStatus(order.status) === 'shipped' ? (isArabic ? 'تم الشحن' : 'Expédié') :
                               normalizeOrderStatus(order.status) === 'pending' ? (isArabic ? 'قيد المراجعة' : 'En attente') : 
                               (isArabic ? 'مرفوض' : 'Rejeté')}
                            </span>
                          </span>

                          <div className="w-7 h-7 rounded-lg bg-white/5 group-hover:bg-emerald-500/20 border border-white/5 group-hover:border-emerald-500/30 flex items-center justify-center text-slate-400 group-hover:text-emerald-300 transition-all shrink-0">
                            <ChevronLeft className={cn("w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5", !isArabic && "rotate-180 group-hover:translate-x-0.5")} />
                          </div>
                        </div>
                      </div>

                      {/* Admin Note Section */}
                      {order.adminNote && (
                        <div className="bg-[#070B14] p-2.5 rounded-xl border border-white/5 flex items-start gap-2 mt-1">
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" strokeWidth={1.6} />
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-emerald-400 block">
                              {isArabic ? "ملاحظة الإدارة" : "Note de l'administration"}
                            </span>
                            <p className="text-[11px] font-normal text-slate-300 leading-relaxed truncate">
                              {order.adminNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={showModal}
        onClose={closeModal}
        isArabic={isArabic}
        onDownloadInvoice={handleDownloadInvoicePDF}
      />

    </div>
  );
};

export default TransactionHistory;
