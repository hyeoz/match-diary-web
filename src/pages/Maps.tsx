import { useEffect, useState, useCallback } from "react";

import { API } from "../api";
import marker from "../assets/map_marker.png";

interface NaverMap {
  setCenter(latlng: NaverLatLng): void;
}

interface NaverMarker {
  setMap(map: NaverMap | null): void;
}

interface NaverMarkerOptions {
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
}

interface NaverMapOptions {
  center: NaverLatLng;
  zoom: number;
  zoomControl: boolean;
  zoomControlOptions: {
    position: number;
  };
}

interface NaverLatLng {
  lat(): number;
  lng(): number;
}

interface RecordType {
  user_id: string;
  records_id?: number;
  match_id?: number | null;
  stadium_id?: number;
  date: string;
  image: string | null;
  ticket_image?: string | null;
  user_note: string;
}

interface Stadium {
  stadium_id: number;
  stadium_name: string;
  stadium_short_name: string;
  latitude: number;
  longitude: number;
}

interface NaverSize {
  width: number;
  height: number;
}

interface NaverPoint {
  x: number;
  y: number;
}

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (elementId: string, options: NaverMapOptions) => NaverMap;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Marker: new (options: NaverMarkerOptions) => NaverMarker;
        Size: new (width: number, height: number) => NaverSize;
        Point: new (x: number, y: number) => NaverPoint;
        Position: {
          TOP_RIGHT: number;
        };
      };
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

const Maps = () => {
  const [mapInstance, setMapInstance] = useState<NaverMap | null>(null);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);
  const [markers, setMarkers] = useState<NaverMarker[]>([]);

  // 웹뷰 로깅 유틸리티 함수
  const logToApp = useCallback((message: string, data?: unknown) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "LOG",
          message,
          data,
          timestamp: new Date().toISOString(),
        })
      );
    }
    // console.log(message, data); // 브라우저 콘솔에도 로깅
  }, []);

  const createMarker = useCallback(
    (stadium: Stadium): NaverMarker | null => {
      if (!mapInstance) return null;

      try {
        return new window.naver.maps.Marker({
          position: new window.naver.maps.LatLng(
            stadium.latitude,
            stadium.longitude
          ),
          map: mapInstance,
          title: stadium.stadium_short_name,
          icon: {
            url: marker,
            size: new window.naver.maps.Size(42, 52),
            scaledSize: new window.naver.maps.Size(42, 52),
            origin: new window.naver.maps.Point(0, 0),
            anchor: new window.naver.maps.Point(21, 30),
          },
        });
      } catch (error) {
        console.error("Error creating marker:", error);
        logToApp("Error creating marker", error);
        return null;
      }
    },
    [mapInstance, logToApp]
  );

  const clearMarkers = useCallback(() => {
    markers.forEach((marker) => marker.setMap(null));
    setMarkers([]);
  }, [markers]);

  const fetchUserRecordsAndStadiums = useCallback(
    async (userId: string) => {
      try {
        // 사용자의 기록 가져오기
        const recordsResponse = await API.post<RecordType[]>("/user-records", {
          userId,
        });
        if (recordsResponse.data) {
          // 중복 없는 경기장 ID 추출
          const uniqueStadiumIds = [
            ...new Set(
              recordsResponse.data
                .filter(
                  (record): record is RecordType =>
                    record.stadium_id !== undefined
                )
                .map((record) => record.stadium_id)
            ),
          ];

          logToApp("Unique stadium IDs", uniqueStadiumIds);

          // 경기장 정보 가져오기
          const stadiumsResponse = await API.get<Stadium[]>("/stadiums");
          if (stadiumsResponse.data) {
            // 사용자가 방문한 경기장만 필터링
            const userStadiums = stadiumsResponse.data.filter(
              (stadium): stadium is Stadium => {
                return uniqueStadiumIds.includes(stadium.stadium_id);
              }
            );
            clearMarkers();
            // 마커 생성
            const newMarkers = userStadiums
              .map((stadium) => createMarker(stadium))
              .filter((marker): marker is NaverMarker => marker !== null);
            setMarkers(newMarkers);
            logToApp("newMarkers", newMarkers);

            // 첫 번째 경기장으로 지도 중심 이동
            if (userStadiums.length > 0 && mapInstance) {
              const firstStadium = userStadiums[0];
              mapInstance.setCenter(
                new window.naver.maps.LatLng(
                  firstStadium.latitude,
                  firstStadium.longitude
                )
              );
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        logToApp("Error fetching data", error);
      }
    },
    [clearMarkers, createMarker, mapInstance, logToApp, setMarkers]
  );

  const initializeMap = useCallback(() => {
    if (!mapInitialized) {
      const mapOptions: NaverMapOptions = {
        center: new window.naver.maps.LatLng(37.5666805, 126.9784147), // 서울 시청
        zoom: 15,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
      };
      const map = new window.naver.maps.Map("map", mapOptions);
      setMapInstance(map);
      setMapInitialized(true);
    }
  }, [mapInitialized, setMapInstance, setMapInitialized]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.userId) {
          await loadNaverMapsScript(); // ✅ 여기가 핵심
          initializeMap();
          await fetchUserRecordsAndStadiums(data.userId);
        }
        // NOTE 테스트용
        // await loadNaverMapsScript(); // ✅ 여기가 핵심
        // initializeMap();
        // await fetchUserRecordsAndStadiums(import.meta.env.VITE_TEST_USER_ID);
      } catch (error) {
        console.error("Error parsing message or loading map:", error);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [fetchUserRecordsAndStadiums, initializeMap]);

  const loadNaverMapsScript = () => {
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${
        import.meta.env.VITE_NAVER_MAP_CLIENT_ID
      }`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Naver Maps script load error"));
      document.head.appendChild(script);
    });
  };

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <div
        id="map"
        style={{
          width: "100%",
          height: "calc(100% - 80px)",
          backgroundColor: "grey",
        }}
      ></div>
    </div>
  );
};

export default Maps;
