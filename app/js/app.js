'use strict'

class Application {
  constructor(container, shaders) {
    this.initStats_(container);
    this.initThreeJs_(container);
    this.initGUIVars();
    this.setupScene_(shaders);
    this.listen_();
  }

  initStats_(container) {
    this.stats_ = new Stats();
    container.appendChild(this.stats_.dom);
  }

  initGUIVars() {
    this.waveStrength = 0.02;
    this.nSeedTerrain = 3.0;
    this.nStrengthTerrain1 = 59.0;
    this.nStrengthTerrain2 = 156.0;
    this.shineDamper = 20.0;
    this.ks = 0.15;
    this.kd = 1.0;
    this.ka = 0.6;
  }

  initThreeJs_(container) {
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;
    this.textureLoader_ = new THREE.TextureLoader();
    this.clock_ = new THREE.Clock();
    this.camera_ =
        new THREE.PerspectiveCamera(60, this.WIDTH / this.HEIGHT, 1, 200000);
    this.camera_.position.set(0, 600, 1000);
    this.camera_.lookAt(new THREE.Vector3(0, 0, 0));

    this.reflectionPlane_ = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.refractionPlane_ = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    // TODO: How to remove clipping plane without lag?
    this.dummyPlane_ = new THREE.Plane(new THREE.Vector3(0, 1, 0), 200000);

    this.renderer_ = new THREE.WebGLRenderer({
      antialias: false,
    });

    this.renderer_.setClearColor(0x000000);
    this.renderer_.setSize(this.WIDTH, this.HEIGHT);
    container.appendChild(this.renderer_.domElement);

    const rendererDomElement = this.renderer_.domElement;
    this.controls_ = new THREE.OrbitControls(this.camera_, rendererDomElement);
    this.controls_.minDistance = 200;
    this.controls_.maxDistance = 2000;
    this.controls_.update();
    //this.controls_.zoomSpeed = 10.0
  }

  listen_() { window.addEventListener('resize', this.onResize_.bind(this)); }

  onResize_(e) {
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;
    this.renderer_.setSize(this.WIDTH, this.HEIGHT);
    this.camera_.aspect = this.WIDTH / this.HEIGHT;
    this.camera_.updateProjectionMatrix();
  }

  setupTerrain_(light, shaders) {
    console.log("light", light);
    const terrainGeometry = new THREE.PlaneGeometry(1000, 1000, 25, 25);
    const terrainUniforms = {
      nSeedTerrain : {value : this.nSeedTerrain},
      nStrengthTerrain1: {value: this.nStrengthTerrain1},
      nStrengthTerrain2: {value: this.nStrengthTerrain2},
      cameraPositionWorld: {value: this.camera_.position},
      lightPositionWorld: {value: light.position},
      shineDamper: {value: this.shineDamper},
      ks: {value: this.ks},
      kd: {value: this.kd},
      ka: {value: this.ka},
    };
    this.terrainMaterial = new THREE.ShaderMaterial({
      vertexShader: shaders['simplex_noise'] + shaders['terrain_vert'],
      fragmentShader:
          shaders['simplex_noise'] + shaders['terrain_frag'],
      uniforms: terrainUniforms
      //wireframe:true,
    });

    const terrainMesh = new THREE.Mesh(terrainGeometry, this.terrainMaterial);
    terrainMesh.rotation.x = - Math.PI / 2;
    terrainMesh.position.y += 100;
    this.scene_.add(terrainMesh);
  }

  setupOBJ_() {
    const loader = new THREE.OBJLoader();
    const duckNabbMaterial = new THREE.MeshLambertMaterial({color: 0xff0000});
    const duckBodyMaterial = new THREE.MeshLambertMaterial({color: 0xfffc00});
    const duckPupilMaterial = new THREE.MeshLambertMaterial({color: 0x000000});
    const duckEyeMaterial = new THREE.MeshLambertMaterial({color: 0xffffff});
    loader.load('models/ducky.obj', object => {
      this.duckHasLoaded_ = true;
      this.duck_ = object;
      object.traverse(child => {
        switch (child.name) {
          case 'Ducky Body Bill':
            child.material = duckNabbMaterial;
            break;
          case 'Ducky Body':
            child.material = duckBodyMaterial;
            break;
          case 'Eye Eye1':
            child.material = duckEyeMaterial;
            break;
          case 'Eye Eye1 Pupil':
            child.material = duckPupilMaterial;
            break;
        }
      });
      const duckScaleFactor = 0.25;
      object.scale.set(
          object.scale.x * duckScaleFactor, object.scale.y * duckScaleFactor,
          object.scale.z * duckScaleFactor);
      this.scene_.add(object);
    });
  }

  setupWater_(light, shaders) {
    const waterUniforms = {
      time: {value: 0},
      waterMoveFactor: {value: 0.0},
      waveStrength: {value: this.waveStrength},
      waterColor: {value: new THREE.Vector3(0.0, 0.3, 0.5, 0.9)},
      // scatterConst: {value: this.scatterConst},
      reflectionTexture: {value: this.reflectionRenderTarget.texture},
      refractionTexture: {value: this.refractionRenderTarget.texture},
      shineDamper: {value: this.shineDamper},
      ks: {value: this.ks},
      kd: {value: this.kd},
      ka: {value: this.ka},
      // For Fresnel
      cameraPositionWorld: {value: this.camera_.position},
      lightPositionWorld: {value: light.position},
    };

    this.waterMaterial = new THREE.ShaderMaterial({
      vertexShader: shaders['water_vert'],
      fragmentShader:
          shaders['simplex_noise'] + shaders['water_frag'],
      uniforms: waterUniforms
    });

    const waterGeometry = new THREE.PlaneGeometry(700, 700, 1, 1);
    const waterMesh = new THREE.Mesh(waterGeometry, this.waterMaterial)
    waterMesh.rotation.x = - Math.PI / 2;
    this.scene_.add(waterMesh);
  }

  setupScene_(shaders) {
    this.scene_ = new THREE.Scene();
    this.reflectionRenderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth, window.innerHeight,
        {minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});
    this.refractionRenderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth, window.innerHeight,
        {minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter});

    const light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(-600.0, 600.0, 600.0);
    //light.position.set(0.0, 60.0, 0.0) * 3.0;

    const sphereGeometry = new THREE.SphereGeometry(50, 32, 32);
    //const sphereMaterial = new THREE.MeshPhongMaterial({color: 0xeb0000, specular:0xffffff, shininess: 10 });
    const sphereMaterial = new THREE.MeshLambertMaterial( {color: 0xeb0000});
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.position.y += 80;

    const sphereGeometry2 = new THREE.SphereGeometry(10, 32, 32);
    const sphereMaterial2 = new THREE.MeshLambertMaterial({color:0xffb400});
    const sphereMesh2 =  new THREE.Mesh(sphereGeometry2, sphereMaterial2);

    sphereMesh2.position.x = -60.0 * 2.0;
    sphereMesh2.position.y = 60.0 * 3.0;
    sphereMesh2.position.z = 60.0 * 2.0;

    //this.scene_.add(sphereMesh2);

   /* const cubeMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0x555555,
      shininess: 30,
      vertexColors: THREE.FaceColors,
    });*/

    this.setupWater_(light, shaders);
    this.setupTerrain_(light, shaders);
    this.setupOBJ_();

    this.scene_.add(light);
    this.scene_.add(sphereMesh);
  }

  updateMirrorCamera_() {
    const mirrorCamera = this.camera_.clone();
    const cameraUp =
        new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera_.quaternion);
    mirrorCamera.up.set(cameraUp.x, -cameraUp.y, cameraUp.z);
    mirrorCamera.position.set(
        this.camera_.position.x, -this.camera_.position.y,
        this.camera_.position.z);
    mirrorCamera.lookAt(this.camera_.getWorldDirection());
    return mirrorCamera;
  }

  renderToMirrorTexture_(mirrorCamera) {
    this.renderer_.clippingPlanes = [this.reflectionPlane_];
    this.renderer_.render(
        this.scene_, mirrorCamera, this.reflectionRenderTarget);
  }

  renderToRefractionTexture_() {
    this.renderer_.clippingPlanes = [this.refractionPlane_];
    this.renderer_.render(
        this.scene_, this.camera_, this.refractionRenderTarget);
  }

  updateUniforms_() {
    const waterUniforms = this.waterMaterial.uniforms;
    waterUniforms.waveStrength.value = this.waveStrength;
    waterUniforms.shineDamper.value = this.shineDamper;
    waterUniforms.cameraPositionWorld.value = this.camera_.position;
    waterUniforms.ks.value = this.ks;
    waterUniforms.kd.value = this.kd;
    waterUniforms.ka.value = this.ka;
    // Terrain
    const terrainUniforms = this.terrainMaterial.uniforms;
    terrainUniforms.nSeedTerrain.value = this.nSeedTerrain;
    terrainUniforms.nStrengthTerrain1.value = this.nStrengthTerrain1;
    terrainUniforms.nStrengthTerrain2.value = this.nStrengthTerrain2;
    terrainUniforms.shineDamper.value = this.shineDamper;
    terrainUniforms.cameraPositionWorld.value = this.camera_.position;
    terrainUniforms.ks.value = this.ks;
    terrainUniforms.kd.value = this.kd;
    terrainUniforms.ka.value = this.ka;
  }

  updateDuck_(time) {
    if (this.duckHasLoaded_) {
      this.duck_.position.x = 200.0 * Math.cos(0.2 * time);
      this.duck_.position.z = 200.0 * Math.sin(0.2 * time);

      // Calculate tangent vector
      const radiusVec = this.duck_.position;
      const rotation = new THREE.Vector3();
      rotation.crossVectors(radiusVec, new THREE.Vector3(0.0, 1.0, 0.0));
      rotation.normalize();

      const dot = rotation.dot(new THREE.Vector3(0.0, 0.0, 1.0));
      let amount = Math.acos(dot);

      if (this.duck_.position.z > 0.0) {
        amount *= -1;
      }
      this.duck_.rotation.set(
          0.1 * Math.sin(time * 2.0), amount, 0.3 * Math.sin(time * 5.0));
    }
  }

  loop() {
    this.stats_.begin();
    this.controls_.update();

  //  console.log("CAMERA POS", this.camera_.position);

    // Update stuff
    const time = this.clock_.getElapsedTime();
    this.waterMaterial.uniforms.time.value = 5.0 * time; // += 0.05;
    this.updateDuck_(time);
    this.updateUniforms_();
    const mirrorCamera = this.updateMirrorCamera_();

    // Render to mirror and refraction texture
    // Remove buffer texture from scene when it is rendered to
    this.waterMaterial.visible = false;
    this.renderToMirrorTexture_(mirrorCamera);
    this.renderToRefractionTexture_();
    this.waterMaterial.visible = true;
    // TODO: Setting clippingplanes to [] results in HUGE fps drop
    this.renderer_.clippingPlanes = [this.dummyPlane_];

    // Finally render scene
    this.renderer_.render(this.scene_, this.camera_);
    requestAnimationFrame(this.loop.bind(this));
    this.stats_.end();
  }
}
