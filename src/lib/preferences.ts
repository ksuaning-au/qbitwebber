// Every qBittorrent 5.2.3 preference the app can edit, grouped like qBittorrent's own Options.
// Labels, choices, and units follow qBittorrent's preferences page.

export type PrefType = 'bool' | 'int' | 'number' | 'text' | 'textarea' | 'password' | 'path' | 'file' | 'select' | 'custom'

export type CustomPref = 'scanDirs' | 'webUiPassword' | 'apiKey' | 'networkInterface' | 'interfaceAddress' | 'testEmail' | 'trackerUrlList' | 'bannedPeers' | 'cookies'

export interface PrefOption {
  value: string | number
  label: string
}

export interface PrefDef {
  key: string
  label: string
  type: PrefType
  options?: PrefOption[]
  unit?: string
  // The value qBittorrent stores is the shown value times this, such as KiB shown and bytes stored.
  scale?: number
  help?: string
  // Greyed out unless this boolean preference is on.
  dependsOn?: string
  custom?: CustomPref
}

export interface PrefGroup {
  title: string
  warning?: string
  prefs: PrefDef[]
}

export interface PrefSection {
  id: string
  title: string
  groups: PrefGroup[]
}

const bool = (key: string, label: string, extra: Partial<PrefDef> = {}): PrefDef => ({ key, label, type: 'bool', ...extra })
const int = (key: string, label: string, extra: Partial<PrefDef> = {}): PrefDef => ({ key, label, type: 'int', ...extra })
const text = (key: string, label: string, extra: Partial<PrefDef> = {}): PrefDef => ({ key, label, type: 'text', ...extra })
const path = (key: string, label: string, extra: Partial<PrefDef> = {}): PrefDef => ({ key, label, type: 'path', ...extra })
const select = (key: string, label: string, options: PrefOption[], extra: Partial<PrefDef> = {}): PrefDef => ({ key, label, type: 'select', options, ...extra })
const custom = (key: string, label: string, kind: CustomPref, extra: Partial<PrefDef> = {}): PrefDef => ({ key, label, type: 'custom', custom: kind, ...extra })

const KIB_PER_SECOND = { unit: 'KiB/s', scale: 1024 }

export const PREFERENCE_SECTIONS: PrefSection[] = [
  {
    id: 'behavior',
    title: 'Behavior',
    groups: [
      {
        title: 'General',
        prefs: [
          text('locale', 'Language code', { help: 'For example en, de, or fr. Used by qBittorrent itself.' }),
          bool('performance_warning', 'Log performance warnings'),
          bool('status_bar_external_ip', 'Show external IP in the status bar'),
          bool('confirm_torrent_deletion', 'Confirm when deleting torrents (qBittorrent\'s own interface)'),
          bool('delete_torrent_content_files', 'Delete .torrent files along with their torrents'),
        ],
      },
      {
        title: 'Log file',
        prefs: [
          bool('file_log_enabled', 'Save the log to a file'),
          path('file_log_path', 'Log folder', { dependsOn: 'file_log_enabled' }),
          bool('file_log_backup_enabled', 'Back up the log after it reaches', { dependsOn: 'file_log_enabled' }),
          int('file_log_max_size', 'Maximum log size', { unit: 'KiB', dependsOn: 'file_log_backup_enabled' }),
          bool('file_log_delete_old', 'Delete backups older than', { dependsOn: 'file_log_enabled' }),
          int('file_log_age', 'Backup age', { dependsOn: 'file_log_delete_old' }),
          select('file_log_age_type', 'Backup age unit', [{ value: 0, label: 'Days' }, { value: 1, label: 'Months' }, { value: 2, label: 'Years' }], { dependsOn: 'file_log_delete_old' }),
        ],
      },
    ],
  },
  {
    id: 'downloads',
    title: 'Downloads',
    groups: [
      {
        title: 'When adding a torrent',
        prefs: [
          select('torrent_content_layout', 'Content layout', [{ value: 'Original', label: 'Original' }, { value: 'Subfolder', label: 'Create subfolder' }, { value: 'NoSubfolder', label: "Don't create subfolder" }]),
          bool('add_to_top_of_queue', 'Add to top of queue'),
          bool('add_stopped_enabled', "Don't start the download automatically"),
          select('torrent_stop_condition', 'Stop condition', [{ value: 'None', label: 'None' }, { value: 'MetadataReceived', label: 'Metadata received' }, { value: 'FilesChecked', label: 'Files checked' }]),
          bool('merge_trackers', 'Merge trackers into an existing torrent'),
          select('auto_delete_mode', 'Delete .torrent files afterwards', [{ value: 0, label: 'Never' }, { value: 1, label: 'If added successfully' }, { value: 2, label: 'Always' }]),
          bool('preallocate_all', 'Pre-allocate disk space for all files'),
          bool('incomplete_files_ext', 'Append .!qB to incomplete files'),
          bool('use_unwanted_folder', 'Keep unselected files in a ".unwanted" folder'),
        ],
      },
      {
        title: 'Saving',
        prefs: [
          select('auto_tmm_enabled', 'Default torrent management mode', [{ value: 'false', label: 'Manual' }, { value: 'true', label: 'Automatic' }]),
          select('torrent_changed_tmm_enabled', 'When a torrent\'s category changes', [{ value: 'true', label: 'Relocate the torrent' }, { value: 'false', label: 'Switch it to manual mode' }]),
          select('save_path_changed_tmm_enabled', 'When the default save path changes', [{ value: 'true', label: 'Relocate affected torrents' }, { value: 'false', label: 'Switch them to manual mode' }]),
          select('category_changed_tmm_enabled', 'When a category\'s save path changes', [{ value: 'true', label: 'Relocate affected torrents' }, { value: 'false', label: 'Switch them to manual mode' }]),
          bool('use_category_paths_in_manual_mode', 'Use category paths in manual mode'),
          path('save_path', 'Default save path'),
          bool('temp_path_enabled', 'Keep incomplete torrents in a separate folder'),
          path('temp_path', 'Folder for incomplete torrents', { dependsOn: 'temp_path_enabled' }),
          path('export_dir', 'Copy .torrent files to', { help: 'Blank turns this off.' }),
          path('export_dir_fin', 'Copy .torrent files of finished downloads to', { help: 'Blank turns this off.' }),
        ],
      },
      {
        title: 'Watched folders',
        prefs: [custom('scan_dirs', 'Folders to watch for new .torrent files', 'scanDirs')],
      },
      {
        title: 'Excluded file names',
        prefs: [
          bool('excluded_file_names_enabled', 'Skip files matching these names'),
          { key: 'excluded_file_names', label: 'Names or patterns, one per line', type: 'textarea', dependsOn: 'excluded_file_names_enabled' },
        ],
      },
      {
        title: 'Email when a download finishes',
        prefs: [
          bool('mail_notification_enabled', 'Send an email'),
          text('mail_notification_sender', 'From', { dependsOn: 'mail_notification_enabled' }),
          text('mail_notification_email', 'To', { dependsOn: 'mail_notification_enabled' }),
          text('mail_notification_smtp', 'SMTP server', { dependsOn: 'mail_notification_enabled' }),
          bool('mail_notification_ssl_enabled', 'Use a secure connection (SSL)', { dependsOn: 'mail_notification_enabled' }),
          bool('mail_notification_auth_enabled', 'Server needs a login', { dependsOn: 'mail_notification_enabled' }),
          text('mail_notification_username', 'Username', { dependsOn: 'mail_notification_auth_enabled' }),
          { key: 'mail_notification_password', label: 'Password', type: 'password', dependsOn: 'mail_notification_auth_enabled' },
          custom('mail_test', 'Test email', 'testEmail', { dependsOn: 'mail_notification_enabled' }),
        ],
      },
      {
        title: 'Run a program',
        warning: 'These run commands on the machine where qBittorrent is installed.',
        prefs: [
          bool('autorun_on_torrent_added_enabled', 'When a torrent is added'),
          text('autorun_on_torrent_added_program', 'Command', { dependsOn: 'autorun_on_torrent_added_enabled', help: '%N name, %L category, %G tags, %F content path, %R root path, %D save path, %C file count, %Z size, %T tracker, %I/%J/%K hashes.' }),
          bool('autorun_enabled', 'When a torrent finishes'),
          text('autorun_program', 'Command', { dependsOn: 'autorun_enabled' }),
        ],
      },
    ],
  },
  {
    id: 'connection',
    title: 'Connection',
    groups: [
      {
        title: 'Listening port',
        prefs: [
          int('listen_port', 'Port for incoming connections', { help: '0 picks a random port.' }),
          bool('upnp', 'Use UPnP / NAT-PMP port forwarding from my router'),
          bool('ssl_enabled', 'Accept SSL torrent connections'),
          int('ssl_listen_port', 'SSL port', { dependsOn: 'ssl_enabled' }),
        ],
      },
      {
        title: 'Connection limits',
        prefs: [
          int('max_connec', 'Global maximum connections', { help: '-1 means no limit.' }),
          int('max_connec_per_torrent', 'Maximum connections per torrent'),
          int('max_uploads', 'Global maximum upload slots'),
          int('max_uploads_per_torrent', 'Maximum upload slots per torrent'),
        ],
      },
      {
        title: 'I2P',
        prefs: [
          bool('i2p_enabled', 'Use I2P'),
          text('i2p_address', 'Host', { dependsOn: 'i2p_enabled' }),
          int('i2p_port', 'Port', { dependsOn: 'i2p_enabled' }),
          bool('i2p_mixed_mode', 'Mixed mode', { dependsOn: 'i2p_enabled' }),
          int('i2p_inbound_quantity', 'Inbound tunnels', { dependsOn: 'i2p_enabled' }),
          int('i2p_outbound_quantity', 'Outbound tunnels', { dependsOn: 'i2p_enabled' }),
          int('i2p_inbound_length', 'Inbound tunnel length', { dependsOn: 'i2p_enabled' }),
          int('i2p_outbound_length', 'Outbound tunnel length', { dependsOn: 'i2p_enabled' }),
        ],
      },
      {
        title: 'Proxy server',
        prefs: [
          select('proxy_type', 'Type', [{ value: 'None', label: 'None' }, { value: 'SOCKS4', label: 'SOCKS4' }, { value: 'SOCKS5', label: 'SOCKS5' }, { value: 'HTTP', label: 'HTTP' }]),
          text('proxy_ip', 'Host'),
          int('proxy_port', 'Port'),
          bool('proxy_auth_enabled', 'Proxy needs a login'),
          text('proxy_username', 'Username', { dependsOn: 'proxy_auth_enabled' }),
          { key: 'proxy_password', label: 'Password', type: 'password', dependsOn: 'proxy_auth_enabled' },
          bool('proxy_hostname_lookup', 'Look up host names through the proxy'),
          bool('proxy_bittorrent', 'Use the proxy for BitTorrent'),
          bool('proxy_peer_connections', 'Use the proxy for peer connections', { dependsOn: 'proxy_bittorrent' }),
          bool('proxy_rss', 'Use the proxy for RSS'),
          bool('proxy_misc', 'Use the proxy for other downloads'),
        ],
      },
      {
        title: 'IP filtering',
        prefs: [
          bool('ip_filter_enabled', 'Use an IP filter file'),
          { key: 'ip_filter_path', label: 'Filter file (.dat, .p2p, .p2b)', type: 'file', dependsOn: 'ip_filter_enabled' },
          bool('ip_filter_trackers', 'Apply the filter to trackers too', { dependsOn: 'ip_filter_enabled' }),
          custom('banned_IPs', 'Banned peers', 'bannedPeers'),
        ],
      },
    ],
  },
  {
    id: 'speed',
    title: 'Speed',
    groups: [
      {
        title: 'Global limits (0 = unlimited)',
        prefs: [
          int('dl_limit', 'Download', KIB_PER_SECOND),
          int('up_limit', 'Upload', KIB_PER_SECOND),
        ],
      },
      {
        title: 'Alternative limits',
        prefs: [
          int('alt_dl_limit', 'Download', KIB_PER_SECOND),
          int('alt_up_limit', 'Upload', KIB_PER_SECOND),
          bool('scheduler_enabled', 'Use the alternative limits on a schedule'),
          int('schedule_from_hour', 'From hour (0-23)', { dependsOn: 'scheduler_enabled' }),
          int('schedule_from_min', 'From minute', { dependsOn: 'scheduler_enabled' }),
          int('schedule_to_hour', 'To hour (0-23)', { dependsOn: 'scheduler_enabled' }),
          int('schedule_to_min', 'To minute', { dependsOn: 'scheduler_enabled' }),
          select('scheduler_days', 'When', [
            { value: 0, label: 'Every day' }, { value: 1, label: 'Weekdays' }, { value: 2, label: 'Weekends' },
            { value: 3, label: 'Monday' }, { value: 4, label: 'Tuesday' }, { value: 5, label: 'Wednesday' }, { value: 6, label: 'Thursday' },
            { value: 7, label: 'Friday' }, { value: 8, label: 'Saturday' }, { value: 9, label: 'Sunday' },
          ], { dependsOn: 'scheduler_enabled' }),
        ],
      },
      {
        title: 'Rate limit settings',
        prefs: [
          select('bittorrent_protocol', 'BitTorrent protocol', [{ value: 0, label: 'TCP and μTP' }, { value: 1, label: 'TCP' }, { value: 2, label: 'μTP' }]),
          bool('limit_utp_rate', 'Apply limits to the μTP protocol'),
          bool('limit_tcp_overhead', 'Apply limits to transport overhead'),
          bool('limit_lan_peers', 'Apply limits to peers on the local network'),
        ],
      },
    ],
  },
  {
    id: 'bittorrent',
    title: 'BitTorrent',
    groups: [
      {
        title: 'Privacy',
        prefs: [
          bool('dht', 'Use DHT to find more peers'),
          bool('pex', 'Use peer exchange (PeX)'),
          bool('lsd', 'Use local peer discovery'),
          select('encryption', 'Encryption', [{ value: 0, label: 'Allow encryption' }, { value: 1, label: 'Require encryption' }, { value: 2, label: 'Disable encryption' }]),
          bool('anonymous_mode', 'Anonymous mode'),
          int('max_active_checking_torrents', 'Maximum torrents checked at once'),
        ],
      },
      {
        title: 'Queueing',
        prefs: [
          bool('queueing_enabled', 'Use torrent queueing'),
          int('max_active_downloads', 'Maximum active downloads', { dependsOn: 'queueing_enabled' }),
          int('max_active_uploads', 'Maximum active uploads', { dependsOn: 'queueing_enabled' }),
          int('max_active_torrents', 'Maximum active torrents', { dependsOn: 'queueing_enabled' }),
          bool('dont_count_slow_torrents', "Don't count slow torrents in these limits", { dependsOn: 'queueing_enabled' }),
          int('slow_torrent_dl_rate_threshold', 'Slow download threshold', { unit: 'KiB/s', dependsOn: 'dont_count_slow_torrents' }),
          int('slow_torrent_ul_rate_threshold', 'Slow upload threshold', { unit: 'KiB/s', dependsOn: 'dont_count_slow_torrents' }),
          int('slow_torrent_inactive_timer', 'Torrent inactivity timer', { unit: 'seconds', dependsOn: 'dont_count_slow_torrents' }),
        ],
      },
      {
        title: 'Seeding limits',
        prefs: [
          bool('max_ratio_enabled', 'Stop at ratio'),
          { key: 'max_ratio', label: 'Ratio', type: 'number', dependsOn: 'max_ratio_enabled' },
          bool('max_seeding_time_enabled', 'Stop after seeding for'),
          int('max_seeding_time', 'Seeding time', { unit: 'minutes', dependsOn: 'max_seeding_time_enabled' }),
          bool('max_inactive_seeding_time_enabled', 'Stop after being inactive for'),
          int('max_inactive_seeding_time', 'Inactive time', { unit: 'minutes', dependsOn: 'max_inactive_seeding_time_enabled' }),
          select('max_ratio_act', 'Then', [{ value: 0, label: 'Stop torrent' }, { value: 1, label: 'Remove torrent' }, { value: 3, label: 'Remove torrent and its files' }, { value: 2, label: 'Enable super seeding for torrent' }]),
        ],
      },
      {
        title: 'Add trackers to new downloads',
        prefs: [
          bool('add_trackers_enabled', 'Add these trackers'),
          { key: 'add_trackers', label: 'Trackers, one per line', type: 'textarea', dependsOn: 'add_trackers_enabled' },
          bool('add_trackers_from_url_enabled', 'Add trackers from a list online'),
          text('add_trackers_url', 'List address', { dependsOn: 'add_trackers_from_url_enabled' }),
          custom('add_trackers_url_list', 'Trackers from that list', 'trackerUrlList', { dependsOn: 'add_trackers_from_url_enabled' }),
        ],
      },
    ],
  },
  {
    id: 'rss',
    title: 'RSS',
    groups: [
      {
        title: 'Reader',
        prefs: [
          bool('rss_processing_enabled', 'Fetch RSS feeds'),
          int('rss_refresh_interval', 'Refresh every', { unit: 'minutes', dependsOn: 'rss_processing_enabled' }),
          int('rss_fetch_delay', 'Wait between fetches from the same host', { unit: 'seconds', dependsOn: 'rss_processing_enabled' }),
          int('rss_max_articles_per_feed', 'Maximum articles per feed', { dependsOn: 'rss_processing_enabled' }),
        ],
      },
      {
        title: 'Automatic downloading',
        prefs: [
          bool('rss_auto_downloading_enabled', 'Download torrents that match the rules'),
          bool('rss_download_repack_proper_episodes', 'Download REPACK and PROPER episodes'),
          { key: 'rss_smart_episode_filters', label: 'Smart episode filters, one per line', type: 'textarea' },
        ],
      },
    ],
  },
  {
    id: 'webui',
    title: 'Web UI',
    groups: [
      {
        title: 'Server',
        warning: 'A wrong address, port, or HTTPS setting can make the Web UI unreachable, including this app.',
        prefs: [
          text('web_ui_address', 'IP address', { help: '* listens on every address.' }),
          int('web_ui_port', 'Port'),
          bool('web_ui_upnp', 'Forward the port with UPnP / NAT-PMP'),
          bool('use_https', 'Use HTTPS'),
          { key: 'web_ui_https_cert_path', label: 'Certificate file', type: 'file', dependsOn: 'use_https' },
          { key: 'web_ui_https_key_path', label: 'Key file', type: 'file', dependsOn: 'use_https' },
        ],
      },
      {
        title: 'Login',
        warning: 'If you change the username or password, sign in again with the new ones.',
        prefs: [
          text('web_ui_username', 'Username'),
          custom('web_ui_password', 'New password', 'webUiPassword'),
          bool('bypass_local_auth', 'Skip the login for clients on localhost'),
          bool('bypass_auth_subnet_whitelist_enabled', 'Skip the login for these networks'),
          { key: 'bypass_auth_subnet_whitelist', label: 'Networks, one per line (such as 192.168.0.0/24)', type: 'textarea', dependsOn: 'bypass_auth_subnet_whitelist_enabled' },
          int('web_ui_max_auth_fail_count', 'Ban a client after this many failed logins'),
          int('web_ui_ban_duration', 'Ban for', { unit: 'seconds' }),
          int('web_ui_session_timeout', 'Sign out after', { unit: 'seconds' }),
          custom('web_ui_api_key', 'API key', 'apiKey'),
        ],
      },
      {
        title: 'Alternative Web UI',
        warning: 'This app is an alternative Web UI. Turning this off or changing the folder switches qBittorrent away from it.',
        prefs: [
          bool('alternative_webui_enabled', 'Use an alternative Web UI'),
          path('alternative_webui_path', 'Files location', { dependsOn: 'alternative_webui_enabled' }),
        ],
      },
      {
        title: 'Security',
        prefs: [
          bool('web_ui_clickjacking_protection_enabled', 'Clickjacking protection'),
          bool('web_ui_csrf_protection_enabled', 'Cross-site request forgery (CSRF) protection'),
          bool('web_ui_secure_cookie_enabled', 'Secure cookie flag (needs HTTPS)'),
          bool('web_ui_host_header_validation_enabled', 'Check the Host header'),
          text('web_ui_domain_list', 'Allowed server domains', { dependsOn: 'web_ui_host_header_validation_enabled', help: 'Separated by ;. Use * for any.' }),
          bool('web_ui_use_custom_http_headers_enabled', 'Add custom HTTP headers'),
          { key: 'web_ui_custom_http_headers', label: 'Headers, one per line', type: 'textarea', dependsOn: 'web_ui_use_custom_http_headers_enabled' },
          bool('web_ui_reverse_proxy_enabled', 'Support a reverse proxy'),
          text('web_ui_reverse_proxies_list', 'Trusted proxies', { dependsOn: 'web_ui_reverse_proxy_enabled', help: 'IP addresses or networks, separated by ;.' }),
        ],
      },
      {
        title: 'Dynamic DNS',
        prefs: [
          bool('dyndns_enabled', 'Update my dynamic domain name'),
          select('dyndns_service', 'Service', [{ value: 0, label: 'DynDNS' }, { value: 1, label: 'NO-IP' }], { dependsOn: 'dyndns_enabled' }),
          text('dyndns_domain', 'Domain name', { dependsOn: 'dyndns_enabled' }),
          text('dyndns_username', 'Username', { dependsOn: 'dyndns_enabled' }),
          { key: 'dyndns_password', label: 'Password', type: 'password', dependsOn: 'dyndns_enabled' },
        ],
      },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    groups: [
      {
        title: 'qBittorrent',
        warning: 'Change these only if you know what they do.',
        prefs: [
          select('resume_data_storage_type', 'Resume data storage (needs a restart)', [{ value: 'Legacy', label: 'Fastresume files' }, { value: 'SQLite', label: 'SQLite database (experimental)' }]),
          select('torrent_content_remove_option', 'When deleting files', [{ value: 'Delete', label: 'Delete them permanently' }, { value: 'MoveToTrash', label: 'Move them to the trash if possible' }]),
          int('memory_working_set_limit', 'Memory use limit', { unit: 'MiB' }),
          custom('current_network_interface', 'Network interface', 'networkInterface'),
          custom('current_interface_address', 'IP address to bind to', 'interfaceAddress'),
          int('save_resume_data_interval', 'Save resume data every', { unit: 'minutes' }),
          int('save_statistics_interval', 'Save statistics every', { unit: 'minutes' }),
          int('torrent_file_size_limit', 'Largest .torrent file to accept', { unit: 'MiB', scale: 1024 * 1024 }),
          bool('confirm_torrent_recheck', 'Confirm torrent rechecks (qBittorrent\'s own interface)'),
          bool('recheck_completed_torrents', 'Recheck torrents when they complete'),
          text('app_instance_name', 'Instance name'),
          int('refresh_interval', 'Refresh interval', { unit: 'ms' }),
          bool('resolve_peer_host_names', 'Resolve peer host names'),
          bool('resolve_peer_countries', 'Resolve peer countries'),
          bool('reannounce_when_address_changed', 'Reannounce to all trackers when the IP or port changes'),
          bool('enable_embedded_tracker', 'Run the built-in tracker'),
          int('embedded_tracker_port', 'Built-in tracker port', { dependsOn: 'enable_embedded_tracker' }),
          bool('embedded_tracker_port_forwarding', 'Forward the built-in tracker port', { dependsOn: 'enable_embedded_tracker' }),
          bool('mark_of_the_web', 'Mark downloaded files as from the internet (Windows and macOS)'),
          bool('ignore_ssl_errors', 'Ignore SSL errors'),
          { key: 'python_executable_path', label: 'Python program (for search)', type: 'file', help: 'Blank finds it automatically.' },
        ],
      },
      {
        title: 'libtorrent',
        warning: 'Change these only if you know what they do.',
        prefs: [
          int('bdecode_depth_limit', 'Bdecode depth limit'),
          int('bdecode_token_limit', 'Bdecode token limit'),
          int('async_io_threads', 'Asynchronous I/O threads'),
          int('hashing_threads', 'Hashing threads'),
          int('file_pool_size', 'File pool size'),
          int('checking_memory_use', 'Memory for checking torrents', { unit: 'MiB' }),
          int('disk_cache', 'Disk cache', { unit: 'MiB', help: '-1 picks automatically.' }),
          int('disk_cache_ttl', 'Disk cache expiry', { unit: 'seconds' }),
          int('disk_queue_size', 'Disk queue size', { unit: 'KiB', scale: 1024 }),
          select('disk_io_type', 'Disk I/O type (needs a restart)', [{ value: 0, label: 'Default' }, { value: 1, label: 'Memory mapped files' }, { value: 2, label: 'POSIX-compliant' }, { value: 3, label: 'Simple pread/pwrite' }]),
          select('disk_io_read_mode', 'Disk read mode', [{ value: 0, label: 'Disable OS cache' }, { value: 1, label: 'Enable OS cache' }]),
          select('disk_io_write_mode', 'Disk write mode', [{ value: 0, label: 'Disable OS cache' }, { value: 1, label: 'Enable OS cache' }, { value: 2, label: 'Write-through' }]),
          bool('enable_coalesce_read_write', 'Coalesce reads and writes'),
          bool('enable_piece_extent_affinity', 'Use piece extent affinity'),
          bool('enable_upload_suggestions', 'Send upload piece suggestions'),
          int('send_buffer_watermark', 'Send buffer watermark', { unit: 'KiB' }),
          int('send_buffer_low_watermark', 'Send buffer low watermark', { unit: 'KiB' }),
          int('send_buffer_watermark_factor', 'Send buffer watermark factor', { unit: '%' }),
          int('connection_speed', 'Outgoing connections per second'),
          int('socket_send_buffer_size', 'Socket send buffer size (0 = system default)', { unit: 'KiB', scale: 1024 }),
          int('socket_receive_buffer_size', 'Socket receive buffer size (0 = system default)', { unit: 'KiB', scale: 1024 }),
          int('socket_backlog_size', 'Socket backlog size'),
          int('outgoing_ports_min', 'Outgoing ports, from (0 = any)'),
          int('outgoing_ports_max', 'Outgoing ports, to (0 = any)'),
          int('upnp_lease_duration', 'UPnP lease duration (0 = permanent)', { unit: 'seconds' }),
          int('peer_tos', 'Type of service (ToS) for peer connections'),
          select('utp_tcp_mixed_mode', 'μTP-TCP mixed mode', [{ value: 0, label: 'Prefer TCP' }, { value: 1, label: 'Peer proportional (throttles TCP)' }]),
          int('hostname_cache_ttl', 'Host name cache lifetime', { unit: 'seconds' }),
          bool('idn_support_enabled', 'Support internationalized domain names'),
          bool('enable_multi_connections_from_same_ip', 'Allow several connections from the same IP'),
          bool('validate_https_tracker_certificate', 'Check HTTPS tracker certificates'),
          bool('ssrf_mitigation', 'Server-side request forgery (SSRF) mitigation'),
          bool('block_peers_on_privileged_ports', 'Block peers on privileged ports'),
          select('upload_slots_behavior', 'Upload slots', [{ value: 0, label: 'Fixed slots' }, { value: 1, label: 'Upload rate based' }]),
          select('upload_choking_algorithm', 'Upload choking', [{ value: 0, label: 'Round-robin' }, { value: 1, label: 'Fastest upload' }, { value: 2, label: 'Anti-leech' }]),
          bool('announce_to_all_trackers', 'Announce to all trackers in a tier'),
          bool('announce_to_all_tiers', 'Announce to all tiers'),
          text('announce_ip', 'IP address reported to trackers (blank = automatic)'),
          int('announce_port', 'Port reported to trackers (0 = listening port)'),
          int('max_concurrent_http_announces', 'Maximum simultaneous HTTP announces'),
          int('stop_tracker_timeout', 'Stop tracker timeout', { unit: 'seconds' }),
          int('peer_turnover', 'Peer turnover disconnect', { unit: '%' }),
          int('peer_turnover_cutoff', 'Peer turnover threshold', { unit: '%' }),
          int('peer_turnover_interval', 'Peer turnover interval', { unit: 'seconds' }),
          int('request_queue_size', 'Maximum outstanding requests to a peer'),
          text('dht_bootstrap_nodes', 'DHT bootstrap nodes', { help: 'host:port, separated by commas. Blank uses the defaults.' }),
        ],
      },
      {
        title: 'Cookies',
        prefs: [custom('cookies', 'Cookies for downloads and RSS', 'cookies')],
      },
    ],
  },
]

// Converts a stored value to what the form shows.
export function toFormValue(def: PrefDef, value: unknown): unknown {
  if (def.type === 'bool') return !!value
  if (def.type === 'select' && def.options?.some(option => typeof option.value === 'string') && typeof value === 'boolean') return String(value)
  if ((def.type === 'int' || def.type === 'number') && typeof value === 'number' && def.scale) {
    return value > 0 ? Math.round((value / def.scale) * 100) / 100 : value
  }
  return value
}

// Converts a form value back to what qBittorrent stores. Returns undefined for an invalid number.
export function toStoredValue(def: PrefDef, value: unknown): unknown {
  if (def.type === 'int' || def.type === 'number') {
    const number = typeof value === 'number' ? value : Number(String(value).trim())
    if (String(value).trim() === '' || !Number.isFinite(number)) return undefined
    if (def.type === 'int' && !Number.isInteger(number) && !def.scale) return undefined
    return def.scale && number > 0 ? Math.round(number * def.scale) : number
  }
  if (def.type === 'select') {
    const option = def.options?.find(o => String(o.value) === String(value))
    if (!option) return value
    if (value === 'true' || value === 'false') return value === 'true'
    return option.value
  }
  return value
}

export const ALL_PREFS: PrefDef[] = PREFERENCE_SECTIONS.flatMap(section => section.groups.flatMap(group => group.prefs))

// The stored values that differ from what qBittorrent sent, or a list of invalid labels.
export function getChangedPreferences(original: Record<string, unknown>, edits: Record<string, unknown>): { changes: Record<string, unknown>; invalid: string[] } {
  const changes: Record<string, unknown> = {}
  const invalid: string[] = []
  for (const [key, value] of Object.entries(edits)) {
    const def = ALL_PREFS.find(p => p.key === key)
    if (!def) {
      // Custom editors store their own final values.
      changes[key] = value
      continue
    }
    const stored = def.type === 'custom' ? value : toStoredValue(def, value)
    if (stored === undefined) {
      invalid.push(def.label)
      continue
    }
    if (JSON.stringify(stored) !== JSON.stringify(original[key])) changes[key] = stored
  }

  // qBittorrent only applies these when both halves arrive together.
  for (const pair of SENT_TOGETHER) {
    if (!pair.some(key => key in changes)) continue
    for (const key of pair) {
      if (key in changes) continue
      const def = ALL_PREFS.find(p => p.key === key)
      changes[key] = key in edits && def ? toStoredValue(def, edits[key]) : original[key]
    }
  }

  // A limit that's switched on needs a value of 0 or more, or qBittorrent turns it back off.
  for (const [enabledKey, valueKey, label] of LIMITS_WITH_SWITCH) {
    if (changes[enabledKey] === true || (enabledKey in changes === false && valueKey in changes && original[enabledKey] === true)) {
      const value = Number(changes[valueKey] ?? original[valueKey])
      if (!(value >= 0)) invalid.push(label)
    }
  }
  return { changes, invalid }
}

const SENT_TOGETHER: string[][] = [
  ['schedule_from_hour', 'schedule_from_min'],
  ['schedule_to_hour', 'schedule_to_min'],
  ['max_ratio_enabled', 'max_ratio'],
  ['max_seeding_time_enabled', 'max_seeding_time'],
  ['max_inactive_seeding_time_enabled', 'max_inactive_seeding_time'],
]

const LIMITS_WITH_SWITCH: [string, string, string][] = [
  ['max_ratio_enabled', 'max_ratio', 'Ratio'],
  ['max_seeding_time_enabled', 'max_seeding_time', 'Seeding time'],
  ['max_inactive_seeding_time_enabled', 'max_inactive_seeding_time', 'Inactive time'],
]
