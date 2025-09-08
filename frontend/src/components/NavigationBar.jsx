import React from 'react'

const NavigationBar = ({ activeTab, onTabChange, savedCount, userProfile = { name: "Student", avatar: "S" } }) => {
  return (
    <nav className="nav-bar">
      <div className="nav-brand">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
        </svg>
        Math Learning Assistant
      </div>
      
      <div className="nav-menu">
        <button
          className={`nav-link ${activeTab === 'question' ? 'active' : ''}`}
          onClick={() => onTabChange('question')}
        >
          Ask Question
        </button>
        <button
          className={`nav-link ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => onTabChange('saved')}
        >
          Saved ({savedCount})
        </button>
      </div>

      <div className="nav-profile">
        <div className="nav-avatar">
          {userProfile.avatar}
        </div>
        <div className="nav-profile-text">
          {userProfile.name}
        </div>
      </div>
    </nav>
  )
}

export default NavigationBar