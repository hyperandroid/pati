import Shader, {ShaderVAOInfo} from "./Shader";
import Engine from "../Engine";
import Material from "../Material";

export class EnvironmentMapShader extends Shader {

	constructor(gl: WebGL2RenderingContext) {
		super({
			gl,
			vertex : `#version 300 es
			
				precision mediump float;
				
				layout (location = 0) in vec3 aPosition;
				layout (location = 1) in vec3 aNormal;
				layout (location = 2) in mat4 aModel;
				
				uniform mat4 uProjection;
				uniform mat4 uModelView;
				
				out vec3 vNormal;
				out vec3 vModelPosition;
				
				void main() {					
					vModelPosition = vec3(aModel * vec4(aPosition, 1.0));
					vNormal = mat3(transpose(inverse(aModel)))*aNormal;
					gl_Position = uProjection * uModelView * aModel * vec4(aPosition, 1.0);
				}
			`,
			fragment: `#version 300 es
			
				precision mediump float;
				
				uniform samplerCube uSkybox;
				uniform vec3 uCameraPos;
				
				in vec3 vNormal;
				in vec3 vModelPosition;
				
				out vec4 color;
				
				void main() {
					vec3 I = normalize(vModelPosition-uCameraPos);
					vec3 R = reflect(I, normalize(vNormal));
					
					color = texture(uSkybox, R);
				}
			`,
			uniforms: ['uProjection', 'uModelView', 'uSkybox', 'uCameraPos'],
			attributes: ['aPosition', 'aNormal', 'aModel']
		});
	}

	render(e: Engine, info: ShaderVAOInfo) {
		const gl = e.gl;

		this.use();
		this.setMatrix4fv("uProjection", false, e.projectionMatrix());
		e.getTexture("cubemap").enableAsUnit(gl, 0);
		this.set1I("uSkybox", 0);
		this.setMatrix4fv("uModelView", false, e.cameraMatrix());
		const cameraPos = e.cameraPosition();
		this.set3F("uCameraPos", cameraPos[0], cameraPos[1], cameraPos[2]);

		gl.bindVertexArray(info.vao);

		if (info.indexBuffer !== null) {
			gl.drawElementsInstanced(gl.TRIANGLES, info.vertexCount, gl.UNSIGNED_SHORT, 0, info.instanceCount);
		} else {
			gl.drawArraysInstanced(gl.TRIANGLES, 0, info.vertexCount, info.instanceCount);
		}

		gl.bindVertexArray(null);
		this.notUse();
	}

	createVAO(gl: WebGL2RenderingContext, vertices: Float32Array, normal: Float32Array, index: Uint16Array, material: Material, instanceCount: number) : ShaderVAOInfo {

		instanceCount = instanceCount || 1;

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		for(let i = 0; i < 5; i++) {
			gl.enableVertexAttribArray(i);
		}

		const glGeometryBuffer = Shader.createAttributeInfo(gl, 0, vertices, 12, 0);
		const glNormalBuffer = Shader.createAttributeInfo(gl, 1, normal, 12, 0);
		const glInstancedModelMatrixBuffer = Shader.createInstancedModelMatrix(gl, instanceCount, 2);
		let glBufferIndex: WebGLBuffer = null;
		let vertexCount = (vertices.length/3)|0;
		if (index!==null) {
			glBufferIndex = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBufferIndex);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
			vertexCount = index.length;
		}

		// restore null vao
		gl.bindVertexArray(null);

		return {
			shader: this,
			vao,
			geometryBuffer: glGeometryBuffer,
			normalBuffer: glNormalBuffer,
			instanceBuffer: glInstancedModelMatrixBuffer,
			instanceCount: instanceCount,
			indexBuffer: glBufferIndex,
			vertexCount,
			uvBuffer: null,
		};
	}
}