import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  addEdge, Background, Controls, applyNodeChanges, applyEdgeChanges, MarkerType,
  Panel, getNodesBounds, useReactFlow, ReactFlowProvider 
} from 'reactflow';
import { toSvg, toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import 'reactflow/dist/style.css';
import { RefreshCcw, Trash2, Plus, Database, Edit2, Check, Key, Link as LinkIcon, Layers, X } from 'lucide-react';
import TableNode from './TableNode';

const nodeTypes = {
  tableNode: TableNode,
};

const INITIAL_LEGEND = [
  { id: '1', name: 'Reporting', hex: '#fbbf24' },
  { id: '2', name: 'Warehouse', hex: '#94a3b8' },
  { id: '3', name: 'Staging', hex: '#cd7f32' },
  { id: '4', name: 'Refined', hex: '#10b981' },
  { id: '5', name: 'Sensitive', hex: '#f43f5e' },
  { id: '6', name: 'External', hex: '#a855f7' },
  { id: '7', name: 'Master Data', hex: '#3b82f6' },
  { id: '8', name: 'Audit/Logs', hex: '#64748b' },
  { id: '9', name: 'Temporary', hex: '#ec4899' },
  { id: '10', name: 'Archive', hex: '#0f172a' },
];

function FlowApp() {
  const { fitView } = useReactFlow();
  const [nodes, setNodes] = useState(() => {
    try {
      const saved = localStorage.getItem('nodes');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [edges, setEdges] = useState(() => {
    try {
      const saved = localStorage.getItem('edges');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [tableName, setTableName] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#fbbf24');
  const [relType, setRelType] = useState('1:N');
  const [edgeToDelete, setEdgeToDelete] = useState('');
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [showExportToast, setShowExportToast] = useState(false);
  
  const [legend, setLegend] = useState(() => {
    try {
      const saved = localStorage.getItem('legend');
      return saved ? JSON.parse(saved) : INITIAL_LEGEND;
    } catch { return INITIAL_LEGEND; }
  });

  const [renamingId, setRenamingId] = useState(null);
  const activeLegendItem = legend.find(l => l.hex === selectedColor) || legend[0];

  const handleRenameLegend = (id, newName) => {
    setLegend(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, name: newName } : item);
      localStorage.setItem('legend', JSON.stringify(updated));
      return updated;
    });
  };

  const onDeleteNode = useCallback((id) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }, []);

  const onStartEdit = useCallback((id, data) => {
    setEditingNodeId(id);
    setTableName(data.label);
    const text = data.columns?.map(c => {
        let tag = '';
        if (c.isPK) tag = ' (pk)';
        else if (c.isFK) tag = ' (fk)';
        else if (c.isCK) tag = ' (ck)';
        return `${c.name}${tag}`;
    }).join(', ');
    setSchemaText(text || '');
    setSelectedColor(data.color);
  }, []);

  useEffect(() => {
    localStorage.setItem('nodes', JSON.stringify(nodes));
    localStorage.setItem('edges', JSON.stringify(edges));
  }, [nodes, edges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onDelete: onDeleteNode,
          onEdit: onStartEdit,
        },
      }))
    );
  }, [onDeleteNode, onStartEdit]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const addTable = () => {
    if (!tableName) return;
    
    const columns = schemaText.split(',')
      .map(item => item.trim())
      .filter(i => i !== "")
      .map(item => ({ 
        name: item.replace(/\((pk|fk|ck)\)/gi, '').trim(), 
        isPK: /\(pk\)/i.test(item),
        isFK: /\(fk\)/i.test(item),
        isCK: /\(ck\)/i.test(item)
      }));
    
    const newNodeData = { 
      label: tableName, 
      columns, 
      color: selectedColor, 
      onDelete: onDeleteNode, 
      onEdit: onStartEdit 
    };

    if (editingNodeId) {
      setNodes(nds => nds.map(n => n.id === editingNodeId ? { ...n, data: newNodeData } : n));
      setEditingNodeId(null);
    } else {
      const newNode = { 
        id: `node_${Date.now()}`, 
        type: 'tableNode', 
        position: { x: 350, y: 150 }, 
        data: newNodeData 
      };
      setNodes(nds => nds.concat(newNode));
    }
    setTableName(''); setSchemaText('');
  };

  const onConnect = useCallback((params) => {
    let markerEnd = undefined;
    let markerStart = undefined;

    if (relType === '1:1') {
      markerEnd = { 
        type: MarkerType.ArrowClosed, 
        color: '#3b82f6', 
        width: 15, 
        height: 15 
      };
    } 
    else if (relType === '1:N') {
      markerEnd = 'many-side'; 
    } 
    else if (relType === 'N:M') {
      markerStart = 'many-side'; 
      markerEnd = 'many-side';
    }

    const edge = {
      ...params,
      id: `e-${Date.now()}`,
      type: 'smoothstep',
      style: { strokeWidth: 1.5, stroke: '#3b82f6' },
      markerStart,
      markerEnd,
    };

    setEdges((eds) => addEdge(edge, eds));
  }, [relType]);
  
  const getEdgeLabelForDropdown = (edge) => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    return `${source?.data?.label || 'Source'} → ${target?.data?.label || 'Target'}`;
  };
const exportDiagram = async (format) => {
  // Handle JSON export first
  if (format === 'json') {
    const data = JSON.stringify({ nodes, edges, legend }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `database_model_${Date.now()}.json`;
    link.click();
    return;
  }

  const element = document.querySelector('.react-flow');
  if (!element || nodes.length === 0) return;

  try {
    const bounds = getNodesBounds(nodes);
    
    // Constants for layout
    const legendBuffer = 300; 
    const margin = 100;       
    
    // Calculate total canvas dimensions
    const exportWidth = bounds.width + legendBuffer + (margin * 2);
    const exportHeight = bounds.height + (margin * 2);

    const options = {
      backgroundColor: '#f8fafc',
      width: exportWidth,
      height: exportHeight,
      style: {
        width: `${exportWidth}px`,
        height: `${exportHeight}px`,
      },
      onClone: (clonedDoc) => {
        const viewport = clonedDoc.querySelector('.react-flow__viewport');
        const panel = clonedDoc.querySelector('.react-flow__panel');

        // Position the Legend
        if (panel) {
          panel.style.position = 'absolute';
          panel.style.left = '40px';
          panel.style.top = '40px';
          panel.style.margin = '0';
          panel.style.display = 'block';
          panel.style.visibility = 'visible';
          panel.style.zIndex = '1000';
          
          if (panel.firstChild) {
            panel.firstChild.style.boxShadow = 'none';
            panel.firstChild.style.border = '1px solid #e2e8f0';
          }
        }

        // Position the Nodes (Shift right to accommodate legend)
        if (viewport) {
          const x = -bounds.x + legendBuffer; 
          const y = -bounds.y + margin;
          viewport.style.transform = `translate(${x}px, ${y}px) scale(1)`;
        }
      },
      filter: (node) => {
        const exclude = ['react-flow__controls', 'react-flow__attribution'];
        return !exclude.some(cls => node.classList?.contains(cls));
      }
    };

    const fileName = `db_model_${Date.now()}.${format}`;
    
    // Support only PNG and SVG
    const dataUrl = format === 'svg' ? await toSvg(element, options) : await toPng(element, options);

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.click();

  } catch (err) {
    console.error("Export Error:", err);
    alert("Export failed. Please try again.");
  }
};
   

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      <aside className="w-80 h-full bg-[#0f172a] text-white p-5 flex flex-col z-50 shadow-2xl overflow-y-auto border-r border-slate-800">
        <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-blue-400">
            <Database size={20} />
            <span className="text-xl font-bold text-white tracking-tight">Data Model Diagram</span>
          </div>
          <button onClick={() => {localStorage.clear(); window.location.reload()}} className="text-slate-500 hover:text-red-400">
            <RefreshCcw size={16} />
          </button>
        </div>

        <div className="space-y-8">
          <section>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-black text-slate-500 uppercase">1. Table Setup</label>
              <button 
                onClick={() => setRenamingId(activeLegendItem.id)}
                className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-all duration-300 border hover:bg-white/10"
                style={{ 
                  backgroundColor: `${activeLegendItem.hex}20`,
                  color: activeLegendItem.hex,
                  borderColor: `${activeLegendItem.hex}40`
                }}
              >
                {activeLegendItem.name}
                <Edit2 size={8} />
              </button>
            </div>

            <input 
              className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded text-sm mb-4 outline-none focus:border-blue-500 text-white" 
              value={tableName} 
              onChange={e => setTableName(e.target.value)} 
              placeholder="Table Name" 
            />
            
            <div className="grid grid-cols-5 gap-2 mb-2">
              {legend.map(l => (
                <button 
                  key={l.id} 
                  onClick={() => setSelectedColor(l.hex)}
                  onDoubleClick={() => setRenamingId(l.id)}
                  title="Double click to rename"
                  className={`h-7 rounded transition-all border-2 ${selectedColor === l.hex ? 'border-white scale-110' : 'border-transparent opacity-40 hover:opacity-100'}`}
                  style={{ backgroundColor: l.hex }} 
                />
              ))}
            </div>

            {renamingId && (
              <div className="mb-4 flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg animate-in fade-in slide-in-from-top-1">
                <input 
                  autoFocus
                  className="flex-1 bg-slate-900 border border-slate-700 p-1.5 rounded text-xs text-white outline-none focus:border-blue-500"
                  value={legend.find(l => l.id === renamingId)?.name || ''}
                  onChange={(e) => handleRenameLegend(renamingId, e.target.value)}
                  onBlur={() => setRenamingId(null)}
                  onKeyDown={(e) => e.key === 'Enter' && setRenamingId(null)}
                  placeholder="New category name..."
                />
                <button onClick={() => setRenamingId(null)} className="text-blue-400 hover:text-white">
                  <Check size={14} />
                </button>
              </div>
            )}

            <textarea 
              className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded h-32 text-xs font-mono mb-4 outline-none text-slate-300" 
              value={schemaText} 
              onChange={e => setSchemaText(e.target.value)} 
              placeholder="id (pk), user_id (fk), code (ck)" 
            />
            
            <button onClick={addTable} className="w-full py-3 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2">
              {editingNodeId ? <RefreshCcw size={16}/> : <Plus size={16}/>}
              {editingNodeId ? 'Update' : 'Add Table'}
            </button>
          </section>

          <section className="pt-6 border-t border-slate-800">
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-3">2. Relationships</label>
            <select 
              className="w-full bg-slate-800 border border-slate-700 p-2.5 rounded text-xs mb-4 text-white"
              value={relType} 
              onChange={e => setRelType(e.target.value)}
            >
              <option value="1:1">1:1</option>
              <option value="1:N">1:N</option>
              <option value="N:M">N:M</option>
            </select>
            
            <div className="flex gap-2">
              <select 
                className="flex-1 bg-slate-800 border border-slate-700 p-2 rounded text-[10px] text-slate-300" 
                value={edgeToDelete} 
                onChange={e => setEdgeToDelete(e.target.value)}
              >
                <option value="">Select link to delete...</option>
                {edges.map(e => (
                  <option key={e.id} value={e.id}>{getEdgeLabelForDropdown(e)}</option>
                ))}
              </select>
              <button 
                onClick={() => {setEdges(eds => eds.filter(e => e.id !== edgeToDelete)); setEdgeToDelete('');}} 
                className="p-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </section>

          <section className="pt-6 border-t border-slate-800 pb-10">
            <label className="text-[10px] font-black text-blue-400 uppercase block mb-4">3. Export</label>
            <div className="grid grid-cols-2 gap-2">
            
              <button onClick={() => exportDiagram('json')} className="bg-blue-600/20 text-blue-400 p-2 rounded text-[10px] font-bold">JSON</button>
              <button onClick={() => exportDiagram('svg')} className="bg-slate-800 p-2 rounded text-[10px] font-bold">SVG</button>
            </div>
          </section>
        </div>
      </aside>

      <main className="flex-1 relative bg-[#f1f5f9]">
        {/* REFRESH POPUP NOTIFICATION */}
        {showExportToast && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-4 border border-blue-400">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <RefreshCcw size={18} className="animate-spin" style={{ animationDuration: '3s' }} />
              </div>
              <p className="font-bold text-sm tracking-wide">
                Kindly refresh the page after downloading the content
              </p>
              <button 
                onClick={() => setShowExportToast(false)}
                className="hover:bg-black/10 p-1 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange} 
          onEdgesChange={onEdgesChange} 
          onConnect={onConnect} 
          nodeTypes={nodeTypes}
          fitView
        >
          <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, pointerEvents: 'none' }}>
            <defs>
              <marker
                id="many-side"
                markerWidth="15"
                markerHeight="15"
                refX="10" 
                refY="7.5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 2,2 L 10,7.5 L 2,13" 
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </marker>
            </defs>
          </svg>
          <Background color="#cbd5e1" variant="dots" gap={20} size={1} />
          <Controls />
          
           <Panel position="top-left" className="m-4">
  <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200 w-[180px] max-h-[80vh] overflow-y-auto pointer-events-auto">

    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
      Categories
    </h3>

    <div className="space-y-2.5 mb-4 border-b border-slate-100 pb-3">
      {legend
        .filter(item =>
          nodes.some(n => n.data.color === item.hex) ||
          item.hex === selectedColor
        )
        .map((item) => {

          const count = nodes.filter(n => n.data.color === item.hex).length;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full shadow-sm ring-1 ring-slate-200"
                  style={{ backgroundColor: item.hex }}
                />
                <span className="text-[12px] font-medium text-slate-600 whitespace-nowrap">
                  {item.name}
                </span>
              </div>

              {count > 0 && (
                <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-full font-bold text-slate-500 border border-slate-200">
                  {count}
                </span>
              )}
            </div>
          );
        })}
    </div>

    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Keys
    </h3>

    <div className="space-y-2 mb-4 border-b border-slate-100 pb-3">
      <div className="flex items-center gap-2.5">
        <Key size={12} className="text-yellow-500 fill-yellow-500 transform -rotate-45" />
        <span className="text-[10px] font-bold text-slate-600">
          Primary Key (pk)
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <Layers size={12} className="text-blue-500" />
        <span className="text-[10px] font-bold text-slate-600">
          Composite Key (ck)
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <LinkIcon size={12} className="text-emerald-500" />
        <span className="text-[10px] font-bold text-slate-600">
          Foreign Key (fk)
        </span>
      </div>
    </div>

    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
      Relationships
    </h3>

    <div className="space-y-3">

      <div className="flex items-center gap-2.5">
        <svg width="24" height="12" className="overflow-visible">
          <line x1="0" y1="6" x2="20" y2="6" stroke="#3b82f6" strokeWidth="1.5" />
          <path d="M 15,2 L 22,6 L 15,10" fill="#3b82f6" />
        </svg>
        <span className="text-[10px] font-bold text-slate-600">
          One-to-One (1:1)
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <svg width="24" height="12" className="overflow-visible">
          <line x1="0" y1="6" x2="16" y2="6" stroke="#3b82f6" strokeWidth="1.5" />
          <path
            d="M 16,2 L 23,6 L 16,10"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px] font-bold text-slate-600">
          One-to-Many (1:N)
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <svg width="24" height="12" className="overflow-visible">
          <line x1="6" y1="6" x2="18" y2="6" stroke="#3b82f6" strokeWidth="1.5" />
          <path
            d="M 7,2 L 0,6 L 7,10"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M 17,2 L 24,6 L 17,10"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px] font-bold text-slate-600">
          Many-to-Many (N:M)
        </span>
      </div>

    </div>
  </div>
</Panel>
        </ReactFlow>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowApp />
    </ReactFlowProvider>
  );
}