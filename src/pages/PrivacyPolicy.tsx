import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { OFFICIAL_PHONE } from "../constants";
import { ShieldCheck, ArrowRight, Lock, Database, CreditCard, EyeOff } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#070B14] text-[#F8FAFC] px-4 py-8 md:py-12">
      <SEO 
        title="سياسة الخصوصية وحماية البيانات | MAURITOP" 
        description="سياسة الخصوصية وحماية البيانات في منصة موري توب (MAURITOP) لشحن الألعاب والخدمات الرقمية في موريتانيا. تعرف على كيفية معالجة طلباتك وتأمين بياناتك."
        keywords="سياسة الخصوصية موري توب, حماية البيانات, MAURITOP privacy, أمان الدفع موريتانيا, بنكيلي, سداد, غزة باي"
      />
      
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb / Back Link */}
        <div className="flex items-center gap-2 text-sm text-[#A8B3C5]">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-[#10B981] transition-colors">
            <ArrowRight size={16} />
            <span>الرئيسية</span>
          </Link>
          <span className="text-[#334155]">/</span>
          <span className="text-white font-medium">سياسة الخصوصية</span>
        </div>

        {/* Header Header */}
        <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-bold">
            <ShieldCheck size={16} />
            <span>حماية البيانات والخصوصية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            سياسة الخصوصية — موري توب (MAURITOP)
          </h1>
          <p className="text-[#A8B3C5] text-sm sm:text-base leading-relaxed">
            تلتزم منصة <strong>MAURITOP</strong> بحماية خصوصية مستخدميها وعملائها في موريتانيا. توضح هذه الوثيقة بوضوح وشفافية كيفية جمع البيانات واستخدامها وحمايتها في إطار تقديم خدمات شحن الألعاب والاشتراكات الرقمية.
          </p>
          <div className="pt-2 text-xs text-[#64748B]">
            آخر تحديث معتمد: {new Date().getFullYear()}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold text-white">البيانات التي نجمعها لغرض التنفيذ</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              نجمع الحد الأدنى من البيانات الضرورية لمعالجة طلبك وإيصال الخدمة الرقمية، وتشمل:
            </p>
            <ul className="text-sm text-[#A8B3C5] space-y-2 pr-11 list-disc list-inside">
              <li><strong className="text-white">معرّف الحساب باللعبة أو الخدمة (Player ID):</strong> لتوجيه الرصيد المشحون إلى حسابك الصحيح مباشرة.</li>
              <li><strong className="text-white">بيانات التحويل البنكي وإثبات الدفع:</strong> رقم مرجع المعاملة (Reference) وصورة إشعار التحويل للتأكد من وصول المبلغ عبر بنكيلي، سداد، أو غزة باي.</li>
              <li><strong className="text-white">رقم الهاتف أو وسيلة التواصل:</strong> للتواصل السريع معك في حال وجود نقص في بيانات المعرّف أو لتأكيد اكتمال الطلب.</li>
              <li><strong className="text-white">بيانات الحساب المسجّل:</strong> البريد الإلكتروني والاسم إذا اخترت إنشاء حساب لحفظ سجل طلباتك.</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold text-white">طريقة استخدام البيانات</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              تُستخدم بياناتك حصرياً للأغراض التشغيلية التالية:
            </p>
            <ul className="text-sm text-[#A8B3C5] space-y-2 pr-11 list-disc list-inside">
              <li>التحقق من صحة التحويل المالي بالأوقية الموريتانية (MRU).</li>
              <li>شحن الرصيد المطلوب في الحساب المحدد وتسليم الخدمة الرقمية.</li>
              <li>تمكينك من متابعة حالة الطلب وتاريخ المعاملات.</li>
              <li>تقديم الدعم الفني المباشر وحل أي استفسارات تتعلق بطلبك.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-lg font-bold text-white">سرية المعاملات وعدم مشاركة البيانات</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              نلتزم التزاماً قاطعاً بعدم بيع أو تأجير أو مشاركة أي بيانات شخصية أو معلومات مالية مع أي أطراف ثالثة لأغراض تسويقية أو دعائية. تُعالج البيانات حصرياً داخل بيئة النظام الآمنة المعتمدة لدى منصة MAURITOP.
            </p>
          </div>

          {/* Section 4 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg font-bold text-white">أمان البنية السحابية والتخزين</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              تعتمد المنصة على بنية سحابية مؤمنة باتصال مشفر بالكامل (HTTPS/TLS)، وتُخزن قواعد البيانات وسجلات العمليات وفق أعلى معايير الحماية وقواعد الوصول الصارمة لمنع أي وصول غير مصرح به.
            </p>
          </div>

          {/* Section 5 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h2 className="text-lg font-bold text-white">التواصل والدعم الفني</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              إذا كان لديك أي استفسار حول سياسة الخصوصية أو ترغب في مراجعة بيانات طلبك، يمكنك التواصل المباشر مع فريق الدعم الفني الرسمي عبر واتساب على الرقم:{" "}
              <a 
                href={`https://wa.me/222${OFFICIAL_PHONE}`}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="text-[#10B981] font-bold hover:underline inline-block mx-1"
              >
                +222 {OFFICIAL_PHONE}
              </a>.
            </p>
          </div>
        </div>

        {/* Footer Navigation within document */}
        <div className="pt-4 border-t border-[#1F2C40] flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link to="/terms" className="text-[#10B981] font-semibold hover:underline">
            ← الاطلاع على الشروط والأحكام
          </Link>
          <Link to="/" className="text-[#A8B3C5] hover:text-white transition-colors">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </main>
  );
}
