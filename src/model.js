// Model.js
// The code for the Model class that handles hierarchical modeling in WebGL can be sourced from
// code snippets provided from the 7th Edition of "Interactive Computer Graphics" by Edward Angel, in chapter 9

class Model {
    constructor(num_segments, model_transformation_matrix, figure) {
        this.num_segments = num_segments;
        this.model_transformation_matrix = model_transformation_matrix;
        this.figure = figure;
        this.mat_stack = [];

        this.dynamic_angle = 0.0;
        this.dt = 0.0;
        this.spinrate = 0.1;
        this.spinphase = 0.0;
        this.oscillationrate = 1.0;

        this.figure_init(this.num_segments);

        for (var i = 0; i < this.num_segments; i++) {
            this.init_node(i);
        }
    }

    set_mtm( model_transformation_matrix) {
        this.model_transformation_matrix = model_transformation_matrix;
    }

    update_dynamic_params(angle, dt, spinrate, oscillationrate) {
        this.dynamic_angle = angle; 
        this.dt = dt;
        this.spinrate = spinrate;
        this.oscillationrate = oscillationrate;
    }

    walk(idx) {
        if (idx == null) {
            return;
        }

        const node = this.figure[idx];

        // save state
        this.mat_stack.push(this.model_transformation_matrix);
        // apply local transformation
        this.model_transformation_matrix = multiplyMat4(this.model_transformation_matrix, node.transform);
        // apply this node's world transformation
        this.figure[idx].wtransform();
        // draw the figure
        this.figure[idx].shape.draw(material_uniforms);

        if (node.children != null) {
            for (var i = 0; i < node.children.length; i++) {
                this.walk(node.children[i]);
            }
        }

        // restore state
        this.model_transformation_matrix = this.mat_stack.pop();
    }

    create_node(idx, transform, wtransform, children, shape) {
        var node = {
            idx: idx,
            transform: transform,
            itransform: transform,
            wtransform: wtransform,
            children: children,
            shape: shape,

            local_angle: {x : 0.0, y : 0.0, z : 0.0},
            rotation_dir: {x : 1, y : 1, z : 1}
        };
        return node;
    }

    update_node_transform(idx) {
        if (idx == null) {
            return;
        }
        const node = this.figure[idx];
        let delta;

        switch (idx) {
            case 0:
                this.spinphase += this.dt * this.spinrate;
                delta = mat4Identity();
                
                delta = mat4RotateY(delta, this.spinphase);

                node.transform = multiplyMat4(node.itransform, delta);
                break;
                
            default:
                break;
        }

        if (node.children != null) {
            for (var i = 0; i < node.children.length; i++) {
                this.update_node_transform(node.children[i]);
            }
        }
    }

    add_children(parent_idx, child_idx) {
        if (this.figure[parent_idx].children == null) {
            this.figure[parent_idx].children = [];
        }
        this.figure[parent_idx].children.push(child_idx);
    }

    figure_init(num_segments) {
        for (var i = 0; i < num_segments; i++) {
            let new_node = this.create_node(i, mat4Identity(), null, null);
            this.figure.push(new_node);
        }
    }

    init_node(idx) {
        var initial_transform = mat4Identity();
        let base_shape;
        
        switch (idx) {
            case 0:
                base_shape = cube;
                initial_transform = mat4Translate(initial_transform, [0.0, 0.0, 0.0]);
                this.figure[idx] = this.create_node(idx, initial_transform, 
                    () => {
                        let segment_mat = mat4Scale(this.model_transformation_matrix, [1.0, 1.0, 1.0]);
                        segment_mat = mat4RotateY(segment_mat, this.dynamic_angle);
                        segment_mat = mat4Translate(segment_mat, [0.0, Math.sin(this.dynamic_angle), 0.0]);
                        gl.uniformMatrix4fv(uMTM, false, segment_mat);
                    }, 
                    null, base_shape);
                break;
            default:
                break;
        }
    }
}

