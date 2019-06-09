import Shader from "./Shader";
import Matrix4 from "../../math/Matrix4";

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

				void main() {
					gl_Position = uProjection * uModelView * vec4(aPosition, 1.0);
				}
			`,
			fragment: `#version 300 es
				
				precision mediump float; 
				
				out vec4 color;

				void main() {
					color = vec4(1.0, 0.0, 1.0, 1.0);
				}
			`,
			attributes : ["aPosition"],
			uniforms: ["uProjection", "uModelView"]
		});

		this.setMatrix4fv("uProjection", false, Matrix4.create());
		this.setMatrix4fv("uModelView", false, Matrix4.create());
	}
}