import {vec2} from "../lib/gl-matrix_3.3.0/esm/index.js"

export function init_noise(regl, resources) {
    const perlin_noise_shader = resources['shaders/perlin.frag.glsl']
	const noise_pass_pipeline = regl({
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
}
