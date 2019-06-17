import Texture from "./Texture";

enum MaterialTexture {
	DIFFUSE,
	SPECULAR,
	NORMAL,
	DISPLACEMENT
};

export enum MaterialType {
	SKYBOX,
	TEXTURE,
	REFLECTIVE
}

export interface MaterialInitializer {
	diffuse: Texture;

	specularIntentisy? : number;
	specularPower? : number;

	normal?: Texture;
	displacement?: Texture;
	displacementMapScale?: number;
	displacementMapBias?: number;
}

export default class Material {

	//
	// private readonly definition: MaterialInitializer;
	//
	// constructor(init: MaterialInitializer) {
	// 	this.definition = init;
	// }

	type: MaterialType;

	private constructor(t: MaterialType) {
		this.type = t;
	}

	static Reflective() {
		return new Material(MaterialType.REFLECTIVE);
	}

	static Skybox() {
		return new Material(MaterialType.SKYBOX);
	}

	static Texture() {
		return new Material(MaterialType.TEXTURE);
	}
}