export type NaverMap = {
  setCenter(latlng: NaverLatLng): void;
  setZoom(level: number): void;
  fitBounds(bounds: NaverLatLngBounds): void;
};

export type NaverLatLngBounds = {
  extend(latlng: NaverLatLng): void;
};

export type NaverMapsStatic = {
  Map: new (elementId: string, options: NaverMapOptions) => NaverMap;
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  LatLngBounds: new () => NaverLatLngBounds;
  Marker: new (options: NaverMarkerOptions) => NaverMarker;
  Size: new (width: number, height: number) => NaverSize;
  Point: new (x: number, y: number) => NaverPoint;
  Event: NaverMapsEvent;
  Position: {
    TOP_RIGHT: number;
  };
  Animation: {
    DROP: number;
  };
};

export type NaverMapsEvent = {
  trigger(target: NaverMap | NaverMarker, eventName: string): void;
};

declare global {
  interface Window {
    naver: {
      maps: NaverMapsStatic;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export type NaverMarker = {
  setMap(map: NaverMap | null): void;
};

export type NaverMarkerOptions = {
  position: NaverLatLng;
  map: NaverMap;
  title?: string;
  animation?: number;
  clickable?: boolean;
  icon?: {
    content?: string;
    url?: string;
    size?: NaverSize;
    scaledSize?: NaverSize;
    origin?: NaverPoint;
    anchor?: NaverPoint;
  };
};

export type NaverMapOptions = {
  center: NaverLatLng;
  zoom: number;
  zoomControl: boolean;
  zoomControlOptions: {
    position: number;
  };
  scaleControl?: boolean;
  logoControl?: boolean;
  mapDataControl?: boolean;
};

export type NaverLatLng = {
  lat(): number;
  lng(): number;
};

export type RecordType = {
  user_id: string;
  records_id?: number;
  match_id?: number | null;
  stadium_id?: number;
  date: string;
  image: string | null;
  ticket_image?: string | null;
  user_note: string;
};

export type Stadium = {
  stadium_id: number;
  stadium_name: string;
  stadium_short_name: string;
  latitude: number;
  longitude: number;
};

export type NaverSize = {
  width: number;
  height: number;
};

export type NaverPoint = {
  x: number;
  y: number;
};
