import Platform from "../platform/Platform";
import Shader from "./shader/Shader";
import NullShader from "./shader/NullShader";
import Matrix4 from "../math/Matrix4";
import Texture from "./Texture";
import TextureShader from "./shader/TextureShader";
import Vector3 from "../math/Vector3";
import Camera from "./Camera";
import SkyboxShader from "./shader/SkyboxShader";
import {Cube} from "./geometry/Cube";
import RenderComponent from "./RenderComponent";
import {EnvironmentMapShader} from "./shader/EnvironmentMapShader";
import Material from "./Material";

const N = 64;

export default class Engine {

	private width: number;
	private height: number;

	readonly gl: WebGL2RenderingContext;
	private shader : {[key: string]:Shader} = {};
	private mesh: {[key: string]:RenderComponent} = {};
	private texture: {[key: string]:Texture} = {};

	private perspective = Matrix4.create();
	private readonly camera = new Camera();

	private time = 0;

	private matrices = new Float32Array(16*N*N);
	private matrix = Matrix4.create();
	private position = Vector3.create();
	private rotation= Vector3.create();
	private scale = Vector3.createFromCoords(1,1,1);

	constructor(w: number, h: number) {
		Platform.initialize(w, h);

		this.gl = Platform.glContext;

		this.resize(w, h);
	}

	init() {
		const gl = this.gl;

		this.shader["null"] = new NullShader(gl);
		this.shader["texture"] = new TextureShader(gl);
		this.shader["skybox"] = new SkyboxShader(gl);
		this.shader["reflectiveEnvMap"] = new EnvironmentMapShader(gl);
		this.shader["refractiveEnvMap"] = new EnvironmentMapShader(gl, true);

		this.mesh["cube"] = new Cube(this, Material.Refractive(this.getTexture("cubemap")), false, N*N);
		this.mesh["skybox"] = new Cube(this, Material.Skybox(this.getTexture("cubemap")), true);

		this.camera.setup(
			new Float32Array([0, 25, -10]),
			new Float32Array([0, 0, -20]),
			new Float32Array([0, 1, 0]));

		this.initializeGraphics();

		for(let i = 0; i < N*N; i++ ) {
			const row = (i/N)|0;
			const col = i%N;

			const tt = 5000;
			const t = ((this.time%tt))/(tt/2)*Math.PI;
			Vector3.set(this.position, (col-((N-1)/2))*3, 30*Math.sin(2*Math.PI/N*col + t)*Math.cos(2*Math.PI/N*row + t), -row*3);
			// Vector3.set(this.rotation, t, 2*t*(i%2?1:-1), 0);
			// Vector3.set(this.rotation, Math.random()*2*Math.PI, Math.random()*Math.PI, 0);
			Vector3.set(this.scale, 2,2,2);
			this.matrices.set(
				Matrix4.modelMatrix(
					this.matrix,
					this.position,
					this.rotation,
					this.scale),
				i*16);
		}

	}

	resize(w: number, h: number) {
		if (this.width!==w || this.height!==h) {
			this.width = w;
			this.height = h;
			this.perspective = Matrix4.perspective(this.perspective, 70 * Math.PI / 180, w / h, .01, 1000);
			Platform.canvas.width = w;
			Platform.canvas.height = h;
		}
	}

	getShader(s: string) : Shader {
		return this.shader[s];
	}

	getTexture(s: string) : Texture {
		return this.texture[s];
	}

	addTexture(name: string, t: Texture) {
		this.texture[name] = t;
	}

	projectionMatrix() : Float32Array {
		return this.perspective;
	}

	cameraMatrix() : Float32Array {
		return this.camera.matrix;
	}

	cameraPosition() : Float32Array {
		return this.camera.position;
	}

	viewMatrix() : Float32Array {
		return this.camera.viewMatrix;
	}

	private initializeGraphics() {
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.CULL_FACE);
		this.gl.clearColor(0,0,0,1);
	}

	render(delta: number) {

		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

		this.gl.viewport(0, 0, this.width, this.height);
		this.camera.lookAt();

		this.mesh["cube"].renderInstanced(this, this.matrices, N*N);
		this.mesh["skybox"].render(this);

		this.time += delta;
	}

	mouseEvent(pixelsIncrementX: number,pixelsIncrementY: number) {
		this.camera.anglesFrom(pixelsIncrementX,pixelsIncrementY);
	}

	keyboardEvent(key: string, down: boolean) {
		switch(key) {
			case 'w':
				this.camera.advanceAmount = down ? 1 : 0;
				break;
			case 's':
				this.camera.advanceAmount = down ? -1 : 0;
				break;
			case 'a':
				this.camera.strafeAmount = down ? -1 : 0;
				break;
			case 'd':
				this.camera.strafeAmount = down ? 1 : 0;
				break;
			case 'q':
				this.camera.upAmount = down ? -1 : 0;
				break;
			case 'z':
				this.camera.upAmount = down ? 1 : 0;
				break;
		}
	}

}