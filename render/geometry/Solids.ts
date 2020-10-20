export type VertexType = number[];
export type FaceType = number[];
export type EdgeType = number[];

export interface MyriahedronGeometry {
	name: string;
	vertices: VertexType[];
	edges?: EdgeType[];
	faces: FaceType[];
}

export const OctahedronGeometry: MyriahedronGeometry = {
	name: 'octahedron',
	vertices: [
		[0, 1, 0],
		[1, 0, 0],
		[0, 0, -1],
		[-1, 0, 0],
		[0, 0, 1],
		[0, -1, 0]
	],
	faces: [
		[0,1,2],
		[0,2,3],
		[0,3,4],
		[0,4,1],
		[5,2,1],
		[5,3,2],
		[5,4,3],
		[5,1,4]
	]
}

export const TetrahedronGeometry: MyriahedronGeometry = {

	name: 'tetrahedron',
	vertices: [
		[0.0, -1.0, 2.0],
		[1.73205081, -1.0, -1.0],
		[-1.73205081, -1.0, -1.0],
		[0.0, 2.0, 0.0],
	],
	edges: [[2, 0], [0, 1], [3, 0], [1, 2], [2, 3], [3, 1]],
	faces: [
		[0, 2, 1],
		[0, 3, 2],
		[0, 1, 3],
		[1, 2, 3],
	]
};

export const CubeGeometry: MyriahedronGeometry = {

	name: 'cube',
	vertices: [
		[0.5, -0.5, -0.5],
		[-0.5, -0.5, -0.5],
		[-0.5, -0.5, 0.5],
		[0.5, -0.5, 0.5],
		[0.5, 0.5, -0.5],
		[-0.5, 0.5, -0.5],
		[-0.5, 0.5, 0.5],
		[0.5, 0.5, 0.5],
	],

	faces: [
			[2, 1, 0], [3, 2, 0],
			[3, 0, 4], [7, 3, 4],
			[0, 1, 5], [4, 0, 5],
			[1, 2, 6], [5, 1, 6],
			[2, 3, 7], [6, 2, 7],
			[4, 5, 6], [7, 4, 6],
		],

	edges: [
		[2,0],[3,0],[3,4],
		[0,1],[4,0],[0,5],
		[1,2],[5,1],[1,6],
		[2,3],[3,7],[6,2],
		[2,7],[4,5],[5,6],
		[7,4],[4,6],[6,7]
	]
}

export const IcosahedronGeometry: MyriahedronGeometry = {
	name: 'icosahedron',
	vertices: [
		[-0.26286500, 0, 0.42532500],
		[0.26286500, 0, 0.42532500],
		[-0.26286500, 0, -0.42532500],
		[0.26286500, 0, -0.42532500],
		[0, 0.42532500, 0.26286500],
		[0, 0.42532500, -0.26286500],
		[0, -0.42532500, 0.26286500],
		[0, -0.42532500, -0.26286500],
		[0.42532500, 0.26286500, 0],
		[-0.42532500, 0.26286500, 0],
		[0.42532500, -0.26286500, 0],
		[-0.42532500, -0.26286500, 0],
	],
	faces: [
		[0, 6, 1],
		[0, 11, 6],
		[1, 4, 0],
		[1, 8, 4],
		[1, 10, 8],
		[2, 5, 3],
		[2, 9, 5],
		[2, 11, 9],
		[3, 7, 2],
		[3, 10, 7],
		[4, 8, 5],
		[4, 9, 0],
		[5, 8, 3],
		[5, 9, 4],
		[6, 10, 1],
		[6, 11, 7],
		[7, 10, 6],
		[7, 11, 2],
		[8, 10, 3],
		[9, 11, 0]
	]
}

