import React from 'react';
import { Handle, Position } from 'reactflow';
import { Trash2, Edit3, Key, Table, Link as LinkIcon, Layers } from 'lucide-react';

const TableNode = ({ id, data }) => {
  // Common style for handles to ensure they show up in downloads
  const handleStyle = { 
    backgroundColor: '#3b82f6', 
    border: '2px solid white',
    width: '8px',
    height: '8px',
    opacity: 1 // Ensure they are visible for the export engine
  };

  return (
    <div className="bg-white border-2 border-slate-800 rounded shadow-2xl min-w-[220px] font-sans overflow-hidden group relative">
      
      {/* MULTIDIRECTIONAL HANDLES */}
      {/* Top Handles */}
      <Handle type="target" position={Position.Top} id="top-target" style={{ ...handleStyle, top: '-4px' }} className="z-10 cursor-crosshair" />
      <Handle type="source" position={Position.Top} id="top-source" style={{ ...handleStyle, top: '-4px' }} className="z-10 cursor-crosshair" />

      {/* Bottom Handles */}
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ ...handleStyle, bottom: '-4px' }} className="z-10 cursor-crosshair" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" style={{ ...handleStyle, bottom: '-4px' }} className="z-10 cursor-crosshair" />

      {/* Left Handles */}
      <Handle type="target" position={Position.Left} id="left-target" style={{ ...handleStyle, left: '-4px' }} className="z-10 cursor-crosshair" />
      <Handle type="source" position={Position.Left} id="left-source" style={{ ...handleStyle, left: '-4px' }} className="z-10 cursor-crosshair" />

      {/* Right Handles */}
      <Handle type="target" position={Position.Right} id="right-target" style={{ ...handleStyle, right: '-4px' }} className="z-10 cursor-crosshair" />
      <Handle type="source" position={Position.Right} id="right-source" style={{ ...handleStyle, right: '-4px' }} className="z-10 cursor-crosshair" />

      {/* Table Header */}
      <div 
        className="text-white px-3 py-2 text-[11px] font-bold flex items-center justify-between"
        style={{ backgroundColor: data.color || '#334155' }}
      >
        <div 
          className="flex items-center gap-2 cursor-pointer flex-1 min-w-0" 
          onClick={() => data.onEdit?.(id, data)}
        >
          <Table size={14} className="opacity-70 shrink-0" />
          <span className="truncate uppercase tracking-tight">{data.label}</span>
          <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); data.onDelete?.(id); }} 
          className="text-white/60 hover:text-white transition-colors ml-2"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Column List */}
      <div className="bg-white flex flex-col">
        {data.columns?.map((col, index) => (
          <div key={`${col.name}-${index}`} className="flex items-center px-3 py-2 border-b border-slate-50 last:border-0 text-[11px] hover:bg-slate-50 transition-colors">
            {/* Key Icon Only Container */}
            <div className="w-5 flex justify-center shrink-0 mr-2">
              {col.isPK && (
                <Key size={12} className="text-yellow-500 fill-yellow-500 transform -rotate-45" title="Primary Key" />
              )}
              {col.isCK && (
                <Layers size={12} className="text-blue-500" title="Composite Key" />
              )}
              {col.isFK && (
                <LinkIcon size={12} className="text-emerald-500" title="Foreign Key" />
              )}
            </div>

            {/* Column Name */}
            <span className={`flex-1 truncate text-slate-700 ${col.isPK || col.isCK ? 'font-bold' : 'font-medium'}`}>
              {col.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(TableNode);