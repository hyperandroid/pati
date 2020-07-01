import Myriahedral, {FacesEdge} from "./render/geometry/Myriahedral";
import {IcosahedronGeometry} from "./render/geometry/Solids";

const m = new Myriahedral().myriahedron({
	geometry: IcosahedronGeometry,
	subdivisions: 4,
	unfold: false,
});

const data = m.getMeshData();

const faceCenter: number[] = [];
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

	faceCenter.push((v0x + v1x + v2x) / 3);
	faceCenter.push((v0y + v1y + v2y) / 3);
	faceCenter.push((v0z + v1z + v2z) / 3);
}

const foldsXY: number[] = [];
for (let i = 0; i < faceCenter.length; i += 3) {
	foldsXY.push(.5 + Math.atan2(faceCenter[i], faceCenter[i + 2]) / (2 * Math.PI));
	foldsXY.push(.5 - Math.asin(faceCenter[i + 1]) / (Math.PI));
}

const polylineFolds: number[] = [];
data.folds.forEach((edge) => {
	polylineFolds.push(foldsXY[edge.f0 * 2], foldsXY[edge.f0 * 2 + 1]);
	polylineFolds.push(foldsXY[edge.f1 * 2], foldsXY[edge.f1 * 2 + 1]);
});




const cutsXY: number[] = [];
for (let i = 0; i < data.vertices.length; i += 3) {
	cutsXY.push(.5 + Math.atan2(data.vertices[i], data.vertices[i + 2]) / (2 * Math.PI));
	cutsXY.push(.5 - Math.asin(data.vertices[i + 1]) / (Math.PI));
}

const polylineCuts: number[] = [];

data.cuts.forEach((edge) => {
	polylineCuts.push(cutsXY[edge.vertex0 * 2], cutsXY[edge.vertex0 * 2 + 1]);
	polylineCuts.push(cutsXY[edge.vertex1 * 2], cutsXY[edge.vertex1 * 2 + 1]);
});

const c = document.createElement('canvas');
c.width = 700;
c.height = 400;
document.body.appendChild(c);
const ctx = c.getContext('2d');


const d: Set<number> = new Set();
data.folds.forEach(e => {
	d.add(e[0]);
	d.add(e[1]);
});
console.log(`distinct vertices length: ${d.size}`);

function render(polylineInfo: number[], max) {
	ctx.beginPath();

	// ctx.globalCompositeOperation = 'xor';

	for (let i = 0; i < max; i += 4) {

		const w = c.width * polylineInfo[i + 2] - c.width * polylineInfo[i];
		if (Math.abs(w) > c.width / 2) {
			continue;
		}

		ctx.moveTo(c.width * polylineInfo[i], c.height * polylineInfo[i + 1]);
		ctx.lineTo(c.width * polylineInfo[i + 2], c.height * polylineInfo[i + 3]);
		//ctx.arc(c.width * polylineInfo[i + 2], c.height * polylineInfo[i + 3], 2, 0, 2*Math.PI, false);
	}

	ctx.stroke();
}


let N = 0;

function run() {
	ctx.strokeStyle = 'black';
	ctx.clearRect(0,0,c.width,c.height);
	render(polylineFolds, polylineFolds.length);
	// render(polylineFolds, N%polylineFolds.length);
	ctx.strokeStyle = 'red';
	render(polylineCuts, polylineCuts.length);
	// render(polylineCuts, N%polylineCuts.length);
	//N+=4;
	// requestAnimationFrame(run);
}

requestAnimationFrame(run);

window.addEventListener("mousedown", (e) => {
	N+=4;
	// run();
});