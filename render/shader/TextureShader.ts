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
				layout(location = 2) in mat4 uModel;
				
				uniform mat4 uProjection;
				uniform mat4 uModelView;
				
				out vec2 texturePos;

				void main() {
					gl_Position = uProjection * uModelView * uModel * vec4(aPosition, 1.0);
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
			attributes : ["aPosition"],
			uniforms: ["uProjection", "uModelView"]
		});

		this.setMatrix4fv("uProjection", false, Matrix4.create());
		this.setMatrix4fv("uModelView", false, Matrix4.create());
	}
}