import fs from 'fs';
import path from 'path';

const GRAPH_DIR = './world_data';
const GRAPH_FILE = path.join(GRAPH_DIR, 'graph.json');

function saveGraphState(state: { nodes: any[]; edges: any[] }) {
 if (!fs.existsSync(GRAPH_DIR)) {
  fs.mkdirSync(GRAPH_DIR, { recursive: true });
 }
 fs.writeFileSync(GRAPH_FILE, JSON.stringify(state, null, 2));
}

function loadGraphState(): { nodes: any[]; edges: any[] } | null {
 if (!fs.existsSync(GRAPH_FILE)) return null;
 return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'));
}

const saved = loadGraphState();

export class Graph {
 nodes = new Map(saved?.nodes || []);
 edges: any[] = saved?.edges || [];

 addNode(n: any) { this.nodes.set(n.id, n); this.persist(); }
 addEdge(e: any) { this.edges.push(e); this.persist(); }
 relations(id: string) { return this.edges.filter(e => e.source === id || e.target === id); }
 value(id: string) { return this.relations(id).reduce((s, e) => s + e.weight, 0); }

 persist() { saveGraphState({ nodes: [...this.nodes], edges: this.edges }); }
}
