import Shader, {ShaderVAOInfo} from "./Shader";
import Engine from "../Engine";

export class EnvironmentMapShader extends Shader {

	constructor(gl: WebGL2RenderingContext) {
		super({
			gl,
			vertex : `#version 300 es
			
				precision mediump float;
				
				layout (location = 0) in vec3 aPosition;
				layout (location = 1) in mat4 aModel;
				layout (location = 5) in vec3 aNormal;
				
				uniform mat4 uProjection;
				uniform mat4 uModelView;
				
				out vec3 vNormal;
				out vec3 vModelPosition;
				
				void main() {
					vec4 modelPosition = aModel * vec4(aPosition, 1.0);
					gl_Position = uProjection * uModelView * modelPosition;
					
					vModelPosition = vec3(modelPosition.xyz);
					vNormal = mat3(transpose(inverse(aModel)))*aNormal;
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
	}
}