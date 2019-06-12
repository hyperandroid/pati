import Platform from "../platform/Platform";
import Shader from "./shader/Shader";
import NullShader from "./shader/NullShader";
import Mesh from "./Mesh";
import Matrix4 from "../math/Matrix4";
import Texture from "./Texture";
import TextureShader from "./shader/TextureShader";
import Vector3 from "../math/Vector3";

const N = 128;

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

	private matrices = new Float32Array(16*N*N);
	private matrix = Matrix4.create();
	private position = Vector3.create();
	private rotation= Vector3.create();
	private scale = Vector3.createFromCoords(1,1,1);

	constructor(w: number, h: number) {
		Platform.initialize(w, h);

		const gl = Platform.glContext;
		this.gl = gl;

		this.width = w;
		this.height = h;

		this.perspective = Matrix4.perspective(this.perspective, 70*Math.PI/180, w / h, .01, 1000);

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
				1, 1, 1,
			],
			[
				0, 0, 1, 1, 0,1, 1,0, 0,1, 1,0, 0,0, 1,1
			],
			[
				2, 1, 0, 3, 2, 0,
				3, 0, 4, 7, 3, 4,
				0, 1, 5, 4, 0, 5,
				1, 2, 6, 5, 1, 6,
				2, 3, 7, 6, 2, 7,
				4, 5, 6, 7, 4, 6,
			]);

		Matrix4.lookAt(
			this.camera,
			new Float32Array([0, 25, 27]),
			new Float32Array([0, 0, -20]),
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

		for(let i = 0; i < N*N; i++ ) {
			const row = (i/N)|0;
			const col = i%N;

			const tt = 5000;
			const t = ((this.time%tt))/(tt/2)*Math.PI;
			Vector3.set(this.position, (col-((N-1)/2))*3, 10*Math.sin(2*Math.PI/N*col + t)*Math.cos(2*Math.PI/N*row + t), -row*3);
			Vector3.set(this.rotation, t, 2*t*(i%2?1:-1), 0);
			this.matrices.set(
				Matrix4.modelMatrix(
					this.matrix,
					this.position,
					this.rotation,
					this.scale),
				i*16);
		}

		const angle = ((this.time%20000))/10000*Math.PI;
		Matrix4.lookAt(
			this.camera,
			new Float32Array([30*Math.cos(angle), 25+8*Math.sin(angle), 30*Math.sin(angle)]),
			new Float32Array([0, 0, -20]),
			new Float32Array([0, 1, 0]));

		cube.renderInstanced(this.gl, this.matrices, N*N);

		this.time += delta;
	}
}