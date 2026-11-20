var APP_DATA = {
  "name": "Виртуальный тур",
  "settings": {
    "mouseViewMode": "drag",
    "autorotate": true,
    "autorotateSpeed": 50,
    "gyroscope": true,
    "gyroSensitivityYaw": 1,
    "gyroSensitivityPitch": 1,
    "gyroInvertPitch": true,
    "gyroSmoothness": 0.15,
    "fullscreenButton": true,
    "viewControlButtons": false,
    "transitionSound": "",
    "arrowImage": ""
  },
  "groups": [],
  "scenes": [
    {
      "id": "s0-mwozgvys43fm",
      "name": "Вход в главный учебный корпус",
      "hidden": false,
      "groupId": null,
      "levels": [
        {
          "tileSize": 256,
          "size": 256,
          "fallbackOnly": true
        },
        {
          "tileSize": 512,
          "size": 512
        },
        {
          "tileSize": 512,
          "size": 1024
        },
        {
          "tileSize": 512,
          "size": 2048
        }
      ],
      "faceSize": 2048,
      "initialViewParameters": {
        "pitch": 0,
        "yaw": 0,
        "fov": 1.49982
      },
      "entryViews": {},
      "linkHotspots": [],
      "infoHotspots": [],
      "regionHotspots": []
    }
  ],
  "home": {
    "enabled": true,
    "title": "",
    "subtitle": "",
    "preset": "warm",
    "effect": "none",
    "motion": "",
    "bgVideo": "video/home-bg.mp4",
    "bgVideoExt": "mp4",
    "bgFade": 1,
    "bg": "linear-gradient(168deg,#8f877e 0%,#6a625a 46%,#3f3b37 100%)",
    "bgImage": "",
    "layout": "square",
    "cols": 3,
    "btnScale": 1.2,
    "menuW": 0,
    "menuH": 0,
    "iconScale": 2,
    "tileScale": 160,
    "photoWinW": 78,
    "photoWinH": 80,
    "videoWinW": 78,
    "videoWinH": 80,
    "photoFolders": [],
    "videoFolders": [],
    "infoCards": [
      {
        "id": "c2-mwozh9hwc4tw",
        "title": "Интересный факт",
        "text": "",
        "image": "",
        "windowImage": "",
        "speed": 0.36,
        "video": "",
        "videoExt": "mp4",
        "winW": 520,
        "winH": 320,
        "xPct": null,
        "yPct": null
      },
      {
        "id": "c3-mwozh9n5qtdj",
        "title": "Интересный факт",
        "text": "",
        "image": "",
        "windowImage": "",
        "speed": 0.93,
        "video": "",
        "videoExt": "mp4",
        "winW": 520,
        "winH": 320,
        "xPct": null,
        "yPct": null
      },
      {
        "id": "c4-mwozh9rtxj3m",
        "title": "Интересный факт",
        "text": "",
        "image": "",
        "windowImage": "",
        "speed": 0.77,
        "video": "",
        "videoExt": "mp4",
        "winW": 520,
        "winH": 320,
        "xPct": null,
        "yPct": null
      }
    ],
    "schemes": [],
    "screenCount": 1,
    "screenMap": {
      "2": "tour",
      "3": "info"
    },
    "buttons": [
      {
        "id": "b-tour",
        "type": "tour",
        "label": "Виртуальная экскурсия",
        "sub": "",
        "icon": "pin",
        "opacity": 1,
        "ownW": 0,
        "ownH": 0
      },
      {
        "id": "b-vr",
        "type": "vr",
        "label": "Виртуальные очки",
        "sub": "",
        "icon": "glasses",
        "opacity": 1,
        "ownW": 0,
        "ownH": 0
      },
      {
        "id": "b-info",
        "type": "info",
        "label": "Интересные факты",
        "sub": "",
        "icon": "info",
        "opacity": 1,
        "ownW": 0,
        "ownH": 0
      },
      {
        "id": "b-photos",
        "type": "photos",
        "label": "Фотоархив",
        "sub": "",
        "icon": "photos",
        "opacity": 1,
        "ownW": 0,
        "ownH": 0
      },
      {
        "id": "b-video",
        "type": "video",
        "label": "Видеоархив",
        "sub": "",
        "icon": "video",
        "opacity": 1,
        "ownW": 0,
        "ownH": 0
      },
      {
        "id": "b-scheme",
        "type": "scheme",
        "label": "Интерактивная игра",
        "sub": "От посадки урожая до готовой продукции",
        "icon": "play",
        "opacity": 1,
        "ownW": 0,
        "ownH": 0
      }
    ],
    "videos": [
      {
        "id": "v1-mwozh2pla50j",
        "title": "1120",
        "ext": "mp4",
        "src": "video/v1-mwozh2pla50j.mp4"
      }
    ],
    "unityGames": [],
    "unityGame": []
  },
  "icons": {
    "map": "M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7zM9 4v13M15 7v13",
    "pin": "M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11zM12 11.2a1.6 1.6 0 1 0 0 .1",
    "arrow-r": "M5 12h14M13 6l6 6-6 6",
    "arrow-l": "M19 12H5M11 6l-6 6 6 6",
    "arrow-u": "M12 19V5M6 11l6-6 6 6",
    "arrow-d": "M12 5v14M6 13l6 6 6-6",
    "menu": "M4 7h16M4 12h16M4 17h16",
    "glasses": "<rect x=\"1.1\" y=\"10.2\" width=\"2.2\" height=\"3.6\" rx=\"1\"/><rect x=\"20.7\" y=\"10.2\" width=\"2.2\" height=\"3.6\" rx=\"1\"/><rect x=\"10.2\" y=\"6.15\" width=\"3.6\" height=\"1.6\" rx=\".45\"/><rect x=\"3.2\" y=\"7.7\" width=\"17.6\" height=\"8.8\" rx=\"2.5\"/><path d=\"M10.1 16.5c.55.85 1.2 1.25 1.9 1.25s1.35-.4 1.9-1.25\"/><text x=\"15.5\" y=\"13.15\" text-anchor=\"middle\" font-size=\"3.15\" font-family=\"Arial,sans-serif\" font-weight=\"700\" fill=\"currentColor\" stroke=\"none\">VR</text>",
    "video": "M4 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM16 11l6-3v8l-6-3z",
    "photo": "M4 6h16v12H4zM8 14l2.5-3 2 2.5L16 10l4 4",
    "photos": "M7 7h13v11H7zM4 10v9h12",
    "info": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 8h.01",
    "gear": "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM12 3v2M12 19v2M4.2 6.5l1.7 1M18.1 16.5l1.7 1M3 12h2M19 12h2M4.2 17.5l1.7-1M18.1 7.5l1.7-1",
    "factory": "M3 21V10l6 4V10l6 4V8l6 3v10H3zM7 21v-3M12 21v-3M17 21v-3",
    "sound": "M4 10h4l5-4v12l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 7a7 7 0 0 1 0 10",
    "scheme": "M5 6h4v4H5zM15 14h4v4h-4zM15 6h4v4h-4zM9 8h6M17 10v4",
    "home": "M4 11l8-7 8 7v9H4zM10 20v-6h4v6",
    "play": "M8 5l12 7-12 7z",
    "pause": "M7 5h4v14H7zM13 5h4v14h-4z",
    "compass": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM14.5 9.5l-1.2 4.8-4.8 1.2 1.2-4.8z",
    "eye": "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "people": "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 20c.6-3 2.8-4.5 6-4.5s5.4 1.5 6 4.5M14 15.6c1.6-.4 3.2-.1 4.5.8 1.2.8 2 2 2.5 3.6",
    "person": "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20c.8-3.2 3.2-5 7-5s6.2 1.8 7 5",
    "clock": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v6l4 2",
    "star": "M12 3l2.7 5.6L21 9.2l-4.5 4.3L17.5 20 12 17l-5.5 3 1-6.5L3 9.2l6.3-.6z",
    "flag": "M5 21V4M5 4h11l-2 4 2 4H5",
    "book": "M4 5h7a3 3 0 0 1 3 3v12H7a3 3 0 0 0-3 3zM20 5h-7a3 3 0 0 0-3 3v12h7a3 3 0 0 1 3 3z",
    "folder": "M3 7h6l2 2h10v10H3z",
    "layers": "M12 3l9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5",
    "cube": "M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5",
    "sun": "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    "drop": "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
    "leaf": "M5 19C5 11 12 4 20 4 20 14 13 20 5 20zM8 15c2-1 4-3 5-6",
    "bolt": "M13 2L4 14h7l-1 8 9-12h-7z",
    "monitor": "M3 5h18v11H3zM8 20h8M12 16v4",
    "phone": "M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2",
    "grid": "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    "list": "M9 7h12M9 12h12M9 17h12M4 7h.01M4 12h.01M4 17h.01",
    "check": "M5 12l5 5L20 7",
    "plus": "M12 5v14M5 12h14",
    "mic": "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4",
    "route": "M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 13V8c0-2 2-3 5-3h4M18 11v5c0 2-2 3-5 3H9",
    "door": "M6 21V4h12v17M10 12h.01M6 21h12",
    "box": "M3 8l9-4 9 4-9 4zM3 8v8l9 4 9-4V8M12 12v8",
    "target": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
    "panorama": "M4 8a8 8 0 0 1 16 0v8H4zM2 16h20M8 16v2M16 16v2",
    "warning": "M12 3l10 18H2zM12 10v5M12 18h.01",
    "chat": "M5 17l-2 4 5-2h9a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3z",
    "search": "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
    "hand": "M8 11V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6.5a1.5 1.5 0 0 1 3 0V13c0 4-2 8-6 8h-1c-3 0-5-2-5-5v-3.5a1.5 1.5 0 0 1 3 0"
  }
};
