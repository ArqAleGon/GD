# Simulaciones teóricas de flujo en estaciones

Versión 2026-10-06. Escenarios ilustrativos solicitados por el usuario. No son aforos, pronósticos calibrados, horarios oficiales ni cálculos de capacidad o evacuación.

## Supuestos ajustables

Jornada inicial: 05:30–23:00; demanda base B: 1.800 personas/h; permanencia: 6 minutos. El mismo punto de partida se aplica a E01–E16, sin afirmar demandas particulares por estación. Los cambios son de esta sesión y se reinician al cambiar de escena/estación. El control horario permite recorrer toda la jornada; reproducción acelerada: 2 minutos simulados por segundo. Al llegar al cierre se pausa, sin reiniciar automáticamente.

## Perfiles

Sea h la hora decimal y G(h,c,w) = exp(−0,5×((h−c)/w)²). El flujo total F=B×factor×rampa. La rampa sube de 0 a 1 en los primeros 30 minutos y baja de 1 a 0 en los últimos 30. Fuera de la jornada F=0.

| Escenario | Factor del flujo | Proporción de entradas desde la calle |
|---|---|---|
| Hora pico | 0,22 + 0,95G(h,7,5;0,85) + 0,85G(h,17,5;1,05) | 0,5 + 0,18G(h,7,5;1) − 0,18G(h,17,5;1,2) |
| Hora Valle | 0,25 + 0,13G(h,12,5;2,5) + 0,1G(h,18;2) | 0,5 |
| Evento | 0,25 + 0,5G(h,17,5;1) + 1,4G(h,18,5;0,65) + 1,9G(h,21;0,4) | 0,5 + 0,3G(h,18,5;0,65) − 0,35G(h,21;0,4) |
| Fin de semana | 0,13 + 0,48G(h,13;2,2) + 0,55G(h,18;1,8) | 0,5 + 0,08G(h,12;2) − 0,08G(h,19;2) |

Entradas=F×proporción; salidas=F×(1−proporción). Son corrientes distintas: pasajeros que acceden para abordar y pasajeros que egresan tras desembarcar; no se resta una de otra para calcular presencia. Presencia aproximada: integral del total F durante la ventana de permanencia anterior a la hora seleccionada, expresando horas correctamente. Total diario de accesos: integral de entradas. Integración trapezoidal a intervalos de un minuto; curva visual muestreada cada 15 minutos; redondeo solo en la presentación.

## Animación

Cian representa entradas; ámbar salidas. Hasta 96 marcas por corriente (aproximadamente una marca por 30 personas/h); no es un conteo de personas físicas. Trayectorias rectas esquemáticas sobre la banda de vestíbulo, siguen su separación vertical y se ocultan al filtrar otros niveles. No se derivan de puertas, recorridos accesibles, escaleras o rutas de evacuación. No se modifican geometría ni identidades IFC.

Para calibrar: aforos por estación/hora y sentido, intervalos y carga de trenes, rutas transitables, ancho útil de pasos, tiempos de permanencia y reglas para eventos. Las alarmas existentes son otra simulación; estos perfiles no calculan tiempos de evacuación ni certifican seguridad.
