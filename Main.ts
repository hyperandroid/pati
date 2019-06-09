import Engine from "./render/Engine";
import Platform from "./platform/Platform";
import Texture from "./render/Texture";

const e = new Engine(window.innerWidth, window.innerHeight);

const img = new Image();
img.onload = function(ev) {

	const gl = Platform.glContext;

	const t = Texture.initialize(gl, {
		element : img,
		wrap_mode: gl.CLAMP_TO_EDGE,
		filter: gl.LINEAR
	});

	e.addTexture("texture0", t);

	run();

};
img.src = "assets/lava.jpg";

function run() {
	function loop() {
		e.render(16.66);
		requestAnimationFrame(loop);
	}

	requestAnimationFrame(loop);
}