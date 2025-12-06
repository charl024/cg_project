class ModelNode {
    constructor() {
        // static, inherited
        this.local = mat4Identity();    
        // animated, not inherited 
        this.dynamic = mat4Identity();   
        // computed
        this.world = mat4Identity();     

        this.wtransform_cb = null;
        this.children = null;

        this.shape = null;
        this.uniforms = null;
        this.material = null;
        this.texture = null;

        this.bounding = null;
        this.world_bounding = null;

    }
}

// transform: local transformation matrix, this is where you set the initial position/angle of the object
// wtransform_cb: function to compute world transformation, this is where you set dynamic transformations (and scaling)
// children: list of child nodes
// shape: shape to draw
// uniforms: material/transform uniform locations
// material: material properties for drawing
// texture: texture info bound to this node (created with create_texture)
// NOTE: if a transform should be inherited by children, modify node.local
//       otherwise if a transform should not be inherited by children, we apply it to node.dynamic
function create_model_node(initial_location, initial_angle, initial_scale, wtransform_cb, shape, uniforms, material, texture) {
    let node = new ModelNode();

    let local = mat4Identity();
    let dynamic = mat4Identity();

    if (initial_location) {
        local = mat4Translate(local, [
            initial_location.x,
            initial_location.y,
            initial_location.z
        ]);
    }

    if (initial_angle) {
        local = mat4RotateX(local, initial_angle.x || 0);
        local = mat4RotateY(local, initial_angle.y || 0);
        local = mat4RotateZ(local, initial_angle.z || 0);
    }

    if (initial_scale) {
        dynamic = mat4Scale(dynamic, [
            initial_scale.x,
            initial_scale.y,
            initial_scale.z
        ]);
    }

    node.local = local;
    node.dynamic = dynamic;
    node.wtransform_cb = wtransform_cb;
    
    node.shape = shape || null;
    node.uniforms = uniforms || null;
    node.material = material || null;
    node.texture = texture || null;
    node.children = [];
 
    node.bounding = {
        type: "box",
        min: [-1, -1, -1],
        max: [ 1,  1,  1]
    };

    node.world_bounding = {
        center: [0,0,0],
        axes: [ [1, 0, 0], [0, 1, 0], [0, 0, 1] ],
        halfsize: [1, 1, 1]
    };

    return node;
}

function add_children(parent_node, child_node) {

    if (parent_node.children == null) {
        parent_node.children = [];
    }
    parent_node.children.push(child_node);
}

// walk the model tree and update their matrix information
function walk_update(node, mtm_stack, parent_world) {

    mtm_stack.push(mat4Copy(parent_world));

    // apply inherited transform
    let world_inherited = multiplyMat4(parent_world, node.local);
    
    // dynamic callback updates node.dynamic
    if (node.wtransform_cb) {
        node.dynamic = node.wtransform_cb(node.dynamic);
    }

    // apply non-inherited dynamic transform
    let world_render = multiplyMat4(world_inherited, node.dynamic);

    node.world = world_render;

    // update bounding
    update_world_obb(node);

    // draw using world
    // if (node.shape) {
    //     node.shape.draw(node.uniforms, node.material, node.texture, world_render);
    // }

    // apply to children
    for (let child of node.children) {
        walk_update(child, mtm_stack, world_render);
    }

    parent_world = mtm_stack.pop();
}

// walk the model tree and draw them
function walk_draw(node) {
    if (node.shape) {
        node.shape.draw(node.uniforms, node.material, node.texture, node.world);
    }
    for (let child of node.children) {
        walk_draw(child);
    }
}

function update_world_obb(node) {

    const b = node.bounding;
    const w = node.world_bounding;
    const M = node.world;

    const local_center = [
        (b.min[0] + b.max[0]) * 0.5,
        (b.min[1] + b.max[1]) * 0.5,
        (b.min[2] + b.max[2]) * 0.5
    ];

    // half-sizes
    const half = [
        (b.max[0] - b.min[0]) * 0.5,
        (b.max[1] - b.min[1]) * 0.5,
        (b.max[2] - b.min[2]) * 0.5
    ];

    // transform center into world
    const c = multiplyMat4Vec(M, [...local_center, 1]);
    w.center = [c[0], c[1], c[2]];

    // extract orientation axes (normalized!)
    const X = [M[0], M[1], M[2]];
    const Y = [M[4], M[5], M[6]];
    const Z = [M[8], M[9], M[10]];

    w.axes[0] = norm(X);
    w.axes[1] = norm(Y);
    w.axes[2] = norm(Z);

    const scaleX = vec3Magnitude(X);
    const scaleY = vec3Magnitude(Y);
    const scaleZ = vec3Magnitude(Z);

    w.halfsize = [
        half[0] * scaleX,
        half[1] * scaleY,
        half[2] * scaleZ
    ];
}


function collect_nodes(node, out) {
    out.push(node);
    for (let c of node.children) {
        collect_nodes(c, out);
    }
    return out;
}

function detect_collisions(root) {
    const nodes = collect_nodes(root, []);

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            if (oriented_bounding_box_intersection(nodes[i], nodes[j])) {
                // console.log(`Collision between`, nodes[i], nodes[j]);
            }
        }
    }
}

function check_taxi_collisions(taxi, root) {
    if (!taxi) return [];

    const collisions = [];
    const nodes = collect_nodes(root, []);

    for (let node of nodes) {
        // Skip the taxi itself and its children
        if (node === taxi || is_child_of(node, taxi)) {
            continue;
        }

        // skip goal arrow
        if (node.isGoalArrow) continue;

        // Only check nodes that have a shape
        if (node.shape && oriented_bounding_box_intersection(taxi, node)) {
            collisions.push({
                node: node,
                center: node.world_bounding.center,
                min: [
                    node.world_bounding.center[0] - node.world_bounding.halfsize[0],
                    node.world_bounding.center[1] - node.world_bounding.halfsize[1],
                    node.world_bounding.center[2] - node.world_bounding.halfsize[2]
                ],
                max: [
                    node.world_bounding.center[0] + node.world_bounding.halfsize[0],
                    node.world_bounding.center[1] + node.world_bounding.halfsize[1],
                    node.world_bounding.center[2] + node.world_bounding.halfsize[2]
                ]
            });
        }
    }

    return [...collisions];
}

function is_child_of(node, parent) {
    if (!parent.children) return false;
    for (let child of parent.children) {
        if (child === node) return true;
        if (is_child_of(node, child)) return true;
    }
    return false;
}


