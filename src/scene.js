// Scene setup

function create_scene(gl, program, uniforms) {
    const textures = {
        rusty_metal1: create_texture(gl, "src/textures/rusty_metal1_tex.jpg"),
        rusty_metal2: create_texture(gl, "src/textures/rusty_metal2_tex.jpg"),
        concrete_floor: create_texture(gl, "src/textures/concrete_floor_tex.jpg"),
        grass_tex: create_texture(gl, "src/textures/grass_tex.png"),
        red_brick_tex: create_texture(gl, "src/textures/red_brick_tex.png")
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
        lights: {
            pos1: [30, 40, 30],   // High above for 3D area
            pos2: [-30, 40, -30],
            color1: [0.9, 0.9, 0.85],  // Warm sunlight
            color2: [0.5, 0.5, 0.6],   // Cool fill light
        },
        root: null,
        taxi: null,
        level: {
            platform_locs: [],
            goal_locs: []
        }
    };

    function build_taxi() {
        // Taxi root node - positioned at starting location (center, above ground)
        const taxiRoot = create_model_node(
            {x: 0.0, y: 15.0, z: -30.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 1, y: 1, z: 1},
            null,
            null,
            uniforms,
            null,
            null
        );

        // Main body - yellow taxi body
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

        // Cabin/roof - smaller on top
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

        // Windshield - front
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

        // Taxi sign on roof
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

        // Store references to flame nodes for toggling visibility
        taxiRoot.thrustFlame1 = thrustFlame1;
        taxiRoot.thrustFlame2 = thrustFlame2;
        taxiRoot.leftFlame = leftFlame;
        taxiRoot.rightFlame = rightFlame;

        // Set custom bounding box for taxi that only covers the body, not the flames
        taxiRoot.bounding = {
            type: "box",
            min: [-1.0, -0.5, -0.5],  // Covers main body and wheels
            max: [ 1.0,  1.0,  0.5]   // Doesn't include extended flames
        };

        return taxiRoot;
    }

    const MAX_LEVELS = 3;
    const BASE_WIDTH = 50;
    const BASE_HEIGHT = 20;
    const BASE_LENGTH = 50;
    const MAX_PLATFORMS = 40;
    const MAX_SPAWN_HEIGHT = 15;

    function generate_level() {
        // Always use Perlin noise terrain with red tower platforms
        return generate_perlin_with_towers();
    }

    function generate_perlin_with_towers() {
        // Create root node (invisible container)
        const base = create_model_node(
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 1.0, y: 1.0, z: 1.0},
            null,
            null,
            uniforms,
            null,
            null
        );

        // Taxi spawn point - keep this area clear
        const spawnX = 0;
        const spawnZ = -30;
        const spawnClearRadius = 15;  // Don't place towers within this radius

        // Generate Perlin noise terrain - now fully 3D
        let max_hill_height = 8;
        let grid_width = 50;   // Cells in X direction
        let grid_length = 50;  // Cells in Z direction
        let cell_width = (2 * BASE_WIDTH) / grid_width;
        let cell_length = (2 * BASE_LENGTH) / grid_length;

        let freq = 0.1;  // Lower frequency for smoother, rolling hills

        for (let z = 0; z < grid_length; z++) {
            for (let x = 0; x < grid_width; x++) {
                // Perlin noise sample
                let n = perlin_noise(x * freq, z * freq);
                n += 1.0;
                n /= 2.0;

                let y = Math.round(n * max_hill_height);

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
                    grass_material,
                    textures.grass_tex
                );

                add_children(base, hill);
            }
        }

        // Add blue refuel tower near spawn point
        const refuelX = 10;
        const refuelZ = -25;
        let refuelGridX = Math.floor((refuelX + BASE_WIDTH) / cell_width);
        let refuelGridZ = Math.floor((refuelZ + BASE_LENGTH) / cell_length);
        refuelGridX = Math.max(0, Math.min(grid_width - 1, refuelGridX));
        refuelGridZ = Math.max(0, Math.min(grid_length - 1, refuelGridZ));

        let refuelTerrainNoise = perlin_noise(refuelGridX * freq, refuelGridZ * freq);
        refuelTerrainNoise = (refuelTerrainNoise + 1.0) / 2.0;
        let refuelTerrainHeight = Math.round(refuelTerrainNoise * max_hill_height);

        let refuelTowerHeight = 3;  // Short tower
        let refuelBaseY = refuelTerrainHeight - 5 + refuelTerrainHeight / 2;

        let refuelTower = create_model_node(
            {x: refuelX, y: refuelBaseY + refuelTowerHeight / 2 + 0.5, z: refuelZ},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 4.2, y: refuelTowerHeight, z: 4.2},
            null,
            shapes.cube,
            uniforms,
            metal_blue_material,
            null
        );
        refuelTower.isRefuelStation = true;  // Mark as refuel station
        add_children(base, refuelTower);

        // Add red tower platforms using Poisson disc sampling in 2D (X-Z plane)
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
            // Skip if too close to spawn point
            let distToSpawn = Math.sqrt((point.x - spawnX) ** 2 + (point.z - spawnZ) ** 2);
            if (distToSpawn < spawnClearRadius) {
                continue;
            }

            // Skip if too close to refuel tower
            let distToRefuel = Math.sqrt((point.x - refuelX) ** 2 + (point.z - refuelZ) ** 2);
            if (distToRefuel < 8) {
                continue;
            }

            // Sample terrain height at this x,z position
            let gridX = Math.floor((point.x + BASE_WIDTH) / cell_width);
            let gridZ = Math.floor((point.z + BASE_LENGTH) / cell_length);
            gridX = Math.max(0, Math.min(grid_width - 1, gridX));
            gridZ = Math.max(0, Math.min(grid_length - 1, gridZ));

            let terrainNoise = perlin_noise(gridX * freq, gridZ * freq);
            terrainNoise = (terrainNoise + 1.0) / 2.0;
            let terrainHeight = Math.round(terrainNoise * max_hill_height);

            // Place tower on top of terrain
            let towerHeight = 4 + Math.random() * 10;
            let baseY = terrainHeight - 5 + terrainHeight / 2;

            let platform_loc = {
                x: point.x,
                y: baseY + towerHeight / 2 + 0.5,
                z: point.z,
                h: towerHeight
            };

            let platform = create_model_node(
                {x: point.x, y: baseY + towerHeight / 2 + 0.5, z: point.z},
                {x: 0.0, y: 0.0, z: 0.0},
                {x: 3.0, y: towerHeight, z: 3.0},
                null,
                shapes.cube,
                uniforms,
                metal_red_material,
                textures.red_brick_tex
            );

            platform.material.textureScale = [1.0, towerHeight / 2.0];

            state.level.platform_locs.push(platform_loc);

            add_children(base, platform);
        }

        let goal_arrow = create_goal_arrow();
        add_children(base, goal_arrow);

        return base;
    }

    // function generate_tall_towers_level() {
    //     let bounds = {
    //         xmin: -BASE_WIDTH + 2,
    //         xmax: BASE_WIDTH - 2,
    //         ymin: 2,
    //         ymax: BASE_HEIGHT,
    //         zmin: -BASE_LENGTH + 2,
    //         zmax: BASE_LENGTH - 2
    //     };

    //     const base = create_model_node(
    //         {x: 0.0, y: -5.0, z: 0.0},
    //         {x: 0.0, y: 0.0, z: 0.0},
    //         {x: BASE_WIDTH, y: 1.0, z: BASE_LENGTH},
    //         null,
    //         shapes.cube,
    //         uniforms,
    //         ground_material,
    //         null
    //     );


    //     let points = get_spaced_points(bounds, 5, 5, MAX_PLATFORMS, false);
        
    //     console.log(points.length);

    //     for (let point of points) {

    //         let height = Math.random() * MAX_SPAWN_HEIGHT;

    //          let platform = create_model_node(
    //             {x: point.x, y: height, z: point.z},
    //             {x: 0.0, y: 0.0, z: 0.0},
    //             {x: 1.0, y: height, z: 1.0},
    //             null,
    //             shapes.cube,
    //             uniforms,
    //             metal_red_material,
    //             null
    //         );

    //         add_children(base, platform);
    //     }

    //     return base;
    // }

    // function generate_hilly_rough_level() {
    //     const base = create_model_node(
    //         {x: 0.0, y: -5.0, z: 0.0},
    //         {x: 0.0, y: 0.0, z: 0.0},
    //         {x: BASE_WIDTH, y: 1.0, z: BASE_LENGTH},
    //         null,
    //         shapes.cube,
    //         uniforms,
    //         ground_material,
    //         null
    //     );

    //     let max_hill_height = 10;
    //     let grid_width = 20;
    //     let grid_length = 20;
    //     let cell_width = (2 * BASE_WIDTH) / grid_width;
    //     let cell_length = (2 * BASE_LENGTH) / grid_length;

    //     let freq = 0.2;

    //     for (let z = 0; z < grid_length; z++) {
    //         for (let x = 0; x < grid_width; x++) {

    //             // perlin noise sample
    //             let n = perlin_noise(x * freq, z * freq);
    //             n += 1.0;
    //             n /= 2.0;

    //             let y = Math.round(n * max_hill_height);

    //             let px = -BASE_WIDTH  + x * cell_width  + cell_width / 2;
    //             let pz = -BASE_LENGTH + z * cell_length + cell_length / 2;

    //             let ph = y / 2 - 4.8;

    //             let hill = create_model_node(
    //                 {x: px, y: ph, z: pz},
    //                 {x: 0.0, y: 0.0, z: 0.0},
    //                 {x: cell_width, y: y, z: cell_length},
    //                 null,
    //                 shapes.cube,
    //                 uniforms,
    //                 candy_material,
    //                 null
    //             );

    //             add_children(base, hill);
    //         }
    //     }

    //     return base;
    // }

    // function generate_floating_platform_level() {
    //     let bounds = {
    //         xmin: -BASE_WIDTH + 2,
    //         xmax: BASE_WIDTH - 2,
    //         ymin: 5,
    //         ymax: BASE_HEIGHT,
    //         zmin: -BASE_LENGTH + 2,
    //         zmax: BASE_LENGTH - 2
    //     };

    //     const base = create_model_node(
    //         {x: 0.0, y: -5.0, z: 0.0},
    //         {x: 0.0, y: 0.0, z: 0.0},
    //         {x: BASE_WIDTH, y: 1.0, z: BASE_LENGTH},
    //         null,
    //         shapes.cube,
    //         uniforms,
    //         ground_material,
    //         null
    //     );


    //     let points = get_spaced_points(bounds, 6, 50, MAX_PLATFORMS, true);
        
    //     for (let point of points) {

    //         let height = Math.random() * MAX_SPAWN_HEIGHT;

    //          let platform = create_model_node(
    //             {x: point.x, y: height, z: point.z},
    //             {x: 0.0, y: 0.0, z: 0.0},
    //             {x: 1.0, y: 0.2, z: 1.0},
    //             null,
    //             shapes.cube,
    //             uniforms,
    //             metal_red_material,
    //             null
    //         );

    //         add_children(base, platform);
    //     }

    //     return base;
    // }

    function create_goal_arrow() {
        let max_valid_platforms = state.level.platform_locs.length;
        if (max_valid_platforms === 0) {
            return null;
        }

        let rand_platform_idx = Math.floor(Math.random() * max_valid_platforms);
        let rand_platform_loc = state.level.platform_locs[rand_platform_idx];
        let platform_top = rand_platform_loc.y + (rand_platform_loc.h / 2);

        state.level.goal_locs.push(rand_platform_loc);

        let arrow_offset_y = 13.0;

        const arrow_tail = create_model_node(
            {
                x: rand_platform_loc.x,
                y: platform_top + arrow_offset_y,
                z: rand_platform_loc.z
            },
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 0.4, y: 2.0, z: 0.4},
            null,
            shapes.cube,
            uniforms,
            goal_arrow_material,
            null
        );

        const arrow_head = create_model_node(
            {x: 0.0, y: -1.5, z: 0.0},
            {x: -(Math.PI / 2), y: 0.0, z: 0.0},
            {x: 2.0, y: 2.0, z: 0.5},
            null,
            shapes.cone,
            uniforms,
            goal_arrow_material,
            null
        );
        arrow_tail.isGoalArrow = true;
        arrow_head.isGoalArrow = true;

        arrow_tail.wtransform_cb = function() {
            const t = scene.time;

            const bob = Math.sin(t * 2.0) * 0.5;
            const rot = t * 1.5;

            let d = mat4Identity();
            d = mat4Translate(d, [0, bob, 0]);
            d = mat4RotateY(d, rot);
            d = mat4Scale(d, [0.5, 2.0, 0.5]);

            return d;
        };

        add_children(arrow_tail, arrow_head);

        return arrow_tail;
    }

    function build_model() {

        let base = generate_level();

        // Build taxi and add to scene
        let taxi = build_taxi();
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

    build_model();
    update_lights();

    console.log("Scene built successfully!");
    console.log("Root node:", state.root);
    console.log("Taxi node:", state.taxi);

    return {
        state,
        update_lights,
        toggle_temperature_lights,
    };
}
