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
	REFLECTIVE,
	REFRACTIVE,
	COLOR
}

export interface MaterialDefinition {
	ambient?: number;

	diffuse?: Texture;

	color? : Float32Array;

	specular?: Texture;
	specularIntensity? : number;
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

	static Refractive(t: Texture) {
		return new Material(MaterialType.REFRACTIVE, {
			diffuse: t,
		});
	}

	static Skybox(texture: Texture) {
		return new Material(MaterialType.SKYBOX, {
			diffuse: texture,
		});
	}

	static Texture(diffuse: Texture, specular: Texture, ambient: number, specularIntensity: number, specularPower: number) {
		return new Material(MaterialType.TEXTURE, {
			diffuse,
			specular,
			ambient,
			specularIntensity,
			specularPower,
		});
	}

	static Color(color: Float32Array) {
		return new Material(MaterialType.COLOR, {
			color,
		})
	}
}