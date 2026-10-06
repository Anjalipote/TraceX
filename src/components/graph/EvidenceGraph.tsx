import React, { useState, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  BackgroundVariant,
  Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CustomForensicNode } from './CustomNode';
import { NodeDetailDrawer } from './NodeDetailDrawer';
import { INITIAL_GRAPH_NODES, INITIAL_GRAPH_EDGES } from '../../data/graph';
import { GraphNodeData } from '../../types';
import { 
  RotateCcw, 
  Layers,
  HelpCircle
} from 'lucide-react';

import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

const nodeTypes = {
  forensicNode: CustomForensicNode,
  custom: CustomForensicNode,
};

export const EvidenceGraph: React.FC = () => {
  const { currentCase } = useApp();
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_GRAPH_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_GRAPH_EDGES);

  const [selectedNodeData, setSelectedNodeData] = useState<GraphNodeData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeData, setSelectedEdgeData] = useState<any | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('ALL');

  // Dynamic Backend Graph Sync
  React.useEffect(() => {
    let isMounted = true;
    api.getGraph(currentCase.id).then((graph) => {
      if (isMounted && graph && graph.nodes && graph.nodes.length > 0) {
        setNodes(graph.nodes);
        setEdges(graph.edges);
      }
    }).catch(() => {
      // Retains demo fallback
    });
    return () => { isMounted = false; };
  }, [currentCase.id, setNodes, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const data = node.data as unknown as GraphNodeData;
    setSelectedNodeData(data);
    setSelectedNodeId(node.id);
    setSelectedEdgeData(null);

    setEdges((eds) =>
      eds.map((edge) => {
        const isConnected = edge.source === node.id || edge.target === node.id;
        return {
          ...edge,
          animated: isConnected,
          style: {
            ...edge.style,
            stroke: isConnected ? '#3B82F6' : '#334155',
            strokeWidth: isConnected ? 3 : 1,
            opacity: isConnected ? 1 : 0.35,
          },
        };
      })
    );
  }, [setEdges]);

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: any) => {
    setSelectedEdgeData(edge);
    setSelectedNodeData(null);
  }, []);

  const handleResetGraph = useCallback(() => {
    api.getGraph(currentCase.id).then((graph) => {
      if (graph && graph.nodes) {
        setNodes(graph.nodes);
        setEdges(graph.edges);
      } else {
        setNodes(INITIAL_GRAPH_NODES);
        setEdges(INITIAL_GRAPH_EDGES);
      }
    }).catch(() => {
      setNodes(INITIAL_GRAPH_NODES);
      setEdges(INITIAL_GRAPH_EDGES);
    });
    setSelectedNodeData(null);
    setSelectedNodeId(null);
    setSelectedEdgeData(null);
    setActiveTypeFilter('ALL');
  }, [currentCase.id, setNodes, setEdges]);

  const filteredNodes = useMemo(() => {
    if (activeTypeFilter === 'ALL') return nodes;
    return nodes.filter(n => {
      const data = n.data as unknown as GraphNodeData;
      return data.nodeType === activeTypeFilter;
    });
  }, [nodes, activeTypeFilter]);

  const nodeFilters = [
    { id: 'ALL', label: 'ALL ENTITIES' },
    { id: 'user', label: 'USERS' },
    { id: 'device', label: 'HARDWARE' },
    { id: 'file', label: 'FILES' },
    { id: 'executable', label: 'EXECUTABLES' },
    { id: 'event', label: 'ATTACK EVENTS' },
  ];

  return (
    <div className="space-y-6">
      {/* Graph Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B1017] border border-[#1E293B]/80 shadow-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono font-bold text-[#94A3B8] flex items-center gap-2 mr-2">
            <Layers className="w-4 h-4 text-blue-400" />
            FILTER NODES:
          </span>

          {nodeFilters.map((flt) => {
            const isActive = activeTypeFilter === flt.id;
            return (
              <button
                key={flt.id}
                onClick={() => setActiveTypeFilter(flt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50 shadow-sm font-semibold'
                    : 'bg-[#080D15] text-[#94A3B8] border border-[#1E293B] hover:text-[#F8FAFC]'
                }`}
              >
                {flt.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetGraph}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#080D15] hover:bg-[#111923] text-xs font-mono text-[#94A3B8] hover:text-white border border-[#1E293B] transition-colors"
            title="Reset node positions and edge highlights"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET GRAPH</span>
          </button>
        </div>
      </div>

      {/* Main Flow Canvas */}
      <div className="relative h-[720px] w-full rounded-2xl bg-[#070A0F] border border-[#1E293B]/80 overflow-hidden shadow-2xl">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.4}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={28} 
            size={1.5} 
            color="#1E293B" 
          />
          <Controls 
            showInteractive={false} 
            className="!bg-[#0B1017] !border !border-[#1E293B] !rounded-xl !p-1.5" 
          />
          <MiniMap 
            nodeColor={(node) => {
              const data = node.data as unknown as GraphNodeData;
              if (data?.risk === 'CRITICAL') return '#EF4444';
              if (data?.risk === 'HIGH') return '#F59E0B';
              return '#3B82F6';
            }}
            maskColor="rgba(7, 10, 15, 0.8)"
            className="!bg-[#0B1017] !border !border-[#1E293B] !rounded-xl"
          />
        </ReactFlow>

        {/* Selected Edge Relationship Callout */}
        {selectedEdgeData && (
          <div className="absolute top-5 right-5 max-w-sm p-4 rounded-2xl bg-[#0B1017]/95 backdrop-blur-md border border-blue-500/50 text-xs font-mono shadow-2xl space-y-2 animate-in fade-in-50 z-20">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <span className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-blue-400" />
                CORRELATED RELATIONSHIP
              </span>
              <button 
                onClick={() => setSelectedEdgeData(null)} 
                className="text-[#64748B] hover:text-white px-1 py-0.5 rounded hover:bg-[#1E293B]"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[#F8FAFC] tracking-wide text-xs">
                {selectedEdgeData.label || selectedEdgeData.relationship_type || 'CONNECTED'}
              </span>
              {selectedEdgeData.confidence && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                  {Math.round(selectedEdgeData.confidence * 100)}% Confidence
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              {selectedEdgeData.explanation || `Forensic connection established between ${selectedEdgeData.source} and ${selectedEdgeData.target}.`}
            </p>
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute top-5 left-5 p-3.5 rounded-2xl bg-[#0B1017]/90 backdrop-blur-md border border-[#1E293B] text-xs font-mono pointer-events-none space-y-2 shadow-xl">
          <div className="text-[10px] uppercase font-bold text-[#64748B]">Entity Severity Key</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Critical
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              High
            </span>
            <span className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Medium
            </span>
          </div>
        </div>

        {/* Interaction Hint */}
        <div className="absolute bottom-5 left-5 p-3 rounded-xl bg-[#0B1017]/85 backdrop-blur-sm border border-[#1E293B] text-[11px] font-mono text-[#94A3B8] pointer-events-none flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>Click any node or connecting edge to inspect forensic attributes & explanations.</span>
        </div>
      </div>

      <NodeDetailDrawer
        nodeData={selectedNodeData}
        isOpen={!!selectedNodeData}
        onClose={() => setSelectedNodeData(null)}
      />
    </div>
  );
};
