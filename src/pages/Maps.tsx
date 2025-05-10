import { useEffect, useState, useCallback } from "react";

import { API } from "../api";
import marker from "../assets/map_marker.png";
import {
  NaverMap,
  NaverMarker,
  NaverMarkerOptions,
  NaverLatLng,
  NaverMapOptions,
  NaverSize,
  NaverPoint,
  Stadium,
  RecordType,
  NaverMapsEvent,
} from "../types/map";

const DEFAULT_LATITUDE = 37.5666805;
const DEFAULT_LONGITUDE = 126.9784147;

declare global {
  interface Window {
    naver: {
      maps: {
        Map: new (elementId: string, options: NaverMapOptions) => NaverMap;
        LatLng: new (lat: number, lng: number) => NaverLatLng;
        Marker: new (options: NaverMarkerOptions) => NaverMarker;
        Size: new (width: number, height: number) => NaverSize;
        Point: new (x: number, y: number) => NaverPoint;
        Event: NaverMapsEvent;
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
  const [userStadiums, setUserStadiums] = useState<Stadium[]>([]);

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
    if (!mapInstance) return;

    return new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(
        DEFAULT_LATITUDE,
        DEFAULT_LONGITUDE
      ),
      map: mapInstance,
    });
  }, [mapInstance]);

  // 경기장 ID만 가져오는 함수
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
            setUserStadiums(filteredStadiums);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        logToApp("Error fetching data", error);
      }
    },
    [logToApp]
  );

  // 마커 생성과 지도 위치 변경을 처리하는 함수
  const updateMapMarkers = useCallback(() => {
    if (!mapInstance || userStadiums.length === 0) return;

    clearMarkers();

    // 마커 생성
    const newMarkers = userStadiums
      .map((stadium) => createMarker(stadium))
      .filter((marker): marker is NaverMarker => marker !== null);

    logToApp("newMarkers", newMarkers);

    // 첫 번째 경기장으로 지도 중심 이동
    const firstStadium = userStadiums[0];
    mapInstance.setCenter(
      new window.naver.maps.LatLng(
        firstStadium.latitude,
        firstStadium.longitude
      )
    );
  }, [clearMarkers, createMarker, mapInstance, userStadiums, logToApp]);

  const initializeMap = useCallback(() => {
    if (!mapInitialized) {
      const mapOptions: NaverMapOptions = {
        center: new window.naver.maps.LatLng(
          DEFAULT_LATITUDE,
          DEFAULT_LONGITUDE
        ), // 서울 시청
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
        logToApp("Received message", data);
        
        if (data.userId) {
          try {
            await loadNaverMapsScript();
            // DOM이 완전히 준비된 후 지도 초기화
            await new Promise(resolve => setTimeout(resolve, 500));
            
            initializeMap();
            await fetchUserRecordsAndStadiums(data.userId);
            
            // 지도 리사이즈 이벤트 트리거
            if (mapInstance) {
              window.naver.maps.Event.trigger(mapInstance, 'resize');
            }
          } catch (error) {
            logToApp("Error initializing map", error);
            console.error("Error initializing map:", error);
          }
        }
      } catch (error) {
        console.error("Error parsing message:", error);
        logToApp("Error parsing message", error);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchUserRecordsAndStadiums, initializeMap, loadNaverMapsScript, mapInstance]);

  useEffect(() => {
    if (userStadiums.length > 0) {
      updateMapMarkers();
    }
  }, [userStadiums, updateMapMarkers, logToApp]);

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      position: "fixed",
      top: 0,
      left: 0,
      overflow: "hidden"
    }}>
      <div
        id="map"
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "grey",
          position: "absolute"
        }}
      ></div>
    </div>
  );
};

export default Maps;
