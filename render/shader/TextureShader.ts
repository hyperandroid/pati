import Shader, {ShaderVAOInfo} from "./Shader";
import Matrix4 from "../../math/Matrix4";
import Engine from "../Engine";

/**
 * just draw geometry in a plain pink color
 */
export default class TextureShader extends Shader {

	constructor(gl: WebGL2RenderingContext) {
		super({
			gl,
			vertex : `#version 300 es
				
				precision mediump float;

				layout(location = 0) in vec3 aPosition;
				layout(location = 1) in vec2 aTexture;
				layout(location = 2) in mat4 aModel;
				
				uniform mat4 uProjection;
				uniform mat4 uModelView;
				
				out vec2 texturePos;

				void main() {
					gl_Position = uProjection * uModelView * aModel * vec4(aPosition, 1.0);
					texturePos = aTexture;
				}
			`,
			fragment: `#version 300 es
				
				precision mediump float; 
				
				uniform sampler2D uTextureSampler;
				in vec2 texturePos;
				
				out vec4 color;

				void main() {
					color = texture(uTextureSampler, texturePos); 
				}
			`,
			attributes : ["aPosition", "aTexture", "aModel"],
			uniforms: ["uProjection", "uModelView", "uTextureSampler"]
		});

		this.setMatrix4fv("uProjection", false, Matrix4.create());
		this.setMatrix4fv("uModelView", false, Matrix4.create());
	}

	use() {
		const gl = this._gl;

		gl.useProgram(this._shaderProgram);
	}

	notUse() {
		const gl = this._gl;

		gl.disableVertexAttribArray(0);
		gl.disableVertexAttribArray(1);
		gl.disableVertexAttribArray(2);
		gl.disableVertexAttribArray(3);
		gl.disableVertexAttribArray(4);
		gl.disableVertexAttribArray(5);

		gl.useProgram(null);
	}

	static createVAO(gl: WebGL2RenderingContext, vertices: number[], uv: number[], index?: number[], instanceCount?: number) : ShaderVAOInfo {

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
		gl.enableVertexAttribArray(2);
		gl.enableVertexAttribArray(3);
		gl.enableVertexAttribArray(4);
		gl.enableVertexAttribArray(5);

		const glGeometryBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, glGeometryBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3*4, 0);
		gl.vertexAttribDivisor(0,0);

		const glUVBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, glUVBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 2*4, 0);
		gl.vertexAttribDivisor(1,0);

		instanceCount = instanceCount || 1;

		const instancedModelTransform = new Float32Array(16*instanceCount);
		const glInstancedModelTransformBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, glInstancedModelTransformBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, instancedModelTransform, gl.DYNAMIC_DRAW);

		gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 16*4, 0);
		gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 16*4, 16);
		gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 16*4, 32);
		gl.vertexAttribPointer(5, 4, gl.FLOAT, false, 16*4, 48);
		gl.vertexAttribDivisor(2,1);
		gl.vertexAttribDivisor(3,1);
		gl.vertexAttribDivisor(4,1);
		gl.vertexAttribDivisor(5,1);

		let glBufferIndex: WebGLBuffer = null;
		let vertexCount = (vertices.length/3)|0;
		if (index!==void 0) {
			glBufferIndex = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBufferIndex);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
			vertexCount = index.length;
		}
		gl.bindVertexArray(null);

		return {
			vao,
			geometryBuffer: glGeometryBuffer,
			uvBuffer: glUVBuffer,
			indexBuffer: glBufferIndex,
			indexedGeometry: glBufferIndex!==null,
			instanceBuffer: glInstancedModelTransformBuffer,
			vertexCount: vertexCount,
			instanceCount: instanceCount,
		};
	}

	render(e: Engine, info: ShaderVAOInfo) {

		const gl = e.gl;

		this.use();
		this.setMatrix4fv("uProjection", false, e.projectionMatrix());
		e.getTexture("texture0").enableAsUnit(gl, 0);
		this.set1I("uTextureSampler", 0);
		this.setMatrix4fv("uModelView", false, e.cameraMatrix());

		gl.bindVertexArray(info.vao);

		if (info.indexedGeometry) {
			gl.drawElementsInstanced(gl.TRIANGLES, info.vertexCount, gl.UNSIGNED_SHORT, 0, info.instanceCount);
		} else {
			gl.drawArraysInstanced(gl.TRIANGLES, 0, info.vertexCount, info.instanceCount);
		}

		gl.bindVertexArray(null);
		this.notUse();
	}
}