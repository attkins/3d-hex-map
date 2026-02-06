precision highp float;

uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

in vec3 vWorldPosition;
out vec4 outColor;   // <-- hier

void main() {
  float h = normalize(vWorldPosition + offset).y;

  outColor = vec4(
    mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)),
    1.0
  );
}
