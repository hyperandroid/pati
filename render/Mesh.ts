import Vector3 from "../math/Vector3";
import Matrix4 from "../math/Matrix4";
import RenderComponent from "./RenderComponent";
import Engine from "./Engine";

export default class Mesh implements RenderComponent {

	vao : WebGLVertexArrayObject;
	indexed = false;
	numVertices = 0;

	position = Vector3.createFromCoords(0,0,0);
	rotation = Vector3.createFromCoords(0,0,0);
	scale = Vector3.createFromCoords(1,1,1);

	transformDirty = true;
	transform = Matrix4.create();

	instanceCount = 1;

	instancedTransform : WebGLBuffer = null;

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
	static from(gl: WebGL2RenderingContext, vertices: number[], uv: number[], index?: number[], instanceCount?: number) : Mesh {

		const m = new Mesh();

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		// warn: use layout location 0 in shader for geometry.
		// gl.enableVertexAttribArray(0);
		// warn: use layout location 1 in shader for texture data.
		// gl.enableVertexAttribArray(1);

		const allGeometryAndUVDataBuffer = new Float32Array(vertices.length + uv.length);
		allGeometryAndUVDataBuffer.set(vertices);
		allGeometryAndUVDataBuffer.set(uv, vertices.length);

		const bufferGeometryAndUV = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, bufferGeometryAndUV);
		gl.bufferData(gl.ARRAY_BUFFER, allGeometryAndUVDataBuffer, gl.STATIC_DRAW);

		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
		gl.enableVertexAttribArray(2);
		gl.enableVertexAttribArray(3);
		gl.enableVertexAttribArray(4);
		gl.enableVertexAttribArray(5);

		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3*4, 0);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 2*4, 4*vertices.length);
		gl.vertexAttribDivisor(0,0);
		gl.vertexAttribDivisor(1,0);

		// warn: use layout location 2 in shader for model transform.
		// gl.enableVertexAttribArray(2);
		instanceCount = instanceCount || 1;

		const instancedModelTransform = new Float32Array(16*instanceCount);
		const glInstancedModelTransformBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, glInstancedModelTransformBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, instancedModelTransform, gl.DYNAMIC_DRAW);
		m.instancedTransform = glInstancedModelTransformBuffer;

		gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 16*4, 0);
		gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 16*4, 16);
		gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 16*4, 32);
		gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 16*4, 48);
		gl.vertexAttribDivisor(2,1);
		gl.vertexAttribDivisor(3,1);
		gl.vertexAttribDivisor(4,1);
		gl.vertexAttribDivisor(5,1);

		if (index!==void 0) {
			const bufferIndex = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferIndex);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
			m.indexed = true;
			m.numVertices = index.length;
		} else {
			m.numVertices = (vertices.length /3)|0;
		}

		gl.bindVertexArray(null);

		m.instanceCount = instanceCount;
		m.vao = vao;

		return m;
	}

	transformMatrix() : Float32Array {

		// transformation needs rebuild
		if (this.transformDirty) {
			Matrix4.modelMatrix(this.transform, this.position, this.rotation, this.scale);
			this.transformDirty = false;
		}

		return this.transform;
	}

	render(e: Engine) {

		this.transformMatrix();
		this.renderInstanced(e, this.transform, 1);
	}

	renderInstanced(e: Engine, locals: Float32Array, numInstances: number) {

		const gl = e.gl;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.instancedTransform);

		// check for locals info room in current instance info buffer.
		if (numInstances > this.instanceCount) {
			gl.bufferData(gl.ARRAY_BUFFER, locals, gl.DYNAMIC_DRAW);
			this.instanceCount = numInstances;
		} else {
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, locals);
		}

		gl.bindVertexArray(this.vao);

		if (this.indexed) {
			gl.drawElementsInstanced(gl.TRIANGLES, this.numVertices, gl.UNSIGNED_SHORT, 0, numInstances);
		} else {
			gl.drawArraysInstanced(gl.TRIANGLES, 0, this.numVertices, numInstances);
		}

		gl.bindVertexArray(null);
	}

	euler(x: number, y: number, z: number) {
		this.rotation[0] = x;
		this.rotation[1] = y;
		this.rotation[2] = z;
		this.transformDirty = true;
	}
}