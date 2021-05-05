precision mediump float;

varying vec3 v2f_position_view;

void main () {
	/* Todo 6.2.1
	Draw the shadow map.
	Compute the Euclidean distance from the light camera to the fragment.
	Store the distance into the red channel of the fragment's color.
	*/
	float dist =sqrt(v2f_position_view.x*v2f_position_view.x +
					 v2f_position_view.y*v2f_position_view.y + 
					 v2f_position_view.z*v2f_position_view.z);
	gl_FragColor.r = dist;
}
