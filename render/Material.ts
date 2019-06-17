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

export interface MaterialDefinition {
	diffuse: Texture;

	specularIntentisy? : number;
	specularPower? : number;

	normal?: Texture;
	displacement?: Texture;
	displacementMapScale?: number;
	displacementMapBias?: number;
}

export default class Material {

	readonly definition: MaterialDefinition;
	readonly type: MaterialType;

	private constructor(t: MaterialType, def?: MaterialDefinition) {
		this.type = t;
		this.definition = def;
	}

	static Reflective(t: Texture) {
		return new Material(MaterialType.REFLECTIVE, {
			diffuse: t,
		});
	}

	static Skybox(texture: Texture) {
		return new Material(MaterialType.SKYBOX, {
			diffuse: texture,
		});
	}

	static Texture(texture: Texture) {
		return new Material(MaterialType.TEXTURE, {
			diffuse: texture,
		});
	}
}