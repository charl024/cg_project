// material: Ka, Kd, Ks, alpha, color, bumpOn

const ground_material = {   
    Kd: 0.4,
    Ks: 0.1,
    alpha: 10.0,
    color: colorconvert(200, 200, 200),
    bumpOn: true
};

const tv_screen_material = {
    Ka: 0.9,
    Kd: 0.8,
    Ks: 0.8,
    alpha: 100.0,
    color: colorconvert(200, 200, 200),
    bumpOn: false
};

const wallpaper_old_material = {
    Kd: 0.5,
    Ks: 0.01,
    alpha: 10.0,
    color: colorconvert(225,226,187),
    bumpOn: false
};

const black_plastic_material = {
    Kd: 0.2,
    Ks: 0.05,
    alpha: 50.0,
    color: colorconvert(30,30,30),
    bumpOn: true
}

const blue_material = {
    Kd: 0.2,
    Ks: 0.05,
    alpha: 50.0,
    color: colorconvert(130,130,235),
    bumpOn: true
}

const green_material = {
    Kd: 0.2,
    Ks: 0.05,
    alpha: 50.0,
    color: colorconvert(130,235,130),
    bumpOn: false
}

const wood_material = {   
    Kd: 0.2,
    Ks: 0.1,
    alpha: 10.0,
    color: colorconvert(205,170,125),
    bumpOn: true
};

const hay_material = {   
    Kd: 0.3,
    Ks: 0.1,
    alpha: 1.0,
    color: colorconvert(218,197,134),
    bumpOn: true
};

const metal_gray_material = {
    Kd: 0.2,
    Ks: 0.9,
    alpha: 1000.0,
    color: colorconvert(128, 128, 128),
    bumpOn: true
};

const metal_orange_material = {
    Kd: 0.2,
    Ks: 0.9,
    alpha: 1000.0,
    color: colorconvert(252, 129, 0),
    bumpOn: true
};

const lava_material = {
    Ka: 0.6,                         
    Kd: 0.4,                  
    Ks: 1.2,                        
    alpha: 50.0,                 
    color: colorconvert(255, 90, 10),
    bumpOn: false,
    textureScale: [1.0, 1.0]
};


const metal_red_material = {
    Kd: 0.2,
    Ks: 0.9,
    alpha: 1000.0,
    color: colorconvert(244, 0, 0),
    bumpOn: true,
    textureScale: [1.0, 6.0]
};

const metal_blue_material = {
    Kd: 0.3,
    Ks: 0.9,
    alpha: 500.0,
    color: colorconvert(0, 100, 255),
    bumpOn: true
};

const grass_material = {
    Kd: 1.0,
    Ks: 0.5,
    alpha: 10.0,
    color: colorconvert(38, 255, 28),
    bumpOn: true
}

const ball_material = {   
    Kd: 0.1,
    Ks: 0.1,
    alpha: 1.0,
    color: [1.0, 0.9, 1.0],
    bumpOn: true
};

const goal_arrow_yellow_material = {   
    Kd: 0.1,
    Ks: 0.9,
    alpha: 1.0,
    color: colorconvert(255.0, 179.0, 0.0),
    bumpOn: false
};

const goal_arrow_green_material = {
    Kd: 0.1,
    Ks: 0.9,
    alpha: 1.0,
    color: colorconvert(60.0, 255.0, 0.0),
    bumpOn: false
};

const snow_material = {
    Kd: 0.3,
    Ks: 0.3,
    alpha: 1.0,
    color: colorconvert(240.0, 240.0, 240.0),
    bumpOn: false
};


function colorconvert(r, g, b) {
    return [r/255, g/255, b/255];
}