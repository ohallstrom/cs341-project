precision highp float;

varying vec3 v2f_normal;         // normal vector in camera coordinates
varying vec3 v2f_position_view;  // vertex position in camera coordinates
varying vec3 v2f_diffuse_color;  // Material's diffuse color, m_d
varying vec3 v2f_specular_color; // Material's specular color, m_s
varying vec3 v2f_marble_position;

uniform vec3 light_position; // light position in camera coordinates

uniform vec3 light_color;
uniform samplerCube shadow_cubemap;

// Material parameters
uniform float shininess;


// perlin
const float ambient_intensity = 0.2;

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

float perlin_noise(vec2 point) {
	/* TODO 4.1
	Implement 2D perlin noise as described in the handout.
	You may find a glsl `for` loop useful here, but it's not necessary.
	*/

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


// for marble
const float freq_multiplier = 2.17;
const float ampl_multiplier = 0.5;
const int num_octaves = 4;

float perlin_fbm(vec2 point) {
	/* TODO 4.2
	Implement 2D fBm as described in the handout. Like in the 1D case, you
	should use the constants num_octaves, freq_multiplier, and ampl_multiplier. 
	*/
	float acc = 0.;
	for (int i = 0; i < num_octaves; i++) {
		acc += pow(ampl_multiplier, float(i)) * perlin_noise(point * pow(freq_multiplier, float(i)));
	}

	return acc;
}

const vec3 brown_dark 	= vec3(0.48, 0.29, 0.00);
const vec3 brown_light 	= vec3(0.90, 0.82, 0.62);
const vec3 white = vec3(0.95, 0.95, 0.95);


vec3 tex_marble(vec2 point) {
	/* TODO 5.1.3
	Implement your marble texture evaluation routine as described in the handout.
	You will need to use your 2d fbm routine and the marble color constants described above.
	*/
	vec2 q = vec2(perlin_fbm(point),perlin_fbm(point+vec2(1.7,4.6)));
	float alpha = (1. + perlin_fbm(point+4.*q)) / 2.;

	return (alpha * white + (1. - alpha) * brown_dark);
}

void main() {
    // Normalize the interpolated normal
    vec3 N = -sign(dot(v2f_normal, v2f_position_view)) *  normalize(v2f_normal); // Orient the normal so it always points opposite the camera rays (for backfaces)



    vec3 diff_color = tex_marble(v2f_marble_position.xy);
    vec3 spec_color = diff_color;


    vec3 color = vec3(0.0);
    
    vec3 int_diff =vec3(0.);
    vec3 int_spec =vec3(0.);
    
    vec3 dir_from_view = normalize(v2f_position_view);
    vec3 dir_to_light = normalize( light_position - v2f_position_view ); 
    float shadow_dist = (textureCube(shadow_cubemap,v2f_position_view- light_position)).r;

    if (dot(dir_to_light, N) > 0.){
        int_diff = diff_color * (light_color)* floor(4.*dot(N, dir_to_light))/4.; 
        vec3 r = reflect(dir_to_light, N);
        if (dot(N,dir_to_light)>0. && dot(r, dir_from_view)>0.) {
            int_spec = spec_color *(light_color) * pow(floor(2.*dot(r, dir_from_view))/2., shininess);
        } 
    }

    float dist = distance(v2f_position_view, light_position);
    float scale_value = 1./(dist*dist);

    if (shadow_dist*1.01> dist){
        color += scale_value*(int_diff + int_spec );
    }
    
    
    //
    if (dot(-dir_from_view, v2f_normal) < mix(0.1,0.3, max(0.,dot(v2f_normal, -dir_to_light)))){
        gl_FragColor = vec4(0.5,0.5,0.5, 1.);
    } else {
        gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
    }
}
