precision mediump float;

varying vec3 v2f_position_view;

void main () {
	float dist =sqrt(v2f_position_view.x*v2f_position_view.x +
					 v2f_position_view.y*v2f_position_view.y + 
					 v2f_position_view.z*v2f_position_view.z);
	gl_FragColor.r = dist;
}
