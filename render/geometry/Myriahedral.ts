import Vector3 from "../../math/Vector3";
import Quaternion from "../../math/Quaternion";
import {EdgeType, FaceType, MyriahedronGeometry} from "./Solids";
import {Graticule, GraticuleParams} from "./Graticule";

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

	clone(): Vertex {
		const v = new Vertex(this.x, this.y, this.z);
		v.index = this.index;
		return v;
	}

	copy(o: Vertex) {
		this.x = o.x;
		this.y = o.y;
		this.z = o.z;
	}

	equals(o: Vertex): boolean {
		return Math.abs(this.x - o.x) < 1e-9 &&
			Math.abs(this.y - o.y) < 1e-9 &&
			Math.abs(this.z - o.z) < 1e-9;
	}

	static normalForVertices(v: Vertex[]): number[] {
		const x0 = v[0].x - v[1].x;
		const y0 = v[0].y - v[1].y;
		const z0 = v[0].z - v[1].z;

		const x1 = v[0].x - v[2].x;
		const y1 = v[0].y - v[2].y;
		const z1 = v[0].z - v[2].z;

		const x = y0 * z1 - z0 * y1;
		const y = z0 * x1 - x0 * z1;
		const z = x0 * y1 - y0 * x1;

		const l = Math.sqrt(x * x + y * y + z * z);

		if (l===0) {
			// there's no normal. Since we are in an goniometric sphere, this should be fine.
			return [v[0].x, v[0].y, v[0].z];
		}

		return [x / l, y / l, z / l];
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

	private static __id = 0;

	id: number;

	parent: FacesEdge;
	children: FacesEdge[] = [];

	orientationMultiplier = 1;
	commonAxisVertices: Vertex[] = [];

	wc = -1;

	constructor(public edge: Edge) {
		this.id = FacesEdge.__id++;
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

export class MM<T> {

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

export interface FaceInfo {
	prevId: number;
	id: number;
	edges: Edge[];
	vertices: Vertex[];
	prevVerticesIndices: number[];
	normal: number[];
}

const knn = Vector3.create();
const knnP0 = Vector3.create();
const q0 = Quaternion.create();

export interface MyriahedronParams {
	geometry: MyriahedronGeometry;
	subdivisions?: number;
	unfold?: boolean,		// default true
	normalize?: boolean,	// default true
	uvOffset?: [number, number],
}

export default class Myriahedral {

	// MARK: myriahedron subdivision into.
	subdivisions = 6;
	edges = new MM<Edge>();		// v0 -> v1 -> Edge
	facesInfo: Map<number, FaceInfo>;
	roots: FacesEdge[];	// must be just one !

	// MARK:
	originalVertices: Vertex[] = [];
	vertex: Vertex[] = [];
	index: number[] = [];

	uv: Float32Array;
	faceEdges: MM<FacesEdge>;
	foldsMST: FacesEdge[];
	folds: MSTNode[];
	cuts: Edge[];
	miryahedronGeometry: MyriahedronGeometry;

	constructor() {

	}

	graticule(p: GraticuleParams) {

		const gr = new Graticule().build(p);

		this.vertex = gr.vertices;
		this.facesInfo = gr.faces;
		this.foldsMST = gr.folds;
		this.index = [];
		gr.faces.forEach(f => {
			f.vertices.forEach(v => {
				this.index.push(v.index);
			})
		});

		const tunfold = Date.now();
		this.unfoldSetup(false);
		console.log(`normalization+retriangulate+unfold time ${Date.now() - tunfold}ms`);

		this.folds = this.foldsMST.map(e => {
			return {
				f0: e.edge.faceIndices[0],
				f1: e.edge.faceIndices[1],
			}
		});

		this.cuts = [];

		return this;
	}

	myriahedron(p: MyriahedronParams): Myriahedral {

		if (p.unfold === undefined) {
			p.unfold = true;
		}

		this.miryahedronGeometry = p.geometry;

		this.subdivisions = p.subdivisions ?? 5;

		this.buildMyriahedron(p.geometry, p.normalize ?? true);

		// get only actual edges, not the ones used to subdivide.
		this.edges = this.edges.clone(v => {
			return v.centerIndex === -1
		});

		let tMST = Date.now();
		this.foldsMST = this.calcMST(this.transformVertEdgesToFaceEdges());
		console.log(`MST calc time ${Date.now() - tMST}ms.`);

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

		if (!p.unfold) {
			this.uv = this.calculateUV();
		} else {
			const tunfold = Date.now();
			this.unfoldSetup(true);
			console.log(`normalization+retriangulate+unfold time ${Date.now() - tunfold}ms`);
		}

		this.folds = this.foldsMST.map(e => {
			return {
				f0: e.edge.faceIndices[0],
				f1: e.edge.faceIndices[1],
			}
		});

		return this;
	}

	private edgesFromFaces(fs: FaceType[]): EdgeType[] {

		const edges: EdgeType[] = [];

		fs.forEach(f => {
			for (let i = 0; i < f.length; i++) {
				edges.push([f[i], f[(i + 1) % f.length]]);
			}
		});

		const edgesMap = new MM<EdgeType>();
		edges.forEach(e => {
			if (edgesMap.getI(e[0], e[1]) === undefined) {
				edgesMap.insert(e[0], e[1], e);
			}
		})

		const retEdges: EdgeType[] = [];
		edgesMap.forEach(e => {
			retEdges.push(e);
		})

		return retEdges;
	}

	private buildMyriahedron(geometry: MyriahedronGeometry, normalize: boolean) {

		const tbm = Date.now();

		geometry.vertices.forEach(v => {
			this.insertVertex(new Vertex(v[0], v[1], v[2]));
		})

		if (geometry.edges === undefined) {
			geometry.edges = this.edgesFromFaces(geometry.faces);
		}

		for (const e of geometry.edges) {
			this.insertEdge(this.vertex[e[0]], this.vertex[e[1]], 0);
		}

		geometry.faces.forEach(f => this.recurse(1, f[0], f[1], f[2]));

		if (normalize) {
			this.normalizeGeometry();
		}

		console.log(`myriahedron build time ${Date.now() - tbm}ms`);
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

		const treeFacesSet = new Map<number, FacesEdge>();
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

				const parent = treeFacesSet.get(minFace);

				// is not the same edge in different faces. e.g. `this.parent=this`
				if (parent.edge !== minEdge.edge) {

					helper.map.get(nextFace).delete(minFace);
					helper.map.get(minFace).delete(nextFace);

					treeFaces.push(nextFace);
					treeEdges.push(minEdge);

					if (parent) {
						minEdge.parent = parent;
					}
				}

				treeFacesSet.set(nextFace, minEdge);

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

		let degenerated = 0;
		this.edges.forEach(edge => {
			if (edge.faceIndices[0] !== null && edge.faceIndices[1] !== null) {
				this.faceEdges.insert(
					edge.faceIndices[0],
					edge.faceIndices[1],
					new FacesEdge(edge)
				);
			} else {
				degenerated++;
			}
		});

		console.log(`edges: ${this.edges.size()}, faceEdges: ${this.faceEdges.size()}, degenerated: ${degenerated}`);

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

	calculateUV(ox?: number, oy?: number) {
		const uv = new Float32Array(this.originalVertices.length * 2);

		ox = ox ?? 0;
		oy = oy ?? 0;

		this.originalVertices.forEach((v, i) => {
			uv[i * 2] = .5 + (ox + Math.atan2(v.x, v.z)) / (2 * Math.PI);
			uv[i * 2 + 1] = .5 - (oy + Math.asin(v.y)) / Math.PI;
		});

		// check for extreme uv offsets.
		this.facesInfo.forEach( fi => {

			const o0 = fi.vertices[0].index*2;
			const u0 = uv[o0];
			const v0 = uv[o0+1];
			const o1 = fi.vertices[1].index*2;
			const u1 = uv[o1];
			const v1 = uv[o1+1];
			const o2 = fi.vertices[2].index*2;
			const u2 = uv[o2];
			const v2 = uv[o2+1];

			if (Math.abs(u0-u1)>.5 || Math.abs(u2-u0)>.5 || Math.abs(u2-u1)>.5) {
				if (u0 < .5) {
					uv[o0] += 1;
				}
				if (u1 < .5) {
					uv[o1] += 1;
				}
				if (u2 < .5) {
					uv[o2] += 1;
				}
			}

			if (Math.abs(v0-v1)>.5 || Math.abs(v2-v0)>.5 || Math.abs(v2-v1)>.5) {
				if (v0 < .5) {
					uv[o0+1] += 1;
				}
				if (v1 < .5) {
					uv[o1+1] += 1;
				}
				if (v2 < .5) {
					uv[o2+1] += 1;
				}
			}
		});

		return uv;
	}

	private insertVertex(v: Vertex) {
		v.index = this.vertex.length;
		this.vertex.push(v);
	}

	private insertEdge(v0: Vertex, v1: Vertex, level: number) {

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

	private edgesFacesDirection(v0i: number, v1i: number, v2i: number) {
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

	}

	/**
	 * recurse edges v01-v1i, v1i-v2i, v2i-v0i
	 * @param level
	 * @param v0i
	 * @param v1i
	 * @param v2i
	 */
	private recurse(level: number, v0i: number, v1i: number, v2i: number) {

		if (level === this.subdivisions) {

			this.edgesFacesDirection(v0i, v1i, v2i);
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

	private splitEdge(e: Edge) {

		const v0v1 = Vertex.middle(this.vertex[e.vertex0], this.vertex[e.vertex1]);
		this.insertVertex(v0v1);

		e.centerIndex = v0v1.index;

		if (!this.edges.getI(e.vertex0, v0v1.index)) {
			const e0 = this.insertEdge(this.vertex[e.vertex0], v0v1, 0);
			e0.w0 = e.w0;
			e0.w1 = e.wc;
			e0.wc = (e.w0 + e.wc) / 2;
		} else {
			console.error('splitting unknown edge.');
		}

		if (!this.edges.getI(v0v1.index, e.vertex1)) {
			const e1 = this.insertEdge(v0v1, this.vertex[e.vertex1], 0);
			e1.w0 = e.wc;
			e1.w1 = e.w1;
			e1.wc = (e.wc + e.w1) / 2;
		} else {
			console.error('splitting unknown edge.');
		}

	}

	private buildFoldingTree() {

		this.roots = this.foldsMST.filter(e => {
			return e.parent === null
		});

		const root = this.roots[0];

		const processed = new Set<number>();
		processed.add(root.id);
		this.buildFoldingTreeImpl(processed, root.fromFaceIndex, root);
		this.buildFoldingTreeImpl(processed, root.toFaceIndex, root);
		root.swap();
	}

	private buildFoldingTreeImpl(processed: Set<number>, parent: number, nodeParent: FacesEdge) {

		const children = this.foldsMST.filter(f => {
			return !processed.has(f.id) && (f.fromFaceIndex === parent || f.toFaceIndex === parent);
		});

		children.forEach(f => {

			if (!processed.has(f.id)) {
				if (f.fromFaceIndex !== parent) {
					f.swap();
				}

				if (nodeParent !== null) {
					nodeParent.children.push(f);
				}

				f.parent = nodeParent;

				processed.add(f.id);
			}
		});

		children.forEach(c => {
			this.buildFoldingTreeImpl(processed, c.toFaceIndex, c);
			this.buildFoldingTreeImpl(processed, c.fromFaceIndex, c);
		})
	}

	private normalizeGeometry() {
		this.vertex.forEach((v) => {
			v.normalize();
		});
	}

	private checkAllTrianglesComplete(faces: Map<number, Edge[]>) {

		let c = 0;
		let inc: any = {};
		faces.forEach((f, faceIndex) => {
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

			if (ar.indexOf(edge) === -1) {
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

			const vertices = [
				this.index[faceIndex * 3],
				this.index[faceIndex * 3 + 1],
				this.index[faceIndex * 3 + 2]
			];

			const nv0 = this.vertex[vertices[0]].clone();
			nv0.index = newVertices.length;
			const nv1 = this.vertex[vertices[1]].clone();
			nv1.index = newVertices.length + 1;
			const nv2 = this.vertex[vertices[2]].clone();
			nv2.index = newVertices.length + 2;

			newVertices.push(nv0, nv1, nv2);

			const i = newIndex.length;
			newIndex.push(i, i + 1, i + 2);

			const ni = (i / 3) | 0;
			faceRemap.set(faceIndex, ni);

			const originalVertices = [nv0, nv1, nv2]

			// this would work too, but I want debug normal in the center of each face.
			// const normal = this.normalForVertices(originalVertices);
			const normal = Myriahedral.getCenterPoint(originalVertices, true);

			this.facesInfo.set(ni, {
				id: ni,
				prevId: faceIndex,
				edges,
				vertices: originalVertices,
				prevVerticesIndices: vertices,
				normal,
			});
		});

		this.edges.forEach(e => {
			e.faceIndices[0] = faceRemap.get(e.faceIndices[0]);
			e.faceIndices[1] = faceRemap.get(e.faceIndices[1]);

		});

		this.vertex = newVertices;
		this.index = newIndex;
	}

	private unfoldSetup(needsRetriangulation: boolean) {

		this.buildFoldingTree();

		if (needsRetriangulation) {
			this.reTriangulateGeometry();
		}

		this.originalVertices = this.vertex;

		this.uv = this.calculateUV();
		this.setFoldsOrientations();

		console.log(`Debug info:`);
		if (this.miryahedronGeometry) {
			console.log(`  Original: ${this.miryahedronGeometry.vertices.length}-${this.miryahedronGeometry.faces.length}-${this.miryahedronGeometry.edges.length}`);
		}
		console.log(`  Geometry: ${this.originalVertices.length}-${this.facesInfo.size}`);
		console.log(`  Folds/Cuts: ${this.foldsMST.length}/${this.cuts?.length ?? 0}`);
	}

	private static getCenterPoint(v: Vertex[], normalize: boolean): number[] {
		let nx = (v[0].x + v[1].x + v[2].x) / 3;
		let ny = (v[0].y + v[1].y + v[2].y) / 3;
		let nz = (v[0].z + v[1].z + v[2].z) / 3;

		if (normalize) {
			const l = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
			nx *= l;
			ny *= l;
			nz *= l;
		}

		return [nx, ny, nz];
	}

	private setFoldsOrientations() {

		this.foldsMST.forEach(fold => this.setupCommonrotationAxisVertices(fold));

		this.setupGeometry();
		this.roots.forEach(root => {
			this.calculateOrientations(root)
		});
	}

	private static dot(v0: number[], v1: number[]): number {
		return v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2];
	}

	/**
	 * Calculate fold angles before/after rotation over common axis to determine what is inwards-outwards.
	 * We expect the myriahedron to be 100% flat after unfolding process.
	 */
	private calculateOrientations(node: FacesEdge) {
		node.children.forEach(c => {
			this.calculateOrientations(c);
		});

		// get starting angle
		const n0 = this.facesInfo.get(node.fromFaceIndex).normal;
		const n1 = this.facesInfo.get(node.toFaceIndex).normal;
		const angle0 = Myriahedral.dot(n0, n1);

		// rotate around common axis
		this.setupQuaternionFor(node, 1);
		const vref = node.commonAxisVertices[0];
		this.facesInfo.get(node.toFaceIndex).vertices.forEach(v => {
			Myriahedral.rotateWith(q0, v, vref);
		});
		const newN1 = this.normalForFaceIndex(node.toFaceIndex);

		// get new angle
		const angle1 = Myriahedral.dot(n0, newN1);

		// set unfolding orientation
		node.orientationMultiplier = (angle1 < angle0) ? -1 : 1;

		// restore rotated face vertices
		const f = this.facesInfo.get(node.toFaceIndex);
		f.vertices.forEach((v, i) => {
			f.vertices[i].copy(this.originalVertices[v.index]);
		});
	}

	private setupCommonrotationAxisVertices(fold: FacesEdge) {

		const fi0 = this.facesInfo.get(fold.fromFaceIndex);
		const fi1 = this.facesInfo.get(fold.toFaceIndex);

		const rotationEdgeVerticesIndices = fi0.prevVerticesIndices.filter(v => {
			return fi1.prevVerticesIndices.indexOf(v) !== -1;		// valores comunes
		});

		fold.commonAxisVertices = rotationEdgeVerticesIndices.map(v => {
			return fi0.vertices[fi0.prevVerticesIndices.indexOf(v)];
		});

		// not the same vertices indices. Graticule uses an ad-hoc triangle pairing process,
		// and this might not work as expected. Check for diff points.
		if (fold.commonAxisVertices.length !== 2) {
			fold.commonAxisVertices = fi0.vertices.filter(v => {
				return fi1.vertices.find(v0 => v0.equals(v));
			});
		}
	}

	private unfoldProcess(scale: number) {
		// let t = Date.now();
		this.roots.forEach(f => this.unfoldImpl(f, scale));
		// t = Date.now() - t;
		// console.log(`unfold vertices took ${t}ms.`);
	}

	private setupGeometry() {
		this.vertex = this.originalVertices.map(v => {
			return v.clone()
		});
		this.facesInfo.forEach(f => {
			f.vertices.forEach((v, i) => {
				f.vertices[i] = this.vertex[v.index];
			});
			f.normal = Vertex.normalForVertices(f.vertices);
		});
	}

	public unfold(scale: number) {

		this.setupGeometry();

		this.unfoldProcess(scale);

		this.folds = this.foldsMST.map(e => {
			return {
				f0: e.edge.faceIndices[0],
				f1: e.edge.faceIndices[1],
			}
		});
	}

	private normalForFaceIndex(i: number) {
		return Vertex.normalForVertices(this.facesInfo.get(i).vertices);
	}

	private unfoldImpl(node: FacesEdge, scale: number) {
		node.children.forEach(c => {
			this.unfoldImpl(c, scale)
		});

		this.unfoldNodeRec(node, scale);
	}

	private setupQuaternionFor(node: FacesEdge, scale: number) {
		const fi0 = this.facesInfo.get(node.fromFaceIndex);
		const fi1 = this.facesInfo.get(node.toFaceIndex);

		const N0 = fi0.normal;
		const N1 = fi1.normal;

		const ac = Math.max(-1, Math.min(1, Myriahedral.dot(N0, N1)));
		let diffAngle = scale *
			Math.acos(ac) *
			node.orientationMultiplier;

		const rotationEdgeVertices = node.commonAxisVertices;
		knn[0] = rotationEdgeVertices[1].x - rotationEdgeVertices[0].x;
		knn[1] = rotationEdgeVertices[1].y - rotationEdgeVertices[0].y;
		knn[2] = rotationEdgeVertices[1].z - rotationEdgeVertices[0].z;
		const e = Vector3.normalize(knn, knn);

		Quaternion.fromAxisAndAngle(q0, e, diffAngle);
	}

	private unfoldNodeRec(node: FacesEdge, scale: number) {
		this.setupQuaternionFor(node, scale);
		this.rotatePointRecQuaterion(node, node.commonAxisVertices[0], q0);
	}

	private rotatePointRecQuaterion(n: FacesEdge, vref: Vertex, q0: Float32Array) {

		n.children.forEach(c => {
			this.rotatePointRecQuaterion(c, vref, q0);
		});

		this.facesInfo.get(n.toFaceIndex).vertices.forEach(v => {

			Myriahedral.rotateWith(q0, v, vref);
		});
	}

	private static rotateWith(q0: Float32Array, v: Vertex, vref: Vertex) {
		knnP0[0] = v.x - vref.x;
		knnP0[1] = v.y - vref.y;
		knnP0[2] = v.z - vref.z;

		const rp0 = Quaternion.rotate(q0, knnP0);

		v.x = rp0[0] + vref.x;
		v.y = rp0[1] + vref.y;
		v.z = rp0[2] + vref.z;
	}
}