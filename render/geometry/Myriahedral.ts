import Vector3 from "../../math/Vector3";

export interface GeometryInfoIndexed {
	vertices: Float32Array;
	index: Uint16Array;
	uv: Float32Array;
	folds: MSTNode[];
	cuts: MSTNode[];
}

export class Vertex {

	index = 0;
	wasCut = false;

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

	clone(): Vertex {
		return new Vertex(this.x, this.y, this.z);
	}

	dot(o: Vertex) {
		// assumes normalized.
		return this.x*o.x + this.y*o.y + this.z*o.z;
	}
}

export class Edge {

	w0 = 0;
	w1 = 0;
	wc = 0;

	centerIndex = -1;	// when an edge is split during recursive subdivision,
						// this is the newly created vertex index.

	faceIndices: number[] = [];		// polygon index

	v0 = -1;
	v1 = -1;

	wasCut = false;

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

export class FacesEdge implements MST {

	parent: FacesEdge;
	children: FacesEdge[] = [];

	v0: number;
	v1: number;
	wc: number;

	// edge vertex indices
	v0e: number;
	v1e: number;

	constructor(v0e: number, v1e: number) {
		this.v0 = -1;
		this.v1 = -1;
		this.wc = -1;
		this.v0e = v0e;
		this.v1e = v1e;
		this.parent = null;
	}
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
	[0, 1], [1, 2], [2, 0], [0, 3], [2, 3], [1, 3]
];

export default class Myriahedral {

	edges = new Map<number, Map<number, Edge>>();
	vertex: Vertex[] = [];
	index: number[] = [];
	subdivisions = 6;

	foldsMST: FacesEdge[];
	folds: MSTNode[];
	cuts: Edge[];

	constructor(subdivisions: number) {

		this.subdivisions = subdivisions;

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

		this.foldsMST = this.calcMST(this.transformVertEdgesToFaceEdges());
		this.folds = this.foldsMST.map(e => {
			return {
				v0: e.v0,
				v1: e.v1,
			}
		});

		// FOLDS

		// clone this.edges into edgesMST
		const edgesMST = new Map<number, Map<number, Edge>>();
		this.edges.forEach( (v,k) => {

			let mm = edgesMST.get(k);
			if (mm===undefined) {
				mm = new Map<number, Edge>();
				edgesMST.set(k, mm);
			}

			v.forEach( (e,kk) => {
				if (e.centerIndex===-1) {
					mm.set(kk, e);
				}
			});
		});

		// CUTS (not needed but beautiful to visualise)

		// all non fold edges, are cut.
		// folds are face-face edges, so use original vertices edge.
		this.foldsMST.forEach( f => {
			edgesMST.get(f.v0e)?.delete(f.v1e);
			edgesMST.get(f.v1e)?.delete(f.v0e);
		})
		this.cuts = [];
		edgesMST.forEach(es => {
			es.forEach(e => {
				this.cuts.push(e);
			})
		});

		// unfold
		this.unfold(25);
	}

	/**
	 *
	 */
	cutGeometry() {

		const cut = (node: Edge, v0: Vertex, index: number) => {

			if (v0.wasCut) {
				return;
			}

			v0.wasCut = true;

			node.faceIndices.forEach(faceIndex => {
				const newVertex0 = v0.clone();
				this.insertVertex(newVertex0);
				const newVertex0Index = newVertex0.index;

				if (this.index[faceIndex * 3] === v0.index) {
					this.index[faceIndex * 3] = newVertex0Index;
				} else if (this.index[faceIndex * 3 + 1] === v0.index) {
					this.index[faceIndex * 3 + 1] = newVertex0Index;
				} else if (this.index[faceIndex * 3 + 2] === v0.index) {
					this.index[faceIndex * 3 + 2] = newVertex0Index;
				}

				if (index===0) {
					node.vertex0 = newVertex0;
				} else {
					node.vertex1 = newVertex0;
				}

			});
		}

		this.cuts.forEach((node,i) => {

			if (!node.wasCut) {

				node.wasCut = true;

				const v0 = this.vertex[node.v0];
				cut(node, v0, 0);
				const v1 = this.vertex[node.v1];
				cut(node, v1, 1);
			} else {
				console.log('cut twice');
			}
		});


	}

	calcMST(edges: FacesEdge[]): FacesEdge[] {

		const helper = new Map<number, Map<number, FacesEdge>>();	// faceid -> faceid -> faceEdge

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

		edges.forEach(e=> {
			e.wc *= -1;

			let f0 = e.v0;
			let f1 = e.v1;

			insert(f0, f1, e);
			insert(f1, f0, e);
		});

		const treeFaces: number[] = [];
		const treeFacesSet: Set<number> = new Set();
		treeFaces.push(edges[0].v0);
		treeFacesSet.add(edges[0].v0);

		const treeEdges: FacesEdge[] = [];

		while(treeFacesSet.size !== this.index.length/3) {

			let minFace = -1;
			let minEdge: FacesEdge = null;
			let minWC = Number.MAX_VALUE;
			let nextFace = -1;

			treeFaces.forEach(face => {
				// find minimum wc of any edge outgoing from face edge
				helper.get(face).forEach((e, faceKey) => {
					if (!treeFacesSet.has(faceKey) && e.wc < minWC) {
						minEdge = e;
						minWC = e.wc;

						nextFace = faceKey;
						minFace = face;
					}
				});
			});

			if (minEdge) {
				treeFaces.push(nextFace);
				treeEdges.push(minEdge);
				treeFacesSet.add(nextFace);

				const ancestor = treeFaces.indexOf(minFace)-1;
				const parent = treeEdges[ancestor];

				if (parent) {
					minEdge.parent = parent;
				}

			} else {
				console.error(`no more edges`);
				break;
			}
		}

		return treeEdges;
	}

	private transformVertEdgesToFaceEdges(): FacesEdge[] {

		function insert(vertexIndex0: number, vertexIndex1: number, faceIndex: number, edge: Edge) {

			// check whether we need to invert the edge data.
			let ed = faceEdges.get(vertexIndex0)?.get(vertexIndex1);
			if (ed===undefined) {
				if (faceEdges.get(vertexIndex1)?.get(vertexIndex0)) {
					[vertexIndex0, vertexIndex1] = [vertexIndex1, vertexIndex0];
				}
			}

			let d = faceEdges.get(vertexIndex0);
			if (d===undefined) {
				d = new Map<number, FacesEdge>();
				faceEdges.set(vertexIndex0, d);
			}

			let d1 = d.get(vertexIndex1);
			if (d1===undefined) {
				d1 = new FacesEdge(vertexIndex0,vertexIndex1);
				d.set(vertexIndex1, d1);
			}

			edge.faceIndices.push( faceIndex );

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

			return this.getEdgeByVertexIndices(i0,i1);
		}

		// edge v0 -> edge v1 -> indices of faces containing edge v0-v1
		const faceEdges = new Map<number, Map<number, FacesEdge>>();

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
		faceEdges.forEach( es => {
			es.forEach( faces => {
				facePairs.push(faces);
			});
		});

		return facePairs;
	}

	getMeshData(): GeometryInfoIndexed {

		const vertices = new Float32Array(this.vertex.length * 3);
		this.vertex.forEach((v, i) => {
			vertices[i * 3] = v.x;
			vertices[i * 3 + 1] = v.y;
			vertices[i * 3 + 2] = v.z;
		});

		return {
			vertices,
			index: this.index!==null ? new Uint16Array(this.index) : null,
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
		this.insertEdgeImpl(e.v0, e.v1, e, level);
	}

	insertEdgeImpl(v0: number, v1: number, e:Edge, level: number) {

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

		return this.edges.get(v0i)?.get(v1i) ?? this.edges.get(v1i)?.get(v0i);
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

	private buildFoldingTree() {
		this.foldsMST.forEach( (fe) => {
			if (fe.parent) {
				fe.parent.children.push( fe );
			} else {
				console.log(`no parent`);
			}
		});
	}

	private normalizeGeometry() {
		this.vertex.forEach((v) => {
			v.normalize();
		});
	}

	unfold(angleInDegs: number) {

		this.normalizeGeometry();
		this.buildFoldingTree();

		this.preCutVertexCount = this.vertex.length;

		this.cutGeometry();

return;

		// recursively unfold faces.
		// on an sphere, all folds have a prent (cyclic).
		// use an arbitrary one as parent: has just one child
		const start = this.foldsMST[0];

		const newVertex: Vertex[] = [
			this.vertex[this.foldsMST[0].v0*3 ].clone(),
			this.vertex[this.foldsMST[0].v0*3 +1 ].clone(),
			this.vertex[this.foldsMST[0].v0*3 +2 ].clone(),
		];

		this.unfoldImpl(start, start, angleInDegs, newVertex);

		console.log(`unfolded ${this.cc}/${this.foldsMST.length}/${this.folds.length}`);

		this.vertex = newVertex;
		this.index = [];
		for(let i = 0; i<newVertex.length; i++) {
			this.index.push(i);
		}
	}

	preCutVertexCount = 0;
	cc = 0;
	private unfoldImpl(root: FacesEdge, node: FacesEdge, angleInRads: number, newVertex: Vertex[]) {

		this.cc++;

		const f0N = this.vertex[node.v0e];
		const f1N = this.vertex[node.v1e];

		const diffAngle = .1; // Math.min(Math.acos( f0N.dot(f1N) ), 0);

		// rotate in f1, the vertex not in the vertex-edge described in FacesEdge

		const vertex0InFace1 = this.index[ node.v0*3 ];
		const vertex1InFace1 = this.index[ node.v0*3 + 1 ];
		const vertex2InFace1 = this.index[ node.v0*3 + 2 ];

		const vertexToRotate = vertex0InFace1 !== node.v0 && vertex0InFace1 !== node.v1 ?
			vertex0InFace1 :
			(vertex1InFace1 !== node.v0 && vertex1InFace1 !== node.v1 ?
				vertex1InFace1 :
				vertex2InFace1);

		const toRotate = this.vertex[vertexToRotate];


		const v = Vector3.createFromCoords(toRotate.x, toRotate.y, toRotate.z);
		const knn = Vector3.createFromCoords(f1N.x - f0N.x, f1N.y - f0N.y, f1N.z - f0N.z);
		const e = Vector3.normalize( Vector3.create(), knn );
		const ev = Vector3.cross( Vector3.create(), e, v);
		const dotev = Vector3.dot(e,v) * (1-Math.cos(diffAngle));

		const vrot =
			Vector3.add( Vector3.create(),
				Vector3.add( Vector3.create(),
					Vector3.mul(Vector3.create(), v, Math.cos(diffAngle)),
					Vector3.mul( Vector3.create(), ev, Math.sin(diffAngle))
				),
				Vector3.mul( Vector3.create(), e, dotev)
			);

		newVertex.push( f0N.clone() );
		newVertex.push( f1N.clone() );
		newVertex.push( new Vertex(vrot[0], vrot[1], vrot[2]) );

		node.children.forEach(c => {
			if (c!==root) {
				this.unfoldImpl(root, c, angleInRads, newVertex);
			}
		});

	}
}