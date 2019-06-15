import Texture from "./Texture";

enum MaterialTexture {
	DIFFUSE,
	SPECULAR,
	NORMAL,
	DISPLACEMENT
};

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

	// textures map. keys
	textures = new Map<MaterialTexture, Texture>();

	private readonly definition: MaterialInitializer;

	constructor(init: MaterialInitializer) {
		this.definition = init;
	}
}