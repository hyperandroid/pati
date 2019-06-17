import RenderComponent from "../RenderComponent";
import Engine from "../Engine";
import SkyboxShader from "../shader/SkyboxShader";
import {ShaderVAOInfo} from "../shader/Shader";


export default class Skybox implements RenderComponent {

	private readonly vao: ShaderVAOInfo;

	constructor(e: Engine) {
		// this.vao = e.getShader("skybox").createVAO(e.gl, );
	}

	render(e: Engine) {
		const gl = e.gl;

		e.getShader("skybox").render(e, this.vao);
	}

	renderInstanced(e: Engine, locals: Float32Array, numInstances: number) {
		throw new Error("Skybox can't be instanced");
	}
}