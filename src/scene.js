// Scene setup

function create_scene(gl, program, uniforms) {
    const textures = {
        rusty_metal1: create_texture(gl, "src/textures/rusty_metal1_tex.jpg"),
        rusty_metal2: create_texture(gl, "src/textures/rusty_metal2_tex.jpg"),
        concrete_floor: create_texture(gl, "src/textures/concrete_floor_tex.jpg"),
        grass_tex: create_texture(gl, "src/textures/grass_tex.png"),
        red_brick_tex: create_texture(gl, "src/textures/red_brick_tex.png"),
        fabric_black_tex: create_texture(gl, "src/textures/fabric_black_tex.jpg"),
        snow_tex: create_texture(gl, "src/textures/snow_tex.jpg"),
        lava_tex_animated: create_texture(gl, "src/textures/lava_tex_animated.webm")
    };

    const shapes = {
        cube: make_shape(gl, program, cube_data),
        sphere: make_shape(gl, program, () => sphere_data(30, 30, 1)),
        cone: make_shape(gl, program, () => cone_data(30, 30, 1, 1)),
        cylinder: make_shape(gl, program, () => cylinder_data(30, 30, 1, 1)),
    };

    const WEATHER_TYPES = {
        clear: {
            name: "Clear",
            skyColor: [0.0, 0.0, 0.0],
            light1: [0.7, 0.7, 0.65],
            light2: [0.3, 0.3, 0.4],
            fogDensity: 0.0,
            rainIntensity: 0.0,
            snowIntensity: 0.0
        },
        sunset: {
            name: "Sunset",
            skyColor: [0.15, 0.05, 0.02],
            light1: [1.0, 0.5, 0.2],
            light2: [0.6, 0.3, 0.4],
            fogDensity: 0.0,
            rainIntensity: 0.0,
            snowIntensity: 0.0
        },
        space: {
            name: "Space",
            skyColor: [0.0, 0.0, 0.02],
            light1: [0.5, 0.5, 0.6],
            light2: [0.2, 0.2, 0.3],
            fogDensity: 0.0,
            rainIntensity: 0.0,
            snowIntensity: 0.0
        },
        foggy: {
            name: "Foggy",
            skyColor: [0.3, 0.3, 0.35],
            light1: [0.5, 0.5, 0.5],
            light2: [0.4, 0.4, 0.4],
            fogDensity: 0.02,
            rainIntensity: 0.0,
            snowIntensity: 0.0
        },
        storm: {
            name: "Storm",
            skyColor: [0.05, 0.05, 0.08],
            light1: [0.3, 0.3, 0.35],
            light2: [0.2, 0.2, 0.25],
            fogDensity: 0.01,
            rainIntensity: 1.0,
            snowIntensity: 0.0
        },
        rainy: {
            name: "Rainy",
            skyColor: [0.15, 0.15, 0.2],
            light1: [0.4, 0.4, 0.45],
            light2: [0.3, 0.3, 0.35],
            fogDensity: 0.005,
            rainIntensity: 0.7,
            snowIntensity: 0.0
        },
        snowy: {
            name: "Snowy",
            skyColor: [0.25, 0.25, 0.3],
            light1: [0.6, 0.6, 0.7],
            light2: [0.4, 0.4, 0.5],
            fogDensity: 0.01,
            rainIntensity: 0.0,
            snowIntensity: 1.0
        },
        blizzard: {
            name: "Blizzard",
            skyColor: [0.4, 0.4, 0.45],
            light1: [0.5, 0.5, 0.55],
            light2: [0.4, 0.4, 0.45],
            fogDensity: 0.02,
            rainIntensity: 0.0,
            snowIntensity: 1.5
        },
        dawn: {
            name: "Dawn",
            skyColor: [0.1, 0.05, 0.1],
            light1: [0.8, 0.6, 0.7],
            light2: [0.4, 0.3, 0.5],
            fogDensity: 0.0,
            rainIntensity: 0.0,
            snowIntensity: 0.0
        }
    };

    const WEATHER_LIST = Object.keys(WEATHER_TYPES);

    const state = {
        bumpStrength: 100.0,
        viewDirection: [0, 0, 0],
        temperatureLights: false,
        dt: 0.0,
        time: 0.0,
        weather: {
            current: "clear",
            config: WEATHER_TYPES.clear,
            stormFlicker: false
        },
        lights: {
            // pos1: [30, 40, 30],
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
            deathY: -100,  // Y level below which taxi dies (for lava levels)
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
    const arrow_offset_y = 10.0;

    // Track current level to avoid repeating
    let currentLevelType = 0;

    function generate_level() {
        // Pick a random level, favoring any level that isn't the current one
        let lvl;
        if (currentLevelType === 0) {
            // First level - fully random
            lvl = Math.ceil(Math.random() * MAX_LEVELS);
        } else {
            // Favor different levels - 80% chance to pick a different level
            if (Math.random() < 0.8) {
                // Pick from levels that aren't the current one
                let options = [];
                for (let i = 1; i <= MAX_LEVELS; i++) {
                    if (i !== currentLevelType) options.push(i);
                }
                lvl = options[Math.floor(Math.random() * options.length)];
            } else {
                // 20% chance to repeat the same level
                lvl = Math.ceil(Math.random() * MAX_LEVELS);
            }
        }

        currentLevelType = lvl;

        switch (lvl) {
            case 1:
                return generate_mountain_level();
            case 2:
                return generate_brick_tower_level();
            case 3:
                return generate_lava_sea_level();
            default:
                return generate_lava_sea_level();
        }
    }

    function generate_brick_tower_level() {

        const base = create_level_root();

        // World generation parameters
        let max_hill_height = 8;
        let grid_width = 25;
        let grid_length = 25;
        let cell_width = (2 * BASE_WIDTH) / grid_width;
        let cell_length = (2 * BASE_LENGTH) / grid_length;
        let freq = 0.1;

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
            grass_material,
            textures.grass_tex
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
            const spawnPlatform = select_spawn_platform(refuelX, refuelZ);
            const loc = spawnPlatform.platformLocation;
            const platformTop = loc.y + (loc.h / 2);

            state.level.spawn_position = {
                x: loc.x,
                y: platformTop + 1.5, 
                z: loc.z
            };
        }

        let goal_arrow = create_goal_arrow();
        if (goal_arrow) add_children(base, goal_arrow);

        return base;
    }

    function generate_lava_sea_level() {
        const base = create_level_root();

        const lava_sea = create_model_node(
            {x: 0.0, y: -10.0, z: 0.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 200.0, y: 1.0, z: 200.0},
            null,
            shapes.cube,
            uniforms,
            lava_material,
            textures.lava_tex_animated
        );
        add_children(base, lava_sea);

        state.level.deathY = -8;

        const spawnX = 0;
        const spawnZ = -30;
        const spawnPlatformY = 5;

        const spawnPlatform = create_model_node(
            {x: spawnX, y: spawnPlatformY, z: spawnZ},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 6.0, y: 1.0, z: 6.0},
            null,
            shapes.cube,
            uniforms,
            metal_gray_material,
            null
        );
        spawnPlatform.isPlatform = true;
        spawnPlatform.platformLocation = {x: spawnX, y: spawnPlatformY + 0.5, z: spawnZ, h: 1};
        add_children(base, spawnPlatform);

        state.level.spawn_position = {
            x: spawnX,
            y: spawnPlatformY + 1.5,
            z: spawnZ
        };

        // Create refuel platform (thin style)
        const refuelX = 25;
        const refuelZ = 25;
        const refuelY = 8;

        const refuelPlatform = create_model_node(
            {x: refuelX, y: refuelY, z: refuelZ},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 5.0, y: 1.0, z: 5.0},
            null,
            shapes.cube,
            uniforms,
            metal_blue_material,
            null
        );
        refuelPlatform.isRefuelStation = true;
        refuelPlatform.isPlatform = true;
        refuelPlatform.platformLocation = {x: refuelX, y: refuelY + 0.5, z: refuelZ, h: 1};
        state.level.platforms.push(refuelPlatform);
        add_children(base, refuelPlatform);

        // Generate random floating platforms
        const spawnClearRadius = 15;
        const refuelClearRadius = 12;

        let bounds = {
            xmin: -BASE_WIDTH + 10,
            xmax: BASE_WIDTH - 10,
            ymin: 0,
            ymax: 0,
            zmin: -BASE_LENGTH + 10,
            zmax: BASE_LENGTH - 10
        };

        let points = get_spaced_points(bounds, 40, 40, 15, false);

        for (let point of points) {
            let distSpawn = Math.hypot(point.x - spawnX, point.z - spawnZ);
            if (distSpawn < spawnClearRadius) continue;

            let distRefuel = Math.hypot(point.x - refuelX, point.z - refuelZ);
            if (distRefuel < refuelClearRadius) continue;

            let platformY = 3 + Math.random() * 15;

            let platform_loc = {
                x: point.x,
                y: platformY,
                z: point.z,
                h: 1
            };

            let p = create_model_node(
                {x: platform_loc.x, y: platform_loc.y, z: platform_loc.z},
                {x: 0.0, y: 0.0, z: 0.0},
                {x: 4.0, y: 1.0, z: 4.0},
                null,
                shapes.cube,
                uniforms,
                metal_gray_material,
                null
            );

            p.platformLocation = platform_loc;
            p.isPlatform = true;
            state.level.platforms.push(p);
            state.level.platform_locs.push(platform_loc);
            add_children(base, p);
        }

        // Create goal arrow
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

    // Get the actual top surface Y of terrain at a world position
    function get_terrain_top_y(worldX, worldZ, grid_width, grid_length, cell_width, cell_length, freq, max_hill_height) {
        const gx = Math.max(0, Math.min(grid_width - 1, Math.floor((worldX + BASE_WIDTH) / cell_width)));
        const gz = Math.max(0, Math.min(grid_length - 1, Math.floor((worldZ + BASE_LENGTH) / cell_length)));
        const terrainHeight = sample_terrain_height(gx, gz, freq, max_hill_height);
        return terrainHeight - 2;
    }

    // Analyze a cell to determine spawn suitability
    function analyze_spawn_cell(worldX, worldZ, refuelX, refuelZ, grid_width, grid_length, cell_width, cell_length, freq, max_hill_height) {
        const terrainTopY = get_terrain_top_y(worldX, worldZ, grid_width, grid_length, cell_width, cell_length, freq, max_hill_height);
        const distToRefuel = Math.hypot(worldX - refuelX, worldZ - refuelZ);

        const inSpawnZone = (
            worldZ >= -BASE_LENGTH + 10 &&
            worldZ <= -BASE_LENGTH / 2 &&
            worldX >= -BASE_WIDTH / 2 &&
            worldX <= BASE_WIDTH / 2
        );

        let nearestPlatform = null;
        let nearestPlatformDist = Infinity;

        for (const platform of state.level.platforms) {
            const loc = platform.platformLocation;
            const dist = Math.hypot(worldX - loc.x, worldZ - loc.z);
            if (dist < nearestPlatformDist) {
                nearestPlatformDist = dist;
                nearestPlatform = platform;
            }
        }

        const hasPlatformHere = nearestPlatform && nearestPlatformDist < 2.0;
        let platformTopY = null;

        if (hasPlatformHere) {
            const loc = nearestPlatform.platformLocation;
            platformTopY = loc.y + (loc.h / 2);
        }

        return {
            worldX,
            worldZ,
            terrainTopY,
            distToRefuel,
            inSpawnZone,
            hasPlatformHere,
            platformTopY,
            nearestPlatform,
            nearestPlatformDist
        };
    }

    function select_spawn_platform(refuelX, refuelZ) {
        const validPlatforms = [];
        const MIN_REFUEL_DIST = 15;
        const MIN_PLATFORM_SPACING = 8;

        for (const platform of state.level.platforms) {
            const loc = platform.platformLocation;
            const distToRefuel = Math.hypot(loc.x - refuelX, loc.z - refuelZ);

            if (distToRefuel < MIN_REFUEL_DIST) continue;

            let tooClose = false;
            for (const other of state.level.platforms) {
                if (other === platform) continue;
                const otherLoc = other.platformLocation;
                const dist = Math.hypot(loc.x - otherLoc.x, loc.z - otherLoc.z);
                if (dist < MIN_PLATFORM_SPACING) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;

            const edgeMargin = 10;
            const nearEdge = (
                Math.abs(loc.x) > BASE_WIDTH - edgeMargin ||
                Math.abs(loc.z) > BASE_LENGTH - edgeMargin
            );

            validPlatforms.push({
                platform,
                nearEdge,
                distToRefuel
            });
        }

        if (validPlatforms.length === 0) {
            for (const platform of state.level.platforms) {
                const loc = platform.platformLocation;
                if (Math.hypot(loc.x - refuelX, loc.z - refuelZ) >= MIN_REFUEL_DIST) {
                    return platform;
                }
            }
            return state.level.platforms[0];
        }

        const interiorPlatforms = validPlatforms.filter(p => !p.nearEdge);
        const candidates = interiorPlatforms.length > 0 ? interiorPlatforms : validPlatforms;

        const idx = Math.floor(Math.random() * candidates.length);
        return candidates[idx].platform;
    }

    function select_taxi_spawn_position(grid_width, grid_length, cell_width, cell_length, freq, max_hill_height, refuelX, refuelZ) {
        const spawnZoneMinZ = -BASE_LENGTH + 10;
        const spawnZoneMaxZ = -BASE_LENGTH / 2;
        const spawnZoneMinX = -BASE_WIDTH / 2;
        const spawnZoneMaxX = BASE_WIDTH / 2;

        const gxMin = Math.floor((spawnZoneMinX + BASE_WIDTH) / cell_width);
        const gxMax = Math.floor((spawnZoneMaxX + BASE_WIDTH) / cell_width);
        const gzMin = Math.floor((spawnZoneMinZ + BASE_LENGTH) / cell_length);
        const gzMax = Math.floor((spawnZoneMaxZ + BASE_LENGTH) / cell_length);

        let bestCell = null;
        const maxAttempts = 50;
        const MIN_REFUEL_DIST = 12;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Pick a random grid cell in the spawn zone
            let gx = gxMin + Math.floor(Math.random() * (gxMax - gxMin + 1));
            let gz = gzMin + Math.floor(Math.random() * (gzMax - gzMin + 1));
            gx = Math.max(0, Math.min(grid_width - 1, gx));
            gz = Math.max(0, Math.min(grid_length - 1, gz));

            const worldX = -BASE_WIDTH + gx * cell_width + cell_width / 2;
            const worldZ = -BASE_LENGTH + gz * cell_length + cell_length / 2;

            const cell = analyze_spawn_cell(
                worldX, worldZ, refuelX, refuelZ,
                grid_width, grid_length, cell_width, cell_length, freq, max_hill_height
            );

            if (cell.distToRefuel < MIN_REFUEL_DIST) continue;

            if (cell.hasPlatformHere && cell.platformTopY !== null) {
                return {
                    x: worldX,
                    y: cell.platformTopY + 1.5,
                    z: worldZ
                };
            }

            if (!bestCell || cell.distToRefuel > bestCell.distToRefuel) {
                bestCell = cell;
            }
        }

        if (bestCell) {
            return {
                x: bestCell.worldX,
                y: bestCell.terrainTopY + 1.5,
                z: bestCell.worldZ
            };
        }

        const fallbackX = 0;
        const fallbackZ = -BASE_LENGTH * 0.75;
        const fallbackY = get_terrain_top_y(
            fallbackX, fallbackZ,
            grid_width, grid_length, cell_width, cell_length, freq, max_hill_height
        );
        return { x: fallbackX, y: fallbackY + 1.5, z: fallbackZ };
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

    // Get a random platform different from the given one (excludes refuel stations)
    function get_random_dropoff_platform(excludePlatform) {
        const platforms = state.level.platforms;

        // Filter out refuel stations - they shouldn't be delivery spots
        const validPlatforms = platforms.filter(p => !p.isRefuelStation);

        if (validPlatforms.length < 2) {
            return validPlatforms[0] || null;
        }

        let dropoffPlatform;
        let attempts = 0;
        do {
            const idx = Math.floor(Math.random() * validPlatforms.length);
            dropoffPlatform = validPlatforms[idx];
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

        // Pick a new random pickup platform (exclude refuel stations)
        const platforms = state.level.platforms;
        const validPlatforms = platforms.filter(p => !p.isRefuelStation);
        if (validPlatforms.length === 0) return;

        const idx = Math.floor(Math.random() * validPlatforms.length);
        const newPickupPlatform = validPlatforms[idx];

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
        const weather = state.weather.config;

        if (state.temperatureLights) {
            // Temperature mode overrides weather
            state.lights.color1 = [1.0, 0.6, 0.4];
            state.lights.color2 = [0.4, 0.6, 1.0];
        } else {
            // Use weather lighting
            state.lights.color1 = [...weather.light1];
            state.lights.color2 = [...weather.light2];

            // Storm flicker effect
            if (state.weather.current === "storm" && Math.random() < 0.02) {
                // Lightning flash
                state.lights.color1 = [1.0, 1.0, 1.2];
                state.lights.color2 = [0.8, 0.8, 1.0];
            }
        }
    }

    function set_weather(weatherType) {
        if (WEATHER_TYPES[weatherType]) {
            state.weather.current = weatherType;
            state.weather.config = WEATHER_TYPES[weatherType];
            update_lights();
            console.log("Weather set to: " + WEATHER_TYPES[weatherType].name);
        }
    }

    function set_random_weather() {
        const randomIndex = Math.floor(Math.random() * WEATHER_LIST.length);
        const weatherType = WEATHER_LIST[randomIndex];
        set_weather(weatherType);
        return weatherType;
    }

    function get_weather_sky_color() {
        return state.weather.config.skyColor;
    }

    function get_weather_name() {
        return state.weather.config.name;
    }

    function get_rain_intensity() {
        return state.weather.config.rainIntensity || 0.0;
    }

    function get_snow_intensity() {
        return state.weather.config.snowIntensity || 0.0;
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
        state.level.deathY = -100;  // Reset death zone (lava levels will set this)

        // Set random weather for new level
        set_random_weather();

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
        set_weather,
        set_random_weather,
        get_weather_sky_color,
        get_weather_name,
        get_rain_intensity,
        get_snow_intensity,
        WEATHER_TYPES,
    };
}
