import Engine from "../Engine";
import Material from "../Material";
import RenderComponent from "../RenderComponent";

export interface ShaderInitializer {
	gl: WebGL2RenderingContext;
	common?: string,
    vertex: string|string[],
    fragment: string|string[],
    uniforms: string[],
    attributes: string[],
    defines?: {[key:string]:string}
}

export interface ShaderVAOInfo {
	shader: Shader;
	vao: WebGLVertexArrayObject;
	geometryBuffer: WebGLBuffer;
	uvBuffer: WebGLBuffer;
	normalBuffer: WebGLBuffer;
	indexBuffer: WebGLBuffer;
	instanceBuffer: ModelMatrixInstancingInfo;
	vertexCount: number;
	instanceCount: number;
	backFaceDisabled?: boolean;
	renderMode: number;
}

export interface VAOGeometryInfo {
	vertex: Float32Array;
	uv?: Float32Array;
	normal?: Float32Array;
	index?: Uint16Array;
	instanceCount?: number;
	cullDisabled?: boolean;
}

// make instancing batches taking at most MAX_BUFFER_INSTANCE bytes.
const BYTES_PER_INSTANCE = 16*4;
const MAX_BUFFER_INSTANCE = 65536;

export class ModelMatrixInstancingInfo {
	readonly buffer: WebGLBuffer;
	readonly attributeIndex: number;
	readonly isIndexed: boolean;
	readonly instanceCount: number;

	constructor(gl: WebGL2RenderingContext, aid: number, instanceCount: number, indexed: boolean) {
		this.attributeIndex = aid;

		this.isIndexed = indexed;
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		const fbuffer = new Float32Array(instanceCount*16);
		gl.bufferData(gl.ARRAY_BUFFER, fbuffer, gl.DYNAMIC_DRAW);

		this.instanceCount = instanceCount;
	}

	dispose(gl: WebGLRenderingContext) {
		gl.deleteBuffer(this.buffer);
	}

	draw(gl: WebGL2RenderingContext, vertexCount: number, instanceCount: number) {

		instanceCount = Math.min(instanceCount, this.instanceCount);

		// batch instances info.
		// any mobile gpu would probably limit the buffer to 16k
		// any desktop will be ok with 65k instances.
		const batches = Math.max(1,((instanceCount * BYTES_PER_INSTANCE) / MAX_BUFFER_INSTANCE) | 0);
		const maxInstancesPerBatch = batches === 0 ? instanceCount : MAX_BUFFER_INSTANCE / BYTES_PER_INSTANCE;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		for (let i = 0; i < 4; i++) {
			gl.enableVertexAttribArray(this.attributeIndex + i);
			gl.vertexAttribDivisor(this.attributeIndex + i, 1);
		}

		for(let j = 0; j < batches; j++ ) {

			const count = j < batches-1 ?
				maxInstancesPerBatch :
				instanceCount - (batches-1)*maxInstancesPerBatch;

			for (let i = 0; i < 4; i++) {
				gl.vertexAttribPointer(this.attributeIndex + i, 4,
					gl.FLOAT, false,
					64, i * 16 + j*MAX_BUFFER_INSTANCE );
			}

			if (this.isIndexed) {
				gl.drawElementsInstanced(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0, count);
			} else {
				gl.drawArraysInstanced(gl.TRIANGLES, 0, vertexCount, count);
			}
		}
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	updateWith(gl: WebGL2RenderingContext, locals: Float32Array) {
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, locals, 0, Math.min(this.instanceCount*16, locals.length));
	}
}

/**
 *
 */
export default abstract class Shader {

	protected readonly _gl: WebGL2RenderingContext;

	protected _uniforms: { [key: string]: WebGLUniformLocation } = {};

	protected _attributes: { [key: string]: GLint } = {};

	protected _shaderProgram: WebGLProgram = null;

	protected constructor(init: ShaderInitializer) {
		this._gl = init.gl;
		this.__init(init);
	}

	private static getShader(gl: WebGL2RenderingContext, type: number, shader_text: string): WebGLProgram {

		let shader = gl.createShader(type);

		gl.shaderSource(shader, shader_text);
		gl.compileShader(shader);
		const res = gl.getShaderInfoLog(shader);
		if (res !== null && res !== "") {
			console.error(`Shader info log: '${res}' for shader: ${shader_text}`);
		}

		return shader;
	}

	private static getShaderDef(def: string | string[], defines?: { [key: string]: string }, common?: string): string {

		let ret = "";

		if (Object.prototype.toString.call(def) === "[object Array]") {
			ret = (def as string[]).join('\n');
		} else {
			ret = def as string;
		}

		let sdefines: string[] = [];
		if (defines !== void 0) {
			Object.keys(defines).forEach(d => {
				sdefines.push(`#define ${d} ${defines[d]}`);
			})
		}

		const lines = ret.split('\n');
		if (lines[0].startsWith("#version")) {
			lines.splice(1, 0, ...sdefines);
		}

		if (common!==undefined) {
			common = `${common}\n`;
		} else {
			common = '';
		}
		return `${common}${lines.join('\n')}`;
	}

	private __init(shaderDef: ShaderInitializer) {

		const gl = this._gl;

		this._shaderProgram = gl.createProgram();
		gl.attachShader(
			this._shaderProgram,
			Shader.getShader(gl, gl.VERTEX_SHADER, Shader.getShaderDef(shaderDef.vertex, shaderDef.defines, shaderDef.common))
		);

		gl.attachShader(
			this._shaderProgram,
			Shader.getShader(gl, gl.FRAGMENT_SHADER, Shader.getShaderDef(shaderDef.fragment, shaderDef.defines, shaderDef.common))
		);

		gl.linkProgram(this._shaderProgram);
		gl.useProgram(this._shaderProgram);

		this.initializeUniforms(shaderDef.uniforms, gl);
		this.initializeAttributes(shaderDef.attributes, gl);
	}

	private initializeAttributes(attributes: string[], gl: WebGL2RenderingContext) {
		attributes.forEach(attr => {
			const attrid = gl.getAttribLocation(this._shaderProgram, attr);
			if (attrid !== -1) {
				this._attributes[attr] = attrid;
			} else {
				console.error(`Attribute ${attr} unknown in program.`);
			}
		});
	}

	private initializeUniforms(uniforms: string[], gl) {
		uniforms.forEach(uniform => {
			const location = gl.getUniformLocation(this._shaderProgram, uniform);
			if (location === null) {
				console.error(`Uniform ${uniform} not found in program.`);
			} else {
				this._uniforms[uniform] = location;
			}
		});
	}

	use() {
		this._gl.useProgram(this._shaderProgram);
		Object.keys(this._attributes).forEach(k =>
			this._gl.enableVertexAttribArray(this._attributes[k]));
	}

	notUse() {
		this._gl.useProgram(null);
		Object.keys(this._attributes).forEach(k =>
			this._gl.disableVertexAttribArray(this._attributes[k]));
	}

	set1F(name: string, v: number) {
		this._gl.uniform1f(this._uniforms[name], v);
	}

	set2F(name: string, v0: number, v1: number) {
		this._gl.uniform2f(this._uniforms[name], v0, v1);
	}

	set3F(name: string, v0: number, v1: number, v2: number) {
		this._gl.uniform3f(this._uniforms[name], v0, v1, v2);
	}

	set3FV(name: string, b: Float32Array) {
		this._gl.uniform3fv(this._uniforms[name], b);
	}

	set4FV(name: string, b: Float32Array) {
		this._gl.uniform4fv(this._uniforms[name], b);
	}

	set4F(name: string, v0: number, v1: number, v2: number, v3: number) {
		this._gl.uniform4f(this._uniforms[name], v0, v1, v2, v3);
	}

	set1I(name: string, v: number) {
		this._gl.uniform1i(this._uniforms[name], v);
	}

	set2I(name: string, v0: number, v1: number) {
		this._gl.uniform2i(this._uniforms[name], v0, v1);
	}

	set3I(name: string, v0: number, v1: number, v2: number) {
		this._gl.uniform3i(this._uniforms[name], v0, v1, v2);
	}

	setMatrix4fv(name: string, transpose: boolean, matrix: Float32Array, srcOffset?: number, srcLength?: number) {
		this._gl.uniformMatrix4fv(this._uniforms[name], transpose, matrix, srcOffset, srcLength);
	}

	abstract render(e: Engine, info: ShaderVAOInfo, rc: RenderComponent);

	protected static createInstancedModelMatrix(gl: WebGL2RenderingContext, instanceCount: number, attributeId: number, indexed: boolean): ModelMatrixInstancingInfo {

		return new ModelMatrixInstancingInfo(gl, attributeId, instanceCount, indexed);
	}

	protected static createAttributeInfo(gl: WebGL2RenderingContext, attributeId: number, data: Float32Array, stride: number, offset: number): WebGLBuffer {
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
		gl.vertexAttribPointer(attributeId, stride / 4, gl.FLOAT, false, stride, offset);
		gl.vertexAttribDivisor(attributeId, 0);

		return buffer;
	}

	abstract createVAO(gl: WebGL2RenderingContext, geomVAO: VAOGeometryInfo, material: Material): ShaderVAOInfo;
}