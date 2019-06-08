/**
 * Texture uses mipmaps by default.
 *
 * internal_format and format, are not required to be equal in webgl2.
 * Combinations are here:
 * https://www.khronos.org/registry/OpenGL-Refpages/es3.0/html/glTexImage2D.xhtml
 */

export type TextureInitializerElement = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageData | ImageBitmap;

export interface TextureInitializer {
	target:	number;				//	TEXTURE_1D, TEXTURE_2D, ...
	width: number;
	height: number;
	internal_format: number;	// color components in texture
	format: number;
	type: number;				// BYTE ?
	level?: number;				// mipmap level
	pixels?: ArrayBufferView;
	element?: TextureInitializerElement;

	filter: number;				// NEAREST | LINEAR | NEAREST_MIPMAP_NEAREST | ...
	wrap_mode: number;

	name: string;
}

export default class Texture {

	glTexture_: WebGLTexture = null;
	name: string = null;
	width = -1;
	height = -1;
	target = -1;

	constructor() {
	}

	initialize(gl: WebGL2RenderingContext, info: TextureInitializer) {

		this.glTexture_ = gl.createTexture();

		gl.bindTexture(info.target, gl);

		const arrayView: ArrayBufferView = info.pixels!==void 0 ? info.pixels : null;
		const element: TextureInitializerElement = info.element!==void 0 ? info.element : null;

		if (element!==null) {
			gl.texImage2D(
				info.target,
				info.level || 0,
				info.internal_format,
				info.width,
				info.height,
				0,
				info.format,
				info.type,
				element);
		} else {
			gl.texImage2D(
				info.target,
				info.level || 0,
				info.internal_format,
				info.width,
				info.height,
				0,
				info.format,
				info.type,
				arrayView);
		}

		this.name = info.name;
		this.width = info.width;
		this.height = info.height;
		this.target = info.target;

		if (info.filter===gl.NEAREST_MIPMAP_NEAREST ||
			info.filter===gl.NEAREST_MIPMAP_LINEAR ||
			info.filter===gl.LINEAR_MIPMAP_NEAREST ||
			info.filter===gl.LINEAR_MIPMAP_LINEAR) {

			gl.generateMipmap(info.target);
		}

		gl.texParameteri(info.target, gl.TEXTURE_MIN_FILTER, info.filter);
		gl.texParameteri(info.target, gl.TEXTURE_MAG_FILTER, info.filter);

		gl.texParameteri(info.target, gl.TEXTURE_WRAP_S, info.wrap_mode);
		gl.texParameteri(info.target, gl.TEXTURE_WRAP_T, info.wrap_mode);
	}

	bindAsRenderTarget() {

	}

	bind(gl: WebGL2RenderingContext) {
		gl.bindTexture(this.target, this.glTexture_);
	}

	dispose(gl: WebGL2RenderingContext) {
		gl.deleteTexture(this.glTexture_);
	}
}