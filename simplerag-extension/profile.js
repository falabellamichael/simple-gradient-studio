window.__SIMPLE_GRADIENT_PROFILE__ = {
  "schema": "simple-gradient-profile",
  "version": 1,
  "name": "SimpleRAG Gradient Workspace",
  "gradients": {
    "warm-studio": {
      "id": "warm-studio",
      "name": "Warm Studio Canvas",
      "type": "linear",
      "angle": 132,
      "stops": [
        { "color": "#FFF9F2", "position": 0, "opacity": 26 },
        { "color": "#F8EFE3", "position": 42, "opacity": 28 },
        { "color": "#F1D6C1", "position": 76, "opacity": 30 },
        { "color": "#E86633", "position": 100, "opacity": 32 }
      ]
    },
    "ember-focus": {
      "id": "ember-focus",
      "name": "Ember Focus",
      "type": "linear",
      "angle": 148,
      "stops": [
        { "color": "#171512", "position": 0, "opacity": 78 },
        { "color": "#25221F", "position": 44, "opacity": 78 },
        { "color": "#563022", "position": 75, "opacity": 60 },
        { "color": "#E86633", "position": 100, "opacity": 42 }
      ]
    },
    "ocean-workspace": {
      "id": "ocean-workspace",
      "name": "Ocean Workspace",
      "type": "linear",
      "angle": 128,
      "stops": [
        { "color": "#12202A", "position": 0, "opacity": 72 },
        { "color": "#167C8C", "position": 48, "opacity": 52 },
        { "color": "#9BCBD1", "position": 76, "opacity": 34 },
        { "color": "#E8F0F2", "position": 100, "opacity": 24 }
      ]
    },
    "grove-workspace": {
      "id": "grove-workspace",
      "name": "Grove Workspace",
      "type": "linear",
      "angle": 142,
      "stops": [
        { "color": "#17231C", "position": 0, "opacity": 72 },
        { "color": "#4D7C58", "position": 46, "opacity": 52 },
        { "color": "#B8CFAD", "position": 76, "opacity": 34 },
        { "color": "#EDF1E7", "position": 100, "opacity": 24 }
      ]
    },
    "oled-ember": {
      "id": "oled-ember",
      "name": "OLED Ember Edge",
      "type": "linear",
      "angle": 118,
      "stops": [
        { "color": "#000000", "position": 0, "opacity": 88 },
        { "color": "#0B0B0D", "position": 52, "opacity": 82 },
        { "color": "#2A1710", "position": 80, "opacity": 58 },
        { "color": "#E86633", "position": 100, "opacity": 32 }
      ]
    }
  },
  "assignments": {
    "app": { "mode": "gradient", "gradientId": "oled-ember" },
    "page:home": { "mode": "gradient", "gradientId": "warm-studio" },
    "panel:home.navigation": { "mode": "gradient", "gradientId": "oled-ember" },
    "panel:home.workspace": { "mode": "gradient", "gradientId": "warm-studio" },
    "panel:home.cards": { "mode": "gradient", "gradientId": "warm-studio" },
    "panel:home.assistant": { "mode": "gradient", "gradientId": "ember-focus" },
    "panel:home.toolbar": { "mode": "gradient", "gradientId": "ocean-workspace" },
    "page:journal": { "mode": "gradient", "gradientId": "ocean-workspace" },
    "page:tasks": { "mode": "gradient", "gradientId": "grove-workspace" },
    "page:email": { "mode": "gradient", "gradientId": "warm-studio" },
    "page:calendar": { "mode": "gradient", "gradientId": "ember-focus" },
    "page:pdf": { "mode": "gradient", "gradientId": "ocean-workspace" },
    "page:graph": { "mode": "gradient", "gradientId": "grove-workspace" },
    "page:plugins": { "mode": "gradient", "gradientId": "oled-ember" },
    "page:settings": { "mode": "inherit" }
  },
  "editor": {
    "activePage": "home",
    "activeTarget": "panel:home.workspace",
    "targetCatalog": "simplerag",
    "targetMode": true,
    "zoom": 100
  }
};
