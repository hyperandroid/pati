/**
 * A vector 3 is an Float32Array[3]
 */
export default class Vector3 {

	static create() : Float32Array {
		return new Float32Array(3);
	}

	static createFromCoords(x: number, y: number, z: number) : Float32Array {
		return Vector3.set(Vector3.create(), x, y, z);
	}

	static set(out: Float32Array, x: number, y: number, z: number) : Float32Array {
		out[0] = x;
		out[1] = y;
		out[2] = z;

		return out;
	}

	static add(out: Float32Array, v0: Float32Array, v1: Float32Array) {

		out[0] = v0[0] + v1[0];
		out[1] = v0[1] + v1[1];
		out[2] = v0[2] + v1[2];
	}

	/**
	 * out = v0 - v1
	 * @param out
	 * @param v0
	 * @param v1
	 */
	static sub(out: Float32Array, v0: Float32Array, v1: Float32Array) : Float32Array {

		out[0] = v0[0] - v1[0];
		out[1] = v0[1] - v1[1];
		out[2] = v0[2] - v1[2];

		return out;
	}

	static magnitude(v: Float32Array) : number {
		return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	}

	static copy(out: Float32Array, v: Float32Array) : Float32Array {
		out[0] = v[0];
		out[1] = v[1];
		out[2] = v[2];

		return out;
	}

	static normalize(out: Float32Array, v: Float32Array) : Float32Array {

		const l = Vector3.magnitude(v);
		if (l !== 0) {
			out[0] = v[0] * l;
			out[1] = v[1] * l;
			out[2] = v[2] * l;
		}

		return out;
	}

	static mul(out: Float32Array, v: Float32Array, l: number) : Float32Array {
		out[0] = v[0] * l;
		out[1] = v[1] * l;
		out[2] = v[2] * l;

		return out;
	}

	/**
	 * assumes normalized vectors.
	 */
	static dot(v0: Float32Array, v1: Float32Array) : number {
		return v0[0] * v1[0] + v0[1] * v1[1] + v0[2] * v1[2];
	}

	static invert(out: Float32Array, v: Float32Array) {

		out[0] = v[0] * -1.0;
		out[1] = v[1] * -1.0;
		out[2] = v[2] * -1.0;
	}

	static cross(out: Float32Array, a: Float32Array, b: Float32Array) : Float32Array {

		out[0] = a[1]*b[2] - a[2]*b[1];
		out[1] = a[2]*b[0] - a[0]*b[2];
		out[2] = a[0]*b[1] - a[1]*b[0];

		return out;
	}
}