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
		Platform.initialize(w, h);

		const gl = Platform.glContext;
		this.gl = gl;

		this.width = w;
		this.height = h;

		this.perspective = Matrix4.perspective(this.perspective, 180, w / h, .01, 1000);

		this.shader["null"] = new NullShader(gl);
		this.shader["texture"] = new TextureShader(gl);
		this.mesh["tri"] = Mesh.from(gl, [1, 0, -5, 0, 2, -5, -1, 0, -5], [0, 0, 1, 0, 0.5, 1]);
		this.mesh["cube"] = Mesh.from(gl,
			[
				1, -1, -1,
				-1, -1, -1,
				-1, -1, 1,
				1, -1, 1,
				1, 1, -1,
				-1, 1, -1,
				-1, 1, 1,
				1, 1, 1
			],
			[
				0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0,
				0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1,
				0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1,
				0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1,
				0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1,
				0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1
			],
			[
				0, 2, 1, 3, 2, 0,
				3, 0, 4, 7, 3, 4,
				0, 1, 5, 4, 0, 5,
				1, 2, 6, 5, 1, 6,
				2, 3, 7, 6, 2, 7,
				4, 5, 6, 7, 4, 6
			]);

		Matrix4.lookAt(
			this.camera,
			new Float32Array([0, 0, 3]),
			new Float32Array([0, 0, 0]),
			new Float32Array([0, 1, 0]));

		this.initializeGraphics();
	}

	addTexture(name: string, t: Texture) {
		this.texture[name] = t;
	}

	private initializeGraphics() {
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.CULL_FACE);
		this.gl.clearColor(0,0,0,1);
	}

	render(delta: number) {

		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		this.texture["texture0"].enableAsUnit(this.gl, 0);

		this.gl.viewport(0, 0, this.width, this.height);

		const ns = this.shader["texture"];
		ns.use();
		ns.setMatrix4fv("uProjection", false, this.perspective);
		ns.set1I("uTextureSampler", 0);

		const cube = this.mesh["cube"];

		ns.setMatrix4fv("uModelView", false, this.camera);
		ns.setMatrix4fv("uModel", false, cube.transformMatrix());

		cube.render(this.gl);
		const t = (this.time%5000)/2500.0*Math.PI;
		const t7 = (this.time%35000)/17500.0*Math.PI;
		cube.euler(t, t7, 0);

		this.time += delta;
	}
}