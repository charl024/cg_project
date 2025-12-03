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
    node.children = []
    return node;
}

function add_children(parent_node, child_node) {

    if (parent_node.children == null) {
        parent_node.children = [];
    }
    parent_node.children.push(child_node);
    console.log(parent_node.children);
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

    // draw using world
    // if (node.shape) {
    //     node.shape.draw(node.uniforms, node.material, node.texture, world_render);
    // }

    // apply to children
    for (let child of node.children) {
        walk_update(child, mtm_stack, world_inherited);
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

