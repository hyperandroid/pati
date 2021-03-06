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
import Light, {PointLight} from "./Light";
import Myriahedral, {GeometryInfoIndexed} from "./geometry/Myriahedral";
import {
	CubeGeometry,
	IcosahedronGeometry,
	MyriahedronGeometry,
	OctahedronGeometry,
	TetrahedronGeometry
} from "./geometry/Solids";
import {GraticuleParams, Graticules} from "./geometry/Graticule";

const MaxUnfoldScale = 90;
const N = 64;
let pos = 0;

interface GraticuleData {
	mesh: Mesh;
	myriahedral: Myriahedral;

	outline?: Mesh;
	normals?: Mesh;
	foldPoints?: Mesh;
	foldLines?: Mesh;
	cutPoints?: Mesh;
	cutLines?: Mesh;
}

export default class Engine {

	renderWidth: number;
	renderHeight: number;

	readonly gl: WebGL2RenderingContext;
	private shader : {[key: string]:Shader} = {};
	private texture: {[key: string]:Texture} = {};
	private surface: {[key: string]:Surface} = {};
	private camera: {[key: string]:Camera} = {};
	private mesh: {[key: string]:RenderComponent} = {};
	light: {[key: string]:Light} = {};

	private perspective = Matrix4.create();
	private currentCamera: Camera;

	time = 0;

	private matrices = new Float32Array(16*N*N);
	private matrix = Matrix4.create();
	private position = Vector3.create();
	private rotation= Vector3.create();
	private scale = Vector3.createFromCoords(1,1,1);

	exy = 0;
	exz = 0;
	eyz = 0;

	unfoldScale = 0;
	myriahedral: Myriahedral;

	normals = false;
	cuts = false;
	folds = false;
	outline = false;
	action = 0;

	constructor(w: number, h: number) {
		Platform.initialize(w, h);

		this.gl = Platform.glContext;

		this.resize(w, h, true);

		// ahemhem
		(window as any).engine = this;
	}

	init() {
		const gl = this.gl;

		this.currentCamera = new Camera();

		this.camera["camera0"] = this.currentCamera;

		this.shader["null"] = new NullShader(gl);
		this.shader["texture"] = new TextureShader(gl);
		this.shader["textureNoLight"] = new TextureShader(gl, {});

		this.shader["skybox"] = new SkyboxShader(gl);
		this.shader["reflectiveEnvMap"] = new EnvironmentMapShader(gl);
		this.shader["refractiveEnvMap"] = new EnvironmentMapShader(gl, true);

		this.surface["surface0"] = new Surface(this, {
			width: 256,
			height: 256,
			attachments: [
				{
					renderBufferTarget: gl.DEPTH_STENCIL_ATTACHMENT,
					renderBufferInternalFormat: gl.DEPTH24_STENCIL8
				},
				{
					renderBufferTarget: gl.COLOR_ATTACHMENT0,
					textureDefinition: {
						// default. size will be set as Surface size.
					}
				}
			]
		});

		this.mesh["cube2"] = new Cube(this, Material.Texture(
			this.getTexture("diffuse"),
			this.getTexture("specular"),
			.1,
			32
		), false, N*N);
		this.updateInstancingMatrices();

		this.mesh["lightprobe"] = new Cube(this, Material.Color(new Float32Array([1.0, 0.0, 0.0, 1.0])), false);

		this.mesh["cube"] = new Cube(this,
			Material.Texture(this.surface["surface0"].texture, this.surface["surface0"].texture, .2, 32), false, N*N);
		this.mesh["skybox"] = new Cube(this, Material.Skybox(this.getTexture("cubemap")), true);

		this.buildGraticules();
		this.buildMyriahedrons();
		this.selectGraticule(0);

		this.currentCamera.setup(
			[-116.15988159179688, 6.677720546722412, -5.870321273803711],
			[0.9977958798408508, -0.016972756013274193, 0.06415063887834549],
			[0,1,0]
		);

		this.currentCamera.lookAt(0,0,0);
		this.light["sun"] = Light.Directional({
			ambient: [.1, .1, .1],
			diffuse: [.5, .5, .5],
			specular: [1, 1, 1],
			direction: [0, -1, 1]
		});

		this.light["point"] = Light.Point({
			ambient: [.1, .1, .1],
			diffuse: [1,1,1],
			specular: [1, 1, 1],
			position: [0, 0, -3]
		});

		this.initializeGraphics();

		Platform.canvas.addEventListener("touchend", (e: TouchEvent) => {

			const mult = (e.changedTouches[0].pageX < window.innerWidth/2) ? 1 : -1;
			pos+=.01 * mult;

			this.currentCamera.lookAt(
				30*Math.cos(pos),
				-20,
				30*Math.sin(pos));

			console.log(pos);
		});
	}

	private buildFoldsCutsLines(data: GeometryInfoIndexed, s1: number, s2: number, gd: GraticuleData) {

		const gl = this.gl;

		/*****/
		const centers: number[] = [];
		for (let i = 0; i < data.index.length; i += 3) {

			const v0x = data.vertices[data.index[i] * 3];
			const v0y = data.vertices[data.index[i] * 3 + 1];
			const v0z = data.vertices[data.index[i] * 3 + 2];

			const v1x = data.vertices[data.index[i + 1] * 3];
			const v1y = data.vertices[data.index[i + 1] * 3 + 1];
			const v1z = data.vertices[data.index[i + 1] * 3 + 2];

			const v2x = data.vertices[data.index[i + 2] * 3];
			const v2y = data.vertices[data.index[i + 2] * 3 + 1];
			const v2z = data.vertices[data.index[i + 2] * 3 + 2];

			centers.push((v0x + v1x + v2x) / 3);
			centers.push((v0y + v1y + v2y) / 3);
			centers.push((v0z + v1z + v2z) / 3);
		}
		const indices: number[] = [];
		data.folds.forEach(fold => {
			indices.push(fold.f0);
			indices.push(fold.f1);
		});

		if (this.folds) {
			const mc = Material.Color(new Float32Array([1, 0, 1, 1]));
			mc.renderMode = gl.POINTS;
			gd.foldPoints = new Mesh().from(this, {
				material: mc,
				index: new Uint16Array(indices),
				vertices: new Float32Array(centers),
				cullDisabled: true,
				uv: null,
				normals: null,
			}, 1).setScale(s2);

			const mc2 = Material.Color(new Float32Array([1, 0, 1, 1]));
			mc2.renderMode = gl.LINES;
			gd.foldLines = new Mesh().from(this, {
				material: mc2,
				index: new Uint16Array(indices),
				vertices: new Float32Array(centers),
				cullDisabled: true,
				uv: null,
				normals: null,
			}, 1).setScale(s2);
		}

		/// cuts
		const indicescut: number[] = [];
		data.cuts.forEach((cut) => {
			indicescut.push(cut.vertex0);
			indicescut.push(cut.vertex1);
		});

		if (this.cuts) {
			const mc3 = Material.Color(new Float32Array([0, 1, 1, 1]));
			mc3.renderMode = gl.LINES;
			gd.cutLines = new Mesh().from(this, {
				material: mc3,
				index: new Uint16Array(indicescut),
				vertices: new Float32Array(data.vertices),
				cullDisabled: true,
				uv: null,
				normals: null,
			}, 1).setScale(s2);

			const mc4 = Material.Color(new Float32Array([0, 1, 1, 1]));
			mc4.renderMode = gl.POINTS;
			gd.cutPoints = new Mesh().from(this, {
				material: mc4,
				index: new Uint16Array(indicescut),
				vertices: new Float32Array(data.vertices),
				cullDisabled: true,
				uv: null,
				normals: null,
			}, 1).setScale(s2);
		}
		/*****/

		if (this.normals) {
			/// normals
			const normals: number[] = [];
			const indicesnormals: number[] = [];
			let indexnormals = 0;
			for (let i = 0; i < data.index.length; i += 3) {
				const x0 = data.vertices[data.index[i + 1] * 3] - data.vertices[data.index[i] * 3];
				const y0 = data.vertices[data.index[i + 1] * 3 + 1] - data.vertices[data.index[i] * 3 + 1];
				const z0 = data.vertices[data.index[i + 1] * 3 + 2] - data.vertices[data.index[i] * 3 + 2];

				const x1 = data.vertices[data.index[i + 2] * 3] - data.vertices[data.index[i] * 3];
				const y1 = data.vertices[data.index[i + 2] * 3 + 1] - data.vertices[data.index[i] * 3 + 1];
				const z1 = data.vertices[data.index[i + 2] * 3 + 2] - data.vertices[data.index[i] * 3 + 2];

				const x = y0 * z1 - z0 * y1;
				const y = z0 * x1 - x0 * z1;
				const z = x0 * y1 - y0 * x1;

				let l = Math.sqrt(x * x + y * y + z * z);
				normals.push(x / l, y / l, z / l);
				const f = 1.1;
				normals.push(x / l * f, y / l * f, z / l * f);

				indicesnormals.push(indexnormals++);
				indicesnormals.push(indexnormals++);
			}

			const matnormals = Material.Color(new Float32Array([1, 1, 1, 1]));
			matnormals.renderMode = gl.LINES;
			gd.normals = new Mesh().from(this, {
				material: matnormals,
				index: new Uint16Array(indicesnormals),
				vertices: new Float32Array(normals),
				cullDisabled: true,
				uv: null,
				normals: null,
			}, 1).setScale(s1);
		}
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
		this.perspective = Matrix4.perspective(this.perspective, 70 * Math.PI / 180, w / h, 1, 2000);
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
		this.gl.clearDepth(1.0);

		this.gl.cullFace(this.gl.BACK);
		this.gl.frontFace(this.gl.CCW);

		this.gl.enable(this.gl.BLEND);
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
	}

	render(delta: number) {

		// cubemap ambient
		// this.surface["surface0"].enableAsTextureTarget(this);
		// this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
		//
		// this.mesh["cube2"].render(this);
		// this.mesh["skybox"].render(this);
		//
		// this.surface["surface0"].disableAsTextureTarget(this);

		const gl = this.gl;

		gl.disable(gl.BLEND);

		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT);

		this.currentCamera = this.camera["camera0"];
		this.currentCamera.sync();

		this.updateInstancingMatrices();
		// this.mesh["cube"].renderInstanced(this, this.matrices, N*N);

		const light = this.light['point'] as PointLight;
		light.setPosition(-100,50,40);

		const cg = this.currentGraticule;
		cg.mesh.euler(this.exy, this.exz, this.eyz);
		cg.outline?.euler(this.exy, this.exz, this.eyz);
		cg.normals?.euler(this.exy, this.exz, this.eyz);
		cg.cutLines?.euler(this.exy, this.exz, this.eyz);
		cg.cutPoints?.euler(this.exy, this.exz, this.eyz);
		cg.foldLines?.euler(this.exy, this.exz, this.eyz);
		cg.foldPoints?.euler(this.exy, this.exz, this.eyz);

		cg.mesh.render(this);
		if (this.outline) {
			cg.outline?.render(this);
		}
		if (this.normals) {
			cg.normals?.render(this);
		}
		if (this.cuts) {
			cg.cutLines?.render(this);
			cg.cutPoints?.render(this);
		}
		if (this.folds) {
			cg.foldLines?.render(this);
			cg.foldPoints?.render(this);
		}

		// const moon = this.mesh["moon"];
		// (moon as Mesh).euler(0, (this.time%25000)/25000*2*Math.PI, 0 );
		// moon.render(this);


		// light.setPosition(
		// 	25*Math.cos((this.time%15000)/15000*2*Math.PI),
		// 	5,
		// 	25*Math.sin((this.time%15000)/15000*2*Math.PI));

		(this.mesh["lightprobe"] as Mesh).setPositionV(light.getPosition());
		(this.mesh["lightprobe"] as Mesh).setScale(3);
		(this.mesh["lightprobe"] as Mesh).getMaterial().definition.color.set(light.getDiffuse());
		const lp = this.mesh["lightprobe"];
		lp.render(this);

		this.mesh["skybox"].render(this);
		// const p = light.getPosition();
		// this.currentCamera.lookAt(p[0], -p[1], p[2]);


		// const angle = ((Date.now() % 30000) / 30000)*2*Math.PI;
		// const angle2 = ((Date.now() % 40000) / 40000)*2*Math.PI;
		// const r = 10;
		// Vector3.set(this.currentCamera.position,
		// 	0,Math.sin(angle)*3.5 + 5,0);
		// this.currentCamera.lookAt(
		// 	r*Math.cos(angle),Math.sin(angle2)*3.5 + 5,r*Math.sin(angle)		// from
		// );
		// this.currentCamera.sync();

		this.time += delta;
	}

	private updateInstancingMatrices() {

		for (let i = 0; i < N * N; i++) {
			const row = (i / N) | 0;
			const col = i % N;

			const tt = 15000;
			const t = ((this.time % tt)) / (tt / 2) * Math.PI;
			Vector3.set(this.position,
				(col - ((N - 1) / 2)) * 3,
				20 * Math.sin(2 * Math.PI / N * col + t) * Math.cos(2 * Math.PI / N * row + t),
				(N/2 -row) * 3);
			Vector3.set(this.rotation, t, 2*(t+i)*(i%2?1:-1), 0);
			// Vector3.set(this.rotation, Math.random()*2*Math.PI, 0, Math.random()*2*Math.PI);
			// Vector3.set(this.position, (col - ((N - 1) / 2)) * 3, 0, (row - ((N-1)/2)) * 3);
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
		this.camera["camera0"].sync();
	}

	updateUnfoldingOutline(data: GeometryInfoIndexed) {
		this.currentGraticule?.outline?.remesh(this, data.vertices, data.uv);
	}

	buildUnfoldingOutline(data: GeometryInfoIndexed): Mesh {

		const gl = this.gl;
		const indices: number[] = [];

		for(let i = 0; i < data.index.length; i+=3) {
			indices.push(data.index[i], data.index[i + 1]);
			indices.push(data.index[i + 1], data.index[i + 2]);
			indices.push(data.index[i + 2], data.index[i]);
		}

		const mc = Material.Color(new Float32Array([1, 1, 1, 1]));
		mc.renderMode = gl.LINES;
		return new Mesh().from(this, {
			material: mc,
			index: new Uint16Array(indices),
			vertices: data.vertices,
			cullDisabled: true,
			uv: null,
			normals: null,
		}, 1).setScale(30.2);
	}

	longitude = 0;
	latitude = 0;
	start = 0;
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

			case 'j':
				this.exz += Math.PI/90;
				break;
			case 'l':
				this.exz -= Math.PI/90;
				break;
			case 'o':
				this.exy -= Math.PI/90;
				break;
			case 'k':
				this.exy += Math.PI/90;
				break;
			case 'i':
				this.eyz -= Math.PI/90;
				break;
			case 'p':
				this.eyz += Math.PI/90;
				break;

			case '1':
				this.action++;
				this.unfoldScale += 1;
				if (this.unfoldScale > 90) {
					this.unfoldScale = 90;
				} else {
					this.unfoldImpl();
				}
				break;
			case '2':
				this.action++;
				this.unfoldScale -= 1;
				if (this.unfoldScale < 0) {
					this.unfoldScale = 0;
				} else {
					this.unfoldImpl();
				}
				break;

			case '0':
				if (!down) {
					this.normals = !this.normals;
					this.foldsCutsInfo();
				}
				break;
			case '8':
				if (!down) {
					this.folds = !this.folds;
					this.foldsCutsInfo();
				}
				break;
			case '9':
				if (!down) {
					this.cuts = !this.cuts;
					this.foldsCutsInfo();
				}
				break;

			case '3':
				if (!down) {
					this.outline = !this.outline;
					this.foldsCutsInfo();
				}
				break;

			case '4':
				// if (!down) {
			{
				this.longitude++;
				this.myriahedral.uv = this.myriahedral.calculateUV(this.longitude / 180 * Math.PI, this.latitude/180*Math.PI);
				const data = this.myriahedral.getMeshData();
				this.currentGraticule?.mesh.remesh(this, data.vertices, data.uv);
			}
				// }
				break;
			case '5':
				// if (!down) {
			{
				this.latitude++;
				this.myriahedral.uv = this.myriahedral.calculateUV(this.longitude / 180 * Math.PI, this.latitude/180*Math.PI);
				const data = this.myriahedral.getMeshData();
				this.currentGraticule?.mesh.remesh(this, data.vertices, data.uv);
			}
				// }
				break;

			case 'f':
				if (!down) {
					this.action++;
					this.fold(() => {
						console.log('folded');
					});
				}
				break;
			case 'u':
				if (!down) {
					this.action++;
					this.unfold(() => {
						console.log('unfolded');
					});
				}
				break;
			case 'g':
				this.action++;
				if (!down) {
					this.nextGraticule();
				}
				break;
		}
	}

	private graticules: GraticuleData[] = [];
	private currentGraticuleIndex = -1;
	private currentGraticule: GraticuleData;

	private buildGraticules() {

		this.buildMenuHeader('Graticules');

		Graticules.forEach(p => {
			this.buildGraticule(p);
		});
	}

	private buildGraticule(p: GraticuleParams) {

		const myriahedral = new Myriahedral().graticule(p);
		const data = myriahedral.getMeshData();

		const outline = this.buildUnfoldingOutline(data);
		const mesh = new Mesh().from(this, {
			...data,
			material: Material.TextureNoLight(this.getTexture("earth"), .6),
			cullDisabled: true,

		}, 1).setScale(30);

		const gr = {
			mesh,
			myriahedral,
			outline,
		};

		this.buildFoldsCutsLines(data,30, 30.5, gr);
		this.buildMenuEntry(p.name, this.graticules.length);

		this.graticules.push(gr);
	}

	private buildMenuEntry(titleText: string, index: number) {
		const menu = document.getElementById("menu");
		const menuItem = document.createElement('div');
		const title = document.createElement('span');
		title.innerText = titleText;

		title.style.cursor = 'pointer';
		title.style.color = 'white';
		title.style.fontSize = '0.9em';
		title.style.paddingLeft = '15px';

		title.addEventListener('click', () => {
			this.selectGraticule(index);
		});

		menuItem.appendChild(title);
		menu.appendChild(menuItem);
	}

	private buildMenuHeader(titleText: string) {
		const menu = document.getElementById("menu");
		const menuItem = document.createElement('div');

		const br0 = document.createElement('br');
		const br1 = document.createElement('br');
		const title = document.createElement('span');
		title.innerHTML = `${titleText}`;

		title.style.fontSize = '1.1em';
		title.style.color = 'white';

		menuItem.appendChild(br0);
		menuItem.appendChild(title);
		menuItem.appendChild(br1);
		menu.appendChild(menuItem);
	}

	private buildMyriahedrons() {

		this.buildMenuHeader('Solids');

		const solids: [string, MyriahedronGeometry][] = [
			['Tetrahedron', TetrahedronGeometry],
			['Cube', CubeGeometry],
			['Octahedron', OctahedronGeometry],
			['Icosahedron', IcosahedronGeometry]
		];

		solids.forEach( g => {
			this.buildMyriahedron(g);
		});
	}

	private buildMyriahedron(geometry: [string, MyriahedronGeometry]) {

		this.buildMenuEntry(geometry[0], this.graticules.length);

		const myriahedral = new Myriahedral().myriahedron({
			name: geometry[1].name,
			geometry: geometry[1],
			subdivisions: 5,
			unfold: true,
			normalize: true,
		});

		const data1 = myriahedral.getMeshData();
		const outline = this.buildUnfoldingOutline(data1);
		const mesh = new Mesh().from(this, {
			...data1,
			material: Material.TextureNoLight(this.getTexture("earth"), .6),
			cullDisabled: true,
		}, 1);

		mesh.setScale(30);
		this.graticules.push({
			mesh,
			myriahedral,
			outline,
		});
	}

	private nextGraticule() {
		this.selectGraticule(this.currentGraticuleIndex+1);
	}

	private selectGraticule(i: number) {
		if (i!==this.currentGraticuleIndex) {
			this.currentGraticuleIndex = i;
			this.fold(() => {

				const graticule = this.graticules[this.currentGraticuleIndex];
				this.currentGraticule = graticule;

				this.myriahedral = graticule.myriahedral;

				this.unfold(() => {
					console.log('unfolded');
				});

			});

		}
	}

	private unfold(onUnfoldFinished: () => void) {
		if (this.myriahedral && this.unfoldScale<MaxUnfoldScale) {
			requestAnimationFrame(this.unfoldAnimation.bind(this, onUnfoldFinished, this.action));
		} else {
			onUnfoldFinished();
		}
	}

	private unfoldAnimation(onUnfoldFinished: () => void, gi: number) {
		if (gi===this.action) {
			this.unfoldScale++;
			this.unfoldImpl();
			if (this.unfoldScale < MaxUnfoldScale) {
				requestAnimationFrame(this.unfoldAnimation.bind(this, onUnfoldFinished, gi));
			} else {
				onUnfoldFinished();
			}
		}
	}

	private fold(onFoldFinished: () => void) {
		if (this.myriahedral && this.unfoldScale>0) {
			requestAnimationFrame(this.foldAnimation.bind(this, onFoldFinished, this.action));
		} else {
			requestAnimationFrame(onFoldFinished);
		}
	}

	private foldAnimation(onFoldFinished: () => void, gi: number) {
		if (this.action===gi) {
			this.unfoldScale--;
			this.unfoldImpl();
			if (this.unfoldScale > 0) {
				requestAnimationFrame(this.foldAnimation.bind(this, onFoldFinished, gi));
			} else {
				requestAnimationFrame(onFoldFinished);
			}
		}
	}

	private unfoldImpl() {
		this.myriahedral.unfold(this.unfoldScale/MaxUnfoldScale);
		const data = this.myriahedral.getMeshData();
		this.currentGraticule?.mesh.remesh(this, data.vertices, data.uv);

		this.foldsCutsInfo();
	}

	private foldsCutsInfo(data?: GeometryInfoIndexed) {
		data = data ?? this.currentGraticule?.myriahedral.getMeshData();
		this.buildFoldsCutsLines(data,30, 30.5, this.currentGraticule);
		if(this.outline) {
			this.updateUnfoldingOutline(data);
		}
	}
}