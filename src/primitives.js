function pyramid_data() {
	let vertices = [
		-1, -1, -1,  // 0
		1, -1, -1,  // 1
		1,  1, -1,  // 2
		-1,  1, -1,  // 3
		-1, -1,  1,  // 4
		1, -1,  1,  // 5
		1,  1,  1,  // 6
		-1,  1,  1,  // 7
		0,  1,  0   // 8
	];

	let indices = [
		// bottom
		0, 1, 5,   0, 5, 4,
		// right face
		1, 5, 8,
		// back face
		5, 4, 8,
		// left face
		4, 0, 8,
		//front face
		0, 1, 8

	];

	let normals = [];
	for (let i = 0; i < vertices.length; i++) {
		normals[i] = vertices[i];
	}

	return {
		vertices: new Float32Array(vertices),
		indices: new Uint16Array(indices),
		normals: new Float32Array(normals)
	};
}

function cube_data() {

	const vertices = [
		-1, -1,  1,
		 1, -1,  1,
		 1,  1,  1,
		-1,  1,  1,

		-1, -1, -1,
		-1,  1, -1,
		 1,  1, -1,
		 1, -1, -1,

		-1,  1, -1,
		-1,  1,  1,
		 1,  1,  1,
		 1,  1, -1,

		-1, -1, -1,
		 1, -1, -1,
		 1, -1,  1,
		-1, -1,  1,

		 1, -1, -1,
		 1,  1, -1,
		 1,  1,  1,
		 1, -1,  1,

		-1, -1, -1,
		-1, -1,  1,
		-1,  1,  1,
		-1,  1, -1
	];

	const tex_coords = [
		0,0, 1,0, 1,1, 0,1,
		0,0, 1,0, 1,1, 0,1,
		0,0, 1,0, 1,1, 0,1,
		0,0, 1,0, 1,1, 0,1,
		0,0, 1,0, 1,1, 0,1,
		0,0, 1,0, 1,1, 0,1
	];

	const indices = [
		0,1,2,    0,2,3,
		4,5,6,    4,6,7,
		8,9,10,   8,10,11,
		12,13,14, 12,14,15,
		16,17,18, 16,18,19,
		20,21,22, 20,22,23
	];

	const normals = [
		0,0,1, 0,0,1, 0,0,1, 0,0,1,
		0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
		0,1,0, 0,1,0, 0,1,0, 0,1,0,
		0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
		1,0,0, 1,0,0, 1,0,0, 1,0,0,
		-1,0,0, -1,0,0, -1,0,0, -1,0,0
	];

	const tangents = compute_tangents(vertices, tex_coords, indices);

	return {
		vertices: new Float32Array(vertices),
		indices: new Uint16Array(indices),
		normals: new Float32Array(normals),
		tex_coords: new Float32Array(tex_coords),
		tangents: new Float32Array(tangents)
	};
}

function sphere_data (u_steps, v_steps, r) {
	let vertices = [];
	let indices = [];
	let normals = [];
	let tex_coords = [];

	for (let i = 0; i <= v_steps; i++) {
		const v = i * Math.PI / v_steps;
		const sinv = Math.sin(v);
		const cosv = Math.cos(v);

		for ( let j = 0; j <= u_steps; j++) {
			const u = j * 2 * Math.PI/u_steps;
			const sinu = Math.sin(u);
			const cosu = Math.cos(u);
			const x = r * cosu * sinv;
			const y = r * cosv;
			const z = r * sinu * sinv;
			vertices.push(x, y, z);

			let v = [];
			v.push(x, y, z);
			let vn = norm(v);
			normals.push(vn[0], vn[1], vn[2]);

			let tu = j/u_steps;
			let tv = i/v_steps;
			tex_coords.push(tu, tv);
		}
	}

	for (let i = 0; i < v_steps; i++) {
		for (let j = 0; j < u_steps; j++) {
			const k1 = (i * (u_steps + 1)) + j;
			const k2 = k1 + u_steps + 1;
			indices.push(k1, k2, k1 + 1);
			indices.push(k2, k2 + 1, k1 + 1);
		}
	}

	const tangents = compute_tangents(vertices, tex_coords, indices);

	return {
		vertices: new Float32Array(vertices),
		indices: new Uint16Array(indices),
		normals: new Float32Array(normals),
		tex_coords: new Float32Array(tex_coords),
		tangents: new Float32Array(tangents)
	};
}

function cone_data(u_steps, v_steps, r, h) {
	let vertices = [];
	let indices = [];
	let normals = [];
	let tex_coords = [];

	const inverse_hyp = 1/Math.sqrt(h*h + r*r);

	for (let i = 0; i <= v_steps; i++) {
		const v = i / v_steps;
		const z = v * h;
		const radius = r * v;

		for (let j = 0; j <= u_steps; j++) {
			const u = j / u_steps;

			const theta = j * 2 * Math.PI / u_steps;
			const c = Math.cos(theta);
			const s = Math.sin(theta);
			const x = radius * c;
			const y = radius * s;

			vertices.push(x, y, z);

			normals.push(h * c * inverse_hyp, h * s * inverse_hyp, r * inverse_hyp);

			tex_coords.push(u, v);
		}
	}

	for (let i = 0; i < v_steps; i++) {
		for (let j = 0; j < u_steps; j++) {
			const k1 = i * (u_steps + 1) + j;
			const k2 = k1 + u_steps + 1;
			indices.push(k1, k2, k1 + 1);
			indices.push(k2, k2 + 1, k1 + 1);
		}
	}

	let base_idx = vertices.length / 3;
	
	vertices.push(0, 0, h);
	normals.push(0, 0, 1);
	tex_coords.push(0.5, 0.5);

	let base_ring_start = base_idx + 1;

	for (let j = 0; j <= u_steps; j++) {
		const theta = j * 2 * Math.PI / u_steps;
		const x = r * Math.cos(theta);
		const y = r * Math.sin(theta);
		vertices.push(x, y, h);
		normals.push(0, 0, 1);
		tex_coords.push(0.5 + 0.5*Math.cos(theta), 0.5 + 0.5*Math.sin(theta));
	}

	for (let j = 0; j < u_steps; j++) {
		const k1 = base_ring_start + j;
		const k2 = base_ring_start + j + 1;
		indices.push(base_idx, k1, k2);
	}

	let tangents = compute_tangents(vertices, tex_coords, indices);

	return {
		vertices: new Float32Array(vertices),
		indices: new Uint16Array(indices),
		normals: new Float32Array(normals),
		tex_coords: new Float32Array(tex_coords),
		tangents: new Float32Array(tangents)
	};
};

function cylinder_data(u_steps, v_steps, r, h) {
	let vertices = [];
	let indices  = [];
	let normals  = [];
	let tex_coords = [];

	for (let i = 0; i <= v_steps; i++) {
		const v = i / v_steps;
		const y = v * h;

		for (let j = 0; j <= u_steps; j++) {
			const u = j / u_steps;

			const theta = j * 2 * Math.PI / u_steps;
			const c = Math.cos(theta);
			const s = Math.sin(theta);
			const x = r * c;
			const z = r * s;
			vertices.push(x, y, z);

			normals.push(c, 0, s);

			tex_coords.push(u, v);
		}
	}

	for (let i = 0; i < v_steps; i++) {
		for (let j = 0; j < u_steps; j++) {
			const k1 = i * (u_steps + 1) + j;
			const k2 = k1 + (u_steps + 1);
			indices.push(k1, k2,     k1 + 1);
			indices.push(k2, k2 + 1, k1 + 1);
		}
	}

	let top_center_idx = vertices.length / 3;
	vertices.push(0, h, 0);
	normals.push(0, 1, 0);
	tex_coords.push(0.5, 0.5);

	let top_ring_start = vertices.length / 3;

	for (let j = 0; j <= u_steps; j++) {
		const theta = j * 2 * Math.PI / u_steps;
		const c = Math.cos(theta);
		const s = Math.sin(theta);
		const x = r * c;
		const z = r * s;
		vertices.push(x, h, z);
		normals.push(0, 1, 0);
		tex_coords.push(0.5 + 0.5*Math.cos(theta), 0.5 + 0.5*Math.sin(theta));
	}

	for (let j = 0; j < u_steps; j++) {
		const k1 = top_ring_start + j;
		const k2 = top_ring_start + j + 1;
		indices.push(top_center_idx, k2, k1);
	}

	let bottom_center_idx = vertices.length / 3;
	vertices.push(0, 0, 0);
	normals.push(0, -1, 0);
	tex_coords.push(0.5, 0.5);

	let bottom_ring_start = vertices.length / 3;

	for (let j = 0; j <= u_steps; j++) {
		const theta = j * 2 * Math.PI / u_steps;
		const c = Math.cos(theta);
		const s = Math.sin(theta);
		const x = r * c;
		const z = r * s;
		vertices.push(x, 0, z);
		normals.push(0, -1, 0);
		tex_coords.push(0.5 + 0.5*Math.cos(theta), 0.5 + 0.5*Math.sin(theta));
	}

	for (let j = 0; j < u_steps; j++) {
		const k1 = bottom_ring_start + j;
		const k2 = bottom_ring_start + j + 1;
		indices.push(bottom_center_idx, k1, k2);
	}

	let tangents = compute_tangents(vertices, tex_coords, indices);

	return {
		vertices: new Float32Array(vertices),
		indices:  new Uint16Array(indices),
		normals:  new Float32Array(normals),
		tex_coords: new Float32Array(tex_coords),
		tangents: new Float32Array(tangents)
	};
}

function generate_colors(rgb, max_iter) {
	let colors = [];
	for (let i = 0; i < max_iter; i++) {
		colors.push(rgb[0], rgb[1], rgb[2]);
	}
	return new Float32Array(colors);
}

function flat_shading_normals(vertices, indices, colors) {
	let fvertices = [];
	let findices  = [];
	let fnormals  = [];
	let fcolors = [];

	for (let i = 0; i < indices.length; i += 3) {
		const i0 = indices[i] * 3;
		const i1 = indices[i + 1] * 3;
		const i2 = indices[i + 2] * 3;

		const v0 = [vertices[i0], vertices[i0 + 1], vertices[i0 + 2]];
		const v1 = [vertices[i1], vertices[i1 + 1], vertices[i1 + 2]];
		const v2 = [vertices[i2], vertices[i2 + 1], vertices[i2 + 2]];

		// compute cross product
		const e1 = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
		const e2 = [v2[0] - v0[0],v2[1] - v0[1], v2[2] - v0[2]];
		const n = [
			e1[1] * e2[2] - e1[2] * e2[1],
			e1[2] * e2[0] - e1[0] * e2[2],
			e1[0] * e2[1] - e1[1] * e2[0]
		];

		// normalize each portion
		const len = Math.hypot(n[0], n[1], n[2]);
		if (len > 0.0) {
			n[0] /= len;
			n[1] /= len;
			n[2] /= len;
		}

		fnormals.push(...n, ...n, ...n);
		fvertices.push(...v0, ...v1, ...v2);
	}

	for (let i = 0; i < fvertices.length/3; i++) {
		findices.push(i);
		fcolors.push(colors[0], colors[1], colors[2]);
	}

	return {
		vertices: new Float32Array(fvertices),
		normals: new Float32Array(fnormals),
		indices: new Uint16Array(findices),
		colors: new Float32Array(fcolors)
	};
}

function compute_tangents(vertices, tex_coords, indices) {
	const vert_len = vertices.length / 3;
	const tangents = new Array(vert_len * 3).fill(0);

	for (let i = 0; i < indices.length; i += 3) {
		const i0 = indices[i];
		const i1 = indices[i+1];
		const i2 = indices[i+2];

		const p0 = vertices.slice(i0*3, i0*3+3);
		const p1 = vertices.slice(i1*3, i1*3+3);
		const p2 = vertices.slice(i2*3, i2*3+3);

		const uv0 = tex_coords.slice(i0*2, i0*2+2);
		const uv1 = tex_coords.slice(i1*2, i1*2+2);
		const uv2 = tex_coords.slice(i2*2, i2*2+2);

		const dp1 = [
			p1[0] - p0[0],
			p1[1] - p0[1],
			p1[2] - p0[2]
		];

		const dp2 = [
			p2[0] - p0[0],
			p2[1] - p0[1],
			p2[2] - p0[2]
		];

		const duv1 = [
			uv1[0] - uv0[0],
			uv1[1] - uv0[1]
		];

		const duv2 = [
			uv2[0] - uv0[0],
			uv2[1] - uv0[1]
		];

		const r = 1.0 / (duv1[0]*duv2[1] - duv1[1]*duv2[0]);

		const t = [
			(dp1[0]*duv2[1] - dp2[0]*duv1[1]) * r,
			(dp1[1]*duv2[1] - dp2[1]*duv1[1]) * r,
			(dp1[2]*duv2[1] - dp2[2]*duv1[1]) * r
		];

		for (const idx of [i0,i1,i2]) {
			tangents[idx*3]   += t[0];
			tangents[idx*3+1] += t[1];
			tangents[idx*3+2] += t[2];
		}
	}

	return tangents;
}
