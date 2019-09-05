import Engine from "./render/Engine";
import Platform from "./platform/Platform";
import Texture from "./render/Texture";
import {Loader} from "./platform/Loader";

new Loader().addImage([
	"assets/lava.jpg",
	"assets/diffuse.png",
	"assets/specular.png",
	"assets/cubemap0/back.jpg",
	"assets/cubemap0/bottom.jpg",
	"assets/cubemap0/front.jpg",
	"assets/cubemap0/left.jpg",
	"assets/cubemap0/right.jpg",
	"assets/cubemap0/top.jpg",
]).load((l: Loader) => {

	const e = new Engine(window.innerWidth, window.innerHeight);
	const gl = e.gl;

	e.addTexture("diffuse", Texture.initialize(gl, {
		element: l.getImage("lava.jpg"),
		wrap_mode: gl.CLAMP_TO_EDGE,
		minFilter: gl.LINEAR_MIPMAP_LINEAR,
	}));

	e.addTexture("specular", Texture.initialize(gl, {
		element: l.getImage("lava.jpg"),
		wrap_mode: gl.CLAMP_TO_EDGE,
		minFilter: gl.LINEAR_MIPMAP_LINEAR,
	}));

	e.addTexture("cubemap", Texture.initializeCubeMap(gl,
		l.getImagesWith(["left.jpg", "right.jpg", "top.jpg", "bottom.jpg", "back.jpg", "front.jpg"])));

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