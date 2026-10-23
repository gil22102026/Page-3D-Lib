/**
    * P3D Library
    * Copyright (c) 2026 Page-3D-Lib
    * Licensed under the P3D Library License v1.0
    * Official source: https://github.com/gil22102026/Page-3D-Lib/
    */

(async function() {
  // === СИСТЕМА ЛОКАЛИЗАЦИИ ===
  const translations = {
    en: {
      loading: 'Loading...',
      error_threejs: '[P3D] Failed to load Three.js',
      error_model: '[P3D] Model error:'
    },
    ru: {
      loading: 'Загрузка...',
      error_threejs: '[P3D] Ошибка загрузки Three.js',
      error_model: '[P3D] Ошибка модели:'
    },
    es: {
      loading: 'Cargando...',
      error_threejs: '[P3D] Error al cargar Three.js',
      error_model: '[P3D] Error de modelo:'
    },
    fr: {
      loading: 'Chargement...',
      error_threejs: '[P3D] Échec du chargement de Three.js',
      error_model: '[P3D] Erreur de modèle:'
    }
  };

  function getSystemLanguage() {
    const lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    const shortLang = lang.split('-')[0];
    return translations[shortLang] ? shortLang : 'en';
  }

  const currentLang = getSystemLanguage();

  function t(key) {
    return translations[currentLang][key] || translations['en'][key] || key;
  }
  // ============================

  window.P3D = window.P3D || {};
  window.P3D.animations = {};
  window.P3D.utils = {
    parseArray: (str, defaultVal = [0,0,0]) => str ? str.split(',').map(v => parseFloat(v.trim()) || 0) : defaultVal,
    parseColor: (str) => str || '#ffffff',
    parseFloat: (str, def) => { const v = parseFloat(str); return isNaN(v) ? def : v; }
  };

  window.P3D.registerAnimation = function(name, keyframes, options = {}) {
    window.P3D.animations[name] = { keyframes, easing: options.easing || 'linear' };
  };

  window.P3D.registerAnimation('rotate', { '0%': { rotation: [0,0,0] }, '100%': { rotation: [0, Math.PI*2, 0] } });
  window.P3D.registerAnimation('float', { '0%': { position: [0,0,0] }, '50%': { position: [0, 0.3, 0] }, '100%': { position: [0,0,0] } });
  window.P3D.registerAnimation('pulse', { '0%': { scale: [1,1,1] }, '50%': { scale: [1.15,1.15,1.15] }, '100%': { scale: [1,1,1] } });

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  }

  function isColorString(val) {
    return typeof val === 'string' && /^#[0-9a-f]{6}$/i.test(val);
  }

  function lerpColor(c1, c2, t) {
    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);
    return rgbToHex(rgb1.r + (rgb2.r - rgb1.r) * t, rgb1.g + (rgb2.g - rgb1.g) * t, rgb1.b + (rgb2.b - rgb1.b) * t);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpArray(start, end, t) { return start.map((val, i) => lerp(val, (end[i] !== undefined ? end[i] : val), t)); }
  
  function parseEasing(easing) {
    const easings = { 'linear': t=>t, 'ease-in': t=>t*t, 'ease-out': t=>t*(2-t), 'ease-in-out': t=>t<0.5 ? 2*t*t : -1+(4-2*t)*t };
    return easings[easing] || easings['linear'];
  }
  
  function interpolateKeyframes(keyframes, progress, easingFn) {
    const keys = Object.keys(keyframes).sort((a, b) => parseFloat(a) - parseFloat(b));
    let startKey = keys[0], endKey = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (progress >= parseFloat(keys[i])/100 && progress <= parseFloat(keys[i+1])/100) {
        startKey = keys[i]; endKey = keys[i+1]; break;
      }
    }
    const startP = parseFloat(startKey)/100, endP = parseFloat(endKey)/100;
    const localP = (endP - startP) > 0 ? (progress - startP) / (endP - startP) : 0;
    const eased = easingFn(Math.max(0, Math.min(1, localP)));
    const result = {};
    for (const prop in keyframes[startKey]) {
      const startVal = keyframes[startKey][prop];
      const endVal = (keyframes[endKey][prop] !== undefined) ? keyframes[endKey][prop] : startVal;
      
      if (Array.isArray(startVal)) {
        result[prop] = lerpArray(startVal, endVal, eased);
      } else if (isColorString(startVal) && isColorString(endVal)) {
        result[prop] = lerpColor(startVal, endVal, eased);
      } else {
        result[prop] = lerp(startVal, endVal, eased);
      }
    }
    return result;
  }

  function createPatternTexture(pattern, patternColor, bgColor = '#ffffff', scale = 2) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = patternColor;
    
    if (pattern === 'dots') {
      for (let x = 0; x < size; x += 16) {
        for (let y = 0; y < size; y += 16) {
          ctx.beginPath(); ctx.arc(x + 8, y + 8, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (pattern === 'stripes') {
      for (let x = 0; x < size; x += 16) ctx.fillRect(x, 0, 8, size);
    } else if (pattern === 'checker') {
      for (let x = 0; x < size; x += 16) {
        for (let y = 0; y < size; y += 16) {
          if ((x/16 + y/16) % 2 === 0) ctx.fillRect(x, y, 16, 16);
        }
      }
    } else if (pattern === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, patternColor); grad.addColorStop(1, bgColor);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(scale, scale);
    return texture;
  }

  async function ensureThreeJS() {
    if (window.custom_three === true && !window.THREE) return null;
    if (window.THREE) return window.THREE;

    try {
      const THREE = await import('https://esm.sh/three@0.160.0');
      const { GLTFLoader } = await import('https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
      const { OrbitControls } = await import('https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js');
      window.THREE = THREE;
      window.THREE.GLTFLoader = GLTFLoader;
      window.THREE.OrbitControls = OrbitControls;
      return THREE;
    } catch (e) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/three@0.150.0/build/three.min.js';
          script.onload = () => {
            const loaderScript = document.createElement('script');
            loaderScript.src = 'https://unpkg.com/three@0.150.0/examples/js/loaders/GLTFLoader.js';
            loaderScript.onload = () => { window.THREE.GLTFLoader = THREE.GLTFLoader; resolve(); };
            loaderScript.onerror = () => resolve();
            document.head.appendChild(loaderScript);
          };
          script.onerror = () => reject(new Error('UMD failed'));
          document.head.appendChild(script);
        });
        return window.THREE;
      } catch (e2) {
        console.error(t('error_threejs'), e2);
        return null;
      }
    }
  }

  class P3DObjectBase extends HTMLElement {
    constructor() {
      super();
      this.mesh = null;
      this.animState = null;
      this.parent3D = null;
      this.basePos = [0,0,0];
      this.baseRot = [0,0,0];
      this.baseScale = [1,1,1];
      this.animProps = new Set();
    }

    connectedCallback() {
      let attempts = 0;
      const checkParent = () => {
        this.parent3D = this.parentElement ? this.parentElement.closest('p3d-scene, p3d-model') : null;
        attempts++;
        if (this.parent3D && this.parent3D.isReady) {
          this.createMesh();
          this.parent3D.addChild(this);
          this.setupAnimation();
        } else {
          setTimeout(checkParent, 50);
        }
      };
      checkParent();
    }

    disconnectedCallback() {
      if (this.parent3D) this.parent3D.removeChild(this);
      this.disposeMesh();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal || !this.mesh) return;
      // === НОВОЕ: Добавлен anim-mode в список триггеров перенастройки анимации ===
      if (name === 'anim-type' || name === 'anim-duration' || name === 'anim-iteration' || name === 'anim-easing' || name === 'anim-mode') {
        if (name === 'anim-type' || name === 'anim-mode') this.resetToBase();
        this.setupAnimation();
        return;
      }
      this.updateMeshFromAttributes(name, newVal);
    }

    createMesh() {}
    
    disposeMesh() {
      if (!this.mesh) return;
      if (this.parent3D) this.parent3D.removeChild(this);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) {
        (Array.isArray(this.mesh.material) ? this.mesh.material : [this.mesh.material]).forEach(m => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
      this.mesh = null;
    }
    
    updateMeshFromAttributes(name, val) {}

    resetToBase() {
      if (!this.mesh) return;
      this.mesh.position.set(...this.basePos);
      this.mesh.rotation.set(...this.baseRot.map(v => v * Math.PI / 180));
      this.mesh.scale.set(...this.baseScale);
    }

    setupAnimation() {
      const type = this.getAttribute('anim-type');
      if (!type || type === 'none' || !window.P3D.animations[type]) {
        this.animState = null;
        this.animProps.clear();
        this.resetToBase();
        return;
      }
      const def = window.P3D.animations[type];
      this.animState = {
        keyframes: def.keyframes,
        duration: parseFloat((this.getAttribute('anim-duration') || '3s').replace('s','')),
        iteration: this.getAttribute('anim-iteration') || 'infinite',
        easingFn: parseEasing(this.getAttribute('anim-easing') || def.easing || 'linear'),
        mode: this.getAttribute('anim-mode') || 'absolute', // === НОВОЕ: Режим анимации ===
        startTime: performance.now(),
        isFinished: false
      };
      
      this.animProps.clear();
      const firstKey = Object.values(def.keyframes)[0];
      if (firstKey) {
        Object.keys(firstKey).forEach(prop => this.animProps.add(prop));
      }
    }

    updateAnimation(elapsed) {
      if (!this.animState || this.animState.isFinished || !this.mesh) return;
      const progress = (elapsed % this.animState.duration) / this.animState.duration;
      const values = interpolateKeyframes(this.animState.keyframes, progress, this.animState.easingFn);
      
      const isRelative = this.animState.mode === 'relative'; // === НОВОЕ: Проверка режима ===

      if (values.position && this.animProps.has('position')) {
        if (isRelative) {
          this.mesh.position.set(
            this.basePos[0] + values.position[0],
            this.basePos[1] + values.position[1],
            this.basePos[2] + values.position[2]
          );
        } else {
          this.mesh.position.set(...values.position);
        }
      }

      if (values.rotation && this.animProps.has('rotation')) {
        if (isRelative) {
          const baseRotRad = this.baseRot.map(v => v * Math.PI / 180);
          this.mesh.rotation.set(
            baseRotRad[0] + values.rotation[0],
            baseRotRad[1] + values.rotation[1],
            baseRotRad[2] + values.rotation[2]
          );
        } else {
          this.mesh.rotation.set(...values.rotation);
        }
      }

      if (values.scale && this.animProps.has('scale')) {
        if (isRelative) {
          this.mesh.scale.set(
            this.baseScale[0] * values.scale[0],
            this.baseScale[1] * values.scale[1],
            this.baseScale[2] * values.scale[2]
          );
        } else {
          this.mesh.scale.set(...values.scale);
        }
      }
      
      if (values.color && this.animProps.has('color') && this.mesh.material) this.mesh.material.color.set(values.color);
      if (values.emissive && this.animProps.has('emissive') && this.mesh.material) this.mesh.material.emissive.set(values.emissive);

      if (this.animState.iteration !== 'infinite' && elapsed >= this.animState.duration) {
        this.animState.isFinished = true;
      }
    }

    updateState(elapsed, frustum) {
      if (!this.mesh) return;
      
      let isVisible = true;
      if (frustum && this.mesh.isMesh && this.mesh.geometry) {
        if (!this.mesh.geometry.boundingSphere) this.mesh.geometry.computeBoundingSphere();
        this.mesh.updateWorldMatrix(true, false);
        const sphere = this.mesh.geometry.boundingSphere.clone();
        sphere.applyMatrix4(this.mesh.matrixWorld);
        isVisible = frustum.intersectsSphere(sphere);
        this.mesh.visible = isVisible;
      }
      
      const lookAt = this.getAttribute('look-at');
      if (lookAt && this.mesh) {
        if (lookAt === 'camera' && this.parent3D && this.parent3D.camera) {
          this.mesh.lookAt(this.parent3D.camera.position);
        } else {
          const target = window.P3D.utils.parseArray(lookAt);
          this.mesh.lookAt(new THREE.Vector3(...target));
        }
      }
      
      const isPausable = this.getAttribute('pausable') === 'true';
      if (isVisible || !isPausable) {
        this.updateAnimation(elapsed);
      }
      
      if (this.children3D) {
        this.children3D.forEach(child => child.updateState(elapsed, frustum));
      }
    }
  }

  class P3DLight extends HTMLElement {
    static get observedAttributes() {
      return ['type', 'color', 'intensity', 'pos', 'distance', 'angle', 'penumbra'];
    }
    constructor() {
      super();
      this.light = null;
      this.parent3D = null;
    }
    connectedCallback() {
      let attempts = 0;
      const checkParent = () => {
        this.parent3D = this.parentElement ? this.parentElement.closest('p3d-scene') : null;
        attempts++;
        if (this.parent3D && this.parent3D.isReady) {
          this.createLight();
          this.parent3D.addLight(this);
        } else {
          setTimeout(checkParent, 50);
        }
      };
      checkParent();
    }
    disconnectedCallback() {
      if (this.parent3D) this.parent3D.removeLight(this);
      if (this.light) {
        if (this.light.dispose) this.light.dispose();
        this.light = null;
      }
    }
    createLight() {
      this.updateLightFromAttributes('init', null);
    }
    updateLightFromAttributes(name, val) {
      if (this.light) {
        this.parent3D.scene.remove(this.light);
        if (this.light.dispose) this.light.dispose();
      }
      
      const type = this.getAttribute('type') || 'directional';
      const color = window.P3D.utils.parseColor(this.getAttribute('color'));
      const intensity = window.P3D.utils.parseFloat(this.getAttribute('intensity'), 1);
      const pos = window.P3D.utils.parseArray(this.getAttribute('pos'), [0, 5, 5]);
      
      if (type === 'ambient') {
        this.light = new THREE.AmbientLight(color, intensity);
      } else if (type === 'directional') {
        this.light = new THREE.DirectionalLight(color, intensity);
        this.light.position.set(...pos);
      } else if (type === 'point') {
        const distance = window.P3D.utils.parseFloat(this.getAttribute('distance'), 0);
        this.light = new THREE.PointLight(color, intensity, distance);
        this.light.position.set(...pos);
      } else if (type === 'spot') {
        const distance = window.P3D.utils.parseFloat(this.getAttribute('distance'), 0);
        const angle = window.P3D.utils.parseFloat(this.getAttribute('angle'), Math.PI / 3);
        const penumbra = window.P3D.utils.parseFloat(this.getAttribute('penumbra'), 0);
        this.light = new THREE.SpotLight(color, intensity, distance, angle, penumbra);
        this.light.position.set(...pos);
      }
      
      if (this.light) {
        this.parent3D.scene.add(this.light);
      }
    }
    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      this.updateLightFromAttributes(name, newVal);
    }
  }

  class P3DScene extends P3DObjectBase {
    static get observedAttributes() { 
      return ['theme', 'anim-type', 'anim-duration', 'anim-iteration', 'anim-easing', 'anim-mode', 'antialias', 'controls', 'fps', 'pausable', 'fov', 'fog', 'scroll-through', 'no-default-light']; 
    }
    
    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: 'open' });
      this.shadow.innerHTML = `
        <style>
          :host { 
            display: block; 
            width: 100%; 
            background: transparent !important; 
            border: none !important; 
            outline: none !important; 
            box-shadow: none !important; 
            margin: 0; 
            padding: 0; 
            position: relative; 
            overflow: visible;
            touch-action: var(--p3d-touch-action, none); 
          }
          :host([style*="height"]) { aspect-ratio: auto; }
          :host([height]) { aspect-ratio: auto; }
          
          .loader { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #666; font-family: system-ui; font-size: 14px; background: rgba(255,255,255,0.7); z-index: 10; border-radius: 8px; }
          canvas { 
            width: 100%; 
            height: 100%; 
            display: block; 
            border: none; 
            outline: none; 
            background: transparent !important;
          }
        </style>
        <div class="loader"><slot>${t('loading')}</slot></div>
        <canvas></canvas>
      `;
      this.canvas = this.shadow.querySelector('canvas');
      this.loader = this.shadow.querySelector('.loader');
      this.children3D = [];
      this.lights = [];
      
      this.defaultLights = []; 

      this.isReady = false;
      this.isActive = false;
      this.isBooted = false;
      this.hasContext = false;
      
      this.frustum = null;
      this.projScreenMatrix = null;
      this.controls = null;
      this.renderer = null;
      this.renderAnimationId = null;
      this.logicAnimationId = null;
      this.lastFrameTime = 0;
      
      this.raycaster = null;
      this.mouse = { x: 0, y: 0 };
      this.hoveredObject = null;
      
      this.observer = new IntersectionObserver(this.onIntersect.bind(this), { rootMargin: '100px' });
    }

    connectedCallback() { this.observer.observe(this); }
    disconnectedCallback() { 
      this.observer.disconnect(); 
      this.destroyContext(true);
    }

    onIntersect(entries) {
      if (entries[0].isIntersecting) {
        if (!this.isActive) {
          this.isActive = true;
          this.initializeOrResume();
        }
      } else {
        if (this.isActive) {
          this.isActive = false;
          this.handlePause();
        }
      }
    }

    async initializeOrResume() {
      this.stopLogicLoop();
      if (!this.isBooted) {
        await this.boot();
        this.isBooted = true;
      } else {
        if (!this.hasContext) this.rebuildContext();
        this.startRenderLoop();
      }
    }

    handlePause() {
      this.stopRenderLoop();
      if (this.getAttribute('pausable') !== 'true') {
        this.startLogicLoop();
      } else {
        this.destroyContext(false);
      }
    }

    onContextLost(event) {
      event.preventDefault();
      this.isActive = false;
      this.stopRenderLoop();
      this.destroyContext(false);
      if (this.getAttribute('pausable') !== 'true') this.startLogicLoop();
    }

    onContextRestored() {
      this.isActive = true;
      this.stopLogicLoop();
      this.rebuildContext();
      this.startRenderLoop();
    }

    rebuildContext() {
      if (!window.THREE) return;

      if (this.renderer) {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
      }

      const newCanvas = document.createElement('canvas');
      newCanvas.style.cssText = this.canvas.style.cssText;
      this.canvas.replaceWith(newCanvas);
      this.canvas = newCanvas;

      this.canvas.addEventListener('webglcontextlost', this.onContextLost.bind(this), false);
      this.canvas.addEventListener('webglcontextrestored', this.onContextRestored.bind(this), false);
      
      const antialias = this.getAttribute('antialias') !== 'false';
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: this.canvas, 
        antialias: antialias, 
        alpha: true,
        preserveDrawingBuffer: true 
      });
      
      this.renderer.setClearColor(0x000000, 0); 

      const width = this.clientWidth || 300;
      const height = this.clientHeight || 150;
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      if (!this.raycaster) this.raycaster = new THREE.Raycaster();

      if (this.scene) {
        this.scene.background = null; 
        this.scene.traverse((obj) => {
          if (obj.isMesh && obj.material) {
            const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
            materials.forEach(m => {
              m.needsUpdate = true;
              if (m.map) m.map.needsUpdate = true;
            });
          }
        });
      }

      if (this.getAttribute('controls') === 'orbit' && THREE.OrbitControls) {
        if (this.controls) this.controls.dispose();
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.touches = {
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN
        };
      }

      this.canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
      this.canvas.addEventListener('pointermove', this.onPointerMove.bind(this), { passive: true });

      this.hasContext = true;
    }

    getClickableMeshes() {
      const meshes = [];
      const traverse = (obj) => {
        if (obj.isMesh && obj.userData.p3dElement && obj.userData.p3dElement.hasAttribute('clickable')) {
          meshes.push(obj);
        }
        if (obj.children) obj.children.forEach(traverse);
      };
      if (this.scene) this.scene.children.forEach(traverse);
      return meshes;
    }

    updateMouseCoords(event) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onPointerMove(event) {
      if (!this.raycaster || !this.camera) return;
      this.updateMouseCoords(event);
      this.checkHover();
    }

    onPointerUp(event) {
      if (!this.raycaster || !this.camera) return;
      this.updateMouseCoords(event);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.getClickableMeshes());
      if (intersects.length > 0) {
        const p3dEl = intersects[0].object.userData.p3dElement;
        if (p3dEl) {
          p3dEl.dispatchEvent(new CustomEvent('p3d-click', { bubbles: true, detail: { point: intersects[0].point, object: p3dEl } }));
        }
      }
    }

    checkHover() {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.getClickableMeshes());
      const newHovered = intersects.length > 0 ? intersects[0].object.userData.p3dElement : null;
      
      if (newHovered !== this.hoveredObject) {
        if (this.hoveredObject) {
          this.hoveredObject.dispatchEvent(new CustomEvent('p3d-hover', { bubbles: true, detail: { hovered: false, object: this.hoveredObject } }));
        }
        if (newHovered) {
          newHovered.dispatchEvent(new CustomEvent('p3d-hover', { bubbles: true, detail: { hovered: true, object: newHovered, point: intersects[0].point } }));
          this.canvas.style.cursor = 'pointer';
        } else {
          this.canvas.style.cursor = 'default';
        }
        this.hoveredObject = newHovered;
      }
    }

    destroyContext(fullCleanup) {
      this.stopRenderLoop();
      this.stopLogicLoop();
      if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer = null; }
      if (this.controls) { this.controls.dispose(); this.controls = null; }

      if (fullCleanup) {
        this.children3D.forEach(child => child.disposeMesh());
        
        this.lights.forEach(light => {
          if (light.light) {
            if (light.light.dispose) light.light.dispose();
            this.scene.remove(light.light);
          }
        });
        
        this.defaultLights.forEach(light => {
           if (light.dispose) light.dispose();
           this.scene.remove(light);
        });
        this.defaultLights = [];

        this.children3D = [];
        this.lights = [];
        this.isBooted = false;
        this.isReady = false;
        this.hasContext = false;
      } else {
        this.hasContext = false;
      }
    }

    startRenderLoop() {
      if (!this.isActive || !this.hasContext || !this.renderer) return;
      this.renderAnimationId = requestAnimationFrame(this.renderLoop.bind(this));
    }

    stopRenderLoop() {
      if (this.renderAnimationId) { cancelAnimationFrame(this.renderAnimationId); this.renderAnimationId = null; }
    }

    renderLoop() {
      if (!this.isActive || !this.hasContext || !this.renderer) return;
      this.renderAnimationId = requestAnimationFrame(this.renderLoop.bind(this));
      
      const now = performance.now();
      const fps = parseInt(this.getAttribute('fps')) || 60;
      const frameInterval = 1000 / fps;
      
      if (this.lastFrameTime === 0) this.lastFrameTime = now;
      if (now - this.lastFrameTime < frameInterval) return;
      this.lastFrameTime = now;

      const elapsed = (now - (this.startTime || now)) / 1000;
      if (!this.startTime) this.startTime = now;

      this.camera.updateMatrixWorld();
      this.projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

      this.updateAnimation(elapsed);
      this.children3D.forEach(child => child.updateState(elapsed, this.frustum));

      if (this.controls) this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }

    startLogicLoop() {
      if (this.logicAnimationId) return;
      this.logicLoop();
    }

    stopLogicLoop() {
      if (this.logicAnimationId) { cancelAnimationFrame(this.logicAnimationId); this.logicAnimationId = null; }
    }

    logicLoop() {
      if (this.isActive || this.getAttribute('pausable') === 'true') return;
      this.logicAnimationId = requestAnimationFrame(this.logicLoop.bind(this));
      const now = performance.now();
      const elapsed = (now - (this.startTime || now)) / 1000;
      if (!this.startTime) this.startTime = now;
      this.updateAnimation(elapsed);
      this.children3D.forEach(child => child.updateState(elapsed, null));
    }

    syncDefaultLight() {
      if (!this.scene) return;

      const shouldHaveDefault = !this.hasAttribute('no-default-light');

      if (shouldHaveDefault && this.defaultLights.length === 0) {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        const directional = new THREE.DirectionalLight(0xffffff, 0.8);
        directional.position.set(3, 5, 4);
        
        this.scene.add(ambient);
        this.scene.add(directional);
        
        this.defaultLights.push(ambient, directional);
      } 
      else if (!shouldHaveDefault && this.defaultLights.length > 0) {
        this.defaultLights.forEach(light => {
          this.scene.remove(light);
          if (light.dispose) light.dispose();
        });
        this.defaultLights = [];
      }
    }

    async boot() {
      const THREE = await ensureThreeJS();
      if (!THREE) { this.loader.textContent = t('error_threejs'); return; }
      window.THREE = THREE;
      
      this.scene = new THREE.Scene();
      this.scene.background = null;
      this.frustum = new THREE.Frustum();
      this.projScreenMatrix = new THREE.Matrix4();
      
      const fov = window.P3D.utils.parseFloat(this.getAttribute('fov'), 50);
      this.camera = new THREE.PerspectiveCamera(fov, this.clientWidth / this.clientHeight, 0.1, 100);
      this.camera.position.z = 5;
      
      this.rebuildContext();
      
      this.syncDefaultLight();

      this.loader.style.display = 'none';
      this.isReady = true; 
      this.setupAnimation();
      this.lastFrameTime = 0;
      this.startRenderLoop();
      
      this.resizeObserver = new ResizeObserver(() => {
        if (this.camera && this.renderer) {
          this.camera.aspect = this.clientWidth / this.clientHeight;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(this.clientWidth, this.clientHeight);
        }
      });
      this.resizeObserver.observe(this);
      this.dispatchEvent(new CustomEvent('p3d-ready', { bubbles: true, composed: true }));
    }

    addChild(child) { 
      if (!this.children3D.includes(child)) { this.children3D.push(child); this.scene.add(child.mesh); }
    }
    removeChild(child) {
      const index = this.children3D.indexOf(child);
      if (index > -1) this.children3D.splice(index, 1);
      if (child.mesh && child.mesh.parent) child.mesh.parent.remove(child.mesh);
    }

    addLight(lightObj) {
      this.lights.push(lightObj);
    }
    removeLight(lightObj) {
      const index = this.lights.indexOf(lightObj);
      if (index > -1) this.lights.splice(index, 1);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (oldVal === newVal) return;
      
      if (name === 'theme' && this.scene) {
        this.scene.background = (newVal === 'transparent' || !newVal) ? null : new THREE.Color(newVal);
      }
      if (name === 'fov' && this.camera) {
        this.camera.fov = window.P3D.utils.parseFloat(newVal, 50);
        this.camera.updateProjectionMatrix();
      }
      if (name === 'fog' && this.scene) {
        if (newVal) {
          const parts = newVal.split(',').map(s => s.trim());
          const color = parts[0] || '#000000';
          
          if (parts.length >= 3) {
            const near = parseFloat(parts[1]) || 0;
            const far = parseFloat(parts[2]) || 100;
            this.scene.fog = new THREE.Fog(color, near, far);
          } else {
            const density = parseFloat(parts[1]) || 0.15;
            this.scene.fog = new THREE.FogExp2(color, density);
          }
        } else {
          this.scene.fog = null;
        }
      }
      if ((name === 'antialias' || name === 'controls') && this.isBooted) {
        this.rebuildContext();
      }
      if (name.startsWith('anim-') || name === 'anim-type') {
        if (name === 'anim-type') this.resetToBase();
        this.setupAnimation();
      }
      
      if (name === 'scroll-through') {
         if (newVal === 'true' || newVal === '') {
             this.style.setProperty('--p3d-touch-action', 'pan-y');
         } else {
             this.style.setProperty('--p3d-touch-action', 'none');
         }
      }

      if (name === 'no-default-light') {
        this.syncDefaultLight();
      }
    }
  }

  class P3DModel extends P3DObjectBase {
    static get observedAttributes() { 
      // === НОВОЕ: Добавлен anim-mode ===
      return ['pos', 'rot', 'scale', 'anim-type', 'anim-duration', 'anim-iteration', 'anim-easing', 'anim-mode', 'pausable', 'look-at']; 
    }
    constructor() { super(); this.children3D = []; this.isReady = false; }
    
    connectedCallback() {
      let attempts = 0;
      const checkParent = () => {
        this.parent3D = this.parentElement ? this.parentElement.closest('p3d-scene, p3d-model') : null;
        attempts++;
        if (this.parent3D && this.parent3D.isReady) {
          this.createMesh();
          this.parent3D.addChild(this);
          this.isReady = true; 
          this.setupAnimation();
        } else {
          setTimeout(checkParent, 50);
        }
      };
      checkParent();
    }

    createMesh() { this.mesh = new THREE.Group(); this.updateMeshFromAttributes('init', null); }
    
    updateMeshFromAttributes(name, val) {
      if (!this.mesh) return;
      const pos = window.P3D.utils.parseArray(this.getAttribute('pos'));
      const rot = window.P3D.utils.parseArray(this.getAttribute('rot'));
      const scale = window.P3D.utils.parseArray(this.getAttribute('scale'), [1,1,1]);
      this.basePos = pos; this.baseRot = rot; this.baseScale = scale;
      this.mesh.position.set(...pos);
      this.mesh.rotation.set(...rot.map(v => v * Math.PI / 180));
      this.mesh.scale.set(...scale);
    }
    
    addChild(child) { if (!this.children3D.includes(child)) { this.children3D.push(child); this.mesh.add(child.mesh); } }
    removeChild(child) {
      const index = this.children3D.indexOf(child);
      if (index > -1) this.children3D.splice(index, 1);
      if (child.mesh && child.mesh.parent) child.mesh.parent.remove(child.mesh);
    }
  }

  function createPrimitiveClass(geometryType) {
    return class extends P3DObjectBase {
      static get observedAttributes() { 
        // === НОВОЕ: Добавлен anim-mode в базовый массив ===
        const base = ['color', 'pos', 'rot', 'scale', 'wireframe', 'anim-type', 'anim-duration', 'anim-iteration', 
                      'anim-easing', 'anim-mode', 'pausable', 'metalness', 'roughness', 'opacity', 'smooth', 'texture', 
                      'pattern', 'pattern-bg', 'pattern-scale', 'emissive', 'double-sided', 'look-at', 'clickable'];
        if (geometryType === 'sphere') return [...base, 'radius', 'segments'];
        if (geometryType === 'box') return [...base, 'size'];
        if (geometryType === 'pyramid') return [...base, 'radius', 'height', 'segments'];
        return [...base, 'radius', 'height', 'segments'];
      }
      createMesh() {
        let geo;
        const r = window.P3D.utils.parseFloat(this.getAttribute('radius'), 1);
        const h = window.P3D.utils.parseFloat(this.getAttribute('height'), 2);
        const seg = window.P3D.utils.parseFloat(this.getAttribute('segments'), 64);
        
        if (geometryType === 'sphere') geo = new THREE.SphereGeometry(r, seg, seg);
        else if (geometryType === 'box') {
          const s = window.P3D.utils.parseArray(this.getAttribute('size'), [1,1,1]);
          geo = new THREE.BoxGeometry(s[0], s[1], s[2]);
        }
        else if (geometryType === 'cylinder') geo = new THREE.CylinderGeometry(r, r, h, seg);
        else if (geometryType === 'cone') geo = new THREE.ConeGeometry(r, h, seg);
        else if (geometryType === 'pyramid') {
          const pSeg = window.P3D.utils.parseFloat(this.getAttribute('segments'), 4);
          geo = new THREE.CylinderGeometry(0, r, h, pSeg);
        }

        const smooth = this.getAttribute('smooth') !== 'false';
        const color = window.P3D.utils.parseColor(this.getAttribute('color'));
        const pattern = this.getAttribute('pattern');
        const patternBg = this.getAttribute('pattern-bg') || '#ffffff';
        const patternScale = window.P3D.utils.parseFloat(this.getAttribute('pattern-scale'), 2);
        const textureUrl = this.getAttribute('texture');
        const emissive = this.getAttribute('emissive');
        const doubleSided = this.hasAttribute('double-sided');
        
        const mat = new THREE.MeshStandardMaterial({ 
          color: color,
          roughness: window.P3D.utils.parseFloat(this.getAttribute('roughness'), 0.4),
          metalness: window.P3D.utils.parseFloat(this.getAttribute('metalness'), 0.2),
          transparent: true,
          opacity: window.P3D.utils.parseFloat(this.getAttribute('opacity'), 1.0),
          wireframe: this.hasAttribute('wireframe'),
          flatShading: !smooth,
          emissive: emissive ? new THREE.Color(emissive) : new THREE.Color(0x000000),
          side: doubleSided ? THREE.DoubleSide : THREE.FrontSide
        });
        
        if (pattern) {
          mat.map = createPatternTexture(pattern, color, patternBg, patternScale);
          mat.color.set('#ffffff');
        } else if (textureUrl) {
          const loader = new THREE.TextureLoader();
          loader.load(textureUrl, (tex) => { mat.map = tex; mat.needsUpdate = true; });
        }
        
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.userData.p3dElement = this;
        this.updateMeshFromAttributes('init', null);
      }
      
      updateMeshFromAttributes(name, val) {
        if (!this.mesh) return;
        
        if (name === 'pos' || name === 'init') {
          const pos = window.P3D.utils.parseArray(this.getAttribute('pos'));
          this.basePos = pos;
          if (name === 'init' || !this.animProps.has('position')) {
            this.mesh.position.set(...pos);
          }
        }
        if (name === 'rot' || name === 'init') {
          const rot = window.P3D.utils.parseArray(this.getAttribute('rot'));
          this.baseRot = rot;
          if (name === 'init' || !this.animProps.has('rotation')) {
            this.mesh.rotation.set(...rot.map(v => v * Math.PI / 180));
          }
        }
        if (name === 'scale' || name === 'init') {
          const scale = window.P3D.utils.parseArray(this.getAttribute('scale'), [1,1,1]);
          this.baseScale = scale;
          if (name === 'init' || !this.animProps.has('scale')) {
            this.mesh.scale.set(...scale);
          }
        }
        
        if (name === 'color') {
          if (!this.getAttribute('pattern')) this.mesh.material.color.set(window.P3D.utils.parseColor(val));
          else this.updatePatternTexture();
        }
        if (name === 'wireframe') this.mesh.material.wireframe = this.hasAttribute('wireframe');
        if (name === 'roughness') this.mesh.material.roughness = window.P3D.utils.parseFloat(val, 0.4);
        if (name === 'metalness') this.mesh.material.metalness = window.P3D.utils.parseFloat(val, 0.2);
        if (name === 'emissive') this.mesh.material.emissive = new THREE.Color(val || 0x000000);
        if (name === 'opacity') {
          this.mesh.material.opacity = window.P3D.utils.parseFloat(val, 1.0);
          this.mesh.material.transparent = this.mesh.material.opacity < 1.0;
        }
        if (name === 'smooth') {
          this.mesh.material.flatShading = val === 'false';
          this.mesh.material.needsUpdate = true;
        }
        if (name === 'double-sided') {
          this.mesh.material.side = this.hasAttribute('double-sided') ? THREE.DoubleSide : THREE.FrontSide;
          this.mesh.material.needsUpdate = true;
        }
        if (name === 'pattern' || name === 'pattern-bg' || name === 'pattern-scale') {
          this.updatePatternTexture();
        }
        if (name === 'texture') {
          if (this.mesh.material.map) this.mesh.material.map.dispose();
          if (val) {
            const loader = new THREE.TextureLoader();
            loader.load(val, (tex) => { this.mesh.material.map = tex; this.mesh.material.needsUpdate = true; });
          }
        }
        if (['radius','height','size','segments'].includes(name)) {
          this.disposeMesh(); 
          this.createMesh();
          if (this.parent3D) this.parent3D.addChild(this);
          this.setupAnimation();
        }
      }
      
      updatePatternTexture() {
        if (this.mesh.material.map) {
          this.mesh.material.map.dispose();
          this.mesh.material.map = null;
        }
        const pattern = this.getAttribute('pattern');
        if (pattern) {
          const pColor = window.P3D.utils.parseColor(this.getAttribute('color'));
          const pBg = this.getAttribute('pattern-bg') || '#ffffff';
          const pScale = window.P3D.utils.parseFloat(this.getAttribute('pattern-scale'), 2);
          this.mesh.material.map = createPatternTexture(pattern, pColor, pBg, pScale);
          this.mesh.material.color.set('#ffffff');
        } else {
          this.mesh.material.color.set(window.P3D.utils.parseColor(this.getAttribute('color')));
        }
        this.mesh.material.needsUpdate = true;
      }
    };
  }

  class P3DExternModel extends P3DObjectBase {
    static get observedAttributes() { 
      // === НОВОЕ: Добавлен anim-mode ===
      return ['src', 'pos', 'rot', 'scale', 'anim-type', 'anim-duration', 'anim-iteration', 'anim-easing', 'anim-mode', 'pausable', 'clickable']; 
    }
    createMesh() {
      this.mesh = new THREE.Group();
      this.mesh.userData.p3dElement = this;
      this.updateMeshFromAttributes('init', null);
      this.loadModel();
    }
    async loadModel() {
      const src = this.getAttribute('src');
      if (!src || !window.THREE || !window.THREE.GLTFLoader) return;
      const loader = new window.THREE.GLTFLoader();
      try {
        const gltf = await new Promise((resolve, reject) => loader.load(src, resolve, undefined, reject));
        while(this.mesh.children.length > 0){ 
          const obj = this.mesh.children[0]; this.mesh.remove(obj);
          if(obj.traverse) obj.traverse(c => { if(c.isMesh){ c.geometry.dispose(); if(c.material) c.material.dispose(); }});
        }
        gltf.scene.traverse(obj => { if (obj.isMesh) obj.userData.p3dElement = this; });
        this.mesh.add(gltf.scene);
      } catch (e) { console.error(t('error_model'), src, e); }
    }
    updateMeshFromAttributes(name, val) {
      if (!this.mesh) return;
      if (name === 'pos' || name === 'init') {
        const pos = window.P3D.utils.parseArray(this.getAttribute('pos'));
        this.basePos = pos;
        if (name === 'init' || !this.animProps.has('position')) this.mesh.position.set(...pos);
      }
      if (name === 'rot' || name === 'init') {
        const rot = window.P3D.utils.parseArray(this.getAttribute('rot'));
        this.baseRot = rot;
        if (name === 'init' || !this.animProps.has('rotation')) this.mesh.rotation.set(...rot.map(v => v * Math.PI / 180));
      }
      if (name === 'scale' || name === 'init') {
        const scale = window.P3D.utils.parseArray(this.getAttribute('scale'), [1,1,1]);
        this.baseScale = scale;
        if (name === 'init' || !this.animProps.has('scale')) this.mesh.scale.set(...scale);
      }
      if (name === 'src' && this.parent3D) this.loadModel();
    }
  }

  customElements.define('p3d-scene', P3DScene);
  customElements.define('p3d-model', P3DModel);
  customElements.define('p3d-light', P3DLight);
  customElements.define('p3d-sphere', createPrimitiveClass('sphere'));
  customElements.define('p3d-box', createPrimitiveClass('box'));
  customElements.define('p3d-cylinder', createPrimitiveClass('cylinder'));
  customElements.define('p3d-cone', createPrimitiveClass('cone'));
  customElements.define('p3d-pyramid', createPrimitiveClass('pyramid'));
  customElements.define('p3d-extern-model', P3DExternModel);

})();