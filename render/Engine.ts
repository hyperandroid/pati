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
import Surface from "./Surface";
import Mesh from "./Mesh";

const N = 64;

export default class Engine {

	renderWidth: number;
	renderHeight: number;

	readonly gl: WebGL2RenderingContext;
	private shader : {[key: string]:Shader} = {};
	private mesh: {[key: string]:RenderComponent} = {};
	private texture: {[key: string]:Texture} = {};
	private surface: {[key: string]:Surface} = {};
	private camera: {[key: string]:Camera} = {};

	private perspective = Matrix4.create();
	private currentCamera: Camera;

	private time = 0;

	private matrices = new Float32Array(16*N*N);
	private matrix = Matrix4.create();
	private position = Vector3.create();
	private rotation= Vector3.create();
	private scale = Vector3.createFromCoords(1,1,1);

	constructor(w: number, h: number) {
		Platform.initialize(w, h);

		this.gl = Platform.glContext;

		this.resize(w, h, true);
	}

	init() {
		const gl = this.gl;

		this.currentCamera = new Camera();
		this.camera["camera0"] = this.currentCamera;
		this.camera["camera1"] = new Camera().setup(
				new Float32Array([0, 0, 2]),
				new Float32Array([0, 0, -1]),
				new Float32Array([0, 1, 0]));

		this.shader["null"] = new NullShader(gl);
		this.shader["texture"] = new TextureShader(gl);
		this.shader["skybox"] = new SkyboxShader(gl);
		this.shader["reflectiveEnvMap"] = new EnvironmentMapShader(gl);
		this.shader["refractiveEnvMap"] = new EnvironmentMapShader(gl, true);

		this.surface["surface0"] = new Surface(this, {
			width: 1024,
			height: 1024,
			attachments: [
				{
					renderBufferTarget: gl.DEPTH_STENCIL_ATTACHMENT,
					renderBufferInternalFormat: gl.DEPTH24_STENCIL8
				},
				{
					renderBufferTarget: gl.COLOR_ATTACHMENT0,
					textureDefinition: {
						width: 512,
						height: 512,
					}
				}
			]
		});

		this.mesh["cube2"] = new Cube(this, Material.Texture(this.getTexture("texture0")), false);

		this.mesh["cube"] = new Cube(this, Material.Texture(this.surface["surface0"].texture), false, N*N);
		this.mesh["skybox"] = new Cube(this, Material.Skybox(this.getTexture("cubemap")), true);

		this.currentCamera.setup(
			new Float32Array([0, 25, -10]),
			new Float32Array([0, 0, -20]),
			new Float32Array([0, 1, 0]));

		this.initializeGraphics();
	}

	resize(w: number, h: number, force?: boolean) {
		if (force || Platform.canvas.width!==w || Platform.canvas.height!==h) {
			Platform.canvas.width = w;
			Platform.canvas.height = h;
			this.renderSurfaceSize(w, h);
		}
	}

	renderSurfaceSize(w: number, h: number) {
		this.renderWidth = w;
		this.renderHeight = h;
		this.perspective = Matrix4.perspective(this.perspective, 70 * Math.PI / 180, w / h, .01, 1000);
		this.gl.viewport(0,0,w,h);
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
		return this.currentCamera.matrix;
	}

	cameraPosition() : Float32Array {
		return this.currentCamera.position;
	}

	viewMatrix() : Float32Array {
		return this.currentCamera.viewMatrix;
	}

	private initializeGraphics() {
		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.enable(this.gl.CULL_FACE);
		this.gl.clearColor(0,0,0,1);
	}

	render(delta: number) {

		this.surface["surface0"].enableAsTextureTarget(this);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.currentCamera = this.camera["camera1"];
		this.currentCamera.sync();
		const u = this.time/1777;
		Vector3.set(this.currentCamera.position,
			3*Math.sin(u),
			Math.sin(u)/3,
			3*Math.cos(u));
		this.currentCamera.lookAt(-this.currentCamera.position[0],0,-this.currentCamera.position[2]);
		this.mesh["cube2"].render(this);
		this.mesh["skybox"].render(this);

		this.surface["surface0"].disableAsTextureTarget(this);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		this.currentCamera = this.camera["camera0"];
		this.currentCamera.sync();
		this.updateInstancingMatrices();
		this.mesh["cube"].renderInstanced(this, this.matrices, N*N);
		this.mesh["skybox"].render(this);

		this.time += delta;
	}

	private updateInstancingMatrices() {
		for (let i = 0; i < N * N; i++) {
			const row = (i / N) | 0;
			const col = i % N;

			const tt = 125000;
			const t = ((this.time % tt)) / (tt / 2) * Math.PI;
			Vector3.set(this.position, (col - ((N - 1) / 2)) * 3, 30 * Math.sin(2 * Math.PI / N * col + t) * Math.cos(2 * Math.PI / N * row + t), -row * 3);
			Vector3.set(this.rotation, t, 2*t*(i%2?1:-1), 0);
			Vector3.set(this.scale, 2, 2, 2);
			this.matrices.set(
				Matrix4.modelMatrix(
					this.matrix,
					this.position,
					this.rotation,
					this.scale),
				i * 16);
		}
	}

	mouseEvent(pixelsIncrementX: number,pixelsIncrementY: number) {
		this.camera["camera0"].anglesFrom(pixelsIncrementX,pixelsIncrementY);
	}

	keyboardEvent(key: string, down: boolean) {
		const c = this.camera["camera0"];
		switch(key) {
			case 'w':
				c.advanceAmount = down ? 1 : 0;
				break;
			case 's':
				c.advanceAmount = down ? -1 : 0;
				break;
			case 'a':
				c.strafeAmount = down ? -1 : 0;
				break;
			case 'd':
				c.strafeAmount = down ? 1 : 0;
				break;
			case 'q':
				c.upAmount = down ? -1 : 0;
				break;
			case 'z':
				c.upAmount = down ? 1 : 0;
				break;
		}
	}

}