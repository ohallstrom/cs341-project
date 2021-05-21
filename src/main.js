
import {createREGL} from "../lib/regljs_2.1.0/regl.module.js"
import {vec2, vec3, vec4, mat2, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {DOM_loaded_promise, load_text, load_image, register_button_with_hotkey, register_keyboard_action} from "./icg_web.js"
import {deg_to_rad, mat4_to_string, vec_to_string, mat4_matmul_many, vec4FromVec3} from "./icg_math.js"
import {mesh_load_obj, icg_mesh_make_uv_sphere} from "./icg_mesh.js"

import {init_light} from "./light.js"
import {init_scene} from "./scene.js"


async function main() {
	/* const in JS means the variable will not be bound to a new value, but the value can be modified (if its an object or array)
		https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const
	*/

	// We are using the REGL library to work with webGL
	// http://regl.party/api
	// https://github.com/regl-project/regl/blob/master/API.md
	const regl = createREGL({
		profile: true, // if we want to measure the size of buffers/textures in memory
		extensions: ['oes_texture_float'], // float textures
	});
	// The <canvas> (HTML element for drawing graphics) was created by REGL, lets take a handle to it.
	const canvas_elem = document.getElementsByTagName('canvas')[0];

	const debug_overlay = document.getElementById('debug-overlay');
	const debug_text = document.getElementById('debug-text');


	/*---------------------------------------------------------------
		Resource loading
	---------------------------------------------------------------*/

	/*
	The textures fail to load when the site is opened from local file (file://) due to "cross-origin".
	Solutions:
	* run a local webserver
		python -m http.server 8000
		# open localhost:8000
	OR
	* run chromium with CLI flag
		"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files index.html

	* edit config in firefox
		security.fileuri.strict_origin_policy = false
	*/
	// Start downloads in parallel
	const resources = {
		'shader_shadowmap_gen_vert': load_text('./src/shaders/shadowmap_gen.vert.glsl'),
		'shader_shadowmap_gen_frag': load_text('./src/shaders/shadowmap_gen.frag.glsl'),
		'shader_vis_vert': load_text('./src/shaders/cubemap_visualization.vert.glsl'),
		'shader_vis_frag': load_text('./src/shaders/cubemap_visualization.frag.glsl'),

		'shader_ambient_vert':      load_text('./src/shaders/ambient_color.vert.glsl'),
		'shader_ambient_frag':      load_text('./src/shaders/ambient_color.frag.glsl'),
		'shader_phong_shadow_vert': load_text('./src/shaders/phong_shadow.vert.glsl'),
		'shader_phong_shadow_frag': load_text('./src/shaders/phong_shadow.frag.glsl'),
		'shader_cell_shadow_vert': load_text('./src/shaders/cell_shadow.vert.glsl'),
		'shader_cell_shadow_frag': load_text('./src/shaders/cell_shadow.frag.glsl'),
		
		'shader_viscube_vert': load_text('./src/shaders/cubemap_visualization_cube.vert.glsl'),
		'shader_viscube_frag': load_text('./src/shaders/cubemap_visualization_cube.frag.glsl'),

		'mesh_car': mesh_load_obj(regl, './meshes/racing_car.obj', {
			wheels: [0.2,0.2,0.2],
			car_body_1: [1.,1.,1.],
			car_body: [0.86,0.1,0.1],
			engine_grille: [0.6,0.6,0.6],
			rear_lights: [1.,0.8,0.],
			glass: [0.3,0.75,1.],
			headlight: [1.,0.8,0.],

		}),
		'mesh_planet': mesh_load_obj(regl, './meshes/planet.obj', {
			planet: [0.2, 1., 0.2],

		}),
		'mesh_sun': mesh_load_obj(regl, './meshes/sun.obj', {
			sun: [0.9, 0.9, 0.1],
		}),
		'mesh_rocket': mesh_load_obj(regl, './meshes/rocket.obj', {
			Material: [1.,0.2,0.],
			Material2: [1.,1.,1.],
			Material3: [1.,1.,1.],
			Material4: [1.,1.,0.],
			Material5: [1.,1.,0.],
			Material6: [0.2,0.2,0.2],
		}),
		'mesh_marvin': mesh_load_obj(regl, './meshes/marvin.obj', {
			Alien: [1.,1.,1.],
		}),
	};

	for(let cube_side = 0; cube_side < 6; cube_side++) {
		resources[`tex_cube_side_${cube_side}`] = load_image(`./textures/cube_side_${cube_side}.png`);
	}

	// Wait for all downloads to complete
	for (const key in resources) {
		if (resources.hasOwnProperty(key)) {
			resources[key] = await resources[key]
		}
	}


	/*---------------------------------------------------------------
		Camera
	---------------------------------------------------------------*/
	const mat_world_to_cam = mat4.create();
	const cam_distance_base = 15;

	let cam_angle_z =  Math.PI / 5; // in radians!
	let cam_angle_y = -Math.PI / 6; // in radians!
	let cam_distance_factor = 1.;

	let cam_target = [0, 0, 0];

	function update_cam_transform() {
		/*
		Calculate the world-to-camera transformation matrix.
		The camera orbits the scene
		* cam_distance_base * cam_distance_factor = distance of the camera from the (0, 0, 0) point
		* cam_angle_z - camera ray's angle around the Z axis
		* cam_angle_y - camera ray's angle around the Y axis

		* cam_target - the point we orbit around
		*/
		
		// Example camera matrix, looking along forward-X, edit this
		const dist = cam_distance_base * cam_distance_factor;
		const look_at = mat4.lookAt(mat4.create(),
			[dist, 0, 0], // camera position in world coord
			cam_target, // view target point
			[0, 0, 1], // up vector
		);
		// Store the combined transform in mat_world_to_cam
		// mat_world_to_cam = A * B * ...
		//Adding 180 degrees offset as proposed by teaching assistant.
		const M_rotatZ = mat4.fromZRotation(mat4.create(), cam_angle_z + Math.PI);
		const M_rotatY = mat4.fromYRotation(mat4.create(), - cam_angle_y );

		mat4_matmul_many(mat_world_to_cam, look_at, M_rotatY, M_rotatZ);
	}

	update_cam_transform();

	// Rotate camera position by dragging with the mouse
	canvas_elem.addEventListener('mousemove', (event) => {
		// if left or middle button is pressed
		if (event.buttons & 1 || event.buttons & 4) {
			if (event.shiftKey) {
				const r = mat2.fromRotation(mat2.create(), -cam_angle_z);
				const offset = vec2.transformMat2([0, 0], [event.movementY, event.movementX], r);
				vec2.scale(offset, offset, -0.01);
				cam_target[0] += offset[0];
				cam_target[1] += offset[1];
			} else {
				cam_angle_z += event.movementX*0.005;
				cam_angle_y += -event.movementY*0.005;
			}
			update_cam_transform();
		}

	});

	canvas_elem.addEventListener('wheel', (event) => {
		// scroll wheel to zoom in or out
		const factor_mul_base = 1.08;
		const factor_mul = (event.deltaY > 0) ? factor_mul_base : 1./factor_mul_base;
		cam_distance_factor *= factor_mul;
		cam_distance_factor = Math.max(0.1, Math.min(cam_distance_factor, 4));
		// console.log('wheel', event.deltaY, event.deltaMode);
		event.preventDefault(); // don't scroll the page too...
		update_cam_transform();
	})


	/*---------------------------------------------------------------
		Actors
	---------------------------------------------------------------*/

	const {actors, update_simulation, render_ambient} = init_scene(regl, resources);

	const Light = init_light(regl, resources);

	const lights = [
		
		new Light({
			update: (light, {sim_time}) => {
				light.position = [35*Math.cos(sim_time*0.05), 35*Math.sin(sim_time*0.05), 0.]
			},
			color: [1., 1., 1.],
			intensity: 100.,
		}),

	];


	//head lights:
	const headl_R = new Light({
			update: (light, {sim_time}) => {
				light.position = [-0.75,12.95* -(Math.sin((sim_time+0.3)*0.5)),( 12.95* Math.cos((sim_time+0.3)*0.5))];
			},
			color: [1., 0.9, 0.2],
			intensity: 0.65,
		});
	const headl_L = new Light({
			update: (light, {sim_time}) => {
				light.position = [0.75,12.95* -(Math.sin((sim_time+0.3)*0.5)),( 12.95* Math.cos((sim_time+0.3)*0.5))];
			},
			color: [1., 0.9, 0.2],
			intensity: 0.65,
		});
	
		
	/*
		UI
	*/
	let sim_time = 0;
	let prev_regl_time = 0;

	let is_paused = false;
	register_button_with_hotkey('btn-pause', 'p', () => {
		is_paused = !is_paused
	})

	let cell_is_used = false;
	register_button_with_hotkey('btn-shade','s', () => {
		cell_is_used = !cell_is_used
	})

	register_keyboard_action('z', () => {
		debug_overlay.classList.toggle('hide');
	})

	let light_on= false;
	register_button_with_hotkey('btn-shade','l', () => {
		light_on = !light_on
		if (light_on){
			lights.push(headl_R);
			lights.push(headl_L);
		}else{
			lights.pop();
			lights.pop();
		}
	})
	// let speed = get_car_speed();
	// register_keyboard_action('u', () => {
	// 	if (speed < 1.){
	// 		speed += 0.1;
	// 		set_car_speed(speed);
	// 	}
	// })

	// register_keyboard_action('d', () => {
	// 	if (speed > 0.){
	// 		speed -= 0.1;
	// 		set_car_speed(speed);
	// 	}
	// })

	function activate_preset_view() {
		is_paused = true;
		sim_time = 24.0;
		cam_angle_z = 0.; //- Math.PI * 0.50;
		cam_angle_y = 0.; //- Math.PI * (1./6.);
		cam_distance_factor = 0.8;
		cam_target = [0, 0, 12];		
		update_cam_transform();
	}
	register_button_with_hotkey('btn-preset-view', 'c', activate_preset_view)

	/*---------------------------------------------------------------
		Frame render
	---------------------------------------------------------------*/
	const mat_projection = mat4.create();
	const mat_view = mat4.create();

	regl.frame((frame) => {
		if (! is_paused) {
			const dt = frame.time - prev_regl_time;
			sim_time += dt;
		}
		prev_regl_time = frame.time;

		mat4.perspective(mat_projection,
			deg_to_rad * 60, // fov y
			frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
			0.01, // near
			100, // far
		)

		mat4.copy(mat_view, mat_world_to_cam);

		var active_mat_view = mat_view;
		var active_mat_projection = mat_projection;

		for (const light of lights) {
			light.update_simulation({sim_time: sim_time});
		}
		update_simulation({sim_time: sim_time, actors: actors});

		const light_to_visulaize = lights[lights.length - 1];
		const scene_info = {
			sim_time:        sim_time,
			mat_view:        active_mat_view, // can differ from mat_view for debugging!
			scene_mat_view:  mat_view,
			mat_projection:  active_mat_projection, // can differ from mat_projection for debugging!
			actors:          actors,
			ambient_light_color: vec3.fromValues(0.4, 0.4, 0.4),
			cell_is_used: 	 cell_is_used,
		}

		regl.clear({color: [0.0, 0.0, 0.0, 1]});

		render_ambient(scene_info);

		for (const light of lights) {
			light.render_shadowmap(scene_info)


			light.draw_phong_contribution(scene_info);
		}
		
		// if (light_on){
		// 	// const headl = new Light({
		// 	// 	position: [0.,0.,-20.],
		// 	// 	color: [1.,0.5,0.5],
		// 	// 	intensity: 20.,
		// 	// })
		// 	const headlights = new Light({
		// 		update: (light, {sim_time}) => {
		// 			light.position = [0., -13., 13.]
		// 		},
		// 		color: [1., 1., 1.],
		// 		intensity: 200.,
		// 	})
		// 	// headl.render_shadowmap(scene_info);
		// 	// headl.draw_phong_contribution(scene_info);
		// 	headlights.render_shadowmap(scene_info);
		// 	headlights.draw_phong_contribution(scene_info);
		// }



// 		debug_text.textContent = `
// Hello! Sim time is ${sim_time.toFixed(2)} s
// Camera: angle_z ${(cam_angle_z / deg_to_rad).toFixed(1)}, angle_y ${(cam_angle_y / deg_to_rad).toFixed(1)}, distance ${(cam_distance_factor*cam_distance_base).toFixed(1)}
// `;
	});
}

DOM_loaded_promise.then(main);
