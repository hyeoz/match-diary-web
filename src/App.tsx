import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import logo from "./assets/logo_moving.gif";
import Privacy from "./pages/Privacy";
import "./App.css";

function Home() {
  return (
    <div className="LinkList">
      <img src={logo} width={300} height={300} className="Logo" />
      <ul>
        <li className="LinkItem">
          <a
            href="https://apps.apple.com/kr/app/%EC%A7%81%EA%B4%80%EC%9D%BC%EA%B8%B0/id6503297796?l=en-GB"
            target="_blank"
          >
            🍎 앱스토어
          </a>
        </li>
        <li className="LinkItem">
          <a
            href="https://play.google.com/store/apps/details?id=com.matchdiary.origin&hl=ko"
            target="_blank"
          >
            ▶️ 플레이 스토어
          </a>
        </li>
        <li className="LinkItem">
          <a
            href="https://www.instagram.com/match_diary_official/"
            target="_blank"
          >
            📷 공식 인스타
          </a>
        </li>
        <li className="LinkItem">
          <a
            href="https://7l1do9o9tw0.typeform.com/to/ZjFUd41l"
            target="_blank"
          >
            ❓ 문의 타입폼
          </a>
        </li>
      </ul>
      <p className="PrivacyLink">
        <a href="/privacy">개인정보 처리방침</a>
      </p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="Container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
