// src/constants/index.ts
type ColumnEntry = { active: boolean; order: number };

const columnsActive = {
    name: { active: true },
    size: { active: false },
    state: { active: true },
    progress: { active: true },
    eta: { active: false },
    dlspeed: { active: true },
    upspeed: { active: true },
    ratio: { active: false },
    num_seeds: { active: true },
    num_leechs: { active: true },
    added_on: { active: false },
    uploaded: { active: false },
    uploaded_session: { active: false },
} as const;

const columns = Object.keys(columnsActive).reduce((acc, key, idx) => {
    const k = key as keyof typeof columnsActive;
    acc[k] = {
        active: (columnsActive[k]).active,
        order: idx + 1,
    };
    return acc;
}, {} as Record<keyof typeof columnsActive, ColumnEntry>);

export const defaultPreferences = {
    locale: 'en',
    save_path: '',
    temp_path: '',
    temp_path_enabled: false,
    create_subfolder_enabled: true,
    start_paused_enabled: false,
    auto_tmm_enabled: false,
    queueing_enabled: false,
    max_active_downloads: 3,
    max_active_torrents: 5,
    max_active_uploads: 3,
    dl_limit: 0,
    up_limit: 0,
    alt_dl_limit: 1024,
    alt_up_limit: 1024,
    listen_port: 6881,
    upnp: true,
    random_port: false,
    dht: true,
    pex: true,
    lsd: true,
    encryption: 0,
    columns,
};

export const columnsDictionary: Record<keyof typeof columns, string> = {
    name: 'Name',
    state: 'State',
    progress: 'Progress',
    dlspeed: 'Download Speed',
    upspeed: 'Upload Speed',
    ratio: 'Ratio',
    num_seeds: 'Seeds',
    num_leechs: 'Leeches',
    size: 'Size',
    added_on: 'Added On',
    uploaded: 'Total Uploaded',
    uploaded_session: 'Uploaded Session',
    eta: 'ETA',
};