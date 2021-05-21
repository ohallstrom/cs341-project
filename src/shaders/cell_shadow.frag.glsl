precision highp float;

varying vec3 v2f_normal;         // normal vector in camera coordinates
varying vec3 v2f_position_view;  // vertex position in camera coordinates
varying vec3 v2f_diffuse_color;  // Material's diffuse color, m_d
varying vec3 v2f_specular_color; // Material's specular color, m_s

uniform vec3 light_position; // light position in camera coordinates

uniform vec3 light_color;
uniform samplerCube shadow_cubemap;

// Material parameters
uniform float shininess;

void main() {
    // Normalize the interpolated normal
    vec3 N = -sign(dot(v2f_normal, v2f_position_view)) *  normalize(v2f_normal); // Orient the normal so it always points opposite the camera rays (for backfaces)
            

    vec3 color = vec3(0.0);
    /** Todo 6.2.2
    * Compute this light's diffuse and specular contributions.
    * You should be able to copy your phong lighting code from assignment 5 mostly as-is,
    * though notice that the light and view vectors need to be computed from scratch
    * here; this time, they are not passed from the vertex shader. Also, the light/material
	* colors have changed; see the Phong lighting equation in the handout if you need
	* a refresher to understand how to incorporate `light_color` (the diffuse and specular
	* colors of the light), `v2f_diffuse_color` and `v2f_specular_color`.
	*
	* To model the attenuation of a point light, you should scale the light
	* color by the inverse distance squared to the point being lit.
    *

    * The light should only contribute to this fragment if the fragment is not occluded
    * by another object in the scene. You need to check this by comparing the distance
    * from the fragment to the light against the distance recorded for this
    * light ray in the shadow map.
    *
    * To prevent "shadow acne" and minimize aliasing issues, we need a rather large
    * tolerance on the distance comparison. It's recommended to use a *multiplicative*
    * instead of additive tolerance: compare the fragment's distance to 1.01x the
    * distance from the shadow map.
    ***/
    
    vec3 int_diff =vec3(0.);
    vec3 int_spec =vec3(0.);
    
    vec3 dir_from_view = normalize(v2f_position_view);
    vec3 dir_to_light = normalize( light_position - v2f_position_view ); 
    float shadow_dist = (textureCube(shadow_cubemap,v2f_position_view- light_position)).r;

    if (dot(dir_to_light, N) > 0.){
        int_diff = v2f_diffuse_color * (light_color)* floor(4.*dot(N, dir_to_light))/4.; 
        vec3 r = reflect(dir_to_light, N);
        if (dot(N,dir_to_light)>0. && dot(r, dir_from_view)>0.) {
            int_spec = v2f_specular_color *(light_color) * pow(floor(4.*dot(r, dir_from_view))/4., shininess);
        } 
    }

    float dist = distance(v2f_position_view, light_position);
    float scale_value = 1./(dist*dist);

    if (shadow_dist*1.01> dist){
        color += scale_value*(int_diff + int_spec );
    }
    gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}
