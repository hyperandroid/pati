
export interface GeometryInfoIndexed {
	vertices: Float32Array;
	index: Uint16Array;
	uv: Float32Array;
	folds: MSTNode[];
	cuts: MSTNode[];
}

export class Vertex {

	index = 0;

	constructor(public x: number, public y: number, public z: number) {
	}

	static middle(v0: Vertex, v1: Vertex) {
		return new Vertex(
			v0.x + (v1.x - v0.x) / 2.,
			v0.y + (v1.y - v0.y) / 2.,
			v0.z + (v1.z - v0.z) / 2.,
		);
	}

	normalize() {
		const l = 1 / Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);

		this.x *= l;
		this.y *= l;
		this.z *= l;
	}
}

export class Edge {

	w0 = 0;
	w1 = 0;
	wc = 0;

	centerIndex = -1;

	v0 = -1;
	v1 = -1;

	constructor(public vertex0: Vertex, public vertex1: Vertex) {
		this.v0 = vertex0.index;
		this.v1 = vertex1.index;
	}
}

export interface MST {
	v0: number;
	v1: number;
	wc: number;
}

export interface FacesEdge extends MST {
	// edge vertex indices
	v0e: number;
	v1e: number;
}


export interface MSTNode {
	v0: number;
	v1: number;
}

const tetrahedronVertices = [
	[0.0, -1.0, 2.0],
	[1.73205081, -1.0, -1.0],
	[-1.73205081, -1.0, -1.0],
	[0.0, 2.0, 0.0],
]
const tetrahedronEdges = [
	[0, 1], [1, 2], [0, 2], [0, 3], [2, 3], [1, 3]
];

export default class Myriahedral {

	edges = new Map<number, Map<number, Edge>>();
	vertex: Vertex[] = [];
	index: number[] = [];
	subdivisions = 6;

	folds: MSTNode[];
	cuts: MSTNode[];

	constructor() {

		tetrahedronVertices.forEach(v => {
			this.insertVertex(new Vertex(v[0], v[1], v[2]));
		})

		tetrahedronEdges.forEach(e => {
			const edge = new Edge(this.vertex[e[0]], this.vertex[e[1]]);
			this.insertEdge(edge, 0);
		});

		this.recurse(1, 0, 2, 1);
		this.recurse(1, 0, 3, 2);
		this.recurse(1, 0, 1, 3);
		this.recurse(1, 1, 2, 3);

		// clone this.edges into edgesMST
		const edgesMST = new Map<number, Map<number, Edge>>();
		this.edges.forEach( (v,k) => {
			edgesMST.set(k, new Map<number, Edge>());

			v.forEach( (e,kk) => {
				if (e.centerIndex===-1) {
					edgesMST.get(k).set(kk, e);
				}
			});
		});

		const foldsMST = this.calcMST(this.calculateAdjacentFaces());
		this.folds = foldsMST.map(e => {
			return {
				v0: e.v0,
				v1: e.v1,
			}
		});

		// get non-folded edges' original vertex edge. these are cuts.
		foldsMST.forEach( f => {
			edgesMST.get(f.v0e)?.delete(f.v1e);
			edgesMST.get(f.v1e)?.delete(f.v0e);
		})
		this.cuts = [];
		edgesMST.forEach(es => {
			es.forEach(e => {
				this.cuts.push({
					v0: e.v0,
					v1: e.v1,
				});
			})
		});

		// const mstDistinctFaces = new Set<number>();
		// this.folds.forEach(e => {
		// 	mstDistinctFaces.add(e[0]);
		// 	mstDistinctFaces.add(e[1]);
		// })
		// console.log(`mst distinct faces size ${mstDistinctFaces.size}`);
		//
		// console.log(`mst size ${this.folds.length}`);
		//
		// console.log(`triangles: ${this.index.length/3}`);
		// const distinctVertices= new Set<number>();
		// this.index.forEach( v=> distinctVertices.add(v));
		// console.log(`distinct vertices in shpere: ${distinctVertices.size}`)
		// console.log(`vertices count: ${this.vertex.length}`);
		//
		// const distinctVerticesCuts = new Set<number>();
		// cuts.edges.forEach(e => {
		// 	distinctVerticesCuts.add(e.v0);
		// 	distinctVerticesCuts.add(e.v1);
		// })
		// console.log(`cuts distinct vertices count ${distinctVerticesCuts.size}`);
		// console.log(`cuts: ${cuts.edges.length} folds: ${folds.edges.length}`);
	}

	calcMST(edges: FacesEdge[]): FacesEdge[] {
		const helper = new Map<number, Map<number, FacesEdge>>();

		function insert(f0: number, f1: number, e: FacesEdge) {

			let dd = helper.get(f0);
			if (!dd) {
				dd = new Map<number, FacesEdge>();
				helper.set(f0, dd);
			}

			const ed = dd.get(f1);
			if (ed===undefined) {
				dd.set(f1,e);
			}
		}

		edges.forEach(e=>{
			e.wc*=-1;

			let f0 = e.v0;
			let f1 = e.v1;

			insert(f0,f1,e);
			insert(f1,f0,e);
		});

		const treeFaces: number[] = [];
		const treeFacesSet: Set<number> = new Set();
		treeFaces.push(edges[0].v0);

		const treeEdges: FacesEdge[] = [];

		while(treeFacesSet.size !== this.index.length/3) {

			let minEdge: FacesEdge = null;
			let minWC = Number.MAX_VALUE;
			let nextFace = -1;

			treeFaces.forEach(face => {
				// find minimum wc of any edge outgoing from face edge
				helper.get(face).forEach((e, faceKey) => {
					if (!treeFacesSet.has(faceKey) && e.wc < minWC && faceKey!==face) {
						minEdge = e;
						minWC = e.wc;
						nextFace = faceKey;
					}
				});
			});

			if (minEdge) {
				treeFaces.push(nextFace);
				treeEdges.push(minEdge);
				treeFacesSet.add(nextFace);
			} else {
				console.error(`no more edges`);
				break;
			}
		}

		console.log(`clean end`);

		return treeEdges;
	}

	private calculateAdjacentFaces(): FacesEdge[] {

		function insert(v0: number, v1: number, faceIndex: number, edge: Edge) {

			if (v0>v1) {
				[v0,v1]=[v1,v0];
			}

			let d = edges.get(v0);
			if (d===undefined) {
				d = new Map<number, FacesEdge>();
				edges.set(v0, d);
			}

			let d1 = d.get(v1);
			if (d1===undefined) {
				d1 = {
					v0: -1,
					v1: -1,
					wc: -1,
					v0e: edge.v0,
					v1e: edge.v1,
				};
				d.set(v1, d1);
			}

			d1.wc = edge.wc;
			if (d1.v0===-1) {
				d1.v0 = faceIndex;
			} else {
				d1.v1 = faceIndex;
			}
		}

		const getWC = (i0: number, i1: number): Edge => {
			i0 = this.index[i0];
			i1 = this.index[i1];

			if (i0>i1) {
				[i0,i1] = [i1,i0];
			}

			return this.edges.get(i0).get(i1);
		}

		// edge v0 -> edge v1 -> indices of faces containing edge v0-v1
		const edges = new Map<number, Map<number, FacesEdge>>();

		for(let i = 0; i<this.index.length; i+=3) {
			let wc: Edge;

			wc = getWC(i, i+1);
			insert(this.index[i  ], this.index[i+1], i/3, wc);
			wc = getWC(i+1, i+2);
			insert(this.index[i+1], this.index[i+2], i/3, wc);
			wc = getWC(i+2, i);
			insert(this.index[i+2], this.index[i  ], i/3, wc);
		}

		const facePairs: FacesEdge[] = []
		// obtain pairs of faces:
		edges.forEach( es => {
			es.forEach( faces => {
				facePairs.push(faces);
			});
		});

		return facePairs;
	}

	getMeshData(): GeometryInfoIndexed {

		const vertices = new Float32Array(this.vertex.length * 3);
		this.vertex.forEach((v, i) => {

			v.normalize();

			vertices[i * 3] = v.x;
			vertices[i * 3 + 1] = v.y;
			vertices[i * 3 + 2] = v.z;
		});

		return {
			vertices,
			index: new Uint16Array(this.index),
			uv: this.calculateUVIndexed(),
			folds: this.folds,
			cuts: this.cuts
		};
	}

	protected calculateUVIndexed() {
		const uv = new Float32Array(this.vertex.length * 2);

		this.vertex.forEach((v, i) => {
			uv[i * 2] = .5 + Math.atan2(v.x, v.z) / (2 * Math.PI);
			uv[i * 2 + 1] = .5 - Math.asin(v.y) / Math.PI;
		});

		return uv;
	}

	insertVertex(v: Vertex) {
		v.index = this.vertex.length;
		this.vertex.push(v);
	}

	insertEdge(e: Edge, level: number) {
		let v0 = e.v0;
		let v1 = e.v1;

		if (v0 > v1) {
			[v0, v1] = [v1, v0];
		}

		let data = this.edges.get(v0);
		if (data === undefined) {
			data = new Map<number, Edge>();
			this.edges.set(v0, data);
		}

		if (data.get(v1) !== undefined) {
			// edge exists.
			return;
		}

		e.w0 = level;
		e.w1 = level;
		e.wc = level + 1;

		data.set(v1, e);
	}

	getEdgeByVertexIndices(v0i: number, v1i: number): Edge | undefined {
		if (v0i > v1i) {
			[v0i, v1i] = [v1i, v0i];
		}

		return this.edges.get(v0i)?.get(v1i);
	}

	/**
	 * recurse edges v01-v1i, v1i-v2i, v2i-v0i
	 * @param level
	 * @param v0i
	 * @param v1i
	 * @param v2i
	 */
	recurse(level: number, v0i: number, v1i: number, v2i: number) {

		if (level === this.subdivisions) {
			this.index.push(v0i, v1i, v2i);
			return;
		}

		const mv0v1 = this.getEdgeByVertexIndices(v0i, v1i);
		if (mv0v1.centerIndex === -1) {
			this.splitEdge(mv0v1);
		}

		const mv1v2 = this.getEdgeByVertexIndices(v1i, v2i);
		if (mv1v2.centerIndex === -1) {
			this.splitEdge(mv1v2);
		}

		const mv2v0 = this.getEdgeByVertexIndices(v2i, v0i);
		if (mv2v0.centerIndex === -1) {
			this.splitEdge(mv2v0);
		}

		this.insertEdge(new Edge(this.vertex[mv0v1.centerIndex], this.vertex[mv2v0.centerIndex]), level);
		this.insertEdge(new Edge(this.vertex[mv0v1.centerIndex], this.vertex[mv1v2.centerIndex]), level);
		this.insertEdge(new Edge(this.vertex[mv2v0.centerIndex], this.vertex[mv1v2.centerIndex]), level);

		this.recurse(level + 1, v0i, mv0v1.centerIndex, mv2v0.centerIndex);
		this.recurse(level + 1, mv0v1.centerIndex, v1i, mv1v2.centerIndex);
		this.recurse(level + 1, mv1v2.centerIndex, mv2v0.centerIndex, mv0v1.centerIndex);
		this.recurse(level + 1, mv2v0.centerIndex, mv1v2.centerIndex, v2i);
	}

	splitEdge(e: Edge) {

		const v0v1 = Vertex.middle(e.vertex0, e.vertex1);
		this.insertVertex(v0v1);

		e.centerIndex = v0v1.index;

		if (!this.getEdgeByVertexIndices(e.v0, v0v1.index)) {
			const e0 = new Edge(e.vertex0, v0v1);
			this.insertEdge(e0, 0);
			e0.w0 = e.w0;
			e0.w1 = e.wc;
			e0.wc = (e.w0 + e.wc) / 2;
		}

		if (!this.getEdgeByVertexIndices(v0v1.index, e.v1)) {
			const e1 = new Edge(v0v1, e.vertex1);
			this.insertEdge(e1, 0);
			e1.w0 = e.wc;
			e1.w1 = e.w1;
			e1.wc = (e.wc + e.w1) / 2;
		}
	}
}