import Engine from "./render/Engine";
import Platform from "./platform/Platform";
import Texture from "./render/Texture";
import {Loader} from "./platform/Loader";

new Loader().addImage([
	"assets/lava.jpg",
	"assets/diffuse.png",
	"assets/specular.png",
	"assets/earth.jpg",
	"assets/moon.jpg",
	"assets/jupiter.jpg",
	"assets/cubemap3/back.png",
	"assets/cubemap3/bottom.png",
	"assets/cubemap3/front.png",
	"assets/cubemap3/left.png",
	"assets/cubemap3/right.png",
	"assets/cubemap3/top.png",
]).load((l: Loader) => {

	const e = new Engine(window.innerWidth, window.innerHeight);
	const gl = e.gl;

	e.addTexture("earth", Texture.initialize(gl, {
		element: l.getImage("earth.jpg"),
		wrap_mode: gl.REPEAT,
		minFilter: gl.LINEAR_MIPMAP_LINEAR,
	}));

	e.addTexture("jupiter", Texture.initialize(gl, {
		element: l.getImage("jupiter.jpg"),
		wrap_mode: gl.REPEAT,
		minFilter: gl.LINEAR_MIPMAP_LINEAR,
	}));

	e.addTexture("moon", Texture.initialize(gl, {
		element: l.getImage("moon.jpg"),
		wrap_mode: gl.REPEAT,
		minFilter: gl.LINEAR_MIPMAP_LINEAR,
	}));

	e.addTexture("diffuse", Texture.initialize(gl, {
		element: l.getImage("diffuse.png"),
		wrap_mode: gl.CLAMP_TO_EDGE,
		minFilter: gl.LINEAR_MIPMAP_LINEAR,
	}));

	e.addTexture("specular", Texture.initialize(gl, {
		element: l.getImage("lava.jpg"),
		wrap_mode: gl.CLAMP_TO_EDGE,
		minFilter: gl.LINEAR_MIPMAP_LINEAR,
	}));

	e.addTexture("cubemap", Texture.initializeCubeMap(gl,
		l.getImagesWith(["left.png", "right.png", "top.png", "bottom.png", "back.png", "front.png"])));

	e.init();

	window.addEventListener("keydown", (ev: KeyboardEvent) => {
		e.keyboardEvent(ev.key, true);
	});

	window.addEventListener("keyup", (ev: KeyboardEvent) => {
		e.keyboardEvent(ev.key, false);
	});

	window.addEventListener("resize", (ev: UIEvent) => {
		e.resize(window.innerWidth, window.innerHeight);
	});

	Platform.canvas.onclick = function () {
		(Platform.canvas as any).requestPointerLock();
	};

	document.addEventListener('pointerlockchange', lockChangeAlert, false);

	run();

	function lockChangeAlert() {
		if ((document as any).pointerLockElement === Platform.canvas) {
			console.log('The pointer lock status is now locked');
			Platform.canvas.addEventListener("mousemove", updatePosition, false);
		} else {
			console.log('The pointer lock status is now unlocked');
			Platform.canvas.removeEventListener("mousemove", updatePosition, false);
			firstPointerLockPosition = true;
		}
	}

	let firstPointerLockPosition = true;
	function updatePosition(ev: MouseEvent) {
		if (firstPointerLockPosition) {
			firstPointerLockPosition = false;
		} else {
			e.mouseEvent(ev.movementX, ev.movementY);
		}
	}

	function run() {
		function loop() {
			e.render(16.66);
			requestAnimationFrame(loop);
		}

		requestAnimationFrame(loop);
	}
});