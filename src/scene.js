import {vec3, vec4, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {mat4_to_string, vec_to_string, mat4_matmul_many} from "./icg_math.js"

//DECLARATION OF CONSTANTS
const RADIUS_PLANET = 12.;

var car_speed = 0.5;
export function init_scene(regl, resources) {

	const ambient_pass_pipeline = regl({
		attributes: {
			position: regl.prop('mesh.vertex_positions'),
			color:    regl.prop('mesh.vertex_color'),
		},
		// Faces, as triplets of vertex indices
		elements: regl.prop('mesh.faces'),

		// Uniforms: global data available to the shader
		uniforms: {
			mat_mvp:     regl.prop('mat_mvp'),
			light_color: regl.prop('ambient_light_color'),
		},	
		
		vert: resources.shader_ambient_vert,
		frag: resources.shader_ambient_frag,

		cull: {enable: false},
	});

	const perlin_pass_pipeline = regl({
		attributes: {
			position: regl.prop('mesh.vertex_positions'),
			color:    regl.prop('mesh.vertex_color'),
		},
		// Faces, as triplets of vertex indices
		elements: regl.prop('mesh.faces'),

		// Uniforms: global data available to the shader
		uniforms: {
			mat_mvp:     regl.prop('mat_mvp'),
			light_color: regl.prop('ambient_light_color'),
		},	

		vert: resources.shader_perlin_vert,
		frag: resources.shader_perlin_frag,

		cull: {enable: false},
	});

	function update_simulation(scene_info) {
		scene_info.actors.forEach(actor => {
			if (actor.animation_tick) {
				actor.animation_tick(actor, scene_info);
			}
		});
	}
	
	function render_ambient({actors, mat_view, mat_projection, ambient_light_color}) {
		const batch_draw_calls = actors.map((actor) => {
			const mat_model      = actor.mat_model;
			const mat_mvp        = mat4.create();
			const mat_model_view = mat4.create();

			mat4_matmul_many(mat_model_view, mat_view, mat_model);
			mat4_matmul_many(mat_mvp, mat_projection, mat_model_view);

			return {
				mesh:        actor.mesh,
				mat_mvp:     mat_mvp,
				ambient_light_color: ambient_light_color,
			}
		});
		ambient_pass_pipeline(batch_draw_calls);
	};

	function render_perlin({actors, mat_view, mat_projection, ambient_light_color}) {
		const batch_draw_calls = actors.map((actor) => {
			const mat_model      = actor.mat_model;
			const mat_mvp        = mat4.create();
			const mat_model_view = mat4.create();

			mat4_matmul_many(mat_model_view, mat_view, mat_model);
			mat4_matmul_many(mat_mvp, mat_projection, mat_model_view);

			return {
				mesh:        actor.mesh,
				mat_mvp:     mat_mvp,
				ambient_light_color: ambient_light_color,
			}
		});

		perlin_pass_pipeline(batch_draw_calls);
	};

	const scene_actors = [
		{ //car
			mesh: resources.mesh_car,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.1));
		 		//actor.mat_model = translation
				const rotation = mat4.fromXRotation(actor.mat_model, sim_time *car_speed);
				actor.mat_model = mat4.multiply(mat4.create(), rotation, translation);
				//mat4_matmul_many(actor.mat_model, rotation);			
			},
		},
		{ //sun
			mesh: resources.mesh_sun,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(40., 0., 0.));	
				const rotation = mat4.fromZRotation(actor.mat_model, sim_time * 0.05);
				const composed = mat4.multiply(mat4.create(), rotation, translation);
				actor.mat_model = mat4.scale(mat4.create(), composed, vec3.fromValues(2., 2., 2.));
			},
		},
		{ //rocket
			mesh: resources.mesh_rocket,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				actor.mat_model = mat4.fromTranslation(mat4.create(), vec3.fromValues(2., 0., RADIUS_PLANET));				
			},
		},
	
		{ //marvin
			mesh: resources.mesh_marvin,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				actor.mat_model = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0., RADIUS_PLANET));				
			},
		},
		
	];

	const perlin_actors = [
		{ //planet
			mesh: resources.mesh_planet,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				actor.mat_model = mat4.scale(mat4.create(), mat4.create(), vec3.fromValues(RADIUS_PLANET,RADIUS_PLANET,RADIUS_PLANET));
			},
		},
	];

	return {
		actors: scene_actors,
		perlin_actors: perlin_actors,
		update_simulation,
		render_ambient,
		render_perlin,
	}
}


