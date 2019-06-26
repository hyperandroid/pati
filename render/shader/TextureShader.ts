import Shader, {ShaderVAOInfo, VAOGeometryInfo} from "./Shader";
import Matrix4 from "../../math/Matrix4";
import Engine from "../Engine";
import Material from "../Material";
import RenderComponent from "../RenderComponent";

/**
 * just draw geometry in a plain pink color
 */
export default class TextureShader extends Shader {

	constructor(gl: WebGL2RenderingContext) {
		super({
			gl,
			vertex : `#version 300 es
				
				precision mediump float;

				layout(location = 0) in vec3 aPosition;
				layout(location = 1) in vec2 aTexture;
				layout(location = 2) in vec3 aNormal;
				layout(location = 3) in mat4 aModel;
				
				uniform mat4 uProjection;
				uniform mat4 uModelView;
				
				out vec2 vTexturePos;
				out vec3 vNormal;
				out vec3 vFragmentPos;

				void main() {
					gl_Position = uProjection * uModelView * aModel * vec4(aPosition, 1.0);
					vTexturePos = aTexture;
					//vNormal = mat3(transpose(inverse(aModel))) * aNormal;	// normal matrix
					vNormal = vec3(aModel * vec4(aNormal,1.0));
					vec4 modelt = aModel * vec4(aPosition, 1.0);
					vFragmentPos = modelt.xyz;
				}
			`,
			fragment: `#version 300 es

				precision mediump float; 

				struct Material {
				    sampler2D diffuse;
				    sampler2D specular;
				    float     shininess;
				};  
				
				struct Light {
					vec3 position;
				  
					vec3 ambient;
					vec3 diffuse;
					vec3 specular;
				};								
				
				uniform sampler2D uTextureSampler;
				
				uniform float uAmbientStrength;
				uniform vec3 uLightPos;
				uniform vec3 uLightColor;
				uniform vec3 uViewPos;
				
				in vec2 vTexturePos;
				in vec3 vNormal;
				in vec3 vFragmentPos;

				
				out vec4 color;

				void main() {
					vec3 norm = normalize(vNormal);
					vec3 lightDir = normalize(uLightPos - vFragmentPos);	// L
					
					// ambient
					vec3 ambient = uAmbientStrength * uLightColor * vec3(texture(uTextureSampler, vTexturePos));
					
					// diffse
					float diff = max(dot(norm, lightDir), 0.0);
					vec3 diffuse = diff * uLightColor * vec3(texture(uTextureSampler, vTexturePos));
					
					// specular
					vec3 specular;
					if (diff>0.0) {
						vec3 viewDir = normalize(uViewPos - vFragmentPos); 
						vec3 reflectDir = reflect(norm, lightDir);
						float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
						specular = specularStrength * spec * uLightColor;
					}  
					
					color = vec4( ambient + diffuse + specular, 1.0 ); 
				
				}
			`,
			attributes : ["aPosition", "aTexture", "aNormal", "aModel"],
			uniforms: ["uProjection", "uModelView", "uTextureSampler", "uAmbientStrength", "uLightPos", "uLightColor"],
			defines: {
				"specularStrength": "0.5",
			}
		});

		this.setMatrix4fv("uProjection", false, Matrix4.create());
		this.setMatrix4fv("uModelView", false, Matrix4.create());
	}

	use() {
		const gl = this._gl;

		gl.useProgram(this._shaderProgram);
	}

	notUse() {
		const gl = this._gl;

		gl.disableVertexAttribArray(0);
		gl.disableVertexAttribArray(1);
		gl.disableVertexAttribArray(2);
		gl.disableVertexAttribArray(3);
		gl.disableVertexAttribArray(4);
		gl.disableVertexAttribArray(5);
		gl.disableVertexAttribArray(6);

		gl.useProgram(null);
	}

	createVAO(gl: WebGL2RenderingContext, geometryInfo: VAOGeometryInfo, material: Material) : ShaderVAOInfo {

		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		for(let i = 0; i < 6; i++) {
			gl.enableVertexAttribArray(i);
		}

		const instanceCount = geometryInfo.instanceCount || 1;

		const glGeometryBuffer = Shader.createAttributeInfo(gl, 0, new Float32Array(geometryInfo.vertex), 12, 0);
		const glUVBuffer = Shader.createAttributeInfo(gl, 1, new Float32Array(geometryInfo.uv), 8, 0);
		const glNormalBuffer = Shader.createAttributeInfo(gl, 2, new Float32Array(geometryInfo.normal), 12, 0);
		const glInstancedModelTransformBuffer = Shader.createInstancedModelMatrix(gl, instanceCount, 3);

		let glBufferIndex: WebGLBuffer = null;
		let vertexCount = (geometryInfo.vertex.length/3)|0;
		if (geometryInfo.index) {
			glBufferIndex = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, glBufferIndex);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometryInfo.index), gl.STATIC_DRAW);
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
		rc.getMaterial().definition.diffuse.enableAsUnit(gl, 0);
		this.set1I("uTextureSampler", 0);
		this.setMatrix4fv("uModelView", false, e.cameraMatrix());

		gl.bindVertexArray(info.vao);

		if (info.indexBuffer!==null) {
			gl.drawElementsInstanced(gl.TRIANGLES, info.vertexCount, gl.UNSIGNED_SHORT, 0, info.instanceCount);
		} else {
			gl.drawArraysInstanced(gl.TRIANGLES, 0, info.vertexCount, info.instanceCount);
		}

		gl.bindVertexArray(null);
		this.notUse();
	}
}