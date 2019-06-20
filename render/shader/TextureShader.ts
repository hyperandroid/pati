import Shader, {ShaderVAOInfo} from "./Shader";
import Matrix4 from "../../math/Matrix4";
import Engine from "../Engine";
import Material from "../Material";
import RenderComponent from "../RenderComponent";

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

	createVAO(gl: WebGL2RenderingContext, vertices: Float32Array, uv: Float32Array, index: Uint16Array, material: Material, instanceCount?: number) : ShaderVAOInfo {

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		for(let i = 0; i < 5; i++) {
			gl.enableVertexAttribArray(i);
		}

		const glGeometryBuffer = Shader.createAttributeInfo(gl, 0, new Float32Array(vertices), 12, 0);
		const glUVBuffer = Shader.createAttributeInfo(gl, 1, new Float32Array(uv), 8, 0);
		const glInstancedModelTransformBuffer = Shader.createInstancedModelMatrix(gl, instanceCount || 1, 2);

		let glBufferIndex: WebGLBuffer = null;
		let vertexCount = (vertices.length/3)|0;
		if (index!==null) {
			glBufferIndex = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBufferIndex);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
			vertexCount = index.length;
		}

		gl.bindVertexArray(null);

		return {
			shader: this,
			vao,
			geometryBuffer: glGeometryBuffer,
			uvBuffer: glUVBuffer,
			indexBuffer: glBufferIndex,
			instanceBuffer: glInstancedModelTransformBuffer,
			vertexCount: vertexCount,
			instanceCount: instanceCount,
			normalBuffer: null,
		};
	}

	render(e: Engine, info: ShaderVAOInfo, rc: RenderComponent) {

		const gl = e.gl;

		this.use();
		this.setMatrix4fv("uProjection", false, e.projectionMatrix());
		rc.getMaterial().definition.diffuse.enableAsUnit(gl, 0);
		this.set1I("uTextureSampler", 0);
		this.setMatrix4fv("uModelView", false, e.cameraMatrix());

		gl.bindVertexArray(info.vao);

		if (info.indexBuffer!==null) {
			gl.drawElementsInstanced(gl.TRIANGLES, info.vertexCount, gl.UNSIGNED_SHORT, 0, info.instanceCount);
		} else {
			gl.drawArraysInstanced(gl.TRIANGLES, 0, info.vertexCount, info.instanceCount);
		}

		gl.bindVertexArray(null);
		this.notUse();
	}
}