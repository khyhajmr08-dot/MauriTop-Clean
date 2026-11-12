import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface FinanceStatCardProps {
  id?: string;
  title: string;
  value: string;
  change: number;
  data: Array<{ val: number }>;
}

const FinanceStatCard: React.FC<FinanceStatCardProps> = ({ id, title, value, change, data }) => {
  return (
    <div id={id} className="p-8 bg-slate-900 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-all shadow-2xl">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-black text-white font-mono">{value}</h3>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border w-fit ${change >= 0 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        </div>
        <div className="w-24 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="val" stroke={change >= 0 ? '#06b6d4' : '#ef4444'} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FinanceStatCard;
