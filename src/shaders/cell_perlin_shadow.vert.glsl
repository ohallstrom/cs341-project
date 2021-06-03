// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 position;
attribute vec3 normal;


// Per-vertex outputs passed on to the fragment shader
varying vec3 v2f_position_view; // vertex position in eye (camera) coordinates
varying vec3 v2f_normal;		// normal vector   in eye (camera) coordinates
varying vec3 v2f_marble_position;

uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals; // mat3 not 4, because normals are only rotated and not translated

void main() {
	vec4 position_v4 = vec4(position, 1);

	// viewing vector (from camera to vertex in view coordinates), camera is at vec3(0, 0, 0) in cam coords
	v2f_position_view = (mat_model_view * position_v4).xyz; 
	v2f_marble_position = position;

	// transform normal to camera coordinates
	v2f_normal = normalize(mat_normals * normal); 

	gl_Position = mat_mvp * position_v4 ;
}
