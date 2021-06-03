attribute vec3 position;

varying vec3 v2f_position;

uniform mat4 mat_mvp;

void main() {
	v2f_position = position;
	gl_Position = mat_mvp *  vec4(position, 1);
}
