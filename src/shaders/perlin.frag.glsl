// this version is needed for: indexing an array, const array, modulo %
precision highp float;

#define NUM_GRADIENTS 12
		

// -- Gradient table --
vec2 gradients(int i) {
	if (i ==  0) return vec2( 1,  1);
	if (i ==  1) return vec2(-1,  1);
	if (i ==  2) return vec2( 1, -1);
	if (i ==  3) return vec2(-1, -1);
	if (i ==  4) return vec2( 1,  0);
	if (i ==  5) return vec2(-1,  0);
	if (i ==  6) return vec2( 1,  0);
	if (i ==  7) return vec2(-1,  0);
	if (i ==  8) return vec2( 0,  1);
	if (i ==  9) return vec2( 0, -1);
	if (i == 10) return vec2( 0,  1);
	if (i == 11) return vec2( 0, -1);
	return vec2(0, 0);
}

float hash_poly(float x) {
	return mod(((x*34.0)+1.0)*x, 289.0);
}

// -- Hash function --
// Map a gridpoint to 0..(NUM_GRADIENTS - 1)
int hash_func(vec2 grid_point) {
	return int(mod(hash_poly(hash_poly(grid_point.x) + grid_point.y), float(NUM_GRADIENTS)));
}

// -- Smooth interpolation polynomial --
// Use mix(a, b, blending_weight_poly(t))
float blending_weight_poly(float t) {
	return t*t*t*(t*(t*6.0 - 15.0)+10.0);
}


// ==============================================================
// 2D Perlin noise evaluation
float perlin_noise(vec2 point) {
	vec2 c00 = floor(point);
	vec2 c10 = c00 + vec2(1., 0.);
	vec2 c01 = c00 + vec2(0.,1.);
	vec2 c11 = c00 + vec2(1.,1.);

	vec2 g00 = gradients(hash_func(c00));
	vec2 g10 = gradients(hash_func(c10));
	vec2 g01 = gradients(hash_func(c01));
	vec2 g11 = gradients(hash_func(c11));

	vec2 a = point - c00;
	vec2 b = point - c10;
	vec2 c = point - c01;
	vec2 d = point - c11;

	float s = dot(g00, a);
	float t = dot(g10, b);
	float u = dot(g01, c);
	float v = dot(g11, d);

	float fx = blending_weight_poly(point.x - c00.x);
	float fy = blending_weight_poly(point.y- c00.y);

	float st = mix(s,t,fx);
	float uv = mix(u,v,fx);

	return mix(st, uv, fy);
}

vec3 tex_perlin(vec2 point) {
	// Visualize noise as a vec3 color
	float freq = 23.15;
 	float noise_val = perlin_noise(point * freq) + 0.5;
	return vec3(noise_val);
}

//We project each point into a 2d plan  which is defined by the axis x and y 
//Then we scale it by the norm of the z component so no two 3D vectors are mapped to
//the same 2D vector
vec2 vec3_to_vec2(vec3 point){
    return point.z * point.xy;
}
