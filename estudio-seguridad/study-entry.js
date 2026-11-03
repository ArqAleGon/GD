import {station} from './study-stations.js?v=20261103-e02cctv33';
if(station.modelOnly) await import('./study-model-viewer.js?v=20261103-e02cctv33');
else await import('./study.js?v=20261103-e02cctv33');
