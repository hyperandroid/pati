
export enum LightType {
	DIRECTIONAL,
	POINT,
	SPOT
}

export interface LightDefinitionBase {
	ambient: number[];		// vec3
	diffuse: number[];		// vec3
	specular: number[];		// vec3
}

export interface DirectionalLightDef extends LightDefinitionBase {
	direction?: number[];	// vec3
}

export interface PointLightDef extends LightDefinitionBase {
	position?: number[];	// vec3
}

export interface SpotLightDef extends LightDefinitionBase {

}

export type LightInitializer = DirectionalLightDef | PointLightDef | SpotLightDef;

export default abstract class Light {

	readonly type: LightType;

	readonly ambient: Float32Array;
	readonly diffuse: Float32Array;
	readonly specular: Float32Array;

	enabled = false;

	protected constructor(type: LightType, li: LightDefinitionBase) {
		this.type = type;

		this.ambient = new Float32Array(li.ambient);
		this.diffuse = new Float32Array(li.diffuse);
		this.specular = new Float32Array(li.specular);
	}

	getAmbient() : Float32Array {
		return this.ambient;
	}

	getDiffuse() : Float32Array {
		return this.diffuse;
	}

	getSpecular() : Float32Array {
		return this.specular;
	}

	setAmbient(x: number, y: number, z: number) {
		this.set(this.ambient, x, y, z);
	}

	setDiffuse(x: number, y: number, z: number) {
		this.set(this.diffuse, x, y, z);
	}

	setSpecular(x: number, y: number, z: number) {
		this.set(this.specular, x, y, z);
	}

	protected set(v: Float32Array, x: number, y: number, z: number) {
		v[0] = x;
		v[1] = y;
		v[2] = z;
	}

	setEnabled(e: boolean) {
		this.enabled = e;
	}

	static Directional(def: DirectionalLightDef) : Light {
		return new DirectionalLight(def);
	}

	static Point(def: PointLightDef) : Light {
		return new PointLight(def);
	}
}

export class DirectionalLight extends Light {

	readonly direction: Float32Array;

	constructor(li: DirectionalLightDef) {
		super(LightType.DIRECTIONAL, li);
		this.direction = new Float32Array(li.direction);
	}

	getDirection() : Float32Array {
		return this.direction;
	}

	setDirection(x: number, y: number, z: number) {
		this.set( this.direction, x, y, z);
	}
}

export class PointLight extends Light {

	readonly position: Float32Array;

	constructor(li: PointLightDef) {
		super(LightType.POINT, li);
		this.position = new Float32Array(li.position);
	}

	getPosition() : Float32Array {
		return this.position;
	}

	setPosition(x: number, y: number, z: number) {
		this.set( this.position, x, y, z, );
	}
}