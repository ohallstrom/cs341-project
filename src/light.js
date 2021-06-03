import {vec3, vec4, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {mat4_matmul_many, vec3FromVec4, vec4FromVec3} from "./icg_math.js"
import {transformMat4} from "../lib/gl-matrix_3.3.0/esm/vec3.js";


export function init_light(regl, resources) {
	// The shadow map buffer is shared by all the lights
	const shadow_cubemap = regl.framebufferCube({
		radius:      1024,
		colorFormat: 'rgba', // GLES 2.0 doesn't support single channel textures : (
		colorType:   'float',
	});

	const shadowmap_generation_pipeline = regl({
		attributes: {
			position: regl.prop('mesh.vertex_positions'),
		},
		// Faces, as triplets of vertex indices
		elements: regl.prop('mesh.faces'),

		// Uniforms: global data available to the shader
		uniforms: {
			mat_mvp:        regl.prop('mat_mvp'),
			mat_model_view: regl.prop('mat_model_view'),
		},

		vert: resources.shader_shadowmap_gen_vert,
		frag: resources.shader_shadowmap_gen_frag,

		// Where the result gets written to:
		framebuffer: regl.prop('out_buffer'),
	});

	const phong_lighting_pipeline = regl({
		attributes: {
			position:       regl.prop('mesh.vertex_positions'),
			normal:         regl.prop('mesh.vertex_normals'),
			diffuse_color:  regl.prop('mesh.vertex_color'),
			specular_color: regl.prop('mesh.vertex_color'),
		},
		// Faces, as triplets of vertex indices
		elements: regl.prop('mesh.faces'),

		// Uniforms: global data available to the shader
		uniforms: {
			mat_mvp:        regl.prop('mat_mvp'),
			mat_model:      regl.prop('mat_model'),
			mat_model_view: regl.prop('mat_model_view'),
			mat_normals:    regl.prop('mat_normals'),

			light_position:  regl.prop('light_position'),
			light_color:     regl.prop('light_color'),
			shadow_cubemap:  shadow_cubemap,

			shininess: 0.5,
		},

		vert: resources.shader_phong_shadow_vert,
		frag: resources.shader_phong_shadow_frag,

		blend: {
            enable: true,
            func: {
                src: 1,
                dst: 1,
            },
        },

		depth: {
			enable: true,
			mask: true,
			func: '<=',
		},

		cull: {enable: false},
	});

	const phong_perlin_lighting_pipeline = regl({
		attributes: {
			position:       regl.prop('mesh.vertex_positions'),
			normal:         regl.prop('mesh.vertex_normals'),
		},
		// Faces, as triplets of vertex indices
		elements: regl.prop('mesh.faces'),

		// Uniforms: global data available to the shader
		uniforms: {
			mat_mvp:        regl.prop('mat_mvp'),
			mat_model:      regl.prop('mat_model'),
			mat_model_view: regl.prop('mat_model_view'),
			mat_normals:    regl.prop('mat_normals'),

			light_position:  regl.prop('light_position'),
			light_color:     regl.prop('light_color'),
			shadow_cubemap:  shadow_cubemap,

			shininess: 0.5,
		},

		vert: resources.shader_perlin_phong_shadow_vert,
		frag: resources.shader_perlin_phong_shadow_frag,

		blend: {
            enable: true,
            func: {
                src: 1,
                dst: 1,
            },
        },

		depth: {
			enable: true,
			mask: true,
			func: '<=',
		},

		cull: {enable: false},
	});

	const cell_lighting_pipeline = regl({
		attributes: {
			position:       regl.prop('mesh.vertex_positions'),
			normal:         regl.prop('mesh.vertex_normals'),
			diffuse_color:  regl.prop('mesh.vertex_color'),
			specular_color: regl.prop('mesh.vertex_color'),
		},
		// Faces, as triplets of vertex indices
		elements: regl.prop('mesh.faces'),

		// Uniforms: global data available to the shader
		uniforms: {
			mat_mvp:        regl.prop('mat_mvp'),
			mat_model:      regl.prop('mat_model'),
			mat_model_view: regl.prop('mat_model_view'),
			mat_normals:    regl.prop('mat_normals'),

			light_position:  regl.prop('light_position'),
			light_color:     regl.prop('light_color'),
			shadow_cubemap:  shadow_cubemap,

			shininess: 0.5,
		},

		vert: resources.shader_cell_shadow_vert,
		frag: resources.shader_cell_shadow_frag,

		blend: {
            enable: true,
            func: {
                src: 1,
                dst: 1,
            },
        },

		depth: {
			enable: true,
			mask: true,
			func: '<=',
		},

		cull: {enable: false},
	});

	const cell_perlin_lighting_pipeline = regl({
		attributes: {
			position:       regl.prop('mesh.vertex_positions'),
			normal:         regl.prop('mesh.vertex_normals'),
		},
		// Faces, as triplets of vertex indices
		elements: regl.prop('mesh.faces'),

		// Uniforms: global data available to the shader
		uniforms: {
			mat_mvp:        regl.prop('mat_mvp'),
			mat_model:      regl.prop('mat_model'),
			mat_model_view: regl.prop('mat_model_view'),
			mat_normals:    regl.prop('mat_normals'),

			light_position:  regl.prop('light_position'),
			light_color:     regl.prop('light_color'),
			shadow_cubemap:  shadow_cubemap,

			shininess: 0.8,
		},

		vert: resources.shader_perlin_cell_shadow_vert,
		frag: resources.shader_perlin_cell_shadow_frag,

		blend: {
            enable: true,
            func: {
                src: 1,
                dst: 1,
            },
        },

		depth: {
			enable: true,
			mask: true,
			func: '<=',
		},

		cull: {enable: false},
	});

	const cube_camera_projection = mat4.perspective(mat4.create(), Math.atan(1) * 2, 1, 0.1, 100); 

	class Light {
		constructor({position, color, intensity, update} = {color: [1., 0.5, 0.], intensity: 5, update: null}) {
			this.position = position;
			this.color = color;
			this.intensity = intensity;
			this.update_simulation_func = update;
		}

		update_simulation(sim_info) {
			if (this.update_simulation_func) {
				this.update_simulation_func(this, sim_info);
			}
		}

		cube_camera_view(side_idx, scene_view) {

			let center = [0,0,0]
			let up = [0,0,0]
			if (side_idx == 0) {
				center = [1,0,0]
				up = [0,1,0]
			} else if (side_idx == 1) {
				center = [-1,0,0]
				up = [0,1,0]
			} else if (side_idx == 2) {
				center = [0,1,0]
				up = [0,0,-1]
			} else if (side_idx == 3) {
				center = [0,-1,0]
				up = [0,0,1]
			} else if (side_idx == 4) {
				center = [0,0,1]
				up = [0,1,0]
			} else if (side_idx == 5) {
				center = [0,0,-1]
				up = [0,1,0]
			}
			//transforming the position into eye coordinates
			let pos_eye = transformMat4(vec3.create(), this.position, scene_view);
			//adding the position as an offset
			let center_offseted = vec3.add(vec3.create(), pos_eye, center);
			let look_at = mat4.lookAt(mat4.create(), pos_eye, center_offseted, up);
			return mat4_matmul_many(mat4.create(), look_at, scene_view);
		}

		render_shadowmap(scene_info) {
			const actors = scene_info.actors;
			const scene_view = scene_info.scene_mat_view;

			for(let side_idx = 0; side_idx < 6; side_idx ++) {
				const out_buffer = shadow_cubemap.faces[side_idx];

				// clear buffer, set distance to max
				regl.clear({
					color: [0, 0, 0, 1],
					depth: 1,
					framebuffer: out_buffer,
				});

				const batch_draw_calls = actors.map(actor => {
					const mat_model_view = mat4.create();
					mat4.multiply(mat_model_view, this.cube_camera_view(side_idx, scene_view), actor.mat_model);
					const mat_mvp = mat4.create();
					mat4_matmul_many(mat_mvp, cube_camera_projection, mat_model_view);

					return {
						mesh: actor.mesh,
						mat_mvp: mat_mvp,
						mat_model_view: mat_model_view,
						out_buffer: out_buffer,
					};
				});

				// Measure new distance map
				shadowmap_generation_pipeline(batch_draw_calls);
			}
		}

		draw_phong_contribution({actors, mat_view, mat_projection, cell_is_used}) {
			const light_position_cam = vec3FromVec4(vec4.transformMat4(vec4.create(), vec4FromVec3(this.position, 1.0), mat_view));

			const batch_draw_calls = actors.map((actor) => {
				const mat_mvp        = mat4.create();
				const mat_model_view = mat4.create();
				const mat_normals    = mat3.create();

				mat4_matmul_many(mat_model_view, mat_view, actor.mat_model);
				mat4_matmul_many(mat_mvp, mat_projection, mat_model_view);

				mat3.fromMat4 (mat_normals, mat_model_view);
				mat3.transpose(mat_normals, mat_normals);
				mat3.invert   (mat_normals, mat_normals);

				return {
					mesh:           actor.mesh,
					mat_mvp:        mat_mvp,
					mat_model:      actor.mat_model,
					mat_model_view: mat_model_view,
					mat_normals:    mat_normals,

					light_position:  light_position_cam,
					light_color:     vec3.scale(vec3.create(), this.color, this.intensity),
				}
			});
			if (cell_is_used) {
				cell_lighting_pipeline(batch_draw_calls);
			} else {
				phong_lighting_pipeline(batch_draw_calls);
			}
			
		}

		draw_perlin_phong_contribution({actors, mat_view, mat_projection, cell_is_used}) {
			const light_position_cam = vec3FromVec4(vec4.transformMat4(vec4.create(), vec4FromVec3(this.position, 1.0), mat_view));

			const batch_draw_calls = actors.map((actor) => {
				const mat_mvp        = mat4.create();
				const mat_model_view = mat4.create();
				const mat_normals    = mat3.create();

				mat4_matmul_many(mat_model_view, mat_view, actor.mat_model);
				mat4_matmul_many(mat_mvp, mat_projection, mat_model_view);

				mat3.fromMat4 (mat_normals, mat_model_view);
				mat3.transpose(mat_normals, mat_normals);
				mat3.invert   (mat_normals, mat_normals);

				return {
					mesh:           actor.mesh,
					mat_mvp:        mat_mvp,
					mat_model:      actor.mat_model,
					mat_model_view: mat_model_view,
					mat_normals:    mat_normals,

					light_position:  light_position_cam,
					light_color:     vec3.scale(vec3.create(), this.color, this.intensity),
				}
			});
			if (cell_is_used) {
				cell_perlin_lighting_pipeline(batch_draw_calls);
			} else {
				phong_perlin_lighting_pipeline(batch_draw_calls);
			}
			
		}
	}

	return Light;
}
