/**
 * Initialize system.
 * Create canvas, get gl2 context, etc.
 */
export default class Platform {

	static glContext: WebGL2RenderingContext = null;
	static canvas: HTMLCanvasElement = null;

	static initialize(w: number, h: number) {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;

		document.body.appendChild(c);

		const ctx = c.getContext("webgl2", {
			depth: true,
			alpha: false,
			antialias: false,
			premultipliedAlpha: false,
		});

		if (ctx) {
			Platform.glContext = ctx;
			Platform.canvas = c;
		} else {
			alert("Webgl2 enabled please.");
		}
	}
}