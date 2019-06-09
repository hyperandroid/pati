import Vector3 from "../math/Vector3";


export default class Camera {

	constructor(protected pos: Vector3, protected forward: Vector3, protected up: Vector3) {

	}

	rotateX(a: number) {

	}

	rotateY(a: number) {

	}

	rotateZ(a: number) {

	}

	advance(amount: number) {

	}

	strafe(amount: number) {

	}

	yaw(a: number) {

	}

	pitch(a: number) {

	}

	roll(a: number) {

	}

	/**
	 * look at a point in global space.
	 * @param p
	 */
	lookAt(p: Vector3) {

	}
}