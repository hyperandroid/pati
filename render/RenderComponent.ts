import Engine from "./Engine";

export default interface RenderComponent {

	render(e: Engine);
	renderInstanced(e: Engine, locals: Float32Array, numInstances: number)
}