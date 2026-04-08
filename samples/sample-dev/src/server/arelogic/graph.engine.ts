let graphData: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };

export class Graph {
  nodes = new Map<string, any>(graphData.nodes);
  edges: any[] = [...graphData.edges];

  addNode(n: any) {
    this.nodes.set(n.id, n);
    this.persist();
  }

  addEdge(e: any) {
    this.edges.push(e);
    this.persist();
  }

  relations(id: string) {
    return this.edges.filter((e) => e.source === id || e.target === id);
  }

  value(id: string) {
    return this.relations(id).reduce((s, e) => s + e.weight, 0);
  }

  persist() {
    graphData = { nodes: [...this.nodes], edges: this.edges };
  }
}
