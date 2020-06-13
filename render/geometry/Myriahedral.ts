import Vector3 from "../../math/Vector3";
import Quaternion from "../../math/Quaternion";

export interface GeometryInfoIndexed {
	vertices: Float32Array;
	index: Uint16Array;
	uv: Float32Array;
	folds: MSTNode[];
	cuts: Edge[];
	foldsMST: FacesEdge[];
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

	dot(o: Vertex) {
		// assumes normalized.
		return this.x*o.x + this.y*o.y + this.z*o.z;
	}

	clone() {
		const v = new Vertex(this.x, this.y, this.z);
		v.index = this.index;
		return v;
	}
}

// from vertex to vertex, belongs with faceIndex.
export interface EdgeInfo {
	fromVertex: number;
	toVertex: number;
	faceIndex: number;
}

export class Edge {

	w0 = 0;
	w1 = 0;
	wc = 0;

	centerIndex = -1;	// when an edge is split during recursive subdivision,
						// this is the newly created vertex index.

	// edge info: from->to, face index.
	// two entries per edge.
	faceIndices: number[] = [null, null];		// polygon index
	faceOriginalIndex: number[] = [null, null];		// polygon index before remap

	constructor(public vertex0: number, public vertex1: number) {
	}

	facesDirection(i: EdgeInfo) {
		let v0 = i.fromVertex;
		let v1 = i.toVertex;

		const index = (v0===this.vertex0 && v1===this.vertex1) ? 0 : 1;
		this.faceIndices[index] = i.faceIndex;
	}

	swap() {
		[this.faceIndices[0], this.faceIndices[1]] = [this.faceIndices[1], this.faceIndices[0]];
		[this.vertex0, this.vertex1] = [this.vertex1, this.vertex0];
	}

}

export class FacesEdge {

	parent: FacesEdge;
	children: FacesEdge[] = [];

	wc = -1;

	constructor(public edge: Edge) {
		this.wc = edge.wc;
		this.parent = null;
	}

	get fromFaceIndex() {
		return this.edge.faceIndices[0];
	}

	get toFaceIndex() {
		return this.edge.faceIndices[1];
	}

	get v0() {
		return this.edge.vertex0;
	}

	get v1() {
		return this.edge.vertex1;
	}

	swap() {
		this.edge.swap();
	}
}

export interface MSTNode {
	f0: number;
	f1: number;
}

const tetrahedron = {

	vertices: [
		[0.0, -1.0, 2.0],
		[1.73205081, -1.0, -1.0],
		[-1.73205081, -1.0, -1.0],
		[0.0, 2.0, 0.0],
	],
	//edges: [[0, 1], [1, 2], [0, 2], [0, 3], [2, 3], [1, 3]],
	edges: [[2, 0], [0, 1], [3, 0], [1, 2], [2, 3], [3, 1]],

	faces: [
		[0, 2, 1],
		[0, 3, 2],
		[0, 1, 3],
		[1, 2, 3],
	]
};


type VertexType = number[];
type FaceType = number[];
type EdgeType = number[];

const cube = {
	vertices: [
		[0.5, -0.5, -0.5],
		[-0.5, -0.5, -0.5],
		[-0.5, -0.5, 0.5],
		[0.5, -0.5, 0.5],
		[0.5, 0.5, -0.5],
		[-0.5, 0.5, -0.5],
		[-0.5, 0.5, 0.5],
		[0.5, 0.5, 0.5],
	],

	faces: [
			[2, 1, 0], [3, 2, 0],
			[3, 0, 4], [7, 3, 4],
			[0, 1, 5], [4, 0, 5],
			[1, 2, 6], [5, 1, 6],
			[2, 3, 7], [6, 2, 7],
			[4, 5, 6], [7, 4, 6],
		],

	edges: [
		[2,0],[3,0],[3,4],
		[0,1],[4,0],[0,5],
		[1,2],[5,1],[1,6],
		[2,3],[3,7],[6,2],
		[2,7],[4,5],[5,6],
		[7,4],[4,6],[6,7]
	]
}

class MM<T> {

	map = new Map<number, Map<number, T>>();

	constructor() {}

	insert(k0: number, k1: number, v: T) {

		let m = this.map.get(k0);

		if (m===undefined) {
			m = new Map<number, T>();
			this.map.set(k0, m);
		}

		m.set(k1, v);
	}

	get(k0: number, k1: number) {
		return this.map.get(k0)?.get(k1);
	}

	getI(k0: number, k1: number) {
		return this.map.get(k0)?.get(k1) ?? this.map.get(k1)?.get(k0);
	}

	clone( predicate: (v: T, k0?: number, k1?: number) => boolean) {
		const clone = new MM<T>();

		this.forEach( (v,k0,k1) => {
			if (predicate(v, k0, k1)) {
					clone.insert(k0,k1,v);
				}
			})

		return clone;
	}

	delete(k0: number, k1: number) {
		this.map.get(k0)?.delete(k1);
	}

	forEach( cb: (v: T, k0?: number, k1?: number) => void) {
		this.map.forEach( (mm, k0) => {
			mm.forEach( (e, k1) => {
				cb(e, k0, k1);
			});
		})
	}

	exists(k0: number, k1: number) {
		return this.map.get(k0)?.get(k1) !==undefined;
	}

	toArray() : T[] {
		const a : T[] = [];
		this.forEach( v => a.push(v));
		return a;
	}

	size() {
		let c = 0;
		this.forEach( _ => c++ );
		return c;
	}
}

interface FaceInfo {

	id: number;
	edges: Edge[];
	vertices: Vertex[];
	prevVerticesIndices: number[];
	normal: number[];
}

interface Geometry {
	vertices: VertexType[];	// [ [0,1,2] ]
	edges: EdgeType[];
	faces: FaceType[];
}

const knn = Vector3.create();
const knnP0 = Vector3.create();
const q0 = Quaternion.create();

export default class Myriahedral {

	edges = new MM<Edge>();		// v0 -> v1 -> Edge
	facesInfo: Map<number, FaceInfo>;

	originalVertices: Vertex[] = [];
	vertex: Vertex[] = [];
	index: number[] = [];
	subdivisions = 6;

	uv: Float32Array;
	faceEdges: MM<FacesEdge>;
	foldsMST: FacesEdge[];
	folds: MSTNode[];
	cuts: Edge[];

	constructor(subdivisions: number, unfold: boolean) {

		this.subdivisions = subdivisions;

		const tbm = Date.now();
		this.buildMyriahedron(tetrahedron, true);
		console.log(`myriahedron build time ${Date.now()-tbm}ms`);

		// get only actual edges, not the ones used to subdivide.
		this.edges = this.edges.clone(v => {
			return v.centerIndex === -1
		});

		let tMST = Date.now();
		this.foldsMST = this.calcMST(this.transformVertEdgesToFaceEdges());
		console.log(`MST calc time ${Date.now()-tMST}ms.`);

		// FOLDS

		// clone this.edges into edgesMST
		const edgesMST = this.edges.clone(_ => {
			return true;
		})

		// CUTS (not needed but beautiful to visualise)

		// all non fold edges, are cut.
		// folds are face-face edges, so use original vertices edge.
		this.foldsMST.forEach(f => {
			edgesMST.delete(f.edge.vertex0, f.edge.vertex1);
			edgesMST.delete(f.edge.vertex1, f.edge.vertex0);
		})

		this.cuts = [];
		edgesMST.forEach(v => {
			this.cuts.push(v);
		});

		if (!unfold) {
			this.uv = this.calculateUV();
		} else {
			const tunfold = Date.now();
			this.unfoldSetup();
			console.log(`normalization+retriangulate+unfold time ${Date.now() - tunfold}ms`);
		}

		this.folds = this.foldsMST.map(e => {
			return {
				f0: e.edge.faceIndices[0],
				f1: e.edge.faceIndices[1],
			}
		});

	}

	static edgesFromIndices(faces: FaceType[]): EdgeType[] {

		const edges: EdgeType[] = [];

		faces.forEach(f => {
			for (let i = 0; i < f.length; i++) {
				edges.push([
					f[i], f[(i + 1) % f.length],
				])
			}
		});

		// remove duplicates
		for (let i = 0; i < edges.length - 1; i++) {
			const edge = edges[i];
			for (let j = i + 1; j < edges.length; j++) {
				const aedge = edges[j];
				if (edge !== null && ((edge[0] === aedge[0] && edge[1] === aedge[1]) || (edge[1] === aedge[0] && edge[0] === aedge[1]))) {
					edges[i] = null;
					break;
				}
			}
		}

		return edges.filter(e => e !== null);
	}


	private buildMyriahedron(geometry: Geometry, normalize: boolean) {

		geometry.vertices.forEach(v => {
			this.insertVertex(new Vertex(v[0], v[1], v[2]));
		})

		geometry.edges.forEach(e => {
			this.insertEdge(this.vertex[e[0]], this.vertex[e[1]], 0);
		});

		geometry.faces.forEach( f => this.recurse(1, f[0], f[1], f[2]));

		if (normalize) {
			this.normalizeGeometry();
		}
	}

	calcMST(faceEdges: FacesEdge[]): FacesEdge[] {

		const helper = new MM<FacesEdge>();	// faceid -> faceid -> faceEdge

		faceEdges.forEach(e => {
			e.wc *= -1;

			let f0 = e.edge.faceIndices[0];
			let f1 = e.edge.faceIndices[1];

			helper.insert(f0, f1, e);
			helper.insert(f1, f0, e);
		});

		const treeFaces: number[] = [];
		treeFaces.push(faceEdges[0].edge.faceIndices[0]);

		const treeFacesSet= new Map<number, FacesEdge>();
		treeFacesSet.set(faceEdges[0].edge.faceIndices[0], faceEdges[0]);

		const treeEdges: FacesEdge[] = [];
		treeEdges.push(faceEdges[0]);

		while (treeFacesSet.size !== this.index.length / 3) {

			let minFace = -1;
			let minEdge: FacesEdge = null;
			let minWC = Number.MAX_VALUE;
			let nextFace = -1;

			treeFaces.forEach(face => {
				// find minimum wc of any edge outgoing from face edge
				helper.map.get(face).forEach((e, faceKey) => {
					if (!treeFacesSet.has(faceKey) && e.wc < minWC) {
						minEdge = e;
						minWC = e.wc;
						nextFace = faceKey;
						minFace = face;
					}
				});
			});

			if (minEdge) {

				helper.map.get(nextFace).delete(minFace);
				helper.map.get(minFace).delete(nextFace);

				treeFaces.push(nextFace);
				treeEdges.push(minEdge);
				treeFacesSet.set(nextFace, minEdge);

				const parent = treeFacesSet.get(minFace);

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

	// form Edge to EdgeFace.
	// EdgeFace keeps a directional Edge information (from face to face) based on
	// edge's vertices traversal direction.
	// 	v0 -> v1 -> F0
	// 	v1 -> v0 -> F1
	private transformVertEdgesToFaceEdges(): FacesEdge[] {

		this.faceEdges = new MM<FacesEdge>();

		this.edges.forEach(edge => {
			this.faceEdges.insert(
				edge.faceIndices[0],
				edge.faceIndices[1],
				new FacesEdge(edge)
			);
		});

		console.log(`edges: ${this.edges.size()}, faceEdges: ${this.faceEdges.size()}`)

		return this.faceEdges.toArray();
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
			index: this.index !== null ? new Uint16Array(this.index) : null,
			uv: this.uv,
			folds: this.folds,
			cuts: this.cuts,
			foldsMST: this.foldsMST,
		};
	}

	protected calculateUV() {
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

	insertEdge(v0: Vertex, v1: Vertex, level: number) {

		if (this.edges.exists(v0.index, v1.index)) {
			console.log(`insert of duplicated edge`);
			return;
		}

		const e = new Edge(v0.index, v1.index);

		e.w0 = level;
		e.w1 = level;
		e.wc = level + 1;

		this.edges.insert(v0.index, v1.index, e);

		return e;
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
			this.edges.getI(v0i, v1i).facesDirection({
				fromVertex: v0i,
				toVertex: v1i,
				faceIndex: this.index.length / 3
			});

			this.edges.getI(v1i, v2i).facesDirection({
				fromVertex: v1i,
				toVertex: v2i,
				faceIndex: this.index.length / 3
			});

			this.edges.getI(v2i, v0i).facesDirection({
				fromVertex: v2i,
				toVertex: v0i,
				faceIndex: this.index.length / 3
			});

			this.index.push(v0i, v1i, v2i);

			return;
		}

		const mv0v1 = this.edges.getI(v0i, v1i);
		if (mv0v1.centerIndex === -1) {
			this.splitEdge(mv0v1);
		}

		const mv1v2 = this.edges.getI(v1i, v2i);
		if (mv1v2.centerIndex === -1) {
			this.splitEdge(mv1v2);
		}

		const mv2v0 = this.edges.getI(v2i, v0i);
		if (mv2v0.centerIndex === -1) {
			this.splitEdge(mv2v0);
		}

		this.insertEdge(this.vertex[mv0v1.centerIndex], this.vertex[mv2v0.centerIndex], level);
		this.insertEdge(this.vertex[mv0v1.centerIndex], this.vertex[mv1v2.centerIndex], level);
		this.insertEdge(this.vertex[mv2v0.centerIndex], this.vertex[mv1v2.centerIndex], level);

		this.recurse(level + 1, v0i, mv0v1.centerIndex, mv2v0.centerIndex);
		this.recurse(level + 1, mv0v1.centerIndex, v1i, mv1v2.centerIndex);
		this.recurse(level + 1, mv1v2.centerIndex, mv2v0.centerIndex, mv0v1.centerIndex);
		this.recurse(level + 1, mv2v0.centerIndex, mv1v2.centerIndex, v2i);
	}

	splitEdge(e: Edge) {

		const v0v1 = Vertex.middle(this.vertex[e.vertex0], this.vertex[e.vertex1]);
		this.insertVertex(v0v1);

		e.centerIndex = v0v1.index;

		if (!this.edges.getI(e.vertex0, v0v1.index)) {
			const e0 = this.insertEdge(this.vertex[e.vertex0], v0v1, 0);
			e0.w0 = e.w0;
			e0.w1 = e.wc;
			e0.wc = (e.w0 + e.wc) / 2;
		} else {
			console.log('ai');
		}

		if (!this.edges.getI(v0v1.index, e.vertex1)) {
			const e1 = this.insertEdge(v0v1, this.vertex[e.vertex1], 0);
			e1.w0 = e.wc;
			e1.w1 = e.w1;
			e1.wc = (e.wc + e.w1) / 2;
		} else {
			console.log('ai');
		}

	}

	private buildFoldingTree() {

		this.foldsMST.forEach((fe) => {
			if (fe.parent) {
				fe.parent.children.push(fe);

				if (fe.fromFaceIndex !== fe.parent.toFaceIndex) {
					// correct direction
					fe.swap();
				}

			} else {
				console.log(`no parent - MST root.`);
			}
		});

	}

	private normalizeGeometry() {
		this.vertex.forEach((v) => {
			v.normalize();
		});
	}

	private checkAllTrianglesComplete(faces: Map<number, Edge[]>) {

		let c = 0;
		let inc: any = {};
		faces.forEach((f,faceIndex) => {
			if (f.length !== 3) {
				c++;
				inc[faceIndex] = f;
			}
		});

		if (c !== 0) {
			console.log(inc);
			throw new Error(`incomplete faces: ${c}`);
		}
	}

	private reTriangulateGeometry() {

		const newVertices: Vertex[] = [];
		const newIndex: number[] = [];

		const faces = new Map<number, Edge[]>();	// faceId, vertices

		const process = (edge: Edge, f0: number) => {
			let ar = faces.get(f0);
			if (ar === undefined) {
				ar = [];
				faces.set(f0, ar);
			}

			if (ar.indexOf(edge)===-1) {
				ar.push(edge);
			}
		}

		const addCut = (c: Edge) => {
			process(c, c.faceIndices[0]);
			process(c, c.faceIndices[1]);
		}

		const addFold = (fold: FacesEdge) => {
			process(fold.edge, fold.fromFaceIndex);
			process(fold.edge, fold.toFaceIndex);
		}

		this.foldsMST.forEach(fold => {
			addFold(fold);
		});

		this.cuts.forEach(c => {
			addCut(c);
		});

		this.checkAllTrianglesComplete(faces);

		const faceRemap = new Map<number, number>();
		this.facesInfo = new Map<number, FaceInfo>();

		// build new geometry.
		// number of faces is constant.
		faces.forEach((edges, faceIndex) => {

			const vertices = [this.index[faceIndex * 3], this.index[faceIndex * 3 + 1], this.index[faceIndex * 3 + 2]];

			const nv0 = this.vertex[vertices[0]].clone();
			nv0.index = newVertices.length;

			const nv1 = this.vertex[vertices[1]].clone();
			nv1.index = newVertices.length + 1;

			const nv2 = this.vertex[vertices[2]].clone();
			nv2.index = newVertices.length + 2;

			newVertices.push(nv0, nv1, nv2);

			const i = newIndex.length;
			newIndex.push(i, i + 1, i + 2);

			const ni = (i/3)|0;
			faceRemap.set(faceIndex, ni);

			const verticesO = [nv0, nv1, nv2]

			this.facesInfo.set(ni, {
				id: faceIndex,
				edges,
				vertices: verticesO,
				prevVerticesIndices: vertices,
				normal: this.normalForVertices(verticesO),
			});
		});

		this.edges.forEach(e => {
			e.faceOriginalIndex[0] = e.faceIndices[0];
			e.faceOriginalIndex[1] = e.faceIndices[1];
			e.faceIndices[0] = faceRemap.get(e.faceIndices[0]);
			e.faceIndices[1] = faceRemap.get(e.faceIndices[1]);
		});

		this.vertex = newVertices;
		this.index = newIndex;
	}

	private unfoldSetup() {

		this.buildFoldingTree();
		this.reTriangulateGeometry();
		this.uv = this.calculateUV();

		this.originalVertices = this.vertex;
	}

	public unfold(scale: number) {

		this.vertex = this.originalVertices.map( v => { return v.clone() } );
		this.facesInfo.forEach( f => {
			f.vertices.forEach( (v,i) => {
				f.vertices[i] = this.vertex[v.index];
			});
			f.normal = this.normalForVertices(f.vertices);
		} );

		let t= Date.now();
		this.foldsMST.filter(e => {
			return e.parent === null
		}).forEach(f => {
			this.unfoldImpl(f, scale);

			// // set straight:
			// const n1 = this.normalForFaceIndex(f.v0);
			// const vref = this.setupFor(
			// 	[0,0,1],
			// 	n1,
			// 	this.facesInfo.get(f.fromFaceIndex),
			// 	this.facesInfo.get(f.toFaceIndex),
			// 	scale);
			//
			// this.rotatePointRecQuaterion(f, vref, q0);

		});
		t= Date.now() - t;
		console.log(`unfold vertices took ${t}ms.`);

		this.folds = this.foldsMST.map(e => {
			return {
				f0: e.edge.faceIndices[0],
				f1: e.edge.faceIndices[1],
			}
		});

	}

	private normalForVertices(v: Vertex[]): number[] {
		const x0 = v[1].x - v[0].x;
		const y0 = v[1].y - v[0].y;
		const z0 = v[1].z - v[0].z;

		const x1 = v[2].x - v[0].x;
		const y1 = v[2].y - v[0].y;
		const z1 = v[2].z - v[0].z;

		const x = y0 * z1 - z0 * y1;
		const y = z0 * x1 - x0 * z1;
		const z = x0 * y1 - y0 * x1;

		const l = Math.sqrt(x * x + y * y + z * z);

		return [x / l, y / l, z / l];
	}

	private normalForFaceIndex(i: number) {
		return this.normalForVertices(this.facesInfo.get(i).vertices);
	}

	private unfoldImpl(node: FacesEdge, scale: number) {
		node.children.forEach(c => {
			this.unfoldImpl(c, scale)
		});
		this.unfoldNodeRec(node, scale);
	}

	private coplanar(f0: number, f1: number): boolean {

		const n0 = this.normalForFaceIndex(f0);
		const n1 = this.normalForFaceIndex(f1);

		const dot = Math.abs(n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]);

		if (dot >= .999) {
			return true;
		}

		console.log(`non coplanar ${f0}-${f1}, ${dot}`);
		return false;
	}

	private unfoldNodeRec(node: FacesEdge, scale: number) {

		const fi0 = this.facesInfo.get(node.fromFaceIndex);
		const fi1 = this.facesInfo.get(node.toFaceIndex);

		const refV = this.setupFor(fi0.normal, fi1.normal, fi0, fi1, scale);

		this.rotatePointRecQuaterion(node, refV, q0);

		// this.coplanar(node.fromFaceIndex, node.toFaceIndex);
	}

	private setupFor(N0: number[], N1: number[], fi0: FaceInfo, fi1: FaceInfo, scale: number) {

		let diffAngle = -scale * Math.acos(N0[0] * N1[0] + N0[1] * N1[1] + N0[2] * N1[2]);

		// find common faces edge.
		// get the two shared points.
		const rotationEdgeVerticesIndices = fi0.prevVerticesIndices.filter(v => {
			return fi1.prevVerticesIndices.indexOf(v) !== -1;		// valores comunes
		});

		const rotationEdgeVertices = rotationEdgeVerticesIndices.map(v => {
			return fi0.vertices[fi0.prevVerticesIndices.indexOf(v)];
		});

		const in0 = (1 + fi0.prevVerticesIndices.indexOf(rotationEdgeVerticesIndices[0])) % 3;
		const in1 = (fi0.prevVerticesIndices.indexOf(rotationEdgeVerticesIndices[1])) % 3;
		if (in0 !== in1) {
			diffAngle *= -1;
		}

		knn[0]= rotationEdgeVertices[1].x - rotationEdgeVertices[0].x;
		knn[1]= rotationEdgeVertices[1].y - rotationEdgeVertices[0].y;
		knn[2]= rotationEdgeVertices[1].z - rotationEdgeVertices[0].z;
		const e = Vector3.normalize(knn, knn);

		Quaternion.fromAxisAndAngle(q0, e, diffAngle);

		return rotationEdgeVertices[0];
	}

	private rotatePointRecQuaterion(n: FacesEdge, vref: Vertex, q0: Float32Array) {

		n.children.forEach(c => {
			this.rotatePointRecQuaterion(c, vref, q0);
		});

		this.facesInfo.get(n.toFaceIndex).vertices.forEach(v => {

			knnP0[0] = v.x - vref.x;
			knnP0[1] = v.y - vref.y;
			knnP0[2] = v.z - vref.z;

			const rp0 = Quaternion.rotate(q0, knnP0);

			v.x = rp0[0] + vref.x;
			v.y = rp0[1] + vref.y;
			v.z = rp0[2] + vref.z;
		});
	}

}