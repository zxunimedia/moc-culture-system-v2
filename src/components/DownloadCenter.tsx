import React, { useEffect, useState } from 'react';
import { pb } from '../pocketbase';
import { SharedFile } from '../types';
import { FileText, Download, Loader2 } from 'lucide-react';

const DownloadCenter: React.FC = () => {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pb.collection('shared_files').getFullList<SharedFile>({ sort: '-created' })
      .then(res => { setFiles(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map(f => (
          <div key={f.id} className="bg-white p-5 rounded-[24px] border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all group">
            <div className="flex items-start justify-between">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <FileText size={24} />
              </div>
              <a 
                href={pb.files.getUrl(f, f.file)} 
                download 
                className="p-2 text-slate-300 hover:text-blue-600 transition-colors"
              >
                <Download size={20} />
              </a>
            </div>
            <div className="mt-4">
              <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-widest">{f.category}</span>
              <h3 className="mt-2 font-black text-slate-700 leading-tight">{f.title}</h3>
              <p className="text-[10px] text-slate-400 mt-1">發佈日期：{new Date(f.created).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DownloadCenter;
