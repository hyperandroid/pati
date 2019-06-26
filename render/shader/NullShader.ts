import Shader, {ShaderVAOInfo, VAOGeometryInfo} from "./Shader";
import Matrix4 from "../../math/Matrix4";
import Engine from "../Engine";
import Material from "../Material";
import RenderComponent from "../RenderComponent";

/**
 * just draw geometry in a plain pink color
 */
export default class NullShader extends Shader {

	constructor(gl: WebGL2RenderingContext) {
		super({
			gl,
			vertex : `#version 300 es
				
				precision mediump float;

				layout(location = 0) in vec3 aPosition;
				
				uniform mat4 uProjection;
				uniform mat4 uModelView;
				uniform mat4 uModelTransform;

				void main() {
					gl_Position = uProjection * uModelView * uModelTransform * vec4(aPosition, 1.0);
				}
			`,
			fragment: `#version 300 es
				
				precision mediump float; 
				
				uniform vec4 uColor;
				
				out vec4 color;

				void main() {
					color = uColor;
				}
			`,
			attributes : ["aPosition"],
			uniforms: ["uProjection", "uModelView", "uModelTransform", "uColor"]
		});

		this.setMatrix4fv("uProjection", false, Matrix4.create());
		this.setMatrix4fv("uModelView", false, Matrix4.create());
	}

	render(e: Engine, info: ShaderVAOInfo, rc: RenderComponent) {
		const gl = e.gl;

		this.use();
		this.setMatrix4fv("uProjection", false, e.projectionMatrix());
		this.setMatrix4fv("uModelView", false, e.cameraMatrix());
		this.setMatrix4fv("uModelTransform", false, rc.getMatrix());
		this.set4FV("uColor", rc.getMaterial().definition.color);

		gl.bindVertexArray(info.vao);

		if (info.indexBuffer !== null) {
			gl.drawElements(gl.TRIANGLES, info.vertexCount, gl.UNSIGNED_SHORT, 0);
		} else {
			gl.drawArrays(gl.TRIANGLES, 0, info.vertexCount);
		}

		gl.bindVertexArray(null);
		this.notUse();
	}

	createVAO(gl: WebGL2RenderingContext, geometryInfo: VAOGeometryInfo, material: Material): ShaderVAOInfo {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		for(let i = 0; i < 1; i++) {
			gl.enableVertexAttribArray(i);
		}

		const instanceCount = geometryInfo.instanceCount || 1;

		const glGeometryBuffer = Shader.createAttributeInfo(gl, 0, geometryInfo.vertex, 12, 0);
		let glBufferIndex: WebGLBuffer = null;
		let vertexCount = (geometryInfo.vertex.length/3)|0;
		if (geometryInfo.index) {
			glBufferIndex = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBufferIndex);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometryInfo.index, gl.STATIC_DRAW);
			vertexCount = geometryInfo.index.length;
		}

		gl.bindVertexArray(null);

		return {
			shader: this,
			vao,
			instanceCount,
			vertexCount,
			geometryBuffer: glGeometryBuffer,
			normalBuffer: null,
			instanceBuffer: null,
			indexBuffer: glBufferIndex,
			uvBuffer: null,
		}
	}
}