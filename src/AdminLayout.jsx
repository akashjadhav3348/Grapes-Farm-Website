import { useEffect, useRef } from 'react';

const NAV_ICONS = {
  overview: 'bi-grid-1x2',
  hero: 'bi-house',
  farm: 'bi-flower1',
  crops: 'bi-basket2',
  gallery: 'bi-images',
  'family-tree': 'bi-diagram-3',
  members: 'bi-person-vcard',
  family: 'bi-person-hearts',
  team: 'bi-people',
  tasks: 'bi-calendar-check',
  notifications: 'bi-bell',
  activity: 'bi-activity',
  profile: 'bi-person-circle',
  settings: 'bi-sliders',
  visit: 'bi-geo-alt',
};

const NAV_ICON_COLORS = {
  overview: '#8de0ad',
  hero: '#ffd166',
  farm: '#72d58c',
  crops: '#f2b84b',
  gallery: '#73c9ef',
  'family-tree': '#c1a0f4',
  members: '#7fc8ff',
  family: '#f3a5c1',
  team: '#87d7cf',
  tasks: '#ffd166',
  notifications: '#ff9389',
  activity: '#73d7c4',
  profile: '#c4b5fd',
  settings: '#b2c4b8',
  visit: '#83c9ef',
};

export function AdminSidebar({ open, collapsed, sections, active, onNavigate, onClose, profileName, t }) {
  return <>
    {open && <button className="dashboard-overlay lg:hidden" aria-label="Close navigation" onClick={onClose} />}
    <aside data-open={open} data-collapsed={collapsed} className="admin-sidebar">
      <div className="sidebar-brand">
        <span aria-hidden="true" className="sidebar-logo"><i className="bi bi-flower1" /></span>
        <div><strong>{t('ऐश्वर्य फार्म्स')}</strong><small>Admin panel</small></div>
        <button className="sidebar-close lg:hidden" type="button" aria-label="Close menu" onClick={onClose}><i className="bi bi-x-lg" /></button>
      </div>
      <nav id="admin-sections" className="sidebar-navigation" aria-label={t('एडिटरचे विभाग')}>
        <p className="sidebar-caption">WORKSPACE &amp; WEBSITE</p>
        {sections.map(([id, label]) => {
          const translated = t(label);
          return <button
            key={id}
            aria-label={translated}
            aria-pressed={active === id}
            title={collapsed ? translated : undefined}
            className="dashboard-nav-item"
            type="button"
            onClick={() => onNavigate(id)}
          >
            <i className={`bi ${NAV_ICONS[id] || 'bi-circle'} menu-symbol`} style={{ color: NAV_ICON_COLORS[id] || '#c6dfd0' }} aria-hidden="true" />
            <span>{translated}</span>
          </button>;
        })}
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-live-dot" />
        <span className="sidebar-profile">
          <strong>{profileName || 'Administrator'}</strong>
          <small>Family administrator</small>
        </span>
      </div>
    </aside>
  </>;
}

export function AdminTopbar({
  open, setOpen, collapsed, onToggleCollapsed, search, setSearch,
  unreadCount, theme, toggleTheme, profileName, navigate, onLogout, t,
}) {
  const searchInput = useRef(null);

  useEffect(() => {
    function onShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);

  return <header className="dashboard-topbar">
    <button
      className="sidebar-collapse-button"
      type="button"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      onClick={onToggleCollapsed}
    >
      <i className={`bi ${collapsed ? 'bi-layout-sidebar' : 'bi-layout-sidebar-inset'}`} aria-hidden="true" />
    </button>
    <button className="mobile-menu-button lg:hidden" type="button" aria-label="Sections" aria-expanded={open} aria-controls="admin-sections" onClick={() => setOpen(!open)}>
      <i className="bi bi-list" /><span>Sections</span>
    </button>
    <label className="dashboard-search">
      <i className="bi bi-search" aria-hidden="true" />
      <input
        ref={searchInput}
        aria-label={t('Search sidebar menus')}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('Search menus…')}
      />
      <kbd>Ctrl K</kbd>
    </label>
    <div className="dashboard-toolbar">
      <span className="toolbar-language" aria-label="Current language: English">
        <i className="bi bi-globe2" aria-hidden="true" /><span>English</span>
      </span>
      <button className="toolbar-circle" type="button" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} onClick={() => navigate('notifications')}>
        <i className="bi bi-bell" />{unreadCount > 0 && <span className="unread-dot" aria-hidden="true" />}
      </button>
      <button className="toolbar-circle theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-pressed={theme === 'dark'} onClick={toggleTheme}>
        <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
      </button>
      <button className="toolbar-avatar" type="button" aria-label="Manage profile" onClick={() => navigate('profile')}>
        {profileName?.trim()?.slice(0, 1).toUpperCase() || 'A'}
      </button>
      <a className="toolbar-link" aria-label={t('मुख्य साइट')} href="/" target="_blank" rel="noopener">
        <i className="bi bi-box-arrow-up-right" aria-hidden="true" /><span>{t('मुख्य साइट')}</span>
      </a>
      <button className="toolbar-link toolbar-signout" aria-label={t('Sign out')} type="button" onClick={onLogout}>
        <i className="bi bi-box-arrow-right" aria-hidden="true" /><span>{t('Sign out')}</span>
      </button>
    </div>
  </header>;
}

export function AdminPageHeader({ title, profileName, section }) {
  const iconColor = NAV_ICON_COLORS[section] || '#188653';
  return <div className="dashboard-page-title">
    <div className="dashboard-page-heading">
      <span className="dashboard-page-icon" style={{ color: iconColor, backgroundColor: `${iconColor}20` }} aria-hidden="true">
        <i className={`bi ${NAV_ICONS[section] || 'bi-grid-1x2'}`} />
      </span>
      <div>
        <span className="page-kicker">{section === 'overview' ? 'CONTROL CENTER' : 'AISHWARY FARMS ADMIN'}</span>
        <h1 id="admin-title">{title}</h1>
        <p>Welcome back, {profileName} · Aishwary Farms</p>
      </div>
    </div>
    <span className="page-status"><i /> Live workspace</span>
  </div>;
}

export function DashboardMetrics({ metrics }) {
  return <dl className="dashboard-metrics">{metrics.map(([label, value], index) => <div key={label}>
    <dt>{label}</dt><dd>{value}</dd><i className={`bi ${['bi-basket2', 'bi-collection', 'bi-images'][index] || 'bi-graph-up'}`} aria-hidden="true" />
  </div>)}</dl>;
}

export default function AdminLayout({
  lang, theme, section, menuOpen, setMenuOpen, sidebarCollapsed, setSidebarCollapsed,
  sections, navigate, search, setSearch, unreadCount, toggleTheme, profileName,
  onLogout, logoutError, themeWarning, title, metrics, showMetrics, t, children,
}) {
  return <main lang={lang} aria-labelledby="admin-title" id="dashboard" data-theme={theme} data-section={section}>
    <div className="admin-shell" data-sidebar-collapsed={sidebarCollapsed}>
      <AdminSidebar
        open={menuOpen}
        collapsed={sidebarCollapsed}
        sections={sections}
        active={section}
        profileName={profileName}
        onNavigate={(id) => { navigate(id); setMenuOpen(false); }}
        onClose={() => setMenuOpen(false)}
        t={t}
      />
      <div className="admin-main">
        <AdminTopbar
          open={menuOpen}
          setOpen={setMenuOpen}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          search={search}
          setSearch={setSearch}
          unreadCount={unreadCount}
          theme={theme}
          toggleTheme={toggleTheme}
          profileName={profileName}
          navigate={navigate}
          onLogout={onLogout}
          t={t}
        />
        {logoutError && <p role="alert" className="dashboard-alert error">{t('Sign-out failed. Try again.')}</p>}
        {themeWarning && <p role="status" className="dashboard-alert warning">{themeWarning}</p>}
        {section !== 'overview' && <AdminPageHeader title={title} profileName={profileName} section={section} />}
        {showMetrics && <DashboardMetrics metrics={metrics} />}
        <div className="admin-page-content">{children}</div>
      </div>
    </div>
  </main>;
}
