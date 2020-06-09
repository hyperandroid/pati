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
		return new Vertex(this.x, this.y, this.z);
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

const tetrahedronVertices = [
	[0.0, -1.0, 2.0],
	[1.73205081, -1.0, -1.0],
	[-1.73205081, -1.0, -1.0],
	[0.0, 2.0, 0.0],
]
const tetrahedronEdges = [
	[0, 1], [1, 2], [0, 2], [0, 3], [2, 3], [1, 3]
];

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
}

export default class Myriahedral {

	edges = new MM<Edge>();		// v0 -> v1 -> Edge
	facesInfo: Map<number, FaceInfo>;

	vertex: Vertex[] = [];
	index: number[] = [];
	subdivisions = 6;

	uv: Float32Array;
	faceEdges: MM<FacesEdge>;
	foldsMST: FacesEdge[];
	folds: MSTNode[];
	cuts: Edge[];

	constructor(subdivisions: number) {

		this.subdivisions = subdivisions;

		tetrahedronVertices.forEach(v => {
			this.insertVertex(new Vertex(v[0], v[1], v[2]));
		})

		tetrahedronEdges.forEach(e => {
			this.insertEdge(this.vertex[e[0]], this.vertex[e[1]], 0);
		});

		this.recurse(1, 0, 2, 1);
		this.recurse(1, 0, 3, 2);
		this.recurse(1, 0, 1, 3);
		this.recurse(1, 1, 2, 3);

		// get only actual edges, not the ones used to subdivide.
		this.edges = this.edges.clone(v => {
			return v.centerIndex === -1
		});

		this.foldsMST = this.calcMST(this.transformVertEdgesToFaceEdges());

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


		this.unfold();

		this.folds = this.foldsMST.map(e => {
			return {
				f0: e.edge.faceIndices[0],
				f1: e.edge.faceIndices[1],
			}
		});

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
		const treeFacesSet: Set<number> = new Set();
		treeFaces.push(faceEdges[0].edge.faceIndices[0]);
		treeFacesSet.add(faceEdges[0].edge.faceIndices[0]);

		const treeEdges: FacesEdge[] = [];

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
				treeFaces.push(nextFace);
				treeEdges.push(minEdge);
				treeFacesSet.add(nextFace);

				const ancestor = treeFaces.indexOf(minFace) - 1;
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

	getEdgeByVertexIndices(v0i: number, v1i: number): Edge | undefined {
		return this.edges.getI(v0i, v1i);
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
			this.getEdgeByVertexIndices(v0i, v1i).facesDirection({
				fromVertex: v0i,
				toVertex: v1i,
				faceIndex: this.index.length / 3
			});

			this.getEdgeByVertexIndices(v1i, v2i).facesDirection({
				fromVertex: v1i,
				toVertex: v2i,
				faceIndex: this.index.length / 3
			});

			this.getEdgeByVertexIndices(v2i, v0i).facesDirection({
				fromVertex: v2i,
				toVertex: v0i,
				faceIndex: this.index.length / 3
			});

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

		if (!this.getEdgeByVertexIndices(e.vertex0, v0v1.index)) {
			const e0 = this.insertEdge(this.vertex[e.vertex0], v0v1, 0);
			e0.w0 = e.w0;
			e0.w1 = e.wc;
			e0.wc = (e.w0 + e.wc) / 2;
		} else {
			console.log('ai');
		}

		if (!this.getEdgeByVertexIndices(v0v1.index, e.vertex1)) {
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
		faces.forEach(f => {
			if (f.length !== 3) {
				c++;
			}
		});

		if (c !== 0) {
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

			ar.push(edge);
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

			faceRemap.set(faceIndex, i / 3);

			this.facesInfo.set(i / 3, {
				id: faceIndex,
				edges,
				vertices: [nv0, nv1, nv2],
				prevVerticesIndices: vertices,
			});
		});

		this.edges.forEach(e => {
			e.faceIndices[0] = faceRemap.get(e.faceIndices[0]);
			e.faceIndices[1] = faceRemap.get(e.faceIndices[1]);
		});

		this.vertex = newVertices;
		this.index = newIndex;
	}

	private unfold() {

		this.normalizeGeometry();
		this.buildFoldingTree();
		this.reTriangulateGeometry();
		this.uv = this.calculateUV();

		// recursively unfold faces.
		// on an sphere, all folds have a prent (cyclic).
		// use an arbitrary one as parent: has just one child
		// const starts = this.foldsMST.filter( e => {
		// 	return e.parent===null
		// }).sort((a,b) => {
		// 	return a.wc < b.wc ? 1 : (a.wc > b.wc ? -1 : 0);
		// });
		//
		// if (starts.length > 1 ) {
		// 	for(let i = 1; i<starts.length; i++) {
		// 		starts[i].parent = starts[0];
		// 	}
		// }
		//
		// this.unfoldImpl(starts[0]);

		this.foldsMST.filter(e => {
			return e.parent === null
		}).forEach(f => this.unfoldImpl(f));
	}

	private normalForFaceIndex(i: number) {
		const x0 = this.vertex[this.index[i * 3 + 1]].x - this.vertex[this.index[i * 3]].x;
		const y0 = this.vertex[this.index[i * 3 + 1]].y - this.vertex[this.index[i * 3]].y;
		const z0 = this.vertex[this.index[i * 3 + 1]].z - this.vertex[this.index[i * 3]].z;

		const x1 = this.vertex[this.index[i * 3 + 2]].x - this.vertex[this.index[i * 3]].x;
		const y1 = this.vertex[this.index[i * 3 + 2]].y - this.vertex[this.index[i * 3]].y;
		const z1 = this.vertex[this.index[i * 3 + 2]].z - this.vertex[this.index[i * 3]].z;

		const x = y0 * z1 - z0 * y1;
		const y = z0 * x1 - x0 * z1;
		const z = x0 * y1 - y0 * x1;

		const l = Math.sqrt(x * x + y * y + z * z);

		return [x / l, y / l, z / l];
	}

	private unfoldImpl(node: FacesEdge) {
		node.children.forEach(c => {
			this.unfoldImpl(c)
		});
		this.unfoldNodeRec(node);
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

	private unfoldNodeRec(node: FacesEdge) {

		// for this pass, normals are just vertex points.
		const N0 = this.normalForFaceIndex(node.fromFaceIndex);
		const N1 = this.normalForFaceIndex(node.toFaceIndex);
		let diffAngle = -Math.acos(N0[0] * N1[0] + N0[1] * N1[1] + N0[2] * N1[2]);

		// find common faces edge.
		// get the two shared points.
		const fi0 = this.facesInfo.get(node.fromFaceIndex);
		const fi1 = this.facesInfo.get(node.toFaceIndex);

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

		const knn = Vector3.createFromCoords(
			rotationEdgeVertices[1].x - rotationEdgeVertices[0].x,
			rotationEdgeVertices[1].y - rotationEdgeVertices[0].y,
			rotationEdgeVertices[1].z - rotationEdgeVertices[0].z);

		const e = Vector3.normalize(Vector3.create(), knn);

		this.rotatePointRecQuaterion(node, rotationEdgeVertices[0], e, diffAngle);
		// this.rotatePointRecRodriges(node, rotationEdgeVertices[0], e, diffAngle);

		this.coplanar(node.fromFaceIndex, node.toFaceIndex);
	}

	private rotatePointRecQuaterion(n: FacesEdge, vref: Vertex, e: Float32Array, diffAngle: number) {

		n.children.forEach(c => {
			this.rotatePointRecQuaterion(c, vref, e, diffAngle);
		});

		this.facesInfo.get(n.toFaceIndex).vertices.forEach(v => {
			const p0 = Vector3.sub(
				Vector3.create(),
				Vector3.createFromCoords(v.x, v.y, v.z),
				Vector3.createFromCoords(vref.x, vref.y, vref.z),
			);

			const q0 = Quaternion.createFromAxisAndAngle(e, diffAngle);
			const rp0 = Quaternion.rotate(Quaternion.create(), q0, p0);

			v.x = rp0[0] + vref.x;
			v.y = rp0[1] + vref.y;
			v.z = rp0[2] + vref.z;
		});
	}

	private rotatePointRecRodriges(n: FacesEdge, vref: Vertex, e: Float32Array, diffAngle: number) {

		this.facesInfo.get(n.toFaceIndex).vertices.forEach(v => {
			const vv = Vector3.sub(Vector3.create(),
				Vector3.createFromCoords(v.x, v.y, v.z),
				Vector3.createFromCoords(vref.x, vref.y, vref.z),
			);
			Myriahedral.rodriguesRotatePoint(vv, e, diffAngle);

			v.x = vv[0] + vref.x;
			v.y = vv[1] + vref.y;
			v.z = vv[2] + vref.z;
		});

		n.children.forEach(c => this.rotatePointRecRodriges(c, vref, e, diffAngle));
	}

	private static rodriguesRotatePoint(v: Float32Array, e: Float32Array, diffAngle: number) {

		const ev = Vector3.cross(Vector3.create(), e, v);
		const dotev = Vector3.dot(e, v) * (1 - Math.cos(diffAngle));

		const vrot =
			Vector3.add(Vector3.create(),
				Vector3.add(Vector3.create(),
					Vector3.mul(Vector3.create(), v, Math.cos(diffAngle)),
					Vector3.mul(Vector3.create(), ev, Math.sin(diffAngle))
				),
				Vector3.mul(Vector3.create(), e, dotev)
			);

		v[0] = vrot[0];
		v[1] = vrot[1];
		v[2] = vrot[2];

	}
}