export const e02Study={
  "id": "E02",
  "name": "E02 · Portal de las Américas",
  "summary": "E02 · Portal de las Américas",
  "origin": [
    89520,
    2550,
    -103710
  ],
  "cameras": 0,
  "fixed": 0,
  "cameraInventoryPending": true,
  "sourceCount": 4,
  "levels": [
    {
      "id": "B",
      "name": "Sótano",
      "ifc": "E02-B",
      "cutMin": 2535.7,
      "cutMax": 2539.1
    },
    {
      "id": "A",
      "name": "Acceso",
      "ifc": "E02-A",
      "cutMin": 2541.1,
      "cutMax": 2545.0
    },
    {
      "id": "I",
      "name": "Intermedio",
      "ifc": "E02-I",
      "cutMin": 2549.15,
      "cutMax": 2553.0
    },
    {
      "id": "P",
      "name": "Plataforma",
      "ifc": "E02-P",
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
  "description": "Modelos recuperados de arquitectura, estructuras e instalaciones. Cuatro plantas arquitectónicas, etiquetas y colores de espacios vinculados por nivel. Inventario calibrado de cámaras y recorridos pendientes.",
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
