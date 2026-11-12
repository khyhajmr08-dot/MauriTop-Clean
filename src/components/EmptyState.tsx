import React from 'react';
import { motion } from 'motion/react';
import { Ghost, Search, ShoppingBag } from 'lucide-react';

interface EmptyStateProps {
  type?: 'search' | 'orders' | 'subscriptions' | 'cards' | 'history';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  type = 'orders',
  title, 
  description, 
  actionText, 
  onAction,
  children
}) => {
  const getIcon = () => {
    switch (type) {
      case 'search': return <Search className="w-6 h-6 text-slate-400" strokeWidth={1.6} />;
      case 'orders': return <ShoppingBag className="w-6 h-6 text-slate-400" strokeWidth={1.6} />;
      case 'subscriptions': return <Ghost className="w-6 h-6 text-slate-400" strokeWidth={1.6} />;
      case 'cards': return <Ghost className="w-6 h-6 text-slate-400" strokeWidth={1.6} />;
      default: return <ShoppingBag className="w-6 h-6 text-slate-400" strokeWidth={1.6} />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 sm:p-12 text-center flex flex-col items-center justify-center bg-[#0E1626] rounded-2xl border border-white/10 w-full col-span-full my-4 shadow-sm"
    >
      <div className="relative mb-4">
        <div className="w-14 h-14 bg-[#070B14] rounded-2xl flex items-center justify-center border border-white/10 text-slate-400">
          {getIcon()}
        </div>
      </div>
      
      <h3 className="text-base font-bold text-white mb-1.5 tracking-tight">
        {title}
      </h3>
      
      <p className="text-xs font-normal text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">
        {description}
      </p>
      
      {actionText && onAction && !children && (
        <button 
          onClick={onAction}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
        >
          {actionText}
        </button>
      )}
      
      {children}
    </motion.div>
  );
};
