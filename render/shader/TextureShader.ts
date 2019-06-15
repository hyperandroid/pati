import Shader from "./Shader";
import Matrix4 from "../../math/Matrix4";

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
		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
		gl.enableVertexAttribArray(2);
		gl.enableVertexAttribArray(3);
		gl.enableVertexAttribArray(4);
		gl.enableVertexAttribArray(5);
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
}