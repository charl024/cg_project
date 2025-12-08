// Scene setup

function create_scene(gl, program, uniforms) {
    const textures = {
        rusty_metal1: create_texture(gl, "src/textures/rusty_metal1_tex.jpg"),
        rusty_metal2: create_texture(gl, "src/textures/rusty_metal2_tex.jpg"),
        concrete_floor: create_texture(gl, "src/textures/concrete_floor_tex.jpg"),
        grass_tex: create_texture(gl, "src/textures/grass_tex.png"),
        red_brick_tex: create_texture(gl, "src/textures/red_brick_tex.png"),
        fabric_black_tex: create_texture(gl, "src/textures/fabric_black_tex.jpg"),
        snow_tex: create_texture(gl, "src/textures/snow_tex.jpg")
    };

    const shapes = {
        cube: make_shape(gl, program, cube_data),
        sphere: make_shape(gl, program, () => sphere_data(30, 30, 1)),
        cone: make_shape(gl, program, () => cone_data(30, 30, 1, 1)),
        cylinder: make_shape(gl, program, () => cylinder_data(30, 30, 1, 1)),
    };

    const state = {
        bumpStrength: 100.0,
        viewDirection: [0, 0, 0],
        temperatureLights: false,
        dt: 0.0,
        time: 0.0,
        lights: {
            // pos1: [30, 40, 30],   // High above for 3D area
            // pos2: [-30, 40, -30],
            dir1: norm([ -0.3, -1.0, -0.2 ]),
            dir2: norm([ 0.2, -1.0, 0.4 ]),
            color1: [0.7, 0.7, 0.65],
            color2: [0.3, 0.3, 0.4],
        },
        root: null,
        taxi: null,
        level: {
            platform_locs: [],
            goal_locs: [],
            spawn_position: null, 
            platforms: [],        
            goalArrow: null,    
            currentPickupPlatform: null,
            currentDropoffPlatform: null,
        }
    };

    function build_taxi(spawnPos) {
        const taxiRoot = create_model_node(
            {x: spawnPos.x, y: spawnPos.y, z: spawnPos.z},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 1, y: 1, z: 1},
            null,
            null,
            uniforms,
            null,
            null
        );

        const body = create_model_node(
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 1.8, y: 0.5, z: 0.8},
            null,
            shapes.cube,
            uniforms,
            {
                Ka: 0.3,
                Kd: 0.7,
                Ks: 0.4,
                alpha: 20.0,
                color: [1.0, 0.9, 0.0], // Yellow
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, body);

        const cabin = create_model_node(
            {x: 0.0, y: 0.5, z: 0.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 1.2, y: 0.4, z: 0.75},
            null,
            shapes.cube,
            uniforms,
            {
                Ka: 0.3,
                Kd: 0.7,
                Ks: 0.4,
                alpha: 20.0,
                color: [1.0, 0.9, 0.0], // Yellow
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, cabin);

        const windshield = create_model_node(
            {x: 0.5, y: 0.5, z: 0.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 0.3, y: 0.35, z: 0.76},
            null,
            shapes.cube,
            uniforms,
            {
                Ka: 0.2,
                Kd: 0.3,
                Ks: 0.9,
                alpha: 100.0,
                color: [0.2, 0.3, 0.4], // Dark blue-gray
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, windshield);

        const taxiSign = create_model_node(
            {x: 0.0, y: 0.95, z: 0.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 0.4, y: 0.15, z: 0.25},
            null,
            shapes.cube,
            uniforms,
            {
                Ka: 0.5,
                Kd: 0.6,
                Ks: 0.3,
                alpha: 10.0,
                color: [1.0, 0.5, 0.0], // Orange
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, taxiSign);

        // Front left wheel
        const frontLeftWheel = create_model_node(
            {x: 0.6, y: -0.4, z: 0.65},
            {x: 0.0, y: 0.0, z: Math.PI / 2},
            {x: 0.3, y: 0.3, z: 0.2},
            null,
            shapes.cylinder,
            uniforms,
            {
                Ka: 0.2,
                Kd: 0.4,
                Ks: 0.2,
                alpha: 5.0,
                color: [0.1, 0.1, 0.1], // Black
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, frontLeftWheel);

        // Front right wheel
        const frontRightWheel = create_model_node(
            {x: 0.6, y: -0.4, z: -0.65},
            {x: 0.0, y: 0.0, z: Math.PI / 2},
            {x: 0.3, y: 0.3, z: 0.2},
            null,
            shapes.cylinder,
            uniforms,
            {
                Ka: 0.2,
                Kd: 0.4,
                Ks: 0.2,
                alpha: 5.0,
                color: [0.1, 0.1, 0.1], // Black
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, frontRightWheel);

        // Rear left wheel
        const rearLeftWheel = create_model_node(
            {x: -0.6, y: -0.4, z: 0.65},
            {x: 0.0, y: 0.0, z: Math.PI / 2},
            {x: 0.3, y: 0.3, z: 0.2},
            null,
            shapes.cylinder,
            uniforms,
            {
                Ka: 0.2,
                Kd: 0.4,
                Ks: 0.2,
                alpha: 5.0,
                color: [0.1, 0.1, 0.1], // Black
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, rearLeftWheel);

        // Rear right wheel
        const rearRightWheel = create_model_node(
            {x: -0.6, y: -0.4, z: -0.65},
            {x: 0.0, y: 0.0, z: Math.PI / 2},
            {x: 0.3, y: 0.3, z: 0.2},
            null,
            shapes.cylinder,
            uniforms,
            {
                Ka: 0.2,
                Kd: 0.4,
                Ks: 0.2,
                alpha: 5.0,
                color: [0.1, 0.1, 0.1], // Black
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, rearRightWheel);

        const thrustFlame1 = create_model_node(
            {x: 2.2, y: -0.3, z: -0.5},
            {x: 0.0, y: -Math.PI / 2, z: 0.0},
            {x: 0.5, y: 8.0, z: 0.5},
            null,
            shapes.cone,
            uniforms,
            {
                Ka: 0.8,
                Kd: 0.6,
                Ks: 0.3,
                alpha: 10.0,
                color: [1.0, 0.4, 0.0], // Orange
                bumpOn: false
            },
            null
        );

        const thrustFlame2 = create_model_node(
            {x: 2.2, y: -0.3, z: 0.5},
            {x: 0.0, y: -Math.PI / 2, z: 0.0},
            {x: 1.0, y: 8.0, z: 1.0},
            null,
            shapes.cone,
            uniforms,
            {
                Ka: 0.8,
                Kd: 0.6,
                Ks: 0.3,
                alpha: 10.0,
                color: [1.0, 0.4, 0.0], // Orange
                bumpOn: false
            },
            null
        );

        add_children(taxiRoot, thrustFlame1);
        add_children(taxiRoot, thrustFlame2);

        const leftFlame = create_model_node(
            {x: 0.0, y: 0.0, z: -1.4},
            {x: Math.PI * 2, y: 0, z: 0},
            {x: 0.5, y: 1.0, z: 0.5},
            null,
            shapes.cone,
            uniforms,
            { Ka:0.8, Kd:0.6, Ks:0.3, alpha:10.0, color:[1.0,0.5,0.1], bumpOn:false },
            null
        );

        const rightFlame = create_model_node(
            {x: 0.0, y: 0.0, z: 1.4},
            {x: Math.PI, y: 0, z: 0},
            {x: 0.5, y: 1.0, z: 0.5},
            null,
            shapes.cone,
            uniforms,
            { Ka:0.8, Kd:0.6, Ks:0.3, alpha:10.0, color:[1.0,0.5,0.1], bumpOn:false },
            null
        );
        add_children(taxiRoot, leftFlame);
        add_children(taxiRoot, rightFlame);

        taxiRoot.thrustFlame1 = thrustFlame1;
        taxiRoot.thrustFlame2 = thrustFlame2;
        taxiRoot.leftFlame = leftFlame;
        taxiRoot.rightFlame = rightFlame;

        taxiRoot.bounding = {
            type: "box",
            min: [-1.0, -0.5, -0.5],
            max: [ 1.0,  1.0,  0.5]
        };

        return taxiRoot;
    }

    const MAX_LEVELS = 3;
    const BASE_WIDTH = 50;
    const BASE_HEIGHT = 20;
    const BASE_LENGTH = 50;
    const MAX_PLATFORMS = 40;
    const MAX_SPAWN_HEIGHT = 15;
    const arrow_offset_y = 7.0;

    function generate_level() {

        
        
        // return generate_brick_tower_level();
        return generate_mountain_level();
    }

    function generate_brick_tower_level() {

        const base = create_level_root();

        // World generation parameters
        let max_hill_height = 8;
        let grid_width = 50;
        let grid_length = 50;
        let cell_width = (2 * BASE_WIDTH) / grid_width;
        let cell_length = (2 * BASE_LENGTH) / grid_length;
        let freq = 0.1;

        // Refuel tower location (fixed)
        const refuelX = 10;
        const refuelZ = -25;

        // Step 1: Generate ground noise map
        generate_perlin_terrain(
            base,
            max_hill_height,
            grid_width,
            grid_length,
            cell_width,
            cell_length,
            freq,
            grass_material,
            textures.grass_tex
        );

        // Step 2: Select taxi spawn position (once per level), avoiding refuel tower
        if (!state.level.spawn_position) {
            state.level.spawn_position = select_taxi_spawn_position(
                grid_width,
                grid_length,
                cell_width,
                cell_length,
                freq,
                max_hill_height,
                refuelX,
                refuelZ
            );
        }

        const spawnX = state.level.spawn_position.x;
        const spawnZ = state.level.spawn_position.z;

        // Step 3: Generate towers avoiding taxi spawn position
        create_refuel_tower(
            base,
            refuelX,
            refuelZ,
            grid_width,
            grid_length,
            cell_width,
            cell_length,
            freq,
            max_hill_height
        );

        generate_tower_platforms(base,
            spawnX,
            spawnZ,
            refuelX,
            refuelZ,
            grid_width,
            grid_length,
            cell_width,
            cell_length,
            freq,
            max_hill_height
        );

        let goal_arrow = create_goal_arrow();
        if (goal_arrow) add_children(base, goal_arrow);

        return base;
    }

    function generate_mountain_level() {

        const base = create_level_root();

        state.lights

        let max_hill_height = 100;
        let grid_width = 25;
        let grid_length = 25;
        let cell_width = (2 * BASE_WIDTH) / grid_width;
        let cell_length = (2 * BASE_LENGTH) / grid_length;
        let freq = 0.02;

        const refuelX = 10;
        const refuelZ = -25;

        generate_perlin_terrain(
            base,
            max_hill_height,
            grid_width,
            grid_length,
            cell_width,
            cell_length,
            freq,
            snow_material,
            textures.snow_tex
        );

        if (!state.level.spawn_position) {
            state.level.spawn_position = select_taxi_spawn_position(
                grid_width,
                grid_length,
                cell_width,
                cell_length,
                freq,
                max_hill_height,
                refuelX,
                refuelZ
            );
        }

        const spawnX = state.level.spawn_position.x;
        const spawnZ = state.level.spawn_position.z;

        create_refuel_tower(
            base,
            refuelX,
            refuelZ,
            grid_width,
            grid_length,
            cell_width,
            cell_length,
            freq,
            max_hill_height
        );

        generate_mountain_cliff_platforms(
            base,
            spawnX,
            spawnZ,
            refuelX,
            refuelZ,
            grid_width,
            grid_length,
            cell_width,
            cell_length,
            freq,
            max_hill_height
        );

        if (state.level.platforms.length > 0) {
            const idx = Math.floor(Math.random() * state.level.platforms.length);
            const p = state.level.platforms[idx];
            const loc = p.platformLocation;

            const top = loc.y + (loc.h / 2);

            state.level.spawn_position = {
                x: loc.x,
                y: top + 4.0,
                z: loc.z
            };
        }

        let goal_arrow = create_goal_arrow();
        if (goal_arrow) add_children(base, goal_arrow);

        return base;
    }



    // All helper functions for level generation

    function create_level_root() {
        return create_model_node(
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 1.0, y: 1.0, z: 1.0},
            null,
            null,
            uniforms,
            null,
            null
        );
    }

    function sample_terrain_height(gridX, gridZ, freq, max_hill_height) {
        let n = perlin_noise(gridX * freq, gridZ * freq);
        n = (n + 1.0) / 2.0;
        return Math.round(n * max_hill_height);
    }

    function select_taxi_spawn_position(grid_width, grid_length, cell_width, cell_length, freq, max_hill_height, refuelX, refuelZ) {
        // Select a random GRID CELL in the back quarter of the map (where player starts)
        // Convert zone bounds to grid coordinates
        const spawnZoneMinZ = -BASE_LENGTH + 10;
        const spawnZoneMaxZ = -BASE_LENGTH / 2;
        const spawnZoneMinX = -BASE_WIDTH / 2;
        const spawnZoneMaxX = BASE_WIDTH / 2;

        // Convert to grid cell indices
        const gxMin = Math.floor((spawnZoneMinX + BASE_WIDTH) / cell_width);
        const gxMax = Math.floor((spawnZoneMaxX + BASE_WIDTH) / cell_width);
        const gzMin = Math.floor((spawnZoneMinZ + BASE_LENGTH) / cell_length);
        const gzMax = Math.floor((spawnZoneMaxZ + BASE_LENGTH) / cell_length);

        let gx, gz, spawnX, spawnZ, terrainHeight;
        let attempts = 0;
        const maxAttempts = 50;

        // Keep trying until we find a valid spawn position away from refuel tower
        do {
            // Pick a random grid cell in the spawn zone
            gx = gxMin + Math.floor(Math.random() * (gxMax - gxMin + 1));
            gz = gzMin + Math.floor(Math.random() * (gzMax - gzMin + 1));

            gx = Math.max(0, Math.min(grid_width - 1, gx));
            gz = Math.max(0, Math.min(grid_length - 1, gz));

            spawnX = -BASE_WIDTH + gx * cell_width + cell_width / 2;
            spawnZ = -BASE_LENGTH + gz * cell_length + cell_length / 2;

            // Check distance from refuel tower
            const distToRefuel = Math.hypot(spawnX - refuelX, spawnZ - refuelZ);

            // If far enough from refuel tower, accept this position
            if (distToRefuel > 12) {
                break;
            }

            attempts++;
        } while (attempts < maxAttempts);

        terrainHeight = sample_terrain_height(gx, gz, freq, max_hill_height);
        const groundLevel = terrainHeight - 4.5;
        const spawnY = groundLevel + 0.5 + 5.0;

        return { x: spawnX, y: spawnY, z: spawnZ };
    }

    function generate_mountain_cliff_platforms(
        base,
        spawnX,
        spawnZ,
        refuelX,
        refuelZ,
        grid_width,
        grid_length,
        cell_width,
        cell_length,
        freq,
        max_hill_height
    ) {
        const spawnClearRadius = 20;

        let bounds = {
            xmin: -BASE_WIDTH + 6,
            xmax: BASE_WIDTH - 6,
            ymin: 0,
            ymax: 0,
            zmin: -BASE_LENGTH + 6,
            zmax: BASE_LENGTH - 6
        };

        let points = get_spaced_points(bounds, 18, 40, 10, false);

        for (let point of points) {

            let distSpawn = Math.hypot(point.x - spawnX, point.z - spawnZ);
            if (distSpawn < spawnClearRadius) continue;

            let distRefuel = Math.hypot(point.x - refuelX, point.z - refuelZ);
            if (distRefuel < 12) continue;

            let gx = Math.max(0, Math.min(grid_width - 1, Math.floor((point.x + BASE_WIDTH) / cell_width)));
            let gz = Math.max(0, Math.min(grid_length - 1, Math.floor((point.z + BASE_LENGTH) / cell_length)));

            let terrainHeight = sample_terrain_height(gx, gz, freq, max_hill_height);

            let vertical_offset = 8 + Math.random() * 20;
            let platformY = terrainHeight - 5 + terrainHeight / 2 + vertical_offset;

            let platformHeight = 1.5 + Math.random() * 3;

            let platform_loc = {
                x: point.x,
                y: platformY,
                z: point.z,
                h: platformHeight
            };

            let p = create_model_node(
                {x: platform_loc.x, y: platform_loc.y, z: platform_loc.z},
                {x: 0.0, y: 0.0, z: 0.0},
                {x: 4.0, y: 1.0, z: 4.0},
                null,
                shapes.cube,
                uniforms,
                blue_material,
                null
            );

            p.material.textureScale = [1.0, 1.0 / 2.0];

            p.platformLocation = platform_loc;
            p.isPlatform = true;
            state.level.platforms.push(p);

            state.level.platform_locs.push(platform_loc);
            add_children(base, p);
        }
    }

    function generate_perlin_terrain(base, max_hill_height, grid_width, grid_length, cell_width, cell_length, freq, material, texture) {
        for (let z = 0; z < grid_length; z++) {
            for (let x = 0; x < grid_width; x++) {

                let y = sample_terrain_height(x, z, freq, max_hill_height);

                let px = -BASE_WIDTH + x * cell_width + cell_width / 2;
                let pz = -BASE_LENGTH + z * cell_length + cell_length / 2;

                let ph = y / 2 - 5;

                let hill = create_model_node(
                    {x: px, y: ph, z: pz},
                    {x: 0.0, y: 0.0, z: 0.0},
                    {x: cell_width, y: y + 1, z: cell_length},
                    null,
                    shapes.cube,
                    uniforms,
                    material,
                    texture
                );

                let column_height = y + 1;

                let vertical_tiles = column_height / 8.0;

                hill.material.textureScale = [cell_width / 4.0, vertical_tiles];

                add_children(base, hill);
            }
        }
    }

    function create_refuel_tower(base, refuelX, refuelZ, grid_width, grid_length, cell_width, cell_length, freq, max_hill_height) {
        let gx = Math.max(0, Math.min(grid_width - 1, Math.floor((refuelX + BASE_WIDTH)  / cell_width)));
        let gz = Math.max(0, Math.min(grid_length - 1, Math.floor((refuelZ + BASE_LENGTH) / cell_length)));

        let terrainHeight = sample_terrain_height(gx, gz, freq, max_hill_height);

        let towerHeight = 3;
        let baseY = terrainHeight - 5 + terrainHeight / 2;

        let tower = create_model_node(
            {x: refuelX, y: baseY + towerHeight / 2 + 0.5, z: refuelZ},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 4.2, y: towerHeight, z: 4.2},
            null,
            shapes.cube,
            uniforms,
            metal_blue_material,
            null
        );

        tower.isRefuelStation = true;
        add_children(base, tower);
    }

    function generate_tower_platforms(base, spawnX, spawnZ, refuelX, refuelZ, grid_width, grid_length, cell_width, cell_length, freq, max_hill_height) {
        const spawnClearRadius = 15;

        let bounds = {
            xmin: -BASE_WIDTH + 8,
            xmax: BASE_WIDTH - 8,
            ymin: 0,
            ymax: 0,
            zmin: -BASE_LENGTH + 8,
            zmax: BASE_LENGTH - 8
        };

        let points = get_spaced_points(bounds, 12, 30, MAX_PLATFORMS, false);

        for (let point of points) {

            let distSpawn = Math.hypot(point.x - spawnX, point.z - spawnZ);
            if (distSpawn < spawnClearRadius) continue;

            let distRefuel = Math.hypot(point.x - refuelX, point.z - refuelZ);
            if (distRefuel < 8) continue;

            let gx = Math.max(0, Math.min(grid_width - 1, Math.floor((point.x + BASE_WIDTH) / cell_width)));
            let gz = Math.max(0, Math.min(grid_length - 1, Math.floor((point.z + BASE_LENGTH) / cell_length)));

            let terrainHeight = sample_terrain_height(gx, gz, freq, max_hill_height);

            let towerHeight = 4 + Math.random() * 10;
            let baseY = terrainHeight - 5 + terrainHeight / 2;

            let platform_loc = {
                x: point.x,
                y: baseY + towerHeight / 2 + 0.5,
                z: point.z,
                h: towerHeight
            };

            let platform = create_model_node(
                {x: platform_loc.x, y: platform_loc.y, z: platform_loc.z},
                {x: 0.0, y: 0.0, z: 0.0},
                {x: 3.0, y: towerHeight, z: 3.0},
                null,
                shapes.cube,
                uniforms,
                metal_red_material,
                textures.red_brick_tex
            );

            platform.material.textureScale = [1.0, towerHeight / 2.0];
            platform.platformLocation = platform_loc;
            platform.isPlatform = true;

            state.level.platform_locs.push(platform_loc);
            state.level.platforms.push(platform);

            add_children(base, platform);
        }
    }

    function create_goal_arrow() {
        let max_valid_platforms = state.level.platforms.length;
        if (max_valid_platforms === 0) {
            return null;
        }

        // Pick a random platform for initial pickup location
        let rand_platform_idx = Math.floor(Math.random() * max_valid_platforms);
        let pickupPlatform = state.level.platforms[rand_platform_idx];
        let platform_loc = pickupPlatform.platformLocation;
        let platform_top = platform_loc.y + (platform_loc.h / 2);

        pickupPlatform.isPickupPlatform = true;
        state.level.currentPickupPlatform = pickupPlatform;

        const arrow_tail = create_model_node(
            {
                x: platform_loc.x,
                y: platform_top + arrow_offset_y,
                z: platform_loc.z
            },
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 0.4, y: 2.0, z: 0.4},
            null,
            shapes.cube,
            uniforms,
            goal_arrow_green_material,
            null
        );

        const arrow_head = create_model_node(
            {x: 0.0, y: -1.5, z: 0.0},
            {x: -(Math.PI / 2), y: 0.0, z: 0.0},
            {x: 2.0, y: 2.0, z: 0.5},
            null,
            shapes.cone,
            uniforms,
            goal_arrow_green_material,
            null
        );
        arrow_tail.isGoalArrow = true;
        arrow_head.isGoalArrow = true;

        // Store arrow base position for animation
        arrow_tail.basePosition = {
            x: platform_loc.x,
            y: platform_top + arrow_offset_y,
            z: platform_loc.z
        };

        arrow_tail.wtransform_cb = function() {
            const t = state.time;

            const bob = Math.sin(t * 2.0) * 0.5;
            const rot = t * 1.5;

            let d = mat4Identity();
            d = mat4Translate(d, [0, bob, 0]);
            d = mat4RotateY(d, rot);
            d = mat4Scale(d, [0.5, 2.0, 0.5]);

            return d;
        };

        add_children(arrow_tail, arrow_head);

        // Store reference to the goal arrow
        state.level.goalArrow = arrow_tail;

        return arrow_tail;
    }

    // Move the goal arrow to a specific platform
    function move_goal_arrow_to_platform(platform) {
        if (!state.level.goalArrow || !platform || !platform.platformLocation) {
            return;
        }

        const arrow = state.level.goalArrow;
        const platform_loc = platform.platformLocation;
        const platform_top = platform_loc.y + (platform_loc.h / 2);        

        // Update arrow position
        const newX = platform_loc.x;
        const newY = platform_top + arrow_offset_y;
        const newZ = platform_loc.z;

        arrow.local = mat4Translate(mat4Identity(), [newX, newY, newZ]);
        arrow.basePosition = { x: newX, y: newY, z: newZ };
    }

    // Get a random platform different from the given one
    function get_random_dropoff_platform(excludePlatform) {
        const platforms = state.level.platforms;
        if (platforms.length < 2) {
            return platforms[0] || null;
        }

        let dropoffPlatform;
        let attempts = 0;
        do {
            const idx = Math.floor(Math.random() * platforms.length);
            dropoffPlatform = platforms[idx];
            attempts++;
        } while (dropoffPlatform === excludePlatform && attempts < 20);

        // Mark platforms
        if (excludePlatform) {
            excludePlatform.isPickupPlatform = false;
        }
        dropoffPlatform.isDropoffPlatform = true;
        state.level.currentDropoffPlatform = dropoffPlatform;

        return dropoffPlatform;
    }

    // Set the goal arrow to point to a specific platform (for dropoff)
    function set_goal_arrow_target(platform) {
        move_goal_arrow_to_platform(platform);
        // Change arrow material to yellow for dropoff target
        state.level.goalArrow.material = goal_arrow_yellow_material;
        state.level.goalArrow.children[0].material = goal_arrow_yellow_material;
    }

    // Setup next passenger pickup location after delivery
    function setup_next_passenger() {
        // Clear current dropoff marker
        if (state.level.currentDropoffPlatform) {
            state.level.currentDropoffPlatform.isDropoffPlatform = false;
        }

        // Pick a new random pickup platform
        const platforms = state.level.platforms;
        if (platforms.length === 0) return;

        const idx = Math.floor(Math.random() * platforms.length);
        const newPickupPlatform = platforms[idx];

        // Mark as pickup and move arrow
        newPickupPlatform.isPickupPlatform = true;
        state.level.currentPickupPlatform = newPickupPlatform;
        state.level.currentDropoffPlatform = null;

        move_goal_arrow_to_platform(newPickupPlatform);

        state.level.goalArrow.material = goal_arrow_green_material;
        state.level.goalArrow.children[0].material = goal_arrow_green_material;
    }

    function build_model() {

        let base = generate_level();

        // Build taxi at the dynamic spawn position and add to scene
        let taxi = build_taxi(state.level.spawn_position);
        add_children(base, taxi);
        state.taxi = taxi;

        state.root = base;
    }

    function update_lights() {
        if (state.temperatureLights) {
            state.lights.color1 = [1.0, 0.6, 0.4];
            state.lights.color2 = [0.4, 0.6, 1.0];
        } else {
            state.lights.color1 = [0.7, 0.7, 0.7];
            state.lights.color2 = [0.7, 0.7, 0.7];
        }
    }

    function toggle_temperature_lights() {
        state.temperatureLights = !state.temperatureLights;
        update_lights();
    }

    function regenerate_level() {
        // Clear existing level state
        state.level.platform_locs = [];
        state.level.goal_locs = [];
        state.level.spawn_position = null;
        state.level.platforms = [];
        state.level.goalArrow = null;
        state.level.currentPickupPlatform = null;
        state.level.currentDropoffPlatform = null;

        // Rebuild the entire scene
        let base = generate_level();
        let taxi = build_taxi(state.level.spawn_position);
        add_children(base, taxi);
        state.taxi = taxi;
        state.root = base;

        return state.level.spawn_position;
    }

    update_lights();

    return {
        state,
        update_lights,
        toggle_temperature_lights,
        regenerate_level,
        get_random_dropoff_platform,
        set_goal_arrow_target,
        setup_next_passenger,
    };
}
