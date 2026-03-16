import React from 'react';
import { Project } from '../types';

const ProjectProgressBar: React.FC<{ project: Project }> = ({ project }) => {
  const stages = project.grants || [];
  const completedCount = stages.filter(g => g.mocFinalCheck === '符合').length;
  const percent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  return (
    <div className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Progress</span>
          <h4 className="text-sm font-black text-slate-700">計畫執行總進度</h4>
        </div>
        <span className="text-xl font-black text-blue-600">{percent}%</span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex gap-1.5">
        {stages.map((g, i) => (
          <div key={i} className="flex-1 space-y-1">
            <div className={`h-1.5 rounded-full ${g.mocFinalCheck === '符合' ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            <p className="text-[9px] font-bold text-slate-400 truncate text-center">{g.stage}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectProgressBar;
