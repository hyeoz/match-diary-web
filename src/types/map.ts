export type NaverMap = {
  setCenter(latlng: NaverLatLng): void;
};

export type NaverMarker = {
  setMap(map: NaverMap | null): void;
};

export type NaverMarkerOptions = {
  position: NaverLatLng;
  map: NaverMap;
  title?: string;
  icon?: {
    url: string;
    size: NaverSize;
    scaledSize: NaverSize;
    origin: NaverPoint;
    anchor: NaverPoint;
  };
};

export type NaverMapOptions = {
  center: NaverLatLng;
  zoom: number;
  zoomControl: boolean;
  zoomControlOptions: {
    position: number;
  };
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
