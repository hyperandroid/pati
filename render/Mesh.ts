import Vector3 from "../math/Vector3";
import Matrix4 from "../math/Matrix4";
import RenderComponent from "./RenderComponent";
import Engine from "./Engine";
import TextureShader from "./shader/TextureShader";
import {ShaderVAOInfo} from "./shader/Shader";

export default class Mesh implements RenderComponent {

	shaderInfo: ShaderVAOInfo = null;

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
	 * @param instanceCount number of instances to allocate space for.
	 */
	from(gl: WebGL2RenderingContext, vertices: number[], uv: number[], index?: number[], instanceCount?: number) {
		this.shaderInfo = TextureShader.createVAO(gl, vertices, uv, index, 1);
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
		this.renderInstanced(e, this.transform, 1);
	}

	renderInstanced(e: Engine, locals: Float32Array, numInstances: number) {

		this.transformMatrix();

		const ns = e.getShader("texture");
		const gl = e.gl;

		// update instances info if needed.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.shaderInfo.instanceBuffer);

		// check for locals info room in current instance info buffer.
		if (numInstances > this.shaderInfo.instanceCount) {
			gl.bufferData(gl.ARRAY_BUFFER, locals, gl.DYNAMIC_DRAW);
			this.shaderInfo.instanceCount = numInstances;
		} else {
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, locals);
		}

		ns.render(e, this.shaderInfo);
	}

	euler(x: number, y: number, z: number) {
		this.rotation[0] = x;
		this.rotation[1] = y;
		this.rotation[2] = z;
		this.transformDirty = true;
	}
}