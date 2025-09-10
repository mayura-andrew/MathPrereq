import React from 'react'
import { 
  BookOpenIcon, 
  BookmarkIcon, 
  HomeIcon,
  UserCircleIcon 
} from '@heroicons/react/24/outline'
import {
  BookOpenIcon as BookOpenSolid,
  BookmarkIcon as BookmarkSolid,
  HomeIcon as HomeSolid
} from '@heroicons/react/24/solid'

const NavigationBar = ({ activeTab, onTabChange, savedCount, userProfile = { name: "Student", avatar: "S" } }) => {
  const navItems = [
    {
      id: 'question',
      label: 'Home',
      icon: HomeIcon,
      iconSolid: HomeSolid,
      description: 'Ask questions'
    },
    {
      id: 'saved', 
      label: 'Saved',
      icon: BookmarkIcon,
      iconSolid: BookmarkSolid,
      description: `${savedCount} saved items`,
      badge: savedCount > 0 ? savedCount : null
    }
  ]

  return (
    <nav className="education-navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-brand">
          <div className="brand-icon">
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div className="brand-text">
            <h1 className="brand-name">MathPrereq</h1>
            <p className="brand-tagline">AI Learning Assistant</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="navbar-nav">
          {navItems.map((item) => {
            const IconComponent = activeTab === item.id ? item.iconSolid : item.icon
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`nav-item ${activeTab === item.id ? 'nav-item-active' : ''}`}
                title={item.description}
              >
                <div className="nav-icon-wrapper">
                  <IconComponent className="nav-icon" />
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </div>
                <span className="nav-label">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* User Profile */}
        <div className="navbar-profile">
          <div className="profile-avatar">
            <UserCircleIcon className="w-7 h-7" />
          </div>
          <div className="profile-info">
            <span className="profile-name">{userProfile?.name || 'Student'}</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default NavigationBar