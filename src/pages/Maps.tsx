import { useEffect, useState, useCallback } from "react";

import { API } from "../api";
import {
  NaverMap,
  NaverMarker,
  NaverMapOptions,
  NaverMapsStatic,
  Stadium,
  RecordType,
} from "../types/map";

const DEFAULT_LATITUDE = 37.5666805;
const DEFAULT_LONGITUDE = 126.9784147;

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

const Maps = () => {
  const [mapInstance, setMapInstance] = useState<NaverMap | null>(null);
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);

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
  }, []);

  const createMarker = useCallback(
    (stadium: Stadium, mapInstance: NaverMap) => {
      const position = new window.naver.maps.LatLng(
        stadium.latitude,
        stadium.longitude
      );
      try {
        new window.naver.maps.Marker({
          position,
          map: mapInstance,
          title: stadium.stadium_name,
          animation: window.naver.maps.Animation.DROP,
          clickable: true,
          icon: {
            url: "/src/assets/map_marker.png",
            size: new window.naver.maps.Size(42, 52),
            scaledSize: new window.naver.maps.Size(42, 52),
            origin: new window.naver.maps.Point(0, 0),
            anchor: new window.naver.maps.Point(21, 30),
          },
        });
      } catch (e) {
        logToApp("Error creating marker", e);
        return null;
      }
    },
    []
  );

  const [markers, setMarkers] = useState<NaverMarker[]>([]);

  const clearMarkers = useCallback(() => {
    // 기존 마커들 제거
    markers.forEach((marker) => {
      marker.setMap(null);
    });
    setMarkers([]);
  }, [markers]);

  // 새로운 마커 저장
  const addMarker = useCallback((marker: NaverMarker) => {
    setMarkers((prev) => [...prev, marker]);
  }, []);

  // 경기장 ID만 가져오는 함수
  const fetchUserRecordsAndStadiums = useCallback(
    async (userId: string, mapInstance: NaverMap) => {
      logToApp("start fetchUserRecordsAndStadiums");

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
          ].filter((id): id is number => id !== undefined);

          logToApp("Unique stadium IDs", uniqueStadiumIds);

          // 경기장 정보 가져오기
          const stadiumsResponse = await API.get<Stadium[]>("/stadiums");
          if (stadiumsResponse.data) {
            // 사용자가 방문한 경기장만 필터링
            const filteredStadiums = stadiumsResponse.data.filter(
              (stadium): stadium is Stadium => {
                return uniqueStadiumIds.includes(stadium.stadium_id);
              }
            );

            logToApp("Update map markers");
            updateMapMarkers(filteredStadiums, mapInstance);
            setTimeout(() => {
              mapInstance.setCenter(
                new window.naver.maps.LatLng(
                  filteredStadiums[0].latitude,
                  filteredStadiums[0].longitude
                )
              );
            }, 1000);
          }
        }
      } catch (error) {
        logToApp("Error fetching data", error);
      }
    },
    [logToApp]
  );

  // 마커 생성과 지도 위치 변경을 처리하는 함수
  const updateMapMarkers = useCallback(
    (userStadiums: Stadium[], mapInstance: NaverMap) => {
      if (!mapInstance) {
        logToApp("No map instance");
        return;
      }
      if (userStadiums.length === 0) {
        logToApp("No stadiums");
        return;
      }

      logToApp("Clear markers", userStadiums);
      clearMarkers();

      // 새로운 마커 생성
      const newMarkers = userStadiums.map((stadium) => {
        const marker = createMarker(stadium, mapInstance);

        logToApp("Created marker", marker);

        if (marker) {
          addMarker(marker);
        }

        return marker;
      });

      logToApp("Created markers count:", newMarkers);

      // 모든 마커를 포함하는 경계 계산(최초에 모든 경기장이 나올 수 있도록)
      const bounds = new window.naver.maps.LatLngBounds();
      userStadiums.forEach((stadium) => {
        bounds.extend(
          new window.naver.maps.LatLng(stadium.latitude, stadium.longitude)
        );
      });

      // 지도 중심과 줌 레벨 조정
      requestAnimationFrame(() => {
        mapInstance.fitBounds(bounds);
        // 단일 마커인 경우 적절한 줌 레벨 설정
        if (userStadiums.length === 1) {
          mapInstance.setZoom(15);
        }
      });
    },
    [createMarker, addMarker]
  );

  const initializeMap = useCallback(() => {
    if (mapInitialized || !window.naver?.maps) return null;

    const mapDiv = document.getElementById("map");

    if (!mapDiv) {
      logToApp("Map container not found");
      return null;
    }

    try {
      const mapOptions: NaverMapOptions = {
        center: new window.naver.maps.LatLng(
          DEFAULT_LATITUDE,
          DEFAULT_LONGITUDE
        ),
        zoom: 15,
        zoomControl: true,
        zoomControlOptions: {
          position: window.naver.maps.Position.TOP_RIGHT,
        },
        scaleControl: false,
      };

      const map = new window.naver.maps.Map("map", mapOptions);
      setMapInstance(map);
      setMapInitialized(true);
      return map;
    } catch (error) {
      console.error("Error in map initialization:", error);
      logToApp("Error in map initialization", error);
      return null;
    }
  }, [mapInitialized, setMapInstance, setMapInitialized, logToApp]);

  const loadNaverMapsScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${
        import.meta.env.VITE_NAVER_MAP_CLIENT_ID
      }`;
      script.async = true;
      script.onload = () => {
        console.log("[SCRIPT] Naver Maps script loaded");
        resolve();
      };
      script.onerror = () => reject(new Error("Naver Maps script load error"));
      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.userId) {
          try {
            await loadNaverMapsScript();
            const map = initializeMap();
            logToApp("userId", data.userId);

            if (map) {
              // 지도가 준비되면 데이터 로드
              await fetchUserRecordsAndStadiums(data.userId, map);
            }
          } catch (error) {
            logToApp("Error initializing map", error);
            console.error("Error initializing map:", error);
          }
        }
        /* 
        // NOTE TEST
        await loadNaverMapsScript();
        const map = initializeMap();

        if (map) {
          // 지도가 준비되면 데이터 로드
          await fetchUserRecordsAndStadiums(
            import.meta.env.VITE_TEST_USER_ID,
            map
          );
          }
        */
      } catch (error) {
        console.error("Error parsing message:", error);
        logToApp("Error parsing message", error);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    initializeMap,
    fetchUserRecordsAndStadiums,
    mapInstance,
    loadNaverMapsScript,
    logToApp,
  ]);

  useEffect(() => {
    if (!mapInstance) return;

    const handleResize = () => {
      window.naver.maps.Event.trigger(mapInstance, "resize");
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mapInstance]);

  return (
    <div
      className="map-container"
      style={{
        width: "100%",
        height: "100%",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
      }}
    >
      <div
        id="map"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      ></div>
    </div>
  );
};

export default Maps;
