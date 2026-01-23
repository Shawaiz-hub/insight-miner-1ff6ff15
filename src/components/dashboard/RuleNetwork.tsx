import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { AssociationRule } from "@/pages/Dashboard";

interface RuleNetworkProps {
  rules: AssociationRule[];
}

interface Node {
  id: string;
  x: number;
  y: number;
  size: number;
  connections: number;
}

interface Edge {
  source: string;
  target: string;
  confidence: number;
  lift: number;
}

export function RuleNetwork({ rules }: RuleNetworkProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const nodeMap: Record<string, { connections: number; totalConfidence: number }> = {};
    const edgeList: Edge[] = [];

    // Build node and edge data
    rules.forEach((rule) => {
      const antecedentKey = rule.antecedent.join(", ");
      const consequentKey = rule.consequent.join(", ");

      if (!nodeMap[antecedentKey]) {
        nodeMap[antecedentKey] = { connections: 0, totalConfidence: 0 };
      }
      if (!nodeMap[consequentKey]) {
        nodeMap[consequentKey] = { connections: 0, totalConfidence: 0 };
      }

      nodeMap[antecedentKey].connections++;
      nodeMap[antecedentKey].totalConfidence += rule.confidence;
      nodeMap[consequentKey].connections++;

      edgeList.push({
        source: antecedentKey,
        target: consequentKey,
        confidence: rule.confidence,
        lift: rule.lift,
      });
    });

    // Calculate node positions in a circle
    const nodeIds = Object.keys(nodeMap);
    const centerX = 200;
    const centerY = 200;
    const radius = 150;

    const nodeList: Node[] = nodeIds.map((id, index) => {
      const angle = (2 * Math.PI * index) / nodeIds.length - Math.PI / 2;
      return {
        id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        size: Math.min(40, 15 + nodeMap[id].connections * 5),
        connections: nodeMap[id].connections,
      };
    });

    return { nodes: nodeList, edges: edgeList };
  }, [rules]);

  const getNodePosition = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const getEdgeColor = (lift: number) => {
    if (lift >= 1.5) return "hsl(var(--primary))";
    if (lift >= 1.2) return "hsl(var(--accent))";
    return "hsl(var(--muted))";
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  if (rules.length === 0) {
    return (
      <Card className="bg-secondary/30 border-border">
        <CardContent className="p-8 text-center text-muted-foreground">
          No rules to visualize
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-secondary/30 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Rule Network Diagram</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-lg bg-background/50 border border-border">
          <svg
            width="100%"
            height="400"
            viewBox={`0 0 ${400 / zoom} ${400 / zoom}`}
            style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
          >
            {/* Legend */}
            <g transform="translate(10, 10)">
              <rect
                x="0"
                y="0"
                width="120"
                height="70"
                fill="hsl(var(--background))"
                fillOpacity="0.9"
                rx="4"
              />
              <text x="10" y="18" fontSize="10" fill="hsl(var(--foreground))">
                Lift Strength:
              </text>
              <circle cx="20" cy="32" r="5" fill="hsl(var(--primary))" />
              <text x="30" y="36" fontSize="9" fill="hsl(var(--muted-foreground))">
                Strong ({">"}1.5)
              </text>
              <circle cx="20" cy="48" r="5" fill="hsl(var(--accent))" />
              <text x="30" y="52" fontSize="9" fill="hsl(var(--muted-foreground))">
                Moderate (1.2-1.5)
              </text>
              <circle cx="20" cy="62" r="5" fill="hsl(var(--muted))" />
              <text x="30" y="66" fontSize="9" fill="hsl(var(--muted-foreground))">
                Weak ({"<"}1.2)
              </text>
            </g>

            {/* Edges */}
            {edges.map((edge, index) => {
              const source = getNodePosition(edge.source);
              const target = getNodePosition(edge.target);
              const midX = (source.x + target.x) / 2;
              const midY = (source.y + target.y) / 2;
              const dx = target.x - source.x;
              const dy = target.y - source.y;
              const angle = Math.atan2(dy, dx);
              const arrowSize = 8;

              return (
                <g key={index}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={getEdgeColor(edge.lift)}
                    strokeWidth={1 + edge.confidence * 2}
                    strokeOpacity={0.6}
                  />
                  {/* Arrow head */}
                  <polygon
                    points={`
                      ${target.x - 15 * Math.cos(angle)},${target.y - 15 * Math.sin(angle)}
                      ${target.x - 15 * Math.cos(angle) - arrowSize * Math.cos(angle - 0.5)},${target.y - 15 * Math.sin(angle) - arrowSize * Math.sin(angle - 0.5)}
                      ${target.x - 15 * Math.cos(angle) - arrowSize * Math.cos(angle + 0.5)},${target.y - 15 * Math.sin(angle) - arrowSize * Math.sin(angle + 0.5)}
                    `}
                    fill={getEdgeColor(edge.lift)}
                    fillOpacity={0.8}
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.size / 2}
                  fill={
                    hoveredNode === node.id
                      ? "hsl(var(--primary))"
                      : "hsl(var(--secondary))"
                  }
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
                <text
                  x={node.x}
                  y={node.y + node.size / 2 + 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="hsl(var(--foreground))"
                  fontWeight={hoveredNode === node.id ? "bold" : "normal"}
                >
                  {node.id.length > 12 ? node.id.slice(0, 10) + "..." : node.id}
                </text>
              </g>
            ))}

            {/* Hovered node info */}
            {hoveredNode && (
              <g transform={`translate(${200}, ${380})`}>
                <rect
                  x="-100"
                  y="-20"
                  width="200"
                  height="24"
                  fill="hsl(var(--background))"
                  fillOpacity="0.95"
                  rx="4"
                  stroke="hsl(var(--border))"
                />
                <text
                  x="0"
                  y="-3"
                  textAnchor="middle"
                  fontSize="11"
                  fill="hsl(var(--foreground))"
                >
                  {hoveredNode} (
                  {nodes.find((n) => n.id === hoveredNode)?.connections} connections)
                </text>
              </g>
            )}
          </svg>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Nodes represent itemsets. Edges show association rules with arrows pointing from
          antecedent to consequent. Edge thickness indicates confidence, color indicates
          lift strength.
        </p>
      </CardContent>
    </Card>
  );
}
