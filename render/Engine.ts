import Platform from "../platform/Platform";
import Shader from "./shader/Shader";
import NullShader from "./shader/NullShader";
import Mesh from "./Mesh";
import Matrix4 from "../math/Matrix4";
import Texture from "./Texture";
import TextureShader from "./shader/TextureShader";

export default class Engine {

	private readonly width: number;
	private readonly height: number;

	private readonly gl: WebGL2RenderingContext;
	private shader : {[key: string]:Shader} = {};
	private mesh: {[key: string]:Mesh} = {};
	private texture: {[key: string]:Texture} = {};

	private readonly perspective = Matrix4.create();
	private readonly camera = Matrix4.create();

	private time = 0;

	constructor(w: number, h: number) {
		Platform.initialize(w,h);

		const gl = Platform.glContext;
		this.gl = gl;

		this.width = w;
		this.height = h;

		this.perspective = Matrix4.perspective(this.perspective, 90, w/h, .01, 1000);

		this.shader["null"] = new NullShader(gl);
		this.shader["texture"] = new TextureShader(gl);
		this.mesh["tri"] = Mesh.from(gl, [1,0,-5, 0,2,-5, -1,0,-5], [0,0, 1,0, 0.5,1]);
		this.mesh["tri2"] = Mesh.from(gl, [3,0,-5, 4,0,-8, 5,0,-5], [0,0, 1,0, 0.5,1]);
	}

	addTexture(name: string, t: Texture) {
		this.texture[name] = t;
	}

	render(delta: number) {

		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.clearColor(0,0,0,1);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		this.texture["texture0"].enableAsUnit(this.gl, 0);

		this.gl.viewport(0, 0, this.width, this.height);

		const ns = this.shader["texture"];
		ns.use();
		ns.setMatrix4fv("uProjection", false, this.perspective);
		ns.set1I("uTextureSampler", 0);

		// mesh around the camera a bit
		const t = (this.time%5000)/2500.0*Math.PI;
		Matrix4.lookAt(
			this.camera,
			new Float32Array([0,2*Math.sin(t),5+2*Math.cos(t)]),
			new Float32Array([0,0,0]),
			new Float32Array([0,1,0]));

		ns.setMatrix4fv("uModelView", false, this.camera);

		this.mesh["tri"].render(this.gl);
		this.mesh["tri2"].render(this.gl);

		this.time += delta;
	}
}