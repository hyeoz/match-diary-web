import './App.css'
import logo from './assets/logo_moving.gif'

function App() {

  return (
    <div className="Container">
      <div className='LinkList'>
        <img src={logo} width={300} height={300} className='Logo' />
        <ul>
          <li className='LinkItem'>
            <a href="https://apps.apple.com/kr/app/%EC%A7%81%EA%B4%80%EC%9D%BC%EA%B8%B0/id6503297796?l=en-GB" target="_blank">🍎 앱스토어</a>
          </li>
          <li className='LinkItem'>
            <a href="https://play.google.com/store/apps/details?id=com.matchdiary.origin&hl=ko" target="_blank">▶️ 플레이 스토어</a>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default App
