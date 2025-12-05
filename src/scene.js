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
    };

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

    return {
        state,
        update_lights,
        toggle_temperature_lights,
    };
}
