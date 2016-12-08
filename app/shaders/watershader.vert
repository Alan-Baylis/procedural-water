uniform vec3 cameraPositionWorld;
uniform vec3 lightPositionWorld;

varying vec4 posClipSpace;
varying vec2 vUv;
varying vec2 vUvManual;
varying vec2 vUvTiled;
varying vec3 toCamera;
varying vec3 fromLight;

varying vec3 worldPosition;

void main() {
  vec3 posWorld = vec3(modelMatrix * vec4(position, 1.0));
  worldPosition = posWorld;
  posClipSpace = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  toCamera = normalize(cameraPositionWorld - posWorld);
  fromLight = normalize(posWorld - lightPositionWorld);
  vUv = uv * 60.0;
  //vUv = vec2(position.x / 2.0 + 0.5, position.y / 2.0 + 0.5);
  gl_Position = posClipSpace;
}
