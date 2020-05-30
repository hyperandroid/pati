import {CubeIndices, CubeVertices} from "../render/geometry/Cube";

export class Vector3T {

	index = -1;

	constructor(public x: number, public y: number, public z: number){

	}

	static create(a: Float32Array, offset: number): Vector3T {
		return new Vector3T(a[offset], a[offset+1], a[offset+2]);
	}

	static createC(x: number, y: number, z: number) {
		return new Vector3T(x,y,z);
	}

	static normalize(b: Float32Array, offset: number, radius: number) {
		const x = b[offset];
		const y = b[offset+1];
		const z = b[offset+2];

		const l = Math.sqrt(x*x + y*y + z*z);

		if (l!==0.0) {
			b[offset] = x/l * radius;
			b[offset+1] = y/l * radius;
			b[offset+2] = z/l * radius;
		}
	}

	static middle(v0: Vector3T, v1: Vector3T) {
		return Vector3T.createC(
			v0.x + (v1.x-v0.x)/2.,
			v0.y + (v1.y-v0.y)/2.,
			v0.z + (v1.z-v0.z)/2.,
		);
	}

	write(b: number[]) {
		b.push(this.x);
		b.push(this.y);
		b.push(this.z);
	}
}

export interface SubdivisionResult {
	numTriangles: number;
	vertices: Float32Array;	// 3*numTriangles
	uv: Float32Array;		// 2*numTriangles
	index: Uint16Array;
	normals: Float32Array;
}

export default class Sphere {

	constructor() {

	}

	tessellateFromCube(subdivisions: number): SubdivisionResult {
		const t: number[] = [];

		const v = CubeVertices;
		const index = CubeIndices;

		for (let i = 0; i < index.length; i++) {
			t.push(v[index[i] * 3]);
			t.push(v[index[i] * 3 + 1]);
			t.push(v[index[i] * 3 + 2]);
		}

		let data = this.subdivideTriangles(new Float32Array(t), 12, subdivisions);
		this.expand(data, 1);
		data = this.calculateUV(data);

		return data;
	}

	tessellateFromTetrahedron(subdivisions: number): SubdivisionResult {

		const P1 = Vector3T.createC( 0.0, -1.0, 2.0 );
		const P2 = Vector3T.createC( 1.73205081, -1.0, -1.0 );
		const P3 = Vector3T.createC( -1.73205081, -1.0, -1.0 );
		const P4 = Vector3T.createC(  0.0, 2.0, 0.0 );

		const t: number[] = [];

		P1.write(t);
		P3.write(t);
		P2.write(t);

		P1.write(t);
		P4.write(t);
		P3.write(t);

		P1.write(t);
		P2.write(t);
		P4.write(t);

		P2.write(t);
		P3.write(t);
		P4.write(t);

		let data = this.subdivideTriangles(new Float32Array(t), 4, subdivisions);
		this.expand(data, 1);
		data = this.calculateUV(data);

		return data;
	}

	protected calculateUV(data: SubdivisionResult) {
		const uv = new Float32Array(data.numTriangles*3*2);

		let uvIndex = 0
		for(let i = 0; i < data.numTriangles*3; i++ ) {
			uv[uvIndex] = Math.atan2(data.vertices[i*3], data.vertices[i*3+2]);
			uv[uvIndex] = .5 + Math.atan2(data.vertices[i*3], data.vertices[i*3+2])/(2*Math.PI);
			uv[uvIndex+1] = .5 - Math.asin(data.vertices[i*3+1])/Math.PI;
			uvIndex += 2;
		}

		for(let i = 0; i < data.numTriangles*3; i+=3 ) {
			const u0 = uv[i*2];
			const v0 = uv[i*2+1];
			const u1 = uv[i*2+2];
			const v1 = uv[i*2+3];
			const u2 = uv[i*2+4];
			const v2 = uv[i*2+5];

			if (Math.abs(u0-u1)>.5 || Math.abs(u2-u0)>.5 || Math.abs(u2-u1)>.5) {
				if (u0 < .5) {
					uv[i*2] += 1;
				}
				if (u1 < .5) {
					uv[i*2+2] += 1;
				}
				if (u2 < .5) {
					uv[i*2+4] += 1;
				}
			}

			if (Math.abs(v0-v1)>.5 || Math.abs(v2-v0)>.5 || Math.abs(v2-v1)>.5) {
				if (v0 < .5) {
					uv[i*2+1] += 1;
				}
				if (v1 < .5) {
					uv[i*2+3] += 1;
				}
				if (v2 < .5) {
					uv[i*2+5] += 1;
				}
			}
		}

		return {
			...data,
			uv,
			normals: data.vertices,
		};
	}

	protected expand(data:SubdivisionResult, radius: number) {
		for(let i = 0; i < data.numTriangles*3; i++) {
			Vector3T.normalize(data.vertices, i*3, radius);
		}
	}

	protected subdivideTriangles(data: Float32Array,
								 numTriangles: number,
								 subdivisions: number): SubdivisionResult {

		for(let i = 0; i < subdivisions; i++) {
			data = this.subdivideTrianglesImpl(data, numTriangles);
			numTriangles = numTriangles * 4;
		}

		return {
			vertices: data,
			numTriangles,
			uv: null,
			index: null,
			normals: null,
		}
	}

	/**
	 * Subdivide numTriangles.
	 * data is at least numTriangles*3 length
	 * @param data
	 * @param numTriangles
	 */
	protected subdivideTrianglesImpl(data: Float32Array, numTriangles: number): Float32Array {

		if (data.length < numTriangles*3) {
			throw new Error(`Not enough input data`);
		}

		const newBuffer: number[] = [];

		for(let i = 0; i<numTriangles; i++) {
			const offset = i*9;		// each tri has 3 vertices of xyz

			const v0 = Vector3T.create(data, offset);
			const v1 = Vector3T.create(data, offset+3);
			const v2 = Vector3T.create(data, offset+6);

			const mv0v1 = Vector3T.middle(v0, v1);
			const mv1v2 = Vector3T.middle(v1, v2);
			const mv2v0 = Vector3T.middle(v2, v0);

			v0.write(newBuffer);
			mv0v1.write(newBuffer);
			mv2v0.write(newBuffer);

			mv0v1.write(newBuffer);
			v1.write(newBuffer);
			mv1v2.write(newBuffer);

			mv1v2.write(newBuffer);
			mv2v0.write(newBuffer);
			mv0v1.write(newBuffer);

			mv2v0.write(newBuffer);
			mv1v2.write(newBuffer);
			v2.write(newBuffer);
		}

		return new Float32Array(newBuffer);
	}

	tessellateFromTetrahedronRec(subdivisions: number): SubdivisionResult {

		const p1 = Vector3T.createC( 0.0, -1.0, 2.0 );
		const p2 = Vector3T.createC( 1.73205081, -1.0, -1.0 );
		const p3 = Vector3T.createC( -1.73205081, -1.0, -1.0 );
		const p4 = Vector3T.createC(  0.0, 2.0, 0.0 );

		const store: Vector3T[] = [];
		const index: number[] = [];

		this.subdivideTrianglesR(store, index, subdivisions, p1, p3, p2);
		this.subdivideTrianglesR(store, index, subdivisions, p1, p4, p3);
		this.subdivideTrianglesR(store, index, subdivisions, p1, p2, p4);
		this.subdivideTrianglesR(store, index, subdivisions, p2, p3, p4);

		const vertices = new Float32Array(store.length*3);
		store.forEach( (v,i) => {
			const l = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
			vertices[i*3] = v.x/l;
			vertices[i*3+1] = v.y/l;
			vertices[i*3+2] = v.z/l;
		});

		let data = {
			vertices,
			index: new Uint16Array(index),
			uv: null,
			normals: vertices,
			numTriangles: index.length/3,
		};

		data = this.calculateUVIndexed(data);

		return data;
	}

	protected calculateUVIndexed(data: SubdivisionResult) {
		const uv = new Float32Array(data.vertices.length / 3 * 2);

		let uvIndex = 0
		for (let i = 0; i < data.vertices.length/3; i++) {
			uv[uvIndex] = .5 + Math.atan2(data.vertices[i * 3], data.vertices[i * 3 + 2]) / (2 * Math.PI);
			uv[uvIndex + 1] = .5 - Math.asin(data.vertices[i * 3 + 1]) / Math.PI;
			uvIndex += 2;
		}

		for (let i = 0; i < data.numTriangles; i ++) {
			const u0 = uv[data.index[i * 3]*2        ];
			const v0 = uv[data.index[i * 3]*2     + 1];
			const u1 = uv[data.index[i * 3 + 1]*2    ];
			const v1 = uv[data.index[i * 3 + 1]*2 + 1]
			const u2 = uv[data.index[i * 3 + 2]*2    ];
			const v2 = uv[data.index[i * 3 + 2]*2 + 1];

			if (Math.abs(u0 - u1) > .5 || Math.abs(u2 - u0) > .5 || Math.abs(u2 - u1) > .5) {
				if (u0 < .5) {
					uv[data.index[i * 3]*2        ] += 1;
				}
				if (u1 < .5) {
					uv[data.index[i * 3 + 1]*2    ] += 1;
				}
				if (u2 < .5) {
					uv[data.index[i * 3 + 2]*2    ] += 1;
				}
			}

			if (Math.abs(v0 - v1) > .5 || Math.abs(v2 - v0) > .5 || Math.abs(v2 - v1) > .5) {
				if (v0 < .5) {
					uv[data.index[i * 3]*2     + 1] += 1;
				}
				if (v1 < .5) {
					uv[data.index[i * 3 + 1]*2 + 1] += 1;
				}
				if (v2 < .5) {
					uv[data.index[i * 3 + 2]*2 + 1] += 1;
				}
			}
		}

		return {
			...data,
			uv,
			normals: data.vertices,
		};
	}

	protected subdivideTrianglesR(store: Vector3T[], index: number[], level: number, v0: Vector3T, v1: Vector3T, v2: Vector3T) {

		if (level===0) {
			if (v0.index===-1) {
				v0.index = store.length;
				store.push(v0);
			}
			if (v1.index===-1) {
				v1.index = store.length;
				store.push(v1);
			}
			if (v2.index===-1) {
				v2.index = store.length;
				store.push(v2);
			}

			index.push(v0.index, v1.index, v2.index);

			return;
		}

		const mv0v1 = Vector3T.middle(v0, v1);
		const mv1v2 = Vector3T.middle(v1, v2);
		const mv2v0 = Vector3T.middle(v2, v0);

		this.subdivideTrianglesR(store, index, level-1, v0, mv0v1, mv2v0);
		this.subdivideTrianglesR(store, index, level-1, mv0v1, v1, mv1v2);
		this.subdivideTrianglesR(store, index, level-1, mv1v2, mv2v0, mv0v1);
		this.subdivideTrianglesR(store, index, level-1, mv2v0, mv1v2, v2);

	}
}