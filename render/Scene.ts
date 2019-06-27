import Engine from "./Engine";
import Camera from "./Camera";
import Mesh from "./Mesh";
import Light from "./Light";


export default class Scene {

	camera: { [key: string]: Camera } = {};
	light: { [key: string]: Light } = {};
	mesh: { [key: string]: Mesh } = {};

	currentCamera: Camera = null;

	addCamera(name: string, c: Camera) {
		this.camera[name] = c;
	}

	addLight(l: Light) {

	}

	render(e: Engine, delta: number) {

	}
}