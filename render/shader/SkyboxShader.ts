import Shader, {ShaderVAOInfo} from "./Shader";
import Engine from "../Engine";

/**
 * Skybox shader which draws a cubemap onto a cube.
 * The cube keeps always on the same position, regardless the camera position. Hence, we get from the camera matrix just
 * information regarding transformation, and not translation.
 *
 * This shader is expected to run the last thing on the renderer. This will speed things up a log, since no extra pixel
 * overdraw will be performed.
 * To do so, we trick gl_Position and duplicate position.w onto position.z. Thus the projection phase will just make z = 1.
 * We thus trick the depth buffer to think the cube is z=1, maximum depth. This will make the depth test fail should any
 * other object has been written to the same pixel.
 * So the skybox will only render on pixels where there's no previous object. It will also fill depth to maximum value of 1.
 *
 * We also need to change the depth function to GL_LEQUAL from GL_EQUAL.
 */
export default class SkyboxShader extends Shader {

	constructor(gl: WebGL2RenderingContext) {
		super({
			gl,
			vertex: `#version 300 es
			
				precision mediump float;
				
				layout (location = 0) in vec3 aPosition;
				
				out vec3 vTexCoords;
				
				uniform mat4 uProjection;
				uniform mat4 uView;
				
				void main() {
					vTexCoords = aPosition;
					vec4 pos = uProjection * uView * vec4(aPosition, 1.0);
					gl_Position = pos.xyww;
				}
			`,
			fragment: `#version 300 es
			
				precision mediump float;
				
				in vec3 vTexCoords;
				out vec4 color;
				
				uniform samplerCube uSampler;
				
				void main() {
					color = texture(uSampler, vTexCoords);
				}
			`,
			uniforms: ['uProjection', 'uView', 'uSampler'],
			attributes: ['aPosition']
		})
	}

	static createVAO(gl: WebGL2RenderingContext) : ShaderVAOInfo {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		gl.enableVertexAttribArray(0);

		const glVerticesBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, glVerticesBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
			1.0, -1.0, -1.0,
			-1.0, -1.0, -1.0,
			-1.0, -1.0, 1.0,
			1.0, -1.0, 1.0,
			1.0, 1.0, -1.0,
			-1.0, 1.0, -1.0,
			-1.0, 1.0, 1.0,
			1.0, 1.0, 1.0,
		]), gl.STATIC_DRAW);

		const glIndexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glIndexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
			2, 1, 0, 3, 2, 0,
			3, 0, 4, 7, 3, 4,
			0, 1, 5, 4, 0, 5,
			1, 2, 6, 5, 1, 6,
			2, 3, 7, 6, 2, 7,
			4, 5, 6, 7, 4, 6,
		]), gl.STATIC_DRAW);

		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 12, 0);
		gl.vertexAttribDivisor(0, 0);

		gl.bindVertexArray(null);

		return {
			vao,
			geometryBuffer: glVerticesBuffer,
			vertexCount: 36,
			indexBuffer: glIndexBuffer,
			indexedGeometry: true,
			uvBuffer: null,
			instanceBuffer: null,
			instanceCount: 1
		}
	}

	render(e: Engine, info: ShaderVAOInfo) {

		const gl = e.gl;

		this.use();
		this.setMatrix4fv("uProjection", false, e.projectionMatrix());
		this.setMatrix4fv("uView", false, e.viewMatrix());

		e.getTexture("cubemap").enableAsUnit(gl, 0);
		this.set1I("uSampler", 0);

		gl.depthFunc(gl.LEQUAL);	// trick depth
		gl.bindVertexArray(info.vao);

		// invert cube normals to see from the inside. (we are inside the skybox)
		gl.cullFace(gl.FRONT);
		gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
		gl.cullFace(gl.BACK);
		gl.bindVertexArray(null);
		gl.depthFunc(gl.LESS);

		this.notUse();
	}
}