import Vector3 from "./Vector3";

/**
 * a quaternion representation would be a float[4], where
 * 0,1,2 = i,j,k
 * 3 = w
 */

const w = 3;
const i = 0;
const j = 1;
const k = 2;

const _v0 = Vector3.create();
const _v1 = Vector3.create();
const _v2 = Vector3.create();
const _v3 = Vector3.create();

export default class Quaternion {

	/**
	 * return a default quaternion
	 */
	static create(): Float32Array {
		const r = new Float32Array(4);
		r[w] = 1.0;

		return r;
	}

	static createFromAxisAndAngle(axis: Float32Array, theta: number): Float32Array {
		return Quaternion.fromAxisAndAngle(Quaternion.create(), axis, theta);
	}

	static fromAxisAndAngle(out: Float32Array, axis: Float32Array, theta: number): Float32Array {
		const s = Math.sin(theta / 2);
		out[i] = axis[0] * s;
		out[j] = axis[1] * s;
		out[k] = axis[2] * s;
		out[w] = Math.cos(theta / 2);

		return out;
	}

	static identity(out: Float32Array): Float32Array {

		out[i] = 0.0;
		out[j] = 0.0;
		out[k] = 0.0;
		out[w] = 1.0;

		return out;
	}

	static fromPoint(out: Float32Array, p: Float32Array): Float32Array {

		out[i] = p[0];
		out[j] = p[1];
		out[k] = p[2];
		out[w] = 0.0;

		return out;
	}

	static conjugate(out: Float32Array, q: Float32Array): Float32Array {

		out[i] = q[i] * -1.0;
		out[j] = q[j] * -1.0;
		out[k] = q[k] * -1.0;
		out[w] = q[w];

		return out;
	}

	static invert(out: Float32Array, q: Float32Array): Float32Array {

		const dot = Quaternion.magnitude(q);
		const invdot = dot === 0 ? 0 : 1.0 / dot;

		out[i] = q[i] * -invdot;
		out[j] = q[j] * -invdot;
		out[k] = q[k] * -invdot;
		out[w] = q[w] * invdot;

		return out;
	}

	static dot(q0: Float32Array, q1: Float32Array): number {
		return q0[w] * q1[w] + q0[i] * q1[i] + q0[j] * q1[j] + q0[k] * q1[k];
	}

	static squaredLength(q: Float32Array): number {
		return q[w] * q[w] + q[i] * q[i] + q[j] * q[j] + q[k] * q[k];
	}

	static magnitude(q: Float32Array): number {
		return Math.sqrt(Quaternion.squaredLength(q));
	}

	static normalize(out: Float32Array, q: Float32Array): Float32Array {
		const m = Quaternion.magnitude(q);

		if (m !== 0) {
			const im = 1.0 / m;

			out[i] = q[i] * im;
			out[j] = q[j] * im;
			out[k] = q[k] * im;
			out[w] = q[w] * im;
		}

		return out;
	}

	/**
	 *    q.w²+q.x²+q.y²+q.z²    0                        0                        0
	 *    0                    q.w²+q.x²-q.y²-q.z²        2*q.x*q.y - 2*q.w*q.z    2*q.x*q.z + 2*q.w*q.y
	 *    0                    2*q.x*q.y + 2*q.w*q.z    q.w²-q.x² + q.y²-q.z²    2*q.y*q.z - 2*q.w*q.x
	 *    0                    2*q.x*q.z - 2*q.w*q.y    2*q.y*q.z + 2*q.w*q.x    q.w²-q.x²-q.y²+q.z²
	 */
	static toMatrix(m: Float32Array, q: Float32Array) {

		const w2 = q[w] * q[w];

		const x = q[i];
		const x2 = x * x;
		const y = q[j];
		const y2 = y * y;
		const z = q[k];
		const z2 = z * z;

		// row 0
		m[0] = w2 + x2 + y2 + z2;
		m[1] = 0;
		m[2] = 0;
		m[3] = 0;

		// row 1
		m[4] = 0;
		m[5] = w2 + x2 - y2 - z2;
		m[6] = 2 * x * y - 2 * w * z;
		m[7] = 2 * x * z + 2 * w * y;

		// row 2
		m[8] = 0;
		m[9] = 2 * x * y + 2 * w * z;
		m[10] = w2 - x2 + y2 - z2;
		m[11] = 2 * y * z - 2 * w * x;

		// row 3
		m[12] = 0;
		m[13] = 2 * x * z - 2 * w * y;
		m[14] = 2 * y * z + 2 * w * x;
		m[15] = w2 - x2 - y2 + z2;

		return m;
	}

	/**
	 * rotate point v by quaternion q.
	 * store the result a a quaternion in out.
	 */
	static rotate(out: Float32Array, q: Float32Array, v: Float32Array): Float32Array {

		return Quaternion.mul(
			_q0,
			Quaternion.mul(
				_q0,
				q,
				Quaternion.fromPoint(Quaternion.create(), v)),
			Quaternion.conjugate(Quaternion.create(), q)
		);
	}

	static clone(out: Float32Array, q: Float32Array): Float32Array {

		out[i] = q[i];
		out[j] = q[j];
		out[k] = q[k];
		out[w] = q[w];

		return out;
	}

	static toJSON(q: Float32Array): any {
		return {
			w: q[w],
			v: {
				x: q[i],
				y: q[j],
				z: q[k],
			}
		}
	}

	static add(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {

		out[i] = a[i] + b[i];
		out[j] = a[j] + b[j];
		out[k] = a[k] + b[k];
		out[w] = a[w] + b[w];

		return out;
	}

	static sub(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {

		out[i] = a[i] - b[i];
		out[j] = a[j] - b[j];
		out[k] = a[k] - b[k];
		out[w] = a[w] - b[w];

		return out;
	}

	static mul(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {

		const bw = b[w];
		const bx = b[i];
		const by = b[j];
		const bz = b[k];

		const aw = a[w];
		const ax = a[i];
		const ay = a[j];
		const az = a[k];

		out[i] = aw * bx + ax * bw + ay * bz - az * by;
		out[j] = aw * by - ax * bz + ay * bw + az * bx;
		out[k] = aw * bz + ax * by - ay * bx + az * bw;
		out[w] = aw * bw - ax * bx - ay * by - az * bz;

		return out;
	}

	static div(out: Float32Array, q1: Float32Array, q2: Float32Array): Float32Array {

		// -q1.v X q2.v
		const v0 = Vector3.cross(
			_v0,
			Vector3.set(_v3, -q1[i], -q1[j], -q1[k]),
			q2	// just take first 3 coords: (x,y,z)
		);

		// q2.v * q1.w
		const v1 = Vector3.mul(_v1, q2, q1[w]);

		const v2 = Vector3.mul(_v2, q1, q2[w]);

		Vector3.add(_v3, Vector3.sub(_v3, v0, v1), v2);

		out[i] = _v3[i];
		out[j] = _v3[j];
		out[k] = _v3[k];
		out[w] = q1[w] * q2[w] + q1[i] * q2[i] + q1[j] * q2[j] + q1[k] * q2[k];

		return out;
	}

	static Test() {

		const p0 = Vector3.createFromCoords(1.0, 0.0, 0.0);
		const q0 = Quaternion.createFromAxisAndAngle(
			Vector3.createFromCoords(0.0, 1.0, 0.0), Math.PI / 4);
		const q1 = Quaternion.createFromAxisAndAngle(
			Vector3.createFromCoords(0.0, 0.0, 1.0), Math.PI / 4);

		const rp0 = Quaternion.rotate(Quaternion.create(), q0, p0);

		console.log(
			Quaternion.toJSON(
				Quaternion.rotate(
					Quaternion.create(),
					q1,
					rp0)));

		const q2 = Quaternion.mul(Quaternion.create(), q1, q0);
		console.log(
			Quaternion.toJSON(
				Quaternion.rotate(
					Quaternion.create(),
					q2,
					p0
				)
			));
	}
}

const _q0 = Quaternion.create();