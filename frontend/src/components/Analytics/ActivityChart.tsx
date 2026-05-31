import React from 'react';

interface ActivityChartProps {
  data: Array<{ hour: string; value: number }>;
  label: string;
  color?: string;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, label, color = '#3b82f6' }) => {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-[#111827]/80 rounded-xl border border-slate-800/50 shadow-lg shadow-black/30 p-5">
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">{label}</h4>
      <div className="flex items-end gap-1 h-32">
        {data.map((d, i) => {
          const height = (d.value / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm hover:opacity-80 transition-opacity cursor-help relative group"
              style={{
                height: `${Math.max(height, 4)}%`,
                backgroundColor: color,
              }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700">
                {d.value}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-[9px] text-gray-500">
        <span>{data[0]?.hour || ''}</span>
        <span>{data[data.length - 1]?.hour || ''}</span>
      </div>
    </div>
  );
};
