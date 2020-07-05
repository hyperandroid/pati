import Engine from "./Engine";
import Material from "./Material";

export default interface RenderComponent {

	getMatrix(): Float32Array;
	getMaterial() : Material;
	render(e: Engine);
	renderInstanced(e: Engine, locals: Float32Array, numInstances: number)
	getPosition(): Float32Array;

	dispose(gl: WebGLRenderingContext);
}