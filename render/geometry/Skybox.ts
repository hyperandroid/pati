import RenderComponent from "../RenderComponent";
import Engine from "../Engine";


export default class Skybox implements RenderComponent {

	private vao: WebGLVertexArrayObject = null;

	constructor(gl) {
		this.initialize(gl);
	}

	private initialize(gl: WebGL2RenderingContext) {

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
			// -1.0, 1.0, -1.0,
			// -1.0, -1.0, -1.0,
			// 1.0, -1.0, -1.0,
			//
			// 1.0, -1.0, -1.0,
			// 1.0, 1.0, -1.0,
			// -1.0, 1.0, -1.0,
			//
			// -1.0, -1.0, 1.0,
			// -1.0, -1.0, -1.0,
			// -1.0, 1.0, -1.0,
			// -1.0, 1.0, -1.0,
			// -1.0, 1.0, 1.0,
			// -1.0, -1.0, 1.0,
			//
			// 1.0, -1.0, -1.0,
			// 1.0, -1.0, 1.0,
			// 1.0, 1.0, 1.0,
			// 1.0, 1.0, 1.0,
			// 1.0, 1.0, -1.0,
			// 1.0, -1.0, -1.0,
			//
			// -1.0, -1.0, 1.0,
			// -1.0, 1.0, 1.0,
			// 1.0, 1.0, 1.0,
			// 1.0, 1.0, 1.0,
			// 1.0, -1.0, 1.0,
			// -1.0, -1.0, 1.0,
			//
			// -1.0, 1.0, -1.0,
			// 1.0, 1.0, -1.0,
			// 1.0, 1.0, 1.0,
			// 1.0, 1.0, 1.0,
			// -1.0, 1.0, 1.0,
			// -1.0, 1.0, -1.0,
			//
			// -1.0, -1.0, -1.0,
			// -1.0, -1.0, 1.0,
			// 1.0, -1.0, -1.0,
			// 1.0, -1.0, -1.0,
			// -1.0, -1.0, 1.0,
			// 1.0, -1.0, 1.0
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
		gl.vertexAttribDivisor(0,0);

		gl.bindVertexArray(null);

		this.vao = vao;
	}

	render(e: Engine) {
		const gl = e.gl;

		const shader = e.getShader("skybox");
		shader.use();
		shader.setMatrix4fv("uProjection", false, e.projectionMatrix());
		shader.setMatrix4fv("uView", false, e.viewMatrix());

		e.getTexture("cubemap").enableAsUnit(gl, 0);
		shader.set1I("uSampler", 0);

		gl.depthFunc(gl.LEQUAL);

		gl.bindVertexArray(this.vao);
		// gl.drawArrays(gl.TRIANGLES, 0, 36);
		gl.cullFace(gl.FRONT);
		gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
		gl.cullFace(gl.BACK);
		gl.bindVertexArray(null);
		gl.depthFunc(gl.LESS);

		shader.notUse();
	}

	renderInstanced(e: Engine, locals: Float32Array, numInstances: number) {
		//
	}
}