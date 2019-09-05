/**
 * Texture uses mipmaps by default.
 *
 * internal_format and format, are not required to be equal in webgl2.
 * Combinations are here:
 * https://www.khronos.org/registry/OpenGL-Refpages/es3.0/html/glTexImage2D.xhtml
 */

export type TextureInitializerElement = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageData | ImageBitmap;

export interface TextureInitializer {
	target?:	number;			//	defaults to TEXTURE_2D
	width?: number;
	height?: number;
	internal_format?: number;	// color components in texture. defaults to RGBA8
	format?: number;			// internal format. defaults to RGBA8
	type?: number;				// defaults to UNSIGNED_BYTE
	level?: number;				// mipmap level. defaults to 0.
	pixels?: ArrayBufferView;
	element?: TextureInitializerElement|TextureInitializerElement[];

	minFilter?: number;			// defaults to LINEAR (NEAREST | LINEAR | NEAREST_MIPMAP_NEAREST | ...)
	magFilter?: number;
	wrap_mode?: number;			// defaults to CLAMP_TO_EDGE
}

/**
 * A general texture class.
 * It honors bitmaps that will be constructed based on the TextureInitialized filter parameter.
 */
export default class Texture {

	glTexture_: WebGLTexture = null;
	width = -1;
	height = -1;
	target = -1;

	private constructor() {
	}

	static initializeCubeMap(gl: WebGL2RenderingContext, elements: HTMLImageElement[]) : Texture {
		return Texture.initialize(gl,
			{
				target: gl.TEXTURE_CUBE_MAP,
				element: elements,
				wrap_mode: gl.CLAMP_TO_EDGE,
				minFilter: gl.LINEAR,
				internal_format: gl.RGBA,
				format: gl.RGBA
			});
	}

	static initialize(gl: WebGL2RenderingContext, info: TextureInitializer) : Texture {

		if (info.target===void 0) {
			info.target = gl.TEXTURE_2D;
		}

		const glTexture_ = gl.createTexture();

		gl.bindTexture(info.target, glTexture_);

		const arrayView: ArrayBufferView = info.pixels!==void 0 ? info.pixels : null;

		if (info.internal_format===void 0) {
			info.internal_format = gl.RGBA;
		}

		if (info.format===void 0) {
			info.format = info.internal_format;
		}

		if (info.type===void 0) {
			info.type = gl.UNSIGNED_BYTE;
		}

		if (info.element) {

			if (Array.isArray(info.element)) {
				if (info.target===gl.TEXTURE_CUBE_MAP) {

					info.element.forEach((img, index) => {
						gl.texImage2D(
							gl.TEXTURE_CUBE_MAP_POSITIVE_X + index,
							0,
							info.internal_format,
							img.width,
							img.height,
							0,
							info.format,
							info.type,
							img);
					});
				} else {
					throw(new Error("Texture type bad: array of images, not cubemap"));
				}

			} else {

				// not array
				const element = info.element;

				info.width = element.width;
				info.height = element.height;
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
			}
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

		const texture = new Texture();

		texture.glTexture_ = glTexture_;
		texture.width = info.width;
		texture.height = info.height;
		texture.target = info.target;

		// default filter if not present
		if (info.minFilter===void 0) {
			info.minFilter = gl.LINEAR;
		}

		// generate mipmaps if needed
		if (info.minFilter===gl.NEAREST_MIPMAP_NEAREST ||
			info.minFilter===gl.NEAREST_MIPMAP_LINEAR ||
			info.minFilter===gl.LINEAR_MIPMAP_NEAREST ||
			info.minFilter===gl.LINEAR_MIPMAP_LINEAR) {

			gl.generateMipmap(info.target);
		}

		if (info.magFilter===void 0) {
			info.magFilter = gl.LINEAR;
		}

		gl.texParameteri(info.target, gl.TEXTURE_MIN_FILTER, info.minFilter);
		gl.texParameteri(info.target, gl.TEXTURE_MAG_FILTER, info.magFilter);

		// default wrap mode
		if (info.wrap_mode===void 0) {
			info.wrap_mode = gl.CLAMP_TO_EDGE;
		}
		gl.texParameteri(info.target, gl.TEXTURE_WRAP_S, info.wrap_mode);
		gl.texParameteri(info.target, gl.TEXTURE_WRAP_T, info.wrap_mode);

		if (info.target===gl.TEXTURE_CUBE_MAP) {
			gl.texParameteri(info.target, gl.TEXTURE_WRAP_R, info.wrap_mode);
		}

		gl.bindTexture(texture.target, null);

		return texture;
	}

	bindAsRenderTarget() {

	}

	bind(gl: WebGL2RenderingContext) {
		gl.bindTexture(this.target, this.glTexture_);
	}

	dispose(gl: WebGL2RenderingContext) {
		gl.deleteTexture(this.glTexture_);
	}

	enableAsUnit(gl: WebGL2RenderingContext, unit: number) {
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(this.target, this.glTexture_);
	}

}