import Engine from "./Engine";
import Texture, {TextureInitializer} from "./Texture";
import Platform from "../platform/Platform";

export interface Attachment {
	renderBufferTarget: number;
	renderBufferInternalFormat?: number
	textureDefinition?: TextureInitializer;
}

export interface SurfaceDefinition {

	width: number;
	height: number;

	attachments : Attachment[];
	samples? : number;
}

export default class Surface {

	private frameBuffer: WebGLFramebuffer = null;
	private renderBuffer: WebGLRenderbuffer = null;
	private texture_: Texture = null;
	private readonly definition: SurfaceDefinition;

	constructor(e: Engine, def: SurfaceDefinition) {
		this.definition = def;
		this.initialize(e);
	}

	private initialize(e: Engine) {

		const gl = e.gl;

		this.frameBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);

		this.renderBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderBuffer);

		this.definition.attachments.forEach( attachment => {

			if (attachment.renderBufferTarget>=gl.COLOR_ATTACHMENT0 && attachment.renderBufferTarget<=gl.COLOR_ATTACHMENT15) {

				// override texture size with framebuffer size.
				attachment.textureDefinition.width = this.definition.width;
				attachment.textureDefinition.height = this.definition.height;
				
				this.texture_ = Texture.initialize(gl, attachment.textureDefinition);

				gl.framebufferTexture2D(gl.FRAMEBUFFER,
					attachment.renderBufferTarget,
					this.texture_.target,
					this.texture_.glTexture_,
					0);

			} else {

				if (this.definition.samples !== void 0) {
					gl.renderbufferStorageMultisample(gl.RENDERBUFFER,
						this.definition.samples,
						attachment.renderBufferInternalFormat,
						this.definition.width,
						this.definition.height);
				} else {
					gl.renderbufferStorage(gl.RENDERBUFFER,
						attachment.renderBufferInternalFormat,
						this.definition.width,
						this.definition.height);
				}

				gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment.renderBufferTarget, gl.RENDERBUFFER, this.renderBuffer);
			}
		});

		if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
			throw new Error(`FrameBuffer incomplete.`);
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	enableAsTextureTarget(e: Engine) {

		const gl = e.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
		e.renderSurfaceSize(this.definition.width, this.definition.height);
	}

	disableAsTextureTarget(e: Engine) {

		e.gl.bindFramebuffer(e.gl.FRAMEBUFFER, null);
		e.renderSurfaceSize(Platform.canvas.width, Platform.canvas.height);
	}

	get texture() {
		return this.texture_;
	}
}