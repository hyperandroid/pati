import Mesh from "../Mesh";
import Material from "../Material";
import Engine from "../Engine";

export const CubeVertices = new Float32Array([
	0.5, -0.5, -0.5,
	-0.5, -0.5, -0.5,
	-0.5, -0.5, 0.5,
	0.5, -0.5, 0.5,
	0.5, 0.5, -0.5,
	-0.5, 0.5, -0.5,
	-0.5, 0.5, 0.5,
	0.5, 0.5, 0.5,
]);

const uv = new Float32Array([0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1]);

export const CubeIndices = new Uint16Array([
	2, 1, 0, 3, 2, 0,
	3, 0, 4, 7, 3, 4,
	0, 1, 5, 4, 0, 5,
	1, 2, 6, 5, 1, 6,
	2, 3, 7, 6, 2, 7,
	4, 5, 6, 7, 4, 6,
]);

export class Cube extends Mesh {


	constructor(e: Engine, material: Material, indexed: boolean, instanceCount?: number) {
		super();

		if (indexed) {
			this.buildIndexed(e, material, instanceCount);
		} else {
			this.build(e, material, instanceCount);
		}
	}

	private buildIndexed(e: Engine, material: Material, instanceCount?: number) {

		this.from(e, {
			vertices: CubeVertices,
			uv: uv,
			index: CubeIndices,
			material
		}, instanceCount || 1);
	}

	private build(e: Engine, material: Material, instanceCount?: number) {
		const vertices = new Float32Array([

			-0.5, -0.5, 0.5,
			0.5, -0.5, 0.5,
			0.5, 0.5, 0.5,
			0.5, 0.5, 0.5,
			-0.5, 0.5, 0.5,
			-0.5, -0.5, 0.5,

			-0.5, 0.5, 0.5,
			-0.5, 0.5, -0.5,
			-0.5, -0.5, -0.5,
			-0.5, -0.5, -0.5,
			-0.5, -0.5, 0.5,
			-0.5, 0.5, 0.5,

			-0.5, -0.5, -0.5,
			0.5, -0.5, -0.5,
			0.5, -0.5, 0.5,
			0.5, -0.5, 0.5,
			-0.5, -0.5, 0.5,
			-0.5, -0.5, -0.5,

			0.5, -0.5, -0.5,
			0.5, 0.5, -0.5,
			0.5, 0.5, 0.5,
			0.5, 0.5, 0.5,
			0.5, -0.5, 0.5,
			0.5, -0.5, -0.5,

			0.5, 0.5, -0.5,
			0.5, -0.5, -0.5,
			-0.5, -0.5, -0.5,
			-0.5, -0.5, -0.5,
			-0.5, 0.5, -0.5,
			0.5, 0.5, -0.5,


			0.5, 0.5, 0.5,
			0.5, 0.5, -0.5,
			-0.5, 0.5, -0.5,
			-0.5, 0.5, -0.5,
			-0.5, 0.5, 0.5,
			0.5, 0.5, 0.5,
		]);

		const uv = new Float32Array([
			0.0, 0.0,
			1.0, 0.0,
			1.0, 1.0,
			1.0, 1.0,
			0.0, 1.0,
			0.0, 0.0,

			0.0, 0.0,
			1.0, 0.0,
			1.0, 1.0,
			1.0, 1.0,
			0.0, 1.0,
			0.0, 0.0,

			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0,
			0.0, 1.0,
			0.0, 0.0,
			1.0, 0.0,

			1.0, 0.0,
			1.0, 1.0,
			0.0, 1.0,
			0.0, 1.0,
			0.0, 0.0,
			1.0, 0.0,

			0.0, 1.0,
			1.0, 1.0,
			1.0, 0.0,
			1.0, 0.0,
			0.0, 0.0,
			0.0, 1.0,

			0.0, 1.0,
			1.0, 1.0,
			1.0, 0.0,
			1.0, 0.0,
			0.0, 0.0,
			0.0, 1.0
		]);

		this.from(e, {
			vertices,
			uv,
			material,
			index: null,
		}, instanceCount || 1);

	}
}