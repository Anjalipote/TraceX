import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

const activityData = [
  { time: '09:30', normalEvents: 14, suspiciousEvents: 0 },
  { time: '09:35', normalEvents: 22, suspiciousEvents: 0 },
  { time: '09:40', normalEvents: 35, suspiciousEvents: 1 },
  { time: '09:43', normalEvents: 18, suspiciousEvents: 0 },
  { time: '09:45', normalEvents: 45, suspiciousEvents: 4 }, // USB Connected
  { time: '09:48', normalEvents: 52, suspiciousEvents: 8 }, // File accessed & copied
  { time: '09:50', normalEvents: 68, suspiciousEvents: 15 }, // suspicious.exe executed
  { time: '09:55', normalEvents: 94, suspiciousEvents: 22 }, // Mass file deletions
  { time: '10:00', normalEvents: 26, suspiciousEvents: 2 },
  { time: '10:05', normalEvents: 12, suspiciousEvents: 0 },
];

export const ActivityChart: React.FC = () => {
  return (
    <div className="rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 p-6 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]/60">
        <div>
          <h3 className="text-sm font-bold text-[#F8FAFC]">
            Forensic Activity & Anomaly Correlation
          </h3>
          <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
            Event volume vs. suspicious anomaly spikes across timeline
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs font-mono">
          <div className="flex items-center gap-2 text-blue-400">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Normal Events</span>
          </div>
          <div className="flex items-center gap-2 text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Suspicious Anomalies</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#64748B" 
              fontSize={11} 
              tickLine={false} 
              fontFamily="JetBrains Mono"
            />
            <YAxis 
              stroke="#64748B" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              fontFamily="JetBrains Mono"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B1017',
                borderColor: '#1E293B',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#F8FAFC',
                fontFamily: 'JetBrains Mono',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
              }}
            />
            <Area
              type="monotone"
              dataKey="normalEvents"
              name="Normal Events"
              stroke="#3B82F6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorNormal)"
            />
            <Area
              type="monotone"
              dataKey="suspiciousEvents"
              name="Suspicious Events"
              stroke="#EF4444"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorSuspicious)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
