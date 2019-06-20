import Vector3 from "../math/Vector3";
import Matrix4 from "../math/Matrix4";
import RenderComponent from "./RenderComponent";
import Engine from "./Engine";
import {ShaderVAOInfo} from "./shader/Shader";
import Material, {MaterialType} from "./Material";

export default class Mesh implements RenderComponent {

	material: Material = null;
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
	 */
	from(e: Engine, vertices: Float32Array, uv: Float32Array, index: Uint16Array, material: Material, instanceCount: number) {

		this.material = material;

		const gl = e.gl;

		switch(material.type) {
			case MaterialType.REFLECTIVE:
				this.shaderInfo = e.getShader("reflectiveEnvMap").createVAO(gl, vertices, this.generateNormals(vertices, index), index, material, instanceCount);
				break;
			case MaterialType.REFRACTIVE:
				this.shaderInfo = e.getShader("refractiveEnvMap").createVAO(gl, vertices, this.generateNormals(vertices, index), index, material, instanceCount);
				break;
			case MaterialType.TEXTURE:
				this.shaderInfo = e.getShader("texture").createVAO(gl, vertices, uv, index, material, instanceCount);
				break;
			case MaterialType.SKYBOX:
				this.shaderInfo = e.getShader("skybox").createVAO(gl, vertices, uv, index, material, instanceCount);
				break;
			default:
				throw new Error(`Unknown material type. ${material}`);
		}
	}

	private generateNormals(vertices: Float32Array, index: Uint16Array) : Float32Array {
		const v0 = Vector3.create();
		const v1 = Vector3.create();
		const v2 = Vector3.create();
		const v3 = Vector3.create();
		const v4 = Vector3.create();
		const v5 = Vector3.create();

		let normals: Float32Array = new Float32Array(vertices.length);;

		if (index !== null) {

			for (let i = 0; i < index.length; i += 3) {
				const v0i = index[i] * 3;
				const v1i = index[i + 1] * 3;
				const v2i = index[i + 2] * 3;

				Vector3.set(v0, vertices[v0i], vertices[v0i + 1], vertices[v0i + 2]);
				Vector3.set(v1, vertices[v1i], vertices[v1i + 1], vertices[v1i + 2]);
				Vector3.set(v2, vertices[v2i], vertices[v2i + 1], vertices[v2i + 2]);

				Vector3.sub(v3, v0, v1);
				Vector3.sub(v4, v0, v2);

				Vector3.cross(v5, v4, v3);	// normal

				normals[v0i] += v5[0];
				normals[v0i + 1] += v5[1];
				normals[v0i + 2] += v5[2];
				normals[v1i] += v5[0];
				normals[v1i + 1] += v5[1];
				normals[v1i + 2] += v5[2];
				normals[v2i] += v5[0];
				normals[v2i + 1] += v5[1];
				normals[v2i + 2] += v5[2];
			}

		} else {

			for(let i = 0; i<vertices.length; i+=9) {
				const v0i = i ;
				const v1i = i + 3;
				const v2i = i + 6;

				Vector3.set(v0, vertices[v0i], vertices[v0i + 1], vertices[v0i + 2]);
				Vector3.set(v1, vertices[v1i], vertices[v1i + 1], vertices[v1i + 2]);
				Vector3.set(v2, vertices[v2i], vertices[v2i + 1], vertices[v2i + 2]);

				Vector3.sub(v3, v0, v1);
				Vector3.sub(v4, v0, v2);

				Vector3.cross(v5, v3, v4);	// normal

				normals[i] += v5[0];
				normals[i + 1] += v5[1];
				normals[i + 2] += v5[2];
				normals[i + 3] += v5[0];
				normals[i + 4] += v5[1];
				normals[i + 5] += v5[2];
				normals[i + 6] += v5[0];
				normals[i + 7] += v5[1];
				normals[i + 8] += v5[2];
			}
		}

		// normalize.
		for (let i = 0; i < normals.length; i += 3) {
			const v = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
			normals[i] /= v;
			normals[i + 1] /= v;
			normals[i + 2] /= v;
		}

		return normals;
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
		const gl = e.gl;

		// bugbug, should be checked on shader.
		if (null!==this.shaderInfo.instanceBuffer) {
			// update instances info if needed.
			gl.bindBuffer(gl.ARRAY_BUFFER, this.shaderInfo.instanceBuffer);

			// check for locals info room in current instance info buffer.
			if (numInstances > this.shaderInfo.instanceCount) {
				gl.bufferData(gl.ARRAY_BUFFER, locals, gl.DYNAMIC_DRAW);
				this.shaderInfo.instanceCount = numInstances;
			} else {
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, locals);
			}
		}

		this.shaderInfo.shader.render(e, this.shaderInfo, this);
	}

	getMaterial() {
		return this.material;
	}

	getMatrix() {
		return this.transformMatrix();
	}

	euler(x: number, y: number, z: number) {
		this.rotation[0] = x;
		this.rotation[1] = y;
		this.rotation[2] = z;
		this.transformDirty = true;
	}
}