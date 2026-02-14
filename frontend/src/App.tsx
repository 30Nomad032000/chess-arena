function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>
          Chess <span>Arena</span>
        </h1>
        <div className="app-header-status">
          <div className="status-dot" />
          <span>System Online</span>
        </div>
      </header>
      <div className="main-grid">
        <div className="board-column">
          <div className="card">
            <div className="card-body empty-state">
              <div className="empty-icon">&#9814;</div>
              <div>Select or start a game to begin</div>
            </div>
          </div>
        </div>
        <div className="sidebar-column">
          <div className="card">
            <div className="card-body empty-state">
              <div>Waiting for game data...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
