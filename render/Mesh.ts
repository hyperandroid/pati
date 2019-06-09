export default class Mesh {

	vao : WebGLVertexArrayObject;
	indexed = false;
	numVertices = 0;

	constructor() {

	}

	/**
	 * define a mesh from vertices data, and optionally, vertices indexes.
	 *
	 * attrib pointer info will be set consecutively:
	 *  all x,y,z
	 *  all u,v
	 *
	 * hence vertexAttribArrayPointer calls will reflect:
	 *  stride of (coords per vertex)*sizeof(FLOAT) = (3*4), offset 0
	 *  stride of (coords per vertex uv)*sizeof(FLOAT) = (2*4), offset num_vertices * sizeof(FLOAT)
	 *
	 * @param gl WebGL2RenderingContext
	 * @param vertices an array of vertex data. Contains x,y,z info per vertex.
	 * @param uv an array of vertex data. Contains x,y,z info per vertex.
	 * @param index optional array of index data.
	 */
	static from(gl: WebGL2RenderingContext, vertices: number[], uv: number[], index?: number[]) : Mesh {

		const m = new Mesh();

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		// warn: use layout location 0 in shader for geometry.
		gl.enableVertexAttribArray(0);
		// warn: use layout location 1 in shader for texture data.
		gl.enableVertexAttribArray(1);

		const allGeometryAndUVDataBuffer = new Float32Array(vertices.length + uv.length);
		allGeometryAndUVDataBuffer.set(vertices);
		allGeometryAndUVDataBuffer.set(uv, vertices.length);

		const bufferGeometryAndUV = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, bufferGeometryAndUV);
		gl.bufferData(gl.ARRAY_BUFFER, allGeometryAndUVDataBuffer, gl.STATIC_DRAW);

		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3*4, 0);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 2*4, 4*vertices.length);

		if (index!==void 0) {
			const bufferIndex = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndex);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
			m.indexed = true;
			m.numVertices = (index.length/3)|0;
		} else {
			m.numVertices = (vertices.length /3)|0;
		}

		gl.bindVertexArray(null);

		m.vao = vao;

		return m;
	}

	render(gl: WebGL2RenderingContext) {
		gl.bindVertexArray(  this.vao );
		if (this.indexed) {
			gl.drawElements(gl.TRIANGLES, this.numVertices, gl.UNSIGNED_SHORT, 0);
		} else {
			gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
		}
	}
}