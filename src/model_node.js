class Model_Node {
    constructor() {
        this.transform = mat4Identity();
        this.itransform = mat4Identity();
        this.wtransform_cb = null;
        this.children = null;

        this.shape = null;
        this.material_uniforms = null;
        this.dynamic_params = {};

    }
}

// transform: local transformation matrix, this is where you set the initial position/angle of the object
// wtransform_cb: function to compute world transformation, this is where you set dynamic transformations (and scaling)
// children: list of child nodes
// shape: shape to draw
// material_uniforms: material properties for drawing
function create_model_node(transform, wtransform_cb, shape, material_uniforms, dynamic_params) {
    let node = new Model_Node();
    node.transform = transform || mat4Identity();
    node.itransform = mat4Copy(transform || mat4Identity());
    node.wtransform_cb = wtransform_cb;
    node.children = [];
    node.shape = shape || null;
    node.material_uniforms = material_uniforms || null;
    node.dynamic_params = dynamic_params || {};
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

    node.shape.draw(node.material_uniforms, mtm);

    if (node.children != null) {
        for (let child of node.children) {
            walk(child, mtm_stack, mtm);
        }
    }

    mtm = mtm_stack.pop();
}

function update_node_params(node, dynamic_params) {
    for (let key in dynamic_params) {
        node.dynamic_params[key] = dynamic_params[key];
    }

    if (node.children != null) {
        for (let child of node.children) {
            update_node_params(child, dynamic_params);
        }
    }
}