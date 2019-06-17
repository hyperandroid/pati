import Mesh from "../Mesh";

export class Cube extends Mesh {

	constructor(gl: WebGL2RenderingContext, indexed?: boolean) {
		super();

		const vertices = new Float32Array([
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

		const index = new Uint16Array([
						2, 1, 0, 3, 2, 0,
						3, 0, 4, 7, 3, 4,
						0, 1, 5, 4, 0, 5,
						1, 2, 6, 5, 1, 6,
						2, 3, 7, 6, 2, 7,
						4, 5, 6, 7, 4, 6,
					]);

		if (indexed) {
			this.from(gl, vertices, uv, index);
		} else {
			const verticesExpanded = new Float32Array(index.length*3);
			const uvExpanded = new Float32Array(index.length*2);
			for(let i = 0; i<index.length; i++ ) {
				const vindex = index[i];

				const x = vertices[vindex * 3];
				const y = vertices[vindex * 3 + 1];
				const z = vertices[vindex * 3 + 2];

				const u = uv[vindex * 2];
				const v = uv[vindex * 2 + 1];

				verticesExpanded[i * 3] = x;
				verticesExpanded[i * 3 + 1] = y;
				verticesExpanded[i * 3 + 2] = z;

				uvExpanded[i * 2] = u;
				uvExpanded[i * 2 + 1] = v;
			}

			this.from(gl, verticesExpanded, uvExpanded, null);

		}
	}
}