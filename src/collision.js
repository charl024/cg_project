function oriented_bounding_box_intersection(a, b) {
    const eps = 1e-6;

    const A = a.world_bounding;
    const B = b.world_bounding;

    const Ax = A.axes[0];
    const Ay = A.axes[1];
    const Az = A.axes[2];
    const Bx = B.axes[0];
    const By = B.axes[1];
    const Bz = B.axes[2];

    const Ah = A.halfsize;
    const Bh = B.halfsize;

    // vector between centers of boxes
    const T = [
        B.center[0] - A.center[0],
        B.center[1] - A.center[1],
        B.center[2] - A.center[2]
    ];

    // T in A's axes
    const t = [
        dot(T, Ax),
        dot(T, Ay),
        dot(T, Az)
    ];

    // compute rotation matrix 
    const R = [
        [dot(Ax,Bx), dot(Ax,By), dot(Ax,Bz)],
        [dot(Ay,Bx), dot(Ay,By), dot(Ay,Bz)],
        [dot(Az,Bx), dot(Az,By), dot(Az,Bz)]
    ];

    const AbsR = [
        [Math.abs(R[0][0])+eps, Math.abs(R[0][1])+eps, Math.abs(R[0][2])+eps],
        [Math.abs(R[1][0])+eps, Math.abs(R[1][1])+eps, Math.abs(R[1][2])+eps],
        [Math.abs(R[2][0])+eps, Math.abs(R[2][1])+eps, Math.abs(R[2][2])+eps]
    ];

    for (let i=0; i<3; i++) {
        const ra = Ah[i];
        const rb =
            Bh[0] * AbsR[i][0] +
            Bh[1] * AbsR[i][1] +
            Bh[2] * AbsR[i][2];

        if (Math.abs(t[i]) > ra + rb) return false;
    }

    for (let j=0; j<3; j++) {
        const ra =
            Ah[0] * AbsR[0][j] +
            Ah[1] * AbsR[1][j] +
            Ah[2] * AbsR[2][j];
        const tb = dot(T, [Bx, By, Bz][j]);
        const rb = Bh[j];

        if (Math.abs(tb) > ra + rb) return false;
    }
    
    for (let i=0; i<3; i++) {
        for (let j=0; j<3; j++) {
            const ra =
                Ah[(i+1)%3] * AbsR[(i+2)%3][j] +
                Ah[(i+2)%3] * AbsR[(i+1)%3][j];
            const rb =
                Bh[(j+1)%3] * AbsR[i][(j+2)%3] +
                Bh[(j+2)%3] * AbsR[i][(j+1)%3];

            const tval = Math.abs(
                t[(i+1)%3] * R[(i+2)%3][j] -
                t[(i+2)%3] * R[(i+1)%3][j]
            );

            if (tval > ra + rb) return false;
        }
    }

    return true;
}