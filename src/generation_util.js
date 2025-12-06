// poisson disc sampling
function get_spaced_points(bounds, min_spacing, attempts = 30, max_points, is3D = true) {

    let xmin = bounds.xmin;
    let xmax = bounds.xmax;
    let ymin = bounds.ymin;
    let ymax = bounds.ymax;
    let zmin = bounds.zmin;
    let zmax = bounds.zmax;

    // dimension-based cell size
    let cell_size = min_spacing / Math.sqrt(is3D ? 3 : 2);

    // grid dims
    let W = Math.ceil((xmax - xmin) / cell_size);
    let H = is3D ? Math.ceil((ymax - ymin) / cell_size) : 1;     // 2D → H = 1
    let L = Math.ceil((zmax - zmin) / cell_size);

    let grid = new Array(W * H * L).fill(-1);

    let points = [];
    let active = [];

    // initial point
    let initial_point = is3D
        ? {
            x: Math.random() * (xmax - xmin) + xmin,
            y: Math.random() * (ymax - ymin) + ymin,
            z: Math.random() * (zmax - zmin) + zmin
        }
        : {
            x: Math.random() * (xmax - xmin) + xmin,
            y: 0,
            z: Math.random() * (zmax - zmin) + zmin
        };

    points.push(initial_point);
    active.push(0);

    let gx = Math.floor((initial_point.x - xmin) / cell_size);
    let gy = is3D ? Math.floor((initial_point.y - ymin) / cell_size) : 0;
    let gz = Math.floor((initial_point.z - zmin) / cell_size);

    grid[dim_idx_conv_3t1(gx, gy, gz, W, H)] = 0;

    while (active.length !== 0) {

        if (points.length >= max_points) {
            break;
        }

        let rand_idx = Math.floor(Math.random() * active.length);
        let point_index = active[rand_idx];
        let point = points[point_index];

        let found_new = false;

        for (let i = 0; i < attempts; i++) {

            let q = is3D
                ? random_point_in_annulus_3d(point, min_spacing, 2 * min_spacing)
                : random_point_in_annulus_2d(point, min_spacing, 2 * min_spacing);

            if (!check_bounds_world_dim(q, xmin, xmax, ymin, ymax, zmin, zmax, is3D)) {
                continue;
            }

            if (is_valid_dim(q, points, grid, xmin, ymin, zmin, cell_size, W, H, L, min_spacing, is3D)) {

                let idx = points.length;
                points.push(q);
                active.push(idx);

                let qx = Math.floor((q.x - xmin) / cell_size);
                let qy = is3D ? Math.floor((q.y - ymin) / cell_size) : 0;
                let qz = Math.floor((q.z - zmin) / cell_size);

                grid[dim_idx_conv_3t1(qx, qy, qz, W, H)] = idx;

                found_new = true;
                break;
            }
        }

        if (!found_new) {
            active.splice(rand_idx, 1);
        }
    }

    return points;
}

function is_valid_dim(p, points, grid, xmin, ymin, zmin, cell_size, W, H, L, min_spacing, is3D) {

    let gx = Math.floor((p.x - xmin) / cell_size);
    let gy = is3D ? Math.floor((p.y - ymin) / cell_size) : 0;
    let gz = Math.floor((p.z - zmin) / cell_size);

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = (is3D ? -1 : 0); dy <= (is3D ? 1 : 0); dy++) {
            for (let dz = -1; dz <= 1; dz++) {

                let nx = gx + dx;
                let ny = gy + dy;
                let nz = gz + dz;

                if (nx < 0 || ny < 0 || nz < 0 || nx >= W || ny >= H || nz >= L)
                    continue;

                let idx = grid[dim_idx_conv_3t1(nx, ny, nz, W, H)];

                if (idx !== -1) {

                    let other = points[idx];

                    let dxv = p.x - other.x;
                    let dzv = p.z - other.z;
                    let dyv = is3D ? (p.y - other.y) : 0;

                    let dist_sq = dxv*dxv + dyv*dyv + dzv*dzv;

                    if (dist_sq < min_spacing * min_spacing) {
                        return false;
                    }
                }
            }
        }
    }

    return true;
}

function check_bounds_world_dim(p, xmin, xmax, ymin, ymax, zmin, zmax, is3D) {
    if (p.x < xmin || p.x > xmax) return false;
    if (p.z < zmin || p.z > zmax) return false;
    if (is3D && (p.y < ymin || p.y > ymax)) return false;
    return true;
}

function random_point_in_annulus_2d(p, r_min, r_max) {

    let radius = Math.random() * (r_max - r_min) + r_min;
    let theta = Math.random() * 2 * Math.PI;

    return {
        x: p.x + Math.cos(theta) * radius,
        y: 0,
        z: p.z + Math.sin(theta) * radius
    };
}

function random_point_in_annulus_3d(p, r_min, r_max) {
    let radius = Math.random() * (r_max - r_min) + r_min;

    let theta = Math.random() * 2 * Math.PI;
    let u = Math.random() * 2 - 1; 
    let phi = Math.acos(u);

    let dx = Math.sin(phi) * Math.cos(theta);
    let dy = Math.sin(phi) * Math.sin(theta);
    let dz = Math.cos(phi);

    return {
        x: p.x + dx * radius,
        y: p.y + dy * radius,
        z: p.z + dz * radius
    };
}

function dim_idx_conv_3t1(x, y, z, W, H) {
    return z * W * H + y * W + x;
}

function dim_idx_conv_1t3(idx, W, H) {
    let z = Math.floor(idx / (W * H));
    idx -= z * W * H;
    let y = Math.floor(idx / W);
    let x = idx % W;
    return {x: x, y: y, z: z};
}

// noise generation (perlin noise)
function init_perm() {
	const permutation = [];
	for(let i = 0; i < 256; i++) {
		permutation.push(i);
	}

	for(let e = permutation.length-1; e > 0; e--) {
		const index = Math.round(Math.random()*(e-1));
		const temp = permutation[e];
		
		permutation[e] = permutation[index];
		permutation[index] = temp;
	}
	
	for(let i = 0; i < 256; i++) {
		permutation.push(permutation[i]);
	}
	
	return permutation;
}

const perm = init_perm();

function perlin_noise(input_x, input_y) {
    const x = Math.floor(input_x) & 255;
    const y = Math.floor(input_y) & 255;

    const xf = input_x - Math.floor(input_x);
    const yf = input_y - Math.floor(input_y);

    const top_right  = [xf - 1.0, yf - 1.0];
    const top_left   = [xf,       yf - 1.0];
    const bot_right  = [xf - 1.0, yf];
    const bot_left   = [xf,       yf];

    // lookup permutation-based corner values
    let val_tr = perm[perm[x + 1] + (y + 1)];
    let val_tl = perm[perm[x]     + (y + 1)];
    let val_br = perm[perm[x + 1] + y];
    let val_bl = perm[perm[x]     + y];

    // dot products with their gradient vectors
    let d_tr = dot2(top_right,  gradient2(val_tr));
    let d_tl = dot2(top_left,   gradient2(val_tl));
    let d_br = dot2(bot_right,  gradient2(val_br));
    let d_bl = dot2(bot_left,   gradient2(val_bl));

    const u = fade(xf);
    const v = fade(yf);

    // bilinear interpolation of dot products
    const lerp_bottom = lerp(u, d_bl, d_br);
    const lerp_top    = lerp(u, d_tl, d_tr);

    return lerp(v, lerp_bottom, lerp_top);
}

function dot2(a, b) {
    return a[0]*b[0] + a[1]*b[1];
}

function fade(t) {
    return ((6*t - 15)*t + 10)*t*t*t;
}

function lerp(t, a, b) {
    return a + t*(b - a);
}

// returns one of 4 gradient directions based on permutation value
function gradient2(v) {
    const h = v & 3;
    if (h === 0) return [ 1.0,  1.0];
    if (h === 1) return [-1.0,  1.0];
    if (h === 2) return [-1.0, -1.0];
    return [ 1.0, -1.0];
}