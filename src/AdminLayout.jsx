const NAV_ICONS = {
  overview: 'bi-grid-1x2', team: 'bi-people', 'family-tree': 'bi-diagram-3', members: 'bi-person-vcard',
  profile: 'bi-person-circle', settings: 'bi-sliders', tasks: 'bi-calendar-check', notifications: 'bi-bell',
  activity: 'bi-activity', hero: 'bi-house', farm: 'bi-flower1', crops: 'bi-basket2', gallery: 'bi-images',
  family: 'bi-person-hearts', visit: 'bi-geo-alt',
};

export function AdminSidebar({ open, sections, active, onNavigate, onClose, t }) {
  return <>
    {open && <button className="dashboard-overlay lg:hidden" aria-label="Close navigation" onClick={onClose} />}
    <aside data-open={open} className="admin-sidebar">
      <div className="sidebar-brand">
        <span aria-hidden="true" className="sidebar-logo">ऐ</span>
        <div><strong>{t('ऐश्वर्य फार्म्स')}</strong><small>{t('Site administration')}</small></div>
        <button className="sidebar-close lg:hidden" type="button" aria-label="Close menu" onClick={onClose}><i className="bi bi-x-lg" /></button>
      </div>
      <nav id="admin-sections" className="sidebar-navigation" aria-label={t('एडिटरचे विभाग')}>
        <p className="sidebar-caption">WORKSPACE &amp; WEBSITE</p>
        {sections.map(([id, label]) => <button key={id} aria-pressed={active === id} className="dashboard-nav-item" type="button" onClick={() => onNavigate(id)}>
          <i className={`bi ${NAV_ICONS[id] || 'bi-circle'} menu-symbol`} aria-hidden="true" /><span>{t(label)}</span>
        </button>)}
      </nav>
      <div className="sidebar-footer"><span className="sidebar-live-dot" /> <span>Dashboard ready</span><small>Aishwary Farms · Kumbhari</small></div>
    </aside>
  </>;
}

export function AdminTopbar({ open, setOpen, search, setSearch, unreadCount, theme, toggleTheme, profileName, navigate, onLogout, t }) {
  return <header className="dashboard-topbar">
    <button className="mobile-menu-button lg:hidden" type="button" aria-label="Sections" aria-expanded={open} aria-controls="admin-sections" onClick={() => setOpen(!open)}><i className="bi bi-list" /><span>Sections</span></button>
    <label className="dashboard-search"><i className="bi bi-search" aria-hidden="true" /><input aria-label={t('Search sidebar menus')} value={search} onChange={e => { setSearch(e.target.value); setOpen(true); }} placeholder={t('Search menus…')} /></label>
    <div className="dashboard-toolbar">
      <button className="toolbar-circle" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'} onClick={() => navigate('notifications')}><i className="bi bi-bell" />{unreadCount > 0 && <span className="unread-dot" aria-hidden="true" />}</button>
      <button className="toolbar-circle theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-pressed={theme === 'dark'} onClick={toggleTheme}><i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} /></button>
      <button className="toolbar-avatar" aria-label="Manage profile" onClick={() => navigate('profile')}>{profileName?.slice(0, 1).toUpperCase()}</button>
      <a className="toolbar-link" aria-label={t('मुख्य साइट')} href="/" target="_blank" rel="noopener"><i className="bi bi-box-arrow-up-right" aria-hidden="true" /><span>{t('मुख्य साइट')}</span></a>
      <button className="toolbar-link toolbar-signout" aria-label={t('Sign out')} type="button" onClick={onLogout}><i className="bi bi-box-arrow-right" aria-hidden="true" /><span>{t('Sign out')}</span></button>
    </div>
  </header>;
}

export function AdminPageHeader({ title, profileName, section }) {
  return <div className="dashboard-page-title"><div><span className="page-kicker">{section === 'overview' ? 'CONTROL CENTER' : 'AISHWARY FARMS ADMIN'}</span><h1 id="admin-title">{title}</h1><p>Welcome back, {profileName} · Aishwary Farms</p></div><span className="page-status"><i /> Live workspace</span></div>;
}

export function DashboardMetrics({ metrics }) {
  return <dl className="dashboard-metrics">{metrics.map(([label, value], index) => <div key={label}><dt>{label}</dt><dd>{value}</dd><i className={`bi ${['bi-basket2', 'bi-collection', 'bi-images'][index] || 'bi-graph-up'}`} aria-hidden="true" /></div>)}</dl>;
}

export default function AdminLayout({ lang, theme, section, menuOpen, setMenuOpen, sections, navigate, search, setSearch, unreadCount, toggleTheme, profileName, onLogout, logoutError, themeWarning, title, metrics, showMetrics, t, children }) {
  return <main lang={lang} aria-labelledby="admin-title" id="dashboard" data-theme={theme} data-section={section}>
    <div className="admin-shell">
      <AdminSidebar open={menuOpen} sections={sections} active={section} onNavigate={id => { navigate(id); setMenuOpen(false); }} onClose={() => setMenuOpen(false)} t={t} />
      <div className="admin-main">
        <AdminTopbar open={menuOpen} setOpen={setMenuOpen} search={search} setSearch={setSearch} unreadCount={unreadCount} theme={theme} toggleTheme={toggleTheme} profileName={profileName} navigate={navigate} onLogout={onLogout} t={t} />
        {logoutError && <p role="alert" className="dashboard-alert error">{t('Sign-out failed. Try again.')}</p>}
        {themeWarning && <p role="status" className="dashboard-alert warning">{themeWarning}</p>}
        <AdminPageHeader title={title} profileName={profileName} section={section} />
        {showMetrics && <DashboardMetrics metrics={metrics} />}
        <div className="admin-page-content">{children}</div>
      </div>
    </div>
  </main>;
}
