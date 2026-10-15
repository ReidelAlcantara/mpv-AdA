// Propiedades observadas del motor (registro → puente → mpv observe_property)
export const OBSERVED_PROPS: string[] = [
  // transporte
  'pause', 'time-pos', 'percent-pos', 'duration', 'time-remaining', 'speed',
  'volume', 'volume-max', 'mute', 'audio-delay', 'sub-delay',
  // pistas
  'track-list', 'sid', 'aid', 'vid', 'secondary-sid',
  // subtítulos (estado + estilo)
  'sub-text', 'sub-start', 'sub-pos', 'sub-scale', 'sub-color', 'sub-font', 'sub-font-size',
  'sub-bold', 'sub-italic', 'sub-outline-size', 'sub-outline-color', 'sub-shadow-offset',
  'sub-shadow-color', 'sub-margin-x', 'sub-margin-y', 'sub-border-style', 'sub-visibility',
  'sub-scale-with-window', 'sub-ass-override',
  // capítulos
  'chapter', 'chapters', 'chapter-list', 'chapter-metadata',
  // cola
  'playlist', 'playlist-count', 'playlist-pos', 'playlist-playing-pos',
  // archivo
  'metadata', 'filename', 'media-title', 'file-format', 'file-size', 'path',
  'container-fps', 'estimated-vf-fps', 'width', 'height', 'video-params', 'audio-params',
  // dispositivos y pipeline
  'audio-device-list', 'hwdec', 'hwdec-current', 'deinterlace', 'scale', 'tone-mapping',
  'video-sync', 'interpolation', 'gapless-audio', 'replaygain', 'audio-pitch-correction',
  'audio-channels', 'current-vo', 'current-ao', 'mpv-version',
  // reproducción
  'loop-file', 'loop-playlist', 'keep-open', 'ab-loop-a', 'ab-loop-b',
  // caché / rendimiento
  'demuxer-cache-state', 'paused-for-cache', 'cache-buffering-state',
  'video-bitrate', 'audio-bitrate', 'frame-drop-count', 'vo-drop-frame-count',
  // estado
  'idle-active', 'eof-reached', 'seeking', 'demuxer-max-bytes', 'cache-secs',
  // paleta de la demo (propiedad user-data extendida del puente)
  'user-data/ada/palette', 'user-data/ada/kind',
]

export const THROTTLED_PROPS = new Set(['time-pos', 'percent-pos', 'video-bitrate', 'audio-bitrate', 'demuxer-cache-state', 'sub-text'])
