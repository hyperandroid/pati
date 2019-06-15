import Shader from "./Shader";

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
}