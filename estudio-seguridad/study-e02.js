export const e02Study={
  "id": "E02",
  "name": "E02 · Portal de las Américas",
  "summary": "E02 · Portal de las Américas",
  "origin": [
    89520,
    2550,
    -103710
  ],
  "cameras": 210,
  "fixed": 32,
  "cameraInventoryPending": false,
  "sourceCount": 4,
  "levels": [
    {
      "id": "B",
      "name": "Sótano",
      "ifc": "ARC_PL_00_BASEMENT",
      "cutMin": 2535.7,
      "cutMax": 2539.1
    },
    {
      "id": "A",
      "name": "Acceso",
      "ifc": "ARC_PL_01_ACCESS",
      "cutMin": 2541.1,
      "cutMax": 2545.0
    },
    {
      "id": "I",
      "name": "Intermedio",
      "ifc": "ARC_PL_02",
      "cutMin": 2549.15,
      "cutMax": 2553.0
    },
    {
      "id": "P",
      "name": "Plataforma",
      "ifc": "ARC_PL_03",
      "cutMin": 2558.64,
      "cutMax": 2562.5
    }
  ],
  "assets": {
    "cameras": "./assets/stations/e02/cameras.json",
    "models": "./assets/stations/e02/models/manifest.json",
    "architecture": "./assets/stations/e02/architecture.json",
    "inventory": "./assets/stations/e02/inventory.json",
    "registration": "./assets/stations/e02/plan-registration.json",
    "spaces": "./assets/stations/e02/spaces.json",
    "locations": "./assets/stations/e02/camera-locations.json"
  },
  "modelBase": "./assets/stations/e02/models/",
  "cameraBase": null,
  "description": "Arquitectura, estructuras e instalaciones de E02. Cuatro plantas arquitectónicas e inventario CCTV, 210 cámaras del IFC y 32 perspectivas Fixed. Recorridos pendientes.",
  "packages": [
    [
      "e02-0000",
      "Arquitectura · 0000"
    ],
    [
      "e02-1150",
      "Estructura · 1150"
    ],
    [
      "e02-1200",
      "Estructura · 1200"
    ],
    [
      "e02-ins",
      "Instalaciones · 5400"
    ]
  ]
};
