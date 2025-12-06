// Scene setup

function create_scene(gl, program, uniforms) {
    const textures = {
        rusty_metal1: create_texture(gl, "src/textures/rusty_metal1_tex.jpg"),
        rusty_metal2: create_texture(gl, "src/textures/rusty_metal2_tex.jpg"),
        concrete_floor: create_texture(gl, "src/textures/concrete_floor_tex.jpg")
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
        lights: {
            pos1: [0, 3, 0],
            pos2: [0, 3, 0],
            color1: [0.7, 0.7, 0.7],
            color2: [0.7, 0.7, 0.7],
        },
        root: null,
        taxi: null,
    };

    function build_taxi() {
        // Taxi root node - positioned at starting location (above ground)
        const taxiRoot = create_model_node(
            {x: -6.0, y: 10.5, z: 0.0},
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

        // Thrust flame - below taxi (visible when thrusting up)
        const thrustFlame = create_model_node(
            {x: 0.0, y: -0.7, z: 0.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: 1.0, y: 1.0, z: 1.0},
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
        add_children(taxiRoot, thrustFlame);

        // Left horizontal flame (visible when moving right - shoots from left side)
        const leftFlame = create_model_node(
            {x: -2.2, y: 0.0, z: 0},
            {x: 90, y: Math.PI / 2, z: 0.0},
            {x: 5, y: 1.0, z: 5},
            null,
            shapes.cone,
            uniforms,
            {
                Ka: 0.8,
                Kd: 0.6,
                Ks: 0.3,
                alpha: 10.0,
                color: [1.0, 0.5, 0.1], // Orange-yellow
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, leftFlame);

        // Right horizontal flame (visible when moving left - shoots from right side)
        const rightFlame = create_model_node(
            {x: -1.7, y: 0.0, z: 0},
            {x: 0.0, y: -Math.PI / 2, z: 0.0},
            {x: 1.0, y: 1.0, z: 1.0},
            null,
            shapes.cone,
            uniforms,
            {
                Ka: 0.8,
                Kd: 0.6,
                Ks: 0.3,
                alpha: 10.0,
                color: [1.0, 0.5, 0.1], // Orange-yellow
                bumpOn: false
            },
            null
        );
        add_children(taxiRoot, rightFlame);

        // Store references to flame nodes for toggling visibility
        taxiRoot.thrustFlame = thrustFlame;
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

    function generate_level() {
        const BASE_WIDTH = 10;
        const BASE_HEIGHT = 10;
        const BASE_LENGTH = 10;

        const MAX_PLATFORMS = 16;
        const MAX_SPAWN_HEIGHT = 10;

        let bounds = {
            xmin: -BASE_WIDTH + 2,
            xmax: BASE_WIDTH - 2,
            ymin: 2,
            ymax: BASE_HEIGHT,
            zmin: -BASE_LENGTH + 2,
            zmax: BASE_LENGTH - 2
        };

        const base = create_model_node(
            {x: 0.0, y: -5.0, z: 0.0},
            {x: 0.0, y: 0.0, z: 0.0},
            {x: BASE_WIDTH, y: 1.0, z: BASE_LENGTH},
            null,
            shapes.cube,
            uniforms,
            ground_material,
            null
        );


        let points = get_spaced_points(bounds, 5, 5, MAX_PLATFORMS, false);
        
        console.log(points.length);

        for (let point of points) {

            let height = Math.random() * BASE_HEIGHT;

             let platform = create_model_node(
                {x: point.x, y: height, z: point.z},
                {x: 0.0, y: 0.0, z: 0.0},
                {x: 1.0, y: height, z: 1.0},
                null,
                shapes.cube,
                uniforms,
                metal_red_material,
                null
            );

            add_children(base, platform);
        }



        // for (let i = 0; i < MAX_PLATFORMS; i++) {

        //     let rand_y = Math.random() * MAX_SPAWN_HEIGHT
        //     let rand_x = Math.random() * BASE_WIDTH * 2 - BASE_WIDTH;
        //     let rand_z = Math.random() * BASE_LENGTH * 2 - BASE_LENGTH;

        //     let platform = create_model_node(
        //         {x: rand_x, y: rand_y, z: rand_z},
        //         {x: 0.0, y: 0.0, z: 0.0},
        //         {x: 1.0, y: 0.1, z: 1.0},
        //         null,
        //         shapes.cube,
        //         uniforms,
        //         metal_red_material,
        //         null
        //     );

        //     add_children(base, platform);
        // }

        return base;
    }

    function build_model() {
        // const ground = create_model_node(
        //     {x: 0.0, y: -5.0, z: 0.0},
        //     {x: 0.0, y: 0.0, z: 0.0},
        //     {x: 10.0, y: 1.0, z: 10.0},
        //     null,
        //     shapes.cube,
        //     uniforms,
        //     ground_material,
        //     null
        // );

        // const body = create_model_node(
        //     {x: 0.0, y: 3.0, z: 0.0},
        //     {x: 0.0, y: 0.0, z: 0.0},
        //     {x: 1.0, y: 1.0, z: 1.0},
        //     (mtm) => {
        //         let mat = mat4Identity();
        //         mat = mat4Translate(mat, [0.0, 0.08*Math.sin(Date.now()/100), 0.0]);
        //         return multiplyMat4(mtm, mat);
        //     },
        //     shapes.cube,
        //     uniforms,
        //     metal_orange_material,
        //     textures.rusty_metal1
        // );

        // add_children(ground, body);

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
