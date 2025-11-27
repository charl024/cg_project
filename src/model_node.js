class ModelNode {
    constructor() {
        this.transform = mat4Identity();
        this.itransform = mat4Identity();
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
function create_model_node(initial_location, initial_angle, wtransform_cb, shape, uniforms, material, texture) {
    let node = new ModelNode();

    let initial_transform = mat4Identity();

    if (initial_location != null) {
        initial_transform = mat4Translate(initial_transform, [initial_location.x, initial_location.y, initial_location.z]);
    }

    if (initial_angle != null) {
        const x_angle = initial_angle.x || 0.0;
        const y_angle = initial_angle.y || 0.0;
        const z_angle = initial_angle.z || 0.0;

        initial_transform = mat4RotateX(initial_transform, x_angle);
        initial_transform = mat4RotateY(initial_transform, y_angle);
        initial_transform = mat4RotateZ(initial_transform, z_angle);
    }

    
    
    node.transform = initial_transform;
    node.itransform = mat4Copy(node.transform || mat4Identity());
    node.wtransform_cb = wtransform_cb;
    node.children = [];
    node.shape = shape || null;
    node.uniforms = uniforms || null;
    node.material = material || null;
    node.texture = texture || null;
    return node;
}

function add_children(parent_node, child_node) {

    if (parent_node.children == null) {
        parent_node.children = [];
    }
    parent_node.children.push(child_node);
    console.log(parent_node.children);
}

function walk(node, mtm_stack, mtm) {

    mtm_stack.push(mat4Copy(mtm));

    mtm = multiplyMat4(mtm, node.transform);
    
    if (node.wtransform_cb != null) {
        mtm = node.wtransform_cb(mtm);
    }

    if (node.shape) {
        node.shape.draw(node.uniforms, node.material, node.texture, mtm);
    }

    if (node.children != null) {
        for (let child of node.children) {
            walk(child, mtm_stack, mtm);
        }
    }

    mtm = mtm_stack.pop();
}
