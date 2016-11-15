uniform float time;
uniform sampler2D reflectionTexture;
uniform sampler2D refractionTexture;

varying vec2 vUv;
varying vec4 posClipSpace;
varying vec3 toCamera;

const float waveStrength = 0.01;
const float reflectiveFactor = 1.75;

void main() {

  float factor = 100.0;
  //float noiseSeed1 = snoise(vec3(factor*vUv.x*0.02, factor*vUv.y*0.09, time*0.15));
  float noiseSeed2 = snoise(vec3(-factor*vUv.x*0.02, factor*vUv.y*0.09 + time * 0.2, time*0.15));

  float totalNoise = (noiseSeed2) * waveStrength;

  //gl_FragColor = vec4(99.0, 120.0, 173.0, 1.0) / 255.0 * noise;
  //vec4 waterColor = vec4(99.0, 120.0, 173.0, 1.0) / 255.0;
  vec2 ndc = posClipSpace.xy / posClipSpace.w;
  vec2 screenCoords = ndc / 2.0 + 0.5;
  vec2 reflectionCoords = vec2(1.0 - screenCoords.x, screenCoords.y);
  vec2 refractionCoords = vec2(screenCoords.x, screenCoords.y);

  // Fresnel
  vec3 unitToCamera = normalize(toCamera);
  // TODO: Replace hardcoded vec with water plane's normal
  float fresnelTerm = dot(unitToCamera, vec3(0.0, 1.0, 0.0));
  fresnelTerm = pow(fresnelTerm, reflectiveFactor);

  gl_FragColor = mix(texture2D(reflectionTexture, reflectionCoords + totalNoise),
                     texture2D(refractionTexture, refractionCoords + totalNoise), fresnelTerm);
  gl_FragColor = mix(gl_FragColor, vec4(0.0, 0.3, 0.5, 1.0), 0.25);
}
