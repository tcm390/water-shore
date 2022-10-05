import * as THREE from 'three';

const _createWaterMaterial = () => {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: {
                value: 0
            },
            tDepth: {
                value: null
            },
            cameraNear: {
                value: 0
            },
            cameraFar: {
                value: 0
            },
            resolution: {
                value: new THREE.Vector2()
            },
            foamTexture: {
                value: null
            }
        },
        vertexShader: `\
            
            ${THREE.ShaderChunk.common}
            ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
            varying vec2 vUv;
            varying vec3 vPos;
            
            void main() {
                vUv = uv;
                vec4 modelPosition = modelMatrix * vec4(position, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectionPosition = projectionMatrix * viewPosition;
                vPos = modelPosition.xyz;
                gl_Position = projectionPosition;
                ${THREE.ShaderChunk.logdepthbuf_vertex}
            }
        `,
        fragmentShader: `\
            ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
            #include <common>
            #include <packing>

            varying vec2 vUv;
            varying vec3 vPos;

            uniform float uTime;
            uniform sampler2D tDepth;
            uniform sampler2D foamTexture;
            uniform float cameraNear;
            uniform float cameraFar;
            uniform vec2 resolution;

            float getDepth(const in vec2 screenPosition) {
                return unpackRGBAToDepth( texture2D(tDepth, screenPosition));
            }
            float getViewZ(const in float depth) {
                return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
            }  
            float getDepthFade(float fragmentLinearEyeDepth, float linearEyeDepth, float depthScale, float depthFalloff) {
                return pow(saturate(1. - (fragmentLinearEyeDepth - linearEyeDepth) / depthScale), depthFalloff);
            }
            vec4 cutout(float depth, float alpha) {
                return vec4(ceil(depth - saturate(alpha)));
            }
            void main() {
                vec2 screenUV = gl_FragCoord.xy / resolution;
    
                float fragmentLinearEyeDepth = getViewZ(gl_FragCoord.z);
                float linearEyeDepth = getViewZ(getDepth(screenUV));

                float depthScale = 5.;
                float depthFalloff = 1.3;
                float sceneDepth = getDepthFade(fragmentLinearEyeDepth, linearEyeDepth, depthScale, depthFalloff);
                vec4 shoreColor = vec4(0.182, 0.731, 0.760, 1.0);
                vec4 waterColor = vec4(0.140, 0.294, 0.560, 1.0);
                vec4 col = sceneDepth * shoreColor + (1. - sceneDepth) * waterColor;

                float foamCutout = 0.5;
                float foamTDepthScale = 0.9;
                float foamTDepthFalloff = 0.5;
                float foamAmount = 0.5;
                float foamTDepth = getDepthFade(fragmentLinearEyeDepth, linearEyeDepth, foamTDepthScale, foamTDepthFalloff);
                float foamUvX = foamTDepth * foamAmount + uTime * 0.05;
                float foamUvY = vPos.z * 0.05;
                vec4 foamT = texture2D(foamTexture, vec2(foamUvX, foamUvY));
                foamT = cutout((foamT * foamTDepth).r, foamCutout);

                vec4 foamColor = vec4(1.0, 1.0, 1.0, 1.0);
                float foamDepth = getDepthFade(fragmentLinearEyeDepth, linearEyeDepth, 1.0, 1.0);
                float foamShoreWidth = 0.9;
                vec4 foamCutOut = saturate(cutout(foamDepth, foamShoreWidth) + foamT);
                vec4 foam = foamCutOut * foamColor;

                
                vec4 col2 = col * (1. - foamCutOut) + foam;


                gl_FragColor = vec4(col2);

                ${THREE.ShaderChunk.logdepthbuf_fragment}
            }
        `,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        // blending: THREE.AdditiveBlending,
    });
    return material;
};

export default _createWaterMaterial;
