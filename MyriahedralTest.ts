import Myriahedral from "./render/geometry/Myriahedral";

const m = new Myriahedral();
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

const faceXY: number[] = [];
for (let i = 0; i < faceCenter.length; i += 3) {
	faceXY.push(.5 + Math.atan2(faceCenter[i], faceCenter[i + 2]) / (2 * Math.PI));
	faceXY.push(.5 - Math.asin(faceCenter[i + 1]) / (Math.PI));
}

const polyline: number[] = [];
data.mst.forEach((edge) => {
	polyline.push(faceXY[edge[0] * 2], faceXY[edge[0] * 2 + 1]);
	polyline.push(faceXY[edge[1] * 2], faceXY[edge[1] * 2 + 1]);
})

const c = document.createElement('canvas');
c.width = 700;
c.height = 400;
document.body.appendChild(c);
const ctx = c.getContext('2d');


const d: Set<number> = new Set();
data.mst.forEach( e => {
	d.add(e[0]);
	d.add(e[1]);
});
console.log(`distinct vertices length: ${d.size}`);

ctx.beginPath();

// for(let i = 0; i < faceXY.length; i+=2) {
// 	ctx.fillRect(c.width*faceXY[i*2],c.height*faceXY[i*2+1], 3, 3);
// }


for (let i = 0; i < polyline.length; i += 4) {

	const w = c.width*polyline[i+2] - c.width*polyline[i];
	if (Math.abs(w)>c.width/2) {
		continue;
	}

	ctx.moveTo(c.width*polyline[i], c.height*polyline[i+1]);
	ctx.lineTo(c.width*polyline[i+2], c.height*polyline[i + 3]);
}

ctx.stroke();