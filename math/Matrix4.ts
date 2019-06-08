import Vector3 from "./Vector3";

const EPSILON = .00001;

/**
 * matrix4
 *
 * [ a  b  c  0 ]
 * [ d  e  f  0 ]
 * [ g  h  i  0 ]
 * [ tx ty tz 0 ]
 */
export default class Matrix4 {

	static perspective(out: Float32Array, verticalFOVInRadians: number, aspect: number, zNear: number, zFar: number) : Float32Array {

		const f = 1.0 / Math.tan(verticalFOVInRadians / 2.0);
		out[0] = f / aspect;
		out[1] = 0;
		out[2] = 0;
		out[3] = 0;
		out[4] = 0;
		out[5] = f;
		out[6] = 0;
		out[7] = 0;
		out[8] = 0;
		out[9] = 0;
		out[11] = -1.0;
		out[12] = 0;
		out[13] = 0;
		out[15] = 0;

		if (zFar !== Infinity) {
			const nf = 1 / (zNear - zFar);
			out[10] = (zFar + zNear) * nf;
			out[14] = (2.0 * zFar * zNear) * nf;
		} else {
			out[10] = -1.0;
			out[14] = -2.0 * zNear;
		}

		return out;
	}

	static ortho(out: Float32Array, left: number, right: number, top: number, bottom: number, near: number, far: number) : Float32Array {
		const lr = 1.0 / (left - right);
		const bt = 1.0 / (bottom - top);
		const nf = 1.0 / (near - far);
		out[0] = -2.0 * lr;
		out[1] = 0.0;
		out[2] = 0.0;
		out[3] = 0.0;
		out[4] = 0.0;
		out[5] = -2.0 * bt;
		out[6] = 0.0;
		out[7] = 0.0;
		out[8] = 0.0;
		out[9] = 0.0;
		out[10] = 2.0 * nf;
		out[11] = 0.0;
		out[12] = (left + right) * lr;
		out[13] = (top + bottom) * bt;
		out[14] = (far + near) * nf;
		out[15] = 1.0;
		return out;
	}

	static mul(out: Float32Array, a: Float32Array, b: Float32Array) : Float32Array {
		const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
		const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
		const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
		const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

		let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
		out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[4];
		b1 = b[5];
		b2 = b[6];
		b3 = b[7];
		out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[8];
		b1 = b[9];
		b2 = b[10];
		b3 = b[11];
		out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		b0 = b[12];
		b1 = b[13];
		b2 = b[14];
		b3 = b[15];
		out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
		out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
		out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
		out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

		return out;
	}

	static inverse(out: Float32Array, a: Float32Array) {
	}

	static clone(a: Float32Array) : Float32Array {
		const b = Matrix4.create();
		return Matrix4.copy(b, a);
	}

	static copy(out: Float32Array, m: Float32Array) : Float32Array {
		out.set(m);
		return out;
	}

	static identity(out: Float32Array) : Float32Array {
		out[0] = 1.0;
		out[1] = 0.0;
		out[2] = 0.0;
		out[3] = 0.0;
		out[4] = 0.0;
		out[5] = 1.0;
		out[6] = 0.0;
		out[7] = 0.0;
		out[8] = 0.0;
		out[9] = 0.0;
		out[10] = 1.0;
		out[11] = 0.0;
		out[12] = 0.0;
		out[13] = 0.0;
		out[14] = 0.0;
		out[15] = 1.0;
		return out;
	}

	static lookAt(out: Float32Array, eye: Float32Array, lookAt: Float32Array, up: Float32Array) : Float32Array {

		const eyex = eye[0];
		const eyey = eye[1];
		const eyez = eye[2];
		const upx = up[0];
		const upy = up[1];
		const upz = up[2];
		const lookAtX = lookAt[0];
		const lookAtY = lookAt[1];
		const lookAtZ = lookAt[2];

		// eye and lookAt are mostly the same.
		if (Math.abs(eyex - lookAtX) < EPSILON &&
			Math.abs(eyey - lookAtY) < EPSILON &&
			Math.abs(eyez - lookAtZ) < EPSILON) {
			return Matrix4.identity(out);
		}

		let x0, x1, x2, y0, y1, y2, z0, z1, z2, len;

		// forward vector
		z0 = eyex - lookAtX;
		z1 = eyey - lookAtY;
		z2 = eyez - lookAtZ;

		// normalized
		len = 1 / Math.hypot(z0, z1, z2);
		z0 *= len;
		z1 *= len;
		z2 *= len;

		// cross vector between up and forward (right vector)
		x0 = upy * z2 - upz * z1;
		x1 = upz * z0 - upx * z2;
		x2 = upx * z1 - upy * z0;
		len = Math.hypot(x0, x1, x2);
		if (!len) {
			x0 = 0.0;
			x1 = 0.0;
			x2 = 0.0;
		} else {
			len = 1 / len;
			x0 *= len;
			x1 *= len;
			x2 *= len;
		}

		// cross right/forward (up)
		y0 = z1 * x2 - z2 * x1;
		y1 = z2 * x0 - z0 * x2;
		y2 = z0 * x1 - z1 * x0;

		len = Math.hypot(y0, y1, y2);
		if (len===0) {
			y0 = 0.0;
			y1 = 0.0;
			y2 = 0.0;
		} else {
			len = 1.0 / len;
			y0 *= len;
			y1 *= len;
			y2 *= len;
		}

		out[0] = x0;
		out[1] = y0;
		out[2] = z0;
		out[3] = 0.0;
		out[4] = x1;
		out[5] = y1;
		out[6] = z1;
		out[7] = 0.0;
		out[8] = x2;
		out[9] = y2;
		out[10] = z2;
		out[11] = 0.0;
		out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
		out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
		out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
		out[15] = 1.0;

		return out;
	}

	static transpose(out: Float32Array, m: Float32Array) : Float32Array {
		if (out===m) {
			const a01 = m[1], a02 = m[2], a03 = m[3];
			const a12 = m[6], a13 = m[7];
			const a23 = m[11];

			out[1] = m[4];
			out[2] = m[8];
			out[3] = m[12];
			out[4] = a01;
			out[6] = m[9];
			out[7] = m[13];
			out[8] = a02;
			out[9] = a12;
			out[11] = m[14];
			out[12] = a03;
			out[13] = a13;
			out[14] = a23;
		} else {
			out[0] = m[0];
			out[1] = m[4];
			out[2] = m[8];
			out[3] = m[12];
			out[4] = m[1];
			out[5] = m[5];
			out[6] = m[9];
			out[7] = m[13];
			out[8] = m[2];
			out[9] = m[6];
			out[10] = m[10];
			out[11] = m[14];
			out[12] = m[3];
			out[13] = m[7];
			out[14] = m[11];
			out[15] = m[15];
		}

		return out;
	}

	static translate(out: Float32Array, m: Float32Array, v: Vector3) : Float32Array {
		const x = v[0], y = v[1], z = v[2];

		if (m === out) {
			out[12] = m[0] * x + m[4] * y + m[8] * z + m[12];
			out[13] = m[1] * x + m[5] * y + m[9] * z + m[13];
			out[14] = m[2] * x + m[6] * y + m[10] * z + m[14];
			out[15] = m[3] * x + m[7] * y + m[11] * z + m[15];
		} else {
			const a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3];
			const a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7];
			const a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11];

			out[0] = a00;
			out[1] = a01;
			out[2] = a02;
			out[3] = a03;
			out[4] = a10;
			out[5] = a11;
			out[6] = a12;
			out[7] = a13;
			out[8] = a20;
			out[9] = a21;
			out[10] = a22;
			out[11] = a23;

			out[12] = a00 * x + a10 * y + a20 * z + m[12];
			out[13] = a01 * x + a11 * y + a21 * z + m[13];
			out[14] = a02 * x + a12 * y + a22 * z + m[14];
			out[15] = a03 * x + a13 * y + a23 * z + m[15];
		}

		return out;
	}

	static rotateX(out: Float32Array, m: Float32Array, angle: number) {
	}

	static rotateY(out: Float32Array, m: Float32Array, angle: number) {
	}

	static rotateZ(out: Float32Array, m: Float32Array, angle: number) {
	}

	static rotate(out: Float32Array, m: Float32Array, xy: number, xz: number, yz: number) {
	}

	/**
	 * scale matrix m by vector v.
	 */
	static scale(out: Float32Array, m: Float32Array, v: Float32Array) : Float32Array {
		const x = v[0], y = v[1], z = v[2];

		out[0] = m[0] * x;
		out[1] = m[1] * x;
		out[2] = m[2] * x;
		out[3] = m[3] * x;
		out[4] = m[4] * y;
		out[5] = m[5] * y;
		out[6] = m[6] * y;
		out[7] = m[7] * y;
		out[8] = m[8] * z;
		out[9] = m[9] * z;
		out[10] = m[10] * z;
		out[11] = m[11] * z;
		out[12] = m[12];
		out[13] = m[13];
		out[14] = m[14];
		out[15] = m[15];
		return out;
	}

	static create() : Float32Array {
		const ret = new Float32Array(16);
		ret[ 0] = 1.0;
		ret[ 5] = 1.0;
		ret[10] = 1.0;
		ret[15] = 1.0;

		return ret;
	}
}