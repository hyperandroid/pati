import Shader, {ShaderVAOInfo, VAOGeometryInfo} from "./Shader";
import Matrix4 from "../../math/Matrix4";
import Engine from "../Engine";
import Material from "../Material";
import RenderComponent from "../RenderComponent";
import {DirectionalLight, PointLight} from "../Light";


/**
 * just draw geometry in a plain pink color
 */
export default class TextureShader extends Shader {

	constructor(gl: WebGL2RenderingContext) {
		super({
			gl,
			common: `#version 300 es
							
				precision mediump float;
				
				// directional lights, 
				struct Light {
					// 				point light
					vec3 position;
					float constant;
					float linear;
					float quadratic;					
					
					// 				directional light
					vec3 direction;	
				  
					vec3 ambient;
					vec3 diffuse;
					vec3 specular;
					
					//				spot light
					float cutoff;
				};
				
 				struct Material {
					float     ambient;
					
					sampler2D diffuse;
					sampler2D specular;
					float     shininess;
			   	};  
				
			`,
			vertex: `					
				layout(location = 0) in vec3 aPosition;
				layout(location = 1) in vec2 aTexture;
				layout(location = 2) in vec3 aNormal;
				layout(location = 4) in mat4 aModel;
				
				uniform mat4 uProjection;
				uniform mat4 uModelView;
				uniform Light uLight;
				
				out vec2 vTexturePos;
				out vec3 vNormal;
				out vec3 vFragmentPos;

				void main() {
					vTexturePos = aTexture;
					vNormal = mat3(transpose(inverse(aModel))) * aNormal;	// normal matrix
					vFragmentPos = (aModel * vec4(aPosition, 1.0)).xyz;
					gl_Position = uProjection * uModelView * aModel * vec4(aPosition, 1.0);
				}
			`,
			fragment: `
				
				uniform vec3 uViewPos;
				uniform Light uLight;
				uniform Material uMaterial;
				
				in vec2 vTexturePos;
				in vec3 vNormal;
				in vec3 vFragmentPos;

				out vec4 color;
				
				vec3 getAmbient() {
					vec3 diffuseColor = texture(uMaterial.diffuse, vTexturePos).xyz;
					return uLight.ambient * diffuseColor;
				}
				
				vec3 getDiffuse(vec3 normal, vec3 lightDir) {
					float diff = max(dot(normal, lightDir), 0.0);
					vec3 diffuseColor = texture(uMaterial.diffuse, vTexturePos).xyz;
					
					return diff * uLight.diffuse * diffuseColor;
				}
				
				vec3 getSpecular(vec3 normal, vec3 lightDir) {
					float specular = 0.0;
					if (dot(normal, lightDir)>0.0) {					
						vec3 viewDir = normalize(uViewPos - vFragmentPos);
						#ifdef PHONG
							// phong
							vec3 reflect = -reflect(lightDir, normal);
							specular = pow(max(dot(viewDir, reflect), 0.0), uMaterial.shininess);
						#else						
							// blinn phong
							vec3 halfwayDir = normalize(lightDir + viewDir);
							specular = pow(max(dot(normal, halfwayDir), 0.0), uMaterial.shininess);
						#endif
					}
					
					return uLight.specular * specular * vec3(texture(uMaterial.specular, vTexturePos)); 
				}
				
				vec4 directional() {
					vec3 lightDir = normalize(-uLight.direction);
					return vec4(0,0,0,0);
				}
				
				vec3 point() {
					vec3 norm = 		normalize(vNormal);
					vec3 lightDir = 	normalize(uLight.position - vFragmentPos);
					
					vec3 color = 		getAmbient() + 
										getDiffuse(norm, lightDir) + 
										getSpecular(norm, lightDir);
									
					float distance = 	length(uLight.position - vFragmentPos);
					float attenuation = pow(1.0 / (	uLight.constant + 
												uLight.linear * distance + 
												uLight.quadratic * 
												(distance * distance)), .45);	// gamma    
 
 					color.xyz = color.xyz * attenuation;
 					// color.xyz = pow(color.xyz, vec3(.45));	// gamma
 					
 					return color;
				}				

				void main() {
					color = vec4(point(), 1.0); 
					// color = vec4(vec3(gl_FragCoord.z), 1.0);
				}
			`,
			attributes: ["aPosition", "aTexture", "aNormal", "aModel"],
			uniforms: [
				"uProjection",
				"uModelView",

				"uLight.position",
				"uLight.constant",
				"uLight.linear",
				"uLight.quadratic",

				"uLight.direction",

				"uLight.ambient",
				"uLight.diffuse",
				"uLight.specular",

				"uMaterial.ambient",
				"uMaterial.diffuse",
				"uMaterial.specular",
				"uMaterial.shininess",
			]
		});

		this.setMatrix4fv("uProjection", false, Matrix4.create());
		this.setMatrix4fv("uModelView", false, Matrix4.create());
		this.set3F("uLight.position", 0, 1, 0);
		this.set3F("uLight.direction", 0, 1, 0);
		this.set3F("uLight.ambient", .2, .2, .2);
		this.set3F("uLight.diffuse", .5, .5, .5);
		this.set3F("uLight.specular", 1, 1, 1);

		// for different point light values decay, check:
		// http://wiki.ogre3d.org/tiki-index.php?page=-Point+Light+Attenuation
		this.set1F("uLight.constant", 1.0);
		this.set1F("uLight.linear", 0.045);
		this.set1F("uLight.quadratic", 0.0075);
	}

	use() {
		const gl = this._gl;

		gl.useProgram(this._shaderProgram);
	}

	notUse() {
		const gl = this._gl;

		for(let i = 0; i<7; i++ ) {
			gl.vertexAttribDivisor(i, 0);
			gl.disableVertexAttribArray(i);
		}

		gl.useProgram(null);
	}

	createVAO(gl: WebGL2RenderingContext, geometryInfo: VAOGeometryInfo, material: Material) : ShaderVAOInfo {

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		for(let i = 0; i < 3; i++) {
			gl.enableVertexAttribArray(i);
			gl.vertexAttribDivisor(i,0);
		}

		const instanceCount = geometryInfo.instanceCount || 1;

		const glGeometryBuffer = Shader.createAttributeInfo(gl, 0, geometryInfo.vertex, 12, 0);
		const glUVBuffer = Shader.createAttributeInfo(gl, 1, geometryInfo.uv, 8, 0);
		const glNormalBuffer = Shader.createAttributeInfo(gl, 2, geometryInfo.normal, 12, 0);

		const amodelLoc = gl.getAttribLocation(this._shaderProgram, "aModel");
		const glInstancedModelTransformBuffer = Shader.createInstancedModelMatrix(gl, instanceCount, amodelLoc, !!geometryInfo.index);

		let glBufferIndex: WebGLBuffer = null;
		let vertexCount = (geometryInfo.vertex.length/3)|0;
		if (geometryInfo.index) {
			glBufferIndex = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBufferIndex);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometryInfo.index, gl.STATIC_DRAW);
			vertexCount = geometryInfo.index.length;
		}

		gl.bindVertexArray(null);

		return {
			shader: this,
			vao,
			geometryBuffer: glGeometryBuffer,
			uvBuffer: glUVBuffer,
			indexBuffer: glBufferIndex,
			instanceBuffer: glInstancedModelTransformBuffer,
			normalBuffer: glNormalBuffer,
			vertexCount: vertexCount,
			instanceCount,
		};
	}

	render(e: Engine, info: ShaderVAOInfo, rc: RenderComponent) {

		const gl = e.gl;

		this.use();
		this.setMatrix4fv("uProjection", false, e.projectionMatrix());

		const material = rc.getMaterial().definition;

		material.diffuse.enableAsUnit(gl, 0);
		this.set1I("uMaterial.diffuse", 0);
		material.specular.enableAsUnit(gl, 1);
		this.set1I("uMaterial.specular", 1);
		this.set1F("uMaterial.ambient", material.ambient);
		this.set1F("uMaterial.shininess", material.shininess);

		const light = e.light['point'] as PointLight;
		this.set3FV("uLight.ambient", light.getAmbient());
		this.set3FV("uLight.diffuse", light.getDiffuse());
		this.set3FV("uLight.specular", light.getSpecular());
		this.set3FV("uLight.position", light.getPosition());

		this.setMatrix4fv("uModelView", false, e.cameraMatrix());
		this.set3FV("uViewPos", e.cameraPosition());

		gl.bindVertexArray(info.vao);

		// if (info.indexBuffer) {
		// 	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, info.indexBuffer);
		// }

		info.instanceBuffer.draw(gl, info.vertexCount, info.instanceCount);

		gl.bindVertexArray(null);
		this.notUse();
	}
}