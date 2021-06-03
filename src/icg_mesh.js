import {load_text} from "./icg_web.js"
import {Mesh} from "../lib/webgl-obj-loader_2.0.8/webgl-obj-loader.module.js"


export async function mesh_load_obj(regl_instance, url, material_colors_by_name) {
	const obj_data = await load_text(url);
	const mesh_loaded_obj = new Mesh(obj_data);

	const faces_from_materials = [].concat(...mesh_loaded_obj.indicesPerMaterial);
	
	let vertex_colors = null;

	if(material_colors_by_name) {
		const material_colors_by_index = mesh_loaded_obj.materialNames.map((name) => {
			let color = material_colors_by_name[name];
			if (color === undefined) {
				console.warn(`Missing color for material ${name} in mesh ${url}`);
				color = [1., 0., 1.];
			}
			return color;
		});

		vertex_colors = [].concat(mesh_loaded_obj.vertexMaterialIndices.map((mat_idx) => material_colors_by_index[mat_idx]));
		vertex_colors = regl_instance.buffer(vertex_colors);
	}


	// Transfer the data into GPU buffers
	// It is not necessary to do so (regl can deal with normal arrays),
	// but this way we make sure its transferred only once and not on every draw.
	const mesh_with_our_names = {
		vertex_positions: regl_instance.buffer(mesh_loaded_obj.vertices),
		vertex_tex_coords: regl_instance.buffer(mesh_loaded_obj.textures),
		vertex_normals: regl_instance.buffer(mesh_loaded_obj.vertexNormals),
		
		// https://github.com/regl-project/regl/blob/master/API.md#elements
		faces: regl_instance.elements({data: faces_from_materials, type: 'uint16'}),
		
		vertex_color: vertex_colors,

		lib_obj: mesh_loaded_obj,
	};

	return mesh_with_our_names;
}

