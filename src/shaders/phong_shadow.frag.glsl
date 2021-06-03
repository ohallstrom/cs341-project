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
    
    vec3 int_diff =vec3(0.);
    vec3 int_spec =vec3(0.);
    
    vec3 dir_from_view = normalize(v2f_position_view);
    vec3 dir_to_light = normalize( light_position - v2f_position_view ); 
    float shadow_dist = (textureCube(shadow_cubemap,v2f_position_view- light_position)).r;

    if (dot(dir_to_light, N) > 0.){
        int_diff = v2f_diffuse_color * (light_color)* dot(N, dir_to_light); 
        vec3 r = reflect(dir_to_light, N);
        if (dot(N,dir_to_light)>0. && dot(r, dir_from_view)>0.) {
            int_spec = v2f_specular_color *(light_color) * pow(dot(r, dir_from_view), shininess);
        } 
    }

    float dist = distance(v2f_position_view, light_position);
    float scale_value = 1./(dist*dist);

    if (shadow_dist*1.01> dist){
        color += scale_value*(int_diff + int_spec);
    }

    gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}
