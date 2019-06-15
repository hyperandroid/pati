import Engine from "../Engine";

export interface ShaderInitializer {
	gl: WebGL2RenderingContext;
    vertex: string|string[],
    fragment: string|string[],
    uniforms: string[],
    attributes: string[],
    defines?: {[key:string]:string}
}

export interface ShaderVAOInfo {
	vao: WebGLVertexArrayObject;
	geometryBuffer: WebGLBuffer;
	uvBuffer: WebGLBuffer;
	indexBuffer: WebGLBuffer;
	instanceBuffer: WebGLBuffer;
	indexedGeometry: boolean;
	vertexCount: number;
	instanceCount: number;
}

/**
 *
 */
export default abstract class Shader {

	protected readonly _gl : WebGL2RenderingContext;

	protected _uniforms       : {[key:string]:WebGLUniformLocation} = {};

	protected _attributes     : {[key:string]:GLint} = {};

	protected _shaderProgram  : WebGLProgram = null;

    protected constructor( init : ShaderInitializer ) {
    	this._gl = init.gl;
        this.__init( init );
    }

    private static getShader(gl: WebGL2RenderingContext, type : number, shader_text : string) : WebGLProgram {

        let shader = gl.createShader(type);

        gl.shaderSource(shader, shader_text);
        gl.compileShader(shader);
		const res = gl.getShaderInfoLog(shader);
		if (res!==null && res!=="") {
			console.error(`Shader info log: '${res}' for shader: ${shader_text}`);
		}

        return shader;
    }

    private static getShaderDef(def:string|string[], defines? : {[key:string]:string} ) : string {

        let ret = "";

        if ( Object.prototype.toString.call(def)==="[object Array]" ) {
            ret = (def as string[]).join('\n');
        } else {
            ret = def as string;
        }

        let sdefines = "";
        if (defines!==void 0) {
            Object.keys(defines).forEach( d => {
                sdefines = `${sdefines}#define ${d} ${defines[d]}\n`;
            })
        }

        return sdefines + ret;
    }

    private __init( shaderDef : ShaderInitializer ) {

    	const gl = this._gl;

        this._shaderProgram = gl.createProgram();
        gl.attachShader(
            this._shaderProgram,
            Shader.getShader(gl, gl.VERTEX_SHADER, Shader.getShaderDef(shaderDef.vertex, shaderDef.defines) )
        );

        gl.attachShader(
            this._shaderProgram,
            Shader.getShader(gl, gl.FRAGMENT_SHADER, Shader.getShaderDef(shaderDef.fragment, shaderDef.defines) )
        );

        gl.linkProgram(this._shaderProgram);
        gl.useProgram(this._shaderProgram);

        this.initializeUniforms(shaderDef.uniforms, gl);
        this.initializeAttributes(shaderDef.attributes, gl);
    }

	private initializeAttributes(attributes: string[], gl: WebGL2RenderingContext) {
		attributes.forEach(attr => {
			const attrid = gl.getAttribLocation(this._shaderProgram, attr);
			if (attrid!==-1) {
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

	abstract render(e: Engine, info: ShaderVAOInfo);
}
