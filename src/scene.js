import {vec3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {mat4_matmul_many} from "./icg_math.js"

//DECLARATION OF CONSTANTS
const RADIUS_PLANET = 12.;
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
		},

		elements: regl.prop('mesh.faces'),

		uniforms: {
			mat_mvp:     regl.prop('mat_mvp'),
		},	

		vert: resources.shader_perlin_vert,
		frag: resources.shader_perlin_frag,

		cull: {enable: false},
	});

	const bloom_pass_pipeline = regl({
		attributes: {
			position: regl.prop('mesh.vertex_positions'),
		},

		elements: regl.prop('mesh.faces'),

		uniforms: {
			mat_mvp:     regl.prop('mat_mvp'),
		},	

		vert: resources.shader_bloom_vert,
		frag: resources.shader_bloom_frag,

		cull: {enable: false},
	});

	function update_simulation(scene_info) {
		scene_info.actors.forEach(actor => {
			if (actor.animation_tick) {
				actor.animation_tick(actor, scene_info);
			}
		});
	}
	function update_car_angle(scene_info){
		scene_info.actors.forEach(actor =>{
			actor.old_angle = actor.tot_angle;
			actor.time_changement_speed = scene_info.sim_time;
		})
	}
	function update_car_speed(scene_info){
		scene_info.actors.forEach(actor => {
			actor.car_speed = scene_info.car_speed;
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

			mat4_matmul_many(mat_mvp, mat_projection, mat_view, mat_model);

			return {
				mesh:        actor.mesh,
				mat_mvp:     mat_mvp,
			}
		});

		perlin_pass_pipeline(batch_draw_calls);
	};

	function render_bloom({actors, mat_view, mat_projection}) {
		const batch_draw_calls = actors.map((actor) => {
			const mat_model      = actor.mat_model;
			const mat_mvp        = mat4.create();

			mat4_matmul_many(mat_mvp, mat_projection, mat_view, mat_model);

			return {
				mesh:        actor.mesh,
				mat_mvp:     mat_mvp,
			}
		});

		bloom_pass_pipeline(batch_draw_calls);
	};
	function noise(time) {
		return Math.cos(Math.PI*Math.random())*0.01;
	}

	const scene_actors = [
		{ //rocket
			mesh: resources.mesh_rocket,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,1.3*RADIUS_PLANET));
				const rotation = mat4.fromXRotation(actor.mat_model,-sim_time * 0.2);
				actor.mat_model = mat4.multiply(mat4.create(), rotation, translation);				
			},
		},

		{ //marvin1
			mesh: resources.mesh_marvin1,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				actor.mat_model = mat4.fromTranslation(mat4.create(), vec3.fromValues(-2., -2.,RADIUS_PLANET-0.9));
			},
		},
	
		{ //marvin2
			mesh: resources.mesh_marvin2,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const scale = mat4.scale(mat4.create(), mat4.create(), vec3.fromValues(1.2,1.2,1.2));
				const transl =mat4.fromTranslation(mat4.create(), vec3.fromValues(-3.7, -2.,RADIUS_PLANET-0.9));
				mat4_matmul_many(actor.mat_model, transl, scale );
			},
		},

		{ //marvin3
			mesh: resources.mesh_marvin3,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const scale = mat4.scale(mat4.create(), mat4.create(), vec3.fromValues(0.7,0.7,0.7));
				const transl =mat4.fromTranslation(mat4.create(), vec3.fromValues(-2.3, -1.,RADIUS_PLANET-0.8));
				mat4_matmul_many(actor.mat_model, transl, scale );
			},
		},
		{ //crazyMarv
			mesh: resources.mesh_marvin1,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.1));
				const rotationX = mat4.fromXRotation(mat4.identity(mat4.create()), 10.);
				const rotationY = mat4.fromYRotation(mat4.identity(mat4.create()), 0.5)
				const rotationZ = mat4.fromZRotation(actor.mat_model,Math.sin(sim_time));
				actor.mat_model = mat4_matmul_many(mat4.create(), rotationX, rotationY, translation, rotationZ);
			},
		},

		{ //CrazyMarv's hair
			mesh: resources.mesh_tree1,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.1));
				const rotationX = mat4.fromXRotation(mat4.identity(mat4.create()), 10.);
				const rotationY = mat4.fromYRotation(mat4.identity(mat4.create()), 0.5)
				const rotationZ = mat4.fromZRotation(actor.mat_model,Math.sin(sim_time));
				actor.mat_model = mat4_matmul_many(mat4.create(), rotationX, rotationY, translation, rotationZ);
			},
		},

		{ //tree1
			mesh: resources.mesh_tree1,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.1));
				const rotationX = mat4.fromXRotation(mat4.identity(mat4.create()), 1.45);
				const rotationY = mat4.fromYRotation(mat4.identity(mat4.create()), 0.9)
				actor.mat_model = mat4_matmul_many(mat4.create(), rotationX, rotationY, translation);
			},
		},
		{ //tree2
			mesh: resources.mesh_tree2,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.1));
				const rotationX = mat4.fromXRotation(mat4.identity(mat4.create()), 1.5);
				const rotationY = mat4.fromYRotation(mat4.identity(mat4.create()), -0.7)
				actor.mat_model = mat4_matmul_many(mat4.create(), rotationX, rotationY, translation);
			},
		},
		{ //tree3
			mesh: resources.mesh_tree2,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.1));
				const rotationX = mat4.fromXRotation(mat4.identity(mat4.create()), 1.55);
				const rotationY = mat4.fromYRotation(mat4.identity(mat4.create()), 0.78)
				actor.mat_model = mat4_matmul_many(mat4.create(), rotationX, rotationY, translation);
			},
		},
		{ //tree4
			mesh: resources.mesh_tree3,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.1));
				const rotationX = mat4.fromXRotation(mat4.identity(mat4.create()), 3.);
				const rotationY = mat4.fromYRotation(mat4.identity(mat4.create()), 0.3)
				actor.mat_model = mat4_matmul_many(mat4.create(), rotationX, rotationY, translation);
			},
		},
		{ //tree4
			mesh: resources.mesh_tree3,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.1));
				const rotationX = mat4.fromXRotation(mat4.identity(mat4.create()), 1.8);
				const rotationY = mat4.fromYRotation(mat4.identity(mat4.create()), -0.42)
				actor.mat_model = mat4_matmul_many(mat4.create(), rotationX, rotationY, translation);
			},
		},
		{ //sat
			mesh: resources.mesh_sat,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				const rotationZ = mat4.fromZRotation(mat4.identity(mat4.create()), Math.PI/2 + 0.9);
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.15));
				const rotationX = mat4.fromXRotation(mat4.identity(mat4.create()), 3*Math.PI/2);
				const rotationY = mat4.fromYRotation(mat4.identity(mat4.create()), -0.42)
				actor.mat_model = mat4_matmul_many(mat4.create(), rotationX, rotationY, translation, rotationZ);
			},
		},
		
		
		
	];
	const car_actors = [
		{//car
			mesh: resources.mesh_car,
			mat_model: mat4.create(),
			car_speed: 0.5,
			tot_angle: 0.,
			old_angle: 0.,
			time_changement_speed: 0.,
			animation_tick: (actor, {sim_time})=> {
				let new_angle = (sim_time-actor.time_changement_speed) * actor.car_speed;
				actor.tot_angle = actor.old_angle + new_angle
				const noise_rotation = mat4.fromZRotation(mat4.create(),noise(sim_time));
				const translation = mat4.fromTranslation(mat4.create(), vec3.fromValues(0., 0.,RADIUS_PLANET-0.1));
				const rotation = mat4.fromXRotation(actor.mat_model,actor.tot_angle);
				actor.mat_model = mat4_matmul_many(mat4.create(), rotation, translation, noise_rotation);	
			},
		},
	]

	const perlin_actors = [
		{ //planet
			mesh: resources.mesh_planet,
			mat_model: mat4.create(),
			animation_tick: (actor, {sim_time}) => {
				actor.mat_model = mat4.scale(mat4.create(), mat4.create(), vec3.fromValues(RADIUS_PLANET,RADIUS_PLANET,RADIUS_PLANET));
			},
		},
	];

	const bloom_actors = [
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

	];


	return {
		actors: scene_actors,
		perlin_actors: perlin_actors,
		bloom_actors: bloom_actors,
		car_actors: car_actors,
		update_simulation,
		update_car_speed,
		update_car_angle,
		render_ambient,
		render_perlin,
		render_bloom,
	}
}


