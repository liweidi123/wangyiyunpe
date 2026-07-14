// --- sjduan.js (API Layer & Utils) ---

// 1. 定义全局缓存对象，供后续调用
window.CacheTypes = { LYRICS: 'lyrics', PLAYLIST: 'playlist', COMMENTS: 'comments', LIKED_SONGS: 'liked_songs' };
window.dataCache = {
    store: {},
    get: function(type, key) {
        const k = type + '_' + key;
        const item = this.store[k];
        if (!item) return null;
        if (Date.now() > item.expiry) { delete this.store[k]; return null; }
        return item.data;
    },
    set: function(type, key, data, ttl) {
        this.store[type + '_' + key] = { data: data, expiry: Date.now() + ttl };
    }
};

const API_BASE = 'https://wyapi.hzxq.asia';

// 音质级别优先级（从高到低）
const QUALITY_LEVELS = ['jymaster', 'sky', 'jyeffect', 'hires', 'lossless', 'exhigh', 'higher', 'standard'];
window.QUALITY_LEVELS = QUALITY_LEVELS;

const api = {
    // 基础请求封装
    async request(endpoint, params = {}) {
        const url = new URL(`${API_BASE}${endpoint}`);
        params.timestamp = Date.now();
        
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            const response = await fetch(url.toString(), {
                method: 'GET',
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    async postRequest(endpoint, params = {}) {
        const url = new URL(`${API_BASE}${endpoint}`);
        url.searchParams.append('timestamp', Date.now());

        try {
            const response = await fetch(url.toString(), {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });
            return await response.json();
        } catch (error) {
            console.error('API POST request failed:', error);
            throw error;
        }
    },

    // --- 业务接口 ---

    async search(keywords, options = {}) {
        const params = {
            keywords,
            limit: options.limit || 30,
            offset: options.offset || 0,
            type: options.type || 1
        };
        return this.request('/cloudsearch', params);
    },

    async getSongUrl(id, level = 'exhigh') {
        const cookie = localStorage.getItem('music_cookie');
        const params = { id, level };
        if (cookie) {
            params.cookie = cookie;
        }
        return this.request('/song/url/v1', params);
    },
    
    // 带降级策略的 URL 获取
    async getSongUrlWithFallback(id, preferredLevel = 'exhigh') {
        const cookie = localStorage.getItem('music_cookie');
        const startIndex = QUALITY_LEVELS.indexOf(preferredLevel);
        const levels = startIndex >= 0 ? QUALITY_LEVELS.slice(startIndex) : QUALITY_LEVELS;
        
        for (const level of levels) {
            try {
                const params = { id, level };
                if (cookie) params.cookie = cookie;
                const res = await this.request('/song/url/v1', params);
                
                if (res && res.data && res.data[0] && res.data[0].url) {
                    return { ...res, actualLevel: level };
                }
            } catch (e) {
                console.warn(`Quality ${level} failed, trying next...`);
            }
        }
        return { data: [{ url: null }], actualLevel: null };
    },

    async getSongDetail(ids) {
        const idsStr = Array.isArray(ids) ? ids.join(',') : ids;
        return this.request('/song/detail', { ids: idsStr });
    },

    async getLyric(id) {
        if (window.dataCache) {
            const cached = window.dataCache.get(window.CacheTypes.LYRICS, id);
            if (cached) return cached;
        }
        
        const cookie = localStorage.getItem('music_cookie');
        const params = { id };
        if (cookie) params.cookie = cookie;
        const result = await this.request('/lyric', params);
        
        if (window.dataCache && result) {
            window.dataCache.set(window.CacheTypes.LYRICS, id, result, 30 * 60 * 1000);
        }
        return result;
    },

    async getLyricNew(id) {
        if (window.dataCache) {
            const cached = window.dataCache.get(window.CacheTypes.LYRICS + '_new', id);
            if (cached) return cached;
        }
        
        const cookie = localStorage.getItem('music_cookie');
        const params = { id };
        if (cookie) params.cookie = cookie;
        const result = await this.request('/lyric/new', params);
        
        if (window.dataCache && result) {
            window.dataCache.set(window.CacheTypes.LYRICS + '_new', id, result, 30 * 60 * 1000);
        }
        return result;
    },

    async getDailyRecommendSongs() {
        const cookie = localStorage.getItem('music_cookie');
        if (!cookie) return null;
        return this.request('/recommend/songs', { cookie });
    },

    async getDailyRecommendPlaylists() {
        const cookie = localStorage.getItem('music_cookie');
        if (!cookie) return null;
        return this.request('/recommend/resource', { cookie });
    },

    async getPlaylistDetail(id) {
        if (window.dataCache) {
            const cached = window.dataCache.get(window.CacheTypes.PLAYLIST, id);
            if (cached) return cached;
        }
        const result = await this.request('/playlist/detail', { id });
        if (window.dataCache && result) {
            window.dataCache.set(window.CacheTypes.PLAYLIST, id, result, 10 * 60 * 1000);
        }
        return result;
    },

    async getPlaylistTracks(id, limit = 50, offset = 0) {
        const cacheKey = `${id}_${limit}_${offset}`;
        if (window.dataCache) {
            const cached = window.dataCache.get(window.CacheTypes.PLAYLIST + '_tracks', cacheKey);
            if (cached) return cached;
        }
        const result = await this.request('/playlist/track/all', { id, limit, offset });
        if (window.dataCache && result) {
            window.dataCache.set(window.CacheTypes.PLAYLIST + '_tracks', cacheKey, result, 10 * 60 * 1000);
        }
        return result;
    },

    async getPersonalized(limit = 9) {
        return this.request('/personalized', { limit });
    },

    // --- 登录相关 ---
    async getQRKey() { return this.request('/login/qr/key'); },
    async createQR(key) { return this.request('/login/qr/create', { key, qrimg: true }); },
    async checkQR(key) { return this.request('/login/qr/check', { key, noCookie: true }); },
    async getLoginStatus(cookie) { return this.request('/login/status', { cookie }); },
    async getUserDetail(uid, cookie) { return this.request('/user/detail', { uid, cookie }); },
    async getUserPlaylist(uid, cookie, limit = 30, offset = 0) { return this.request('/user/playlist', { uid, limit, offset, cookie }); },
    async logout(cookie) { return this.request('/logout', { cookie }); },
    async getUserLevel(cookie) {
        const cookieToUse = cookie || localStorage.getItem('music_cookie');
        if (!cookieToUse) return null;
        return this.request('/user/level', { cookie: cookieToUse });
    },

    // --- 收藏/红心 ---
    async likeSong(id, like = true, cookie) {
        const cookieToUse = cookie || localStorage.getItem('music_cookie');
        if (!cookieToUse) return null;
        return this.request('/like', { id, like, cookie: cookieToUse });
    },

    // --- 工具函数 ---

    formatDuration(ms) {
        if (!ms) return "0:00";
        const seconds = Math.floor(ms / 1000);
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    },

    formatTrack(song) {
        const artists = song.ar || song.artists || [];
        const artistsList = artists.map(a => ({ id: a.id, name: a.name }));
        
        let cover = '';
        if (song.al) {
            if (song.al.picUrl) cover = song.al.picUrl;
            else if (song.al.pic_str) cover = `https://p1.music.126.net/${song.al.pic_str}/${song.al.pic_str}.jpg`;
            else if (song.al.pic) cover = `https://p1.music.126.net/${song.al.pic}/${song.al.pic}.jpg`;
        } else if (song.album && song.album.picUrl) {
            cover = song.album.picUrl;
        }
        
        return {
            id: song.id,
            title: song.name,
            artist: artistsList.map(a => a.name).join(' / ') || '未知艺人',
            artistId: artistsList[0]?.id || null,
            artists: artistsList,
            album: song.al ? song.al.name : (song.album ? song.album.name : '未知专辑'),
            cover: cover,
            duration: this.formatDuration(song.dt || song.duration),
        };
    },

    parseLyric(lyricStr) {
        if (!lyricStr) return [];
        const lines = lyricStr.split('\n');
        const lyrics = [];
        const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

        lines.forEach(line => {
            const matches = [...line.matchAll(timeRegex)];
            if (matches.length === 0) return;
            const text = line.replace(timeRegex, '').trim();
            if (!text) return;

            matches.forEach(match => {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = parseInt(match[3].padEnd(3, '0'));
                const time = min * 60 + sec + ms / 1000;
                lyrics.push({ time, text });
            });
        });
        return lyrics.sort((a, b) => a.time - b.time);
    },

    // YRC 逐字歌词解析
    parseYrc(yrcStr) {
        if (!yrcStr) return null;
        const lines = yrcStr.split('\n');
        const lyrics = [];
        const lineMetaReg = /^\[(\d+),(\d+)\]/;
        const wordReg = /\((\d+),(\d+),(\d+)\)(.*?)(?=\(\d+,\d+,\d+\)|$)/g;

        lines.forEach(line => {
            const metaMatch = line.match(lineMetaReg);
            if (!metaMatch) return;
            const startTime = parseInt(metaMatch[1]) / 1000;

            const words = [];
            let wordMatch;
            const content = line.replace(lineMetaReg, '');
            while ((wordMatch = wordReg.exec(content)) !== null) {
                words.push({
                    startTime: parseInt(wordMatch[1]) / 1000,
                    duration: parseInt(wordMatch[2]) / 1000,
                    text: wordMatch[4]
                });
            }

            if (words.length > 0) {
                lyrics.push({
                    time: startTime,
                    type: 'yrc',
                    words: words,
                    text: words.map(w => w.text).join('')
                });
            }
        });
        return lyrics.length > 0 ? lyrics.sort((a, b) => a.time - b.time) : null;
    }
};

window.api = api;