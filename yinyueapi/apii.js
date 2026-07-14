// --- sjduan1.js (App Logic) --- 美化版

// Toast 工具
let toastTimer = null;
function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.classList.add('show');
    
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// 全局状态
const state = {
    currentSong: null,
    isPlaying: false,
    playList: [],
    currentIndex: 0,
    lyrics: [],
    lyricIndex: -1,
    lyricType: 'lrc', // 'lrc' 或 'yrc'
    activeWordEls: [], // 缓存当前行的 DOM 元素 (优化性能)
    isLoggedIn: false,
    userInfo: null,
    checkQrTimer: null,
    activeTab: 'home',
    lastView: 'home',
    likedSongs: new Set(),
    isDragging: false,
    userLikedPlaylistId: null,
    currentPlaylistId: null,
    skipTimer: null,
    retryCount: 0,
    playMode: 0, // 0: 顺序, 1: 单曲, 2: 随机
    colorThief: (typeof ColorThief !== 'undefined') ? new ColorThief() : null // 颜色提取工具
};

const audio = document.getElementById('audio-player');
let karaokeRafId = null;

// 初始化卡片悬停效果
function initCardHoverEffects() {
    const cards = document.querySelectorAll('.grid-item, .playlist-row, .song-item, .daily-recommend-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            if (window.innerWidth > 768) {
                card.style.transition = 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
            }
        });
        
        // 添加触摸反馈
        card.addEventListener('touchstart', () => {
            card.style.transform = 'scale(0.98)';
            card.style.transition = 'transform 0.1s ease';
        });
        
        card.addEventListener('touchend', () => {
            card.style.transform = '';
            setTimeout(() => {
                card.style.transition = '';
            }, 100);
        });
    });
}

// 初始化点击涟漪效果
function initRippleEffects() {
    document.addEventListener('click', function(e) {
        const target = e.target;
        
        // 检查是否为可点击元素
        const clickableSelectors = [
            '.btn', '.login-btn', '.search-btn-text', '.logout-btn', 
            '.nav-item', '.grid-item', '.song-item', '.playlist-row', 
            '.daily-recommend-card', '.like-btn', '.mini-btn', '.ctrl-btn',
            '.fp-back', '.lyric-click-area'
        ];
        
        let clickableElement = null;
        for (const selector of clickableSelectors) {
            if (target.matches(selector) || target.closest(selector)) {
                clickableElement = target.matches(selector) ? target : target.closest(selector);
                break;
            }
        }
        
        if (!clickableElement) return;
        
        // 创建涟漪效果
        const ripple = document.createElement('span');
        const rect = clickableElement.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: ${clickableElement.classList.contains('login-btn') || 
                         clickableElement.classList.contains('daily-recommend-card') ? 
                         'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'};
            transform: scale(0);
            animation: ripple 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            z-index: 1;
        `;
        
        clickableElement.style.position = 'relative';
        clickableElement.style.overflow = 'hidden';
        clickableElement.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple && ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    });
}

// 添加视差滚动效果
function initParallaxEffects() {
    const parallaxElements = document.querySelectorAll('.playlist-header, .fp-bg');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        parallaxElements.forEach(el => {
            if (el && el.isConnected) {
                const rate = scrolled * 0.5;
                el.style.transform = `translate3d(0, ${rate}px, 0)`;
            }
        });
    });
}

// 平滑滚动到顶部
function smoothScrollToTop(element) {
    if (!element) return;
    
    element.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 增强的视图切换函数
const originalSwitchView = window.switchView;
window.switchView = function(viewName) {
    if (originalSwitchView) {
        originalSwitchView(viewName);
    } else {
        document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${viewName}`).classList.remove('hidden');
    }
    
    const viewElement = document.getElementById(`view-${viewName}`);
    if (viewElement) {
        setTimeout(() => {
            smoothScrollToTop(viewElement);
        }, 50);
    }
    
    // 添加切换动画
    if (viewElement) {
        viewElement.style.animation = 'none';
        setTimeout(() => {
            viewElement.style.animation = 'pageSlideIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        }, 10);
    }
};

// 初始化所有交互效果
function initUIEffects() {
    // 添加涟漪动画样式
    if (!document.getElementById('ripple-animation-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-animation-style';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            /* 增强按钮按压效果 */
            .btn:active, 
            .login-btn:active,
            .nav-item:active,
            .like-btn:active,
            .mini-btn:active,
            .ctrl-btn:active,
            .search-box:active {
                transform: scale(0.97) !important;
                transition: transform 0.1s ease !important;
            }
            
            /* 卡片按压效果 */
            .grid-item:active,
            .song-item:active,
            .playlist-row:active,
            .daily-recommend-card:active {
                transform: scale(0.98) !important;
                transition: transform 0.1s ease !important;
            }
            
            /* 加载动画 */
            @keyframes shimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
            }
            
            .shimmer-effect {
                background: linear-gradient(90deg, 
                    rgba(255,255,255,0) 0%, 
                    rgba(255,255,255,0.3) 50%, 
                    rgba(255,255,255,0) 100%);
                background-size: 200% auto;
                animation: shimmer 1.5s infinite linear;
            }
            
            /* 歌单封面浮动动画 */
            @keyframes gentleFloat {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                50% { transform: translateY(-8px) rotate(2deg); }
            }
            
            .floating-cover {
                animation: gentleFloat 6s ease-in-out infinite;
            }
            
            /* 心跳动画 */
            @keyframes heartbeat {
                0%, 100% { transform: scale(1); }
                25% { transform: scale(1.1); }
                50% { transform: scale(0.95); }
                75% { transform: scale(1.05); }
            }
            
            .heartbeat {
                animation: heartbeat 0.8s ease;
            }
        `;
        document.head.appendChild(style);
    }
    
    initCardHoverEffects();
    initRippleEffects();
    setTimeout(initParallaxEffects, 1000);
    
    // 为图片添加加载动画
    document.querySelectorAll('img').forEach(img => {
        if (!img.classList.contains('loaded')) {
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            img.onload = function() {
                this.classList.add('loaded');
                this.style.opacity = '1';
                
                // 如果是封面图片，添加浮动效果
                if (this.classList.contains('pl-cover') || 
                    this.closest('.cover-box') || 
                    this.id === 'fp-cover') {
                    this.parentElement.classList.add('floating-cover');
                }
            };
        }
    });
    
    // 为SVIP徽章添加闪烁效果
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList && 
                        (node.classList.contains('user-level') || node.querySelector('.user-level'))) {
                        const levelElement = node.classList.contains('user-level') ? 
                            node : node.querySelector('.user-level');
                        if (levelElement && levelElement.innerHTML.includes('SVIP')) {
                            const sparkle = document.createElement('div');
                            sparkle.style.cssText = `
                                position: absolute;
                                width: 100%;
                                height: 100%;
                                background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
                                border-radius: 50%;
                                animation: shimmer 3s infinite linear;
                                pointer-events: none;
                            `;
                            levelElement.style.position = 'relative';
                            levelElement.appendChild(sparkle);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', async () => {
    // 设置初始日期
    const d = new Date();
    const dailyDateEl = document.getElementById('daily-date');
    if (dailyDateEl) dailyDateEl.innerText = d.getDate();
    
    // 初始化功能
    bindProgressEvent();
    initVolume();
    initGestures();
    await checkLogin();
    loadHomeData();
    
    // 初始化UI效果
    initUIEffects();

    // 监听封面加载，提取主题色
    const coverImg = document.getElementById('fp-cover');
    if (coverImg) {
        coverImg.addEventListener('load', () => {
            extractThemeColor(coverImg);
            
            // 添加封面加载完成的效果
            coverImg.style.transition = 'transform 0.8s ease, opacity 0.8s ease';
            coverImg.style.opacity = '1';
            coverImg.style.transform = 'scale(1)';
            
            // 触发CD旋转动画
            const cdWrapper = document.getElementById('cd-wrapper');
            if (cdWrapper) {
                cdWrapper.style.opacity = '1';
                cdWrapper.style.transform = 'scale(1)';
            }
        });
        
        // 设置初始状态
        coverImg.style.opacity = '0';
        coverImg.style.transform = 'scale(0.8)';
    }

    // --- 音频事件监听 ---
    audio.addEventListener('timeupdate', () => { updateProgress(); });
    
    audio.addEventListener('playing', () => { 
        state.retryCount = 0; 
        state.isPlaying = true; 
        updatePlayState(); 
        startKaraokeLoop();
        
        // 播放时添加心跳效果
        const playBtn = document.getElementById('mini-play-btn');
        if (playBtn) {
            playBtn.classList.add('heartbeat');
            setTimeout(() => playBtn.classList.remove('heartbeat'), 800);
        }
    });

    audio.addEventListener('pause', () => { 
        state.isPlaying = false; 
        updatePlayState(); 
        stopKaraokeLoop(); 
    });
    
    audio.addEventListener('ended', () => { 
        playNext(true); 
        stopKaraokeLoop();
    });
    
    audio.addEventListener('waiting', stopKaraokeLoop);
    
    audio.addEventListener('error', (e) => { 
        console.log('播放出错:', e);
        if (state.playList.length > 1) {
            if(state.skipTimer) clearTimeout(state.skipTimer);
            if (state.retryCount < 5) {
                state.retryCount++;
                state.skipTimer = setTimeout(() => playNext(), 1000);
            } else {
                state.retryCount = 0;
                showToast('连续播放失败，已停止播放');
                state.isPlaying = false;
                updatePlayState();
            }
        }
    });
    
    if (state.isLoggedIn) {
        await initLikedSongs();
    }

    // MediaSession API 支持 (锁屏控制)
    if ('mediaSession' in navigator) {
        const actions = [
            ['play', () => togglePlay()],
            ['pause', () => togglePlay()],
            ['previoustrack', () => playPrev()],
            ['nexttrack', () => playNext()],
            ['seekto', (details) => {
                if (details.fastSeek && 'fastSeek' in audio) audio.fastSeek(details.seekTime);
                else audio.currentTime = details.seekTime;
                updateProgress();
            }]
        ];
        actions.forEach(([action, handler]) => {
            try { navigator.mediaSession.setActionHandler(action, handler); } catch(e){}
        });
    }
    
    // 路由/视图切换处理
    const searchBox = document.querySelector('#view-home .search-box');
    if (searchBox) {
        searchBox.onclick = function() {
            switchView('search');
            history.pushState({ view: 'search' }, '', '#search');
            
            // 搜索框激活效果
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                setTimeout(() => {
                    searchInput.focus();
                    searchInput.parentElement.classList.add('active');
                }, 300);
            }
        };
    }

    window.addEventListener('popstate', (event) => {
        const viewName = event.state ? event.state.view : null;
        const fullPlayer = document.getElementById('full-player');
        if (fullPlayer && fullPlayer.classList.contains('show')) {
            closeFullPlayer();
        }

        if (viewName === 'playlist' || viewName === 'search') {
            document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
            document.getElementById(`view-${viewName}`).classList.remove('hidden');
        } else {
            document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
            document.getElementById(`view-${state.activeTab}`).classList.remove('hidden');
        }
    });
    
    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
        // 空格键切换播放/暂停
        if (e.code === 'Space' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            togglePlay();
        }
        // 左右箭头切换歌曲
        else if (e.code === 'ArrowRight' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            playNext();
        }
        else if (e.code === 'ArrowLeft' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            playPrev();
        }
        // ESC关闭全屏播放器
        else if (e.code === 'Escape') {
            const fullPlayer = document.getElementById('full-player');
            if (fullPlayer && fullPlayer.classList.contains('show')) {
                closeFullPlayer();
            }
        }
    });
});

// --- 高频逐字动画引擎 ---

function startKaraokeLoop() {
    if (karaokeRafId) cancelAnimationFrame(karaokeRafId);
    const loop = () => {
        updateKaraoke();
        if (state.isPlaying) {
            karaokeRafId = requestAnimationFrame(loop);
        }
    };
    loop();
}

function stopKaraokeLoop() {
    if (karaokeRafId) {
        cancelAnimationFrame(karaokeRafId);
        karaokeRafId = null;
    }
}

// 逐字状态更新
function updateKaraoke() {
    if (state.lyricType !== 'yrc' || state.lyricIndex === -1) return;
    
    const lineData = state.lyrics[state.lyricIndex];
    if (!lineData || !lineData.words || state.activeWordEls.length === 0) return;

    const currentTime = audio.currentTime;
    const wordEls = state.activeWordEls; 
    const words = lineData.words;
    const len = Math.min(wordEls.length, words.length);

    for (let i = 0; i < len; i++) {
        const w = words[i];
        const wordEl = wordEls[i];
        if (!wordEl) continue;

        const endTime = w.startTime + w.duration;

        if (currentTime > endTime) {
            // 唱过去了
            if (!wordEl.classList.contains('passed')) {
                wordEl.classList.add('passed');
                wordEl.classList.remove('singing');
            }
        } else if (currentTime >= w.startTime && currentTime <= endTime) {
            // 正在唱
            if (!wordEl.classList.contains('singing')) {
                wordEl.classList.add('singing');
                wordEl.classList.remove('passed');
                
                // 添加发光效果
                wordEl.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.4)';
            }
        } else {
            // 还没唱到
            wordEl.classList.remove('passed');
            wordEl.classList.remove('singing');
            wordEl.style.textShadow = '';
        }
    }
}

// --- 颜色提取 ---
function extractThemeColor(imgElement) {
    if (!imgElement.src || imgElement.src === window.location.href || !state.colorThief) return;
    try {
        const color = state.colorThief.getColor(imgElement);
        if (color) {
            const rgbString = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            document.documentElement.style.setProperty('--dynamic-color', rgbString);
            
            // 更新相关元素
            updateDynamicColorElements(rgbString);
        }
    } catch (e) {
        const defaultColor = '#ff3a3a';
        document.documentElement.style.setProperty('--dynamic-color', defaultColor);
        updateDynamicColorElements(defaultColor);
    }
}

function updateDynamicColorElements(color) {
    // 更新进度条
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.background = color;
    }
    
    // 更新播放按钮边框
    const playBtn = document.querySelector('.btn-play');
    if (playBtn) {
        playBtn.style.borderColor = color;
    }
    
    // 更新当前播放歌曲的样式
    const activeSongItems = document.querySelectorAll('.song-item.active');
    activeSongItems.forEach(item => {
        item.style.color = color;
    });
}

function resetThemeColor() {
    const defaultColor = '#ff3a3a';
    document.documentElement.style.setProperty('--dynamic-color', defaultColor);
    updateDynamicColorElements(defaultColor);
}

// --- 音量控制 ---
function initVolume() {
    const slider = document.getElementById('volume-slider');
    if (!slider) return;
    
    const savedVol = localStorage.getItem('player_volume');
    if (savedVol !== null) {
        audio.volume = parseFloat(savedVol);
        slider.value = savedVol;
    } else {
        audio.volume = 1;
        slider.value = 1;
    }
    
    // 添加平滑过渡
    slider.addEventListener('input', (e) => {
        const val = e.target.value;
        audio.volume = val;
        localStorage.setItem('player_volume', val);
        
        // 添加音量变化动画
        const volumeIcons = document.querySelectorAll('.volume-icon');
        volumeIcons.forEach(icon => {
            icon.style.transform = `scale(${1 + (val * 0.2)})`;
            setTimeout(() => {
                icon.style.transform = '';
            }, 200);
        });
    });
}

// --- 导航与视图 ---
function switchTab(tabName, el) {
    state.activeTab = tabName;
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if(el) el.classList.add('active');
    switchView(tabName);
    
    if (tabName === 'home' || tabName === 'my') {
         smoothScrollToTop(document.getElementById(`view-${tabName}`));
    }
    if (tabName === 'my') renderMyPage();
}

// --- 播放控制逻辑 ---

function playNext(isAuto = false) {
    if (state.playList.length === 0) return;
    let nextIndex;

    if (isAuto && state.playMode === 1) {
        audio.currentTime = 0;
        audio.play();
        return;
    }

    if (state.playMode === 2) {
        do {
            nextIndex = Math.floor(Math.random() * state.playList.length);
        } while (state.playList.length > 1 && nextIndex === state.currentIndex);
    } else {
        nextIndex = state.currentIndex + 1;
        if (nextIndex >= state.playList.length) nextIndex = 0;
    }

    playMusicAtIndex(nextIndex);
}

function playPrev() {
    if (state.playList.length === 0) return;
    let prevIndex;
    
    if (state.playMode === 2) {
        prevIndex = Math.floor(Math.random() * state.playList.length);
    } else {
        prevIndex = state.currentIndex - 1;
        if (prevIndex < 0) prevIndex = state.playList.length - 1;
    }
    playMusicAtIndex(prevIndex);
}

function togglePlayMode() {
    state.playMode = (state.playMode + 1) % 3;
    const icons = ['fa-exchange-alt', 'fa-redo-alt', 'fa-random'];
    const texts = ['顺序播放', '单曲循环', '随机播放'];
    const iconEl = document.getElementById('mode-icon');
    if (iconEl) {
        // 添加切换动画
        iconEl.style.transform = 'scale(0.8)';
        setTimeout(() => {
            iconEl.className = `fas ${icons[state.playMode]}`;
            iconEl.style.transform = 'scale(1.1)';
            setTimeout(() => {
                iconEl.style.transform = '';
            }, 200);
        }, 150);
    }
    showToast(texts[state.playMode]);
}

async function playMusicAtIndex(index) {
    if (!state.playList || state.playList.length === 0 || index < 0 || index >= state.playList.length) return;
    
    resetThemeColor();
    state.currentIndex = index;
    const songData = state.playList[index];
    if (!songData || !songData.id) return;
    
    let formattedSong;
    try {
        formattedSong = api.formatTrack ? api.formatTrack(songData) : formatTrackFallback(songData);
    } catch (e) {
        formattedSong = formatTrackFallback(songData);
    }
    
    state.currentSong = formattedSong;
    updatePlayerUI(formattedSong);
    updateCurrentSongLikeButton(formattedSong.id);
    
    const drawer = document.getElementById('playlist-drawer');
    if (drawer && drawer.classList.contains('show')) renderPlaylistDrawer();

    try {
        audio.pause(); 
        const urlRes = await api.getSongUrlWithFallback(formattedSong.id);
        const url = urlRes.data && urlRes.data[0] ? urlRes.data[0].url : null;
        
        if (!url) { 
            showToast('资源失效，即将跳过');
            if(state.skipTimer) clearTimeout(state.skipTimer);
            if (state.retryCount < 5) {
                state.retryCount++;
                state.skipTimer = setTimeout(() => playNext(), 1000);
            }
            return; 
        }

        audio.src = url;
        try {
            await audio.play();
        } catch (playErr) {
            console.log('播放请求中断或被阻止:', playErr);
        }

        loadLyrics(formattedSong.id);
    } catch (e) {
        console.error('播放流程异常:', e);
        if(state.skipTimer) clearTimeout(state.skipTimer);
        state.skipTimer = setTimeout(() => playNext(), 1000);
    }
}

function formatTrackFallback(songData) {
    const artists = songData.artists || songData.ar || [];
    const album = songData.album || songData.al || {};
    let pic = 'https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg';
    if (album.picUrl) pic = album.picUrl;
    else if (album.pic_str) pic = `https://p1.music.126.net/${album.pic_str}/${album.pic_str}.jpg`;

    return {
        id: songData.id,
        title: songData.name || '未知歌曲',
        artist: artists.map(a => a.name).join('/') || '未知歌手',
        cover: pic
    };
}

function updateMediaSession(song) {
    if ('mediaSession' in navigator) {
        const coverUrl = song.cover || 'https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg';
        const safeCover = coverUrl.startsWith('http') ? coverUrl : 'https://p1.music.126.net/6y-UleORITEDbvrOLV0Q8A==/5639395138885805.jpg';
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title,
            artist: song.artist,
            album: '网易云音乐',
            artwork: [
                { src: safeCover + "?param=96y96", sizes: '96x96', type: 'image/jpeg' },
                { src: safeCover + "?param=128y128", sizes: '128x128', type: 'image/jpeg' },
                { src: safeCover + "?param=512y512", sizes: '512x512', type: 'image/jpeg' },
            ]
        });
    }
}

function updatePlayerUI(song) {
    // Mini Player 更新
    const miniTitle = document.getElementById('mini-title');
    const miniArtist = document.getElementById('mini-artist');
    const miniImg = document.getElementById('mini-img');
    
    if (miniTitle) {
        miniTitle.innerText = song.title;
        miniTitle.style.animation = 'none';
        setTimeout(() => {
            miniTitle.style.animation = 'slideIn 0.3s ease';
        }, 10);
    }
    
    if (miniArtist) {
        miniArtist.innerText = song.artist;
        miniArtist.style.animation = 'none';
        setTimeout(() => {
            miniArtist.style.animation = 'slideIn 0.3s ease 0.1s';
        }, 10);
    }
    
    if (miniImg) {
        // 添加图片切换过渡效果
        miniImg.style.opacity = '0';
        miniImg.style.transform = 'scale(0.9)';
        setTimeout(() => {
            miniImg.src = song.cover + "?param=100y100";
            miniImg.onload = function() {
                this.style.opacity = '1';
                this.style.transform = 'scale(1)';
                this.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            };
        }, 200);
    }
    
    // 全屏播放器更新
    const fpTitle = document.getElementById('fp-title');
    const fpArtist = document.getElementById('fp-artist');
    const fpCover = document.getElementById('fp-cover');
    const fpBg = document.getElementById('fp-bg');
    
    if (fpTitle) fpTitle.innerText = song.title;
    if (fpArtist) fpArtist.innerText = song.artist;
    
    const coverUrl = song.cover + "?param=400y400";
    if (fpCover) {
        // 封面图片过渡效果
        fpCover.style.opacity = '0';
        fpCover.style.transform = 'scale(0.8) rotate(10deg)';
        setTimeout(() => {
            fpCover.src = coverUrl;
            fpCover.onload = function() {
                this.style.opacity = '1';
                this.style.transform = 'scale(1) rotate(0deg)';
                this.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
            };
        }, 200);
    }
    
    if (fpBg) {
        // 背景渐变过渡
        fpBg.style.opacity = '0';
        setTimeout(() => {
            fpBg.style.backgroundImage = `url(${coverUrl})`;
            fpBg.style.opacity = '0.6';
            fpBg.style.transition = 'opacity 1s ease';
        }, 300);
    }
    
    // 激活Mini Player
    const miniPlayer = document.getElementById('mini-player');
    if (miniPlayer) {
        miniPlayer.classList.add('active');
        miniPlayer.style.transform = 'translateY(0)';
        miniPlayer.style.opacity = '1';
    }
    
    document.body.classList.add('has-player'); 
    
    // 重置歌词位置
    const lyricContent = document.getElementById('lyric-content');
    const lyricWrapper = document.getElementById('lyric-wrapper');
    if (lyricContent) lyricContent.style.transform = 'none';
    if (lyricWrapper) lyricWrapper.scrollTo({ top: 0, behavior: 'smooth' });

    updateMediaSession(song);
}

function togglePlay() {
    if (!state.currentSong && state.playList.length > 0) {
        playMusicAtIndex(0);
        return;
    }
    if (!state.currentSong) return;
    
    // 添加按钮按压效果
    const playButtons = document.querySelectorAll('#mini-play-btn, #fp-play-icon');
    playButtons.forEach(btn => {
        btn.style.transform = 'scale(0.9)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 100);
    });
    
    if (state.isPlaying) {
        audio.pause();
    } else {
        audio.play().catch(e => console.error("Playback failed:", e));
    }
}

function updatePlayState() {
    const miniIcon = state.isPlaying ? 'fa-pause-circle' : 'fa-play-circle';
    const fpIcon = state.isPlaying ? 'fa-pause' : 'fa-play';
    
    const miniPlayBtn = document.getElementById('mini-play-btn');
    const fpPlayIcon = document.getElementById('fp-play-icon');
    
    if (miniPlayBtn) {
        miniPlayBtn.className = `fas ${miniIcon}`;
        // 添加图标切换动画
        miniPlayBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            miniPlayBtn.style.transform = '';
        }, 200);
    }
    
    if (fpPlayIcon) {
        fpPlayIcon.className = `fas ${fpIcon}`;
        // 添加图标切换动画
        fpPlayIcon.parentElement.style.transform = 'scale(1.05)';
        setTimeout(() => {
            fpPlayIcon.parentElement.style.transform = '';
        }, 200);
    }
    
    const cd = document.getElementById('cd-wrapper');
    const mini = document.getElementById('mini-cover-div');
    if (state.isPlaying) {
        if (cd) cd.classList.add('playing');
        if (mini) mini.classList.add('playing');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    } else {
        if (cd) cd.classList.remove('playing');
        if (mini) mini.classList.remove('playing');
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    }
    
    const drawer = document.getElementById('playlist-drawer');
    if (drawer && drawer.classList.contains('show')) renderPlaylistDrawer();
}

function bindProgressEvent() {
    const wrapper = document.getElementById('progress-bg-wrapper');
    if (!wrapper) return;
    
    const progressBg = wrapper.querySelector('.progress-bg');
    const progressBar = document.getElementById('progress-bar');
    if (!progressBg || !progressBar) return;
    
    wrapper.addEventListener('click', (e) => {
        if (!state.currentSong || !audio.duration) return;
        const rect = progressBg.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        let percent = clickX / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        audio.currentTime = percent * audio.duration;
        updateProgress();
        
        // 添加点击反馈
        progressBar.style.transform = 'scaleY(1.2)';
        setTimeout(() => {
            progressBar.style.transform = '';
        }, 200);
    });
    
    const startDrag = (e) => {
        if (!state.currentSong || !audio.duration) return;
        state.isDragging = true;
        progressBar.style.transition = 'none';
        
        const moveHandler = (e) => {
            if (!state.isDragging) return;
            const clientX = e.type.includes('mouse') ? e.clientX : (e.touches[0] ? e.touches[0].clientX : 0);
            const rect = progressBg.getBoundingClientRect();
            let percent = (clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            
            progressBar.style.width = `${percent * 100}%`;
            document.getElementById('current-time').innerText = api.formatDuration(percent * audio.duration * 1000);
        };
        
        const upHandler = (e) => {
            if (!state.isDragging) return;
            state.isDragging = false;
            progressBar.style.transition = 'width 0.1s linear';
            
            const clientX = e.type.includes('mouse') ? e.clientX : (e.changedTouches ? e.changedTouches[0].clientX : 0);
            const rect = progressBg.getBoundingClientRect();
            let percent = (clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            
            if(isFinite(audio.duration)) audio.currentTime = percent * audio.duration;
            
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('touchmove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            document.removeEventListener('touchend', upHandler);
        };
        
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('touchmove', moveHandler, { passive: false });
        document.addEventListener('mouseup', upHandler);
        document.addEventListener('touchend', upHandler);
    };

    wrapper.addEventListener('mousedown', startDrag);
    wrapper.addEventListener('touchstart', startDrag, { passive: false });
}

function updateProgress() {
    if (!audio.duration || state.isDragging) return;
    const p = (audio.currentTime / audio.duration) * 100;
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
        progressBar.style.width = `${p}%`;
    }
    
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');
    if (currentTimeEl) currentTimeEl.innerText = api.formatDuration(audio.currentTime * 1000);
    if (totalTimeEl) totalTimeEl.innerText = api.formatDuration(audio.duration * 1000);
    
    scrollLyric();
}

// --- 手势控制 (全屏播放器下拉) ---
function initGestures() {
    const player = document.getElementById('full-player');
    const header = document.querySelector('.fp-header');
    
    if (!player || !header) return;
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let hasMoved = false; 

    header.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        currentY = startY; 
        
        isDragging = true;
        hasMoved = false; 
        player.style.transition = 'none';
    });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        hasMoved = true; 
        currentY = e.touches[0].clientY;
        const delta = currentY - startY;
        
        if (delta > 0) {
            e.preventDefault();
            player.style.transform = `translateY(${delta}px)`;
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        player.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
        
        if (!hasMoved) {
            player.style.transform = '';
            return;
        }

        const delta = currentY - startY;
        if (delta > 150) {
            closeFullPlayer();
            setTimeout(() => { player.style.transform = ''; }, 300);
        } else {
            player.style.transform = '';
        }
    });
}

// --- 歌词逻辑 (支持 YRC) ---
async function loadLyrics(id) {
    const currentId = id;
    const div = document.getElementById('lyric-content');
    if (!div) return;
    
    div.innerHTML = '<p class="lyric-line">加载歌词...</p>';
    
    state.lyrics = [];
    state.lyricIndex = -1;
    state.lyricType = 'lrc'; 
    state.activeWordEls = [];
    
    const lyricWrapper = document.getElementById('lyric-wrapper');
    if (lyricWrapper) lyricWrapper.scrollTo({ top: 0, behavior: 'smooth' });
    
    try {
        const res = await api.getLyricNew(id);
        if (state.currentSong && state.currentSong.id !== currentId) return;

        let parsedLyrics = null;

        if (res && res.yrc && res.yrc.lyric) {
            parsedLyrics = api.parseYrc(res.yrc.lyric);
            if (parsedLyrics) {
                state.lyricType = 'yrc';
            }
        }

        if (!parsedLyrics && res && res.lrc && res.lrc.lyric) {
            parsedLyrics = api.parseLyric ? api.parseLyric(res.lrc.lyric) : parseLyricSimple(res.lrc.lyric);
            state.lyricType = 'lrc';
        }

        state.lyrics = parsedLyrics || [];

        if (state.lyrics.length === 0) {
             div.innerHTML = '<p class="lyric-line">纯音乐，请欣赏</p>';
        } else {
            if (state.lyricType === 'yrc') {
                div.innerHTML = state.lyrics.map((line, i) => {
                    const wordsHtml = line.words.map((w, wIdx) => 
                        `<span class="yrc-word" id="word-${i}-${wIdx}">${w.text}</span>`
                    ).join('');
                    return `<p class="lyric-line yrc-mode" id="line-${i}">
                        <span class="lyric-click-area" onclick="seekToLyric(event, ${line.time})">${wordsHtml}</span>
                    </p>`;
                }).join('');
            } else {
                div.innerHTML = state.lyrics.map((l, i) => 
                    `<p class="lyric-line" id="line-${i}">
                        <span class="lyric-click-area" onclick="seekToLyric(event, ${l.time})">
                            <span class="standard-lyric-text">${l.text}</span>
                        </span>
                    </p>`
                ).join('');
            }
        }
    } catch (e) {
        if (state.currentSong && state.currentSong.id === currentId) {
            div.innerHTML = '<p class="lyric-line">歌词加载失败</p>';
        }
    }
}

function parseLyricSimple(lyricText) {
    const lines = lyricText.split('\n');
    const lyrics = [];
    const timeReg = /\[(\d{2}):(\d{2})(\.\d{2,3})?\]/;
    for (let line of lines) {
        const match = timeReg.exec(line);
        if (match) {
            const minute = parseInt(match[1]);
            const second = parseInt(match[2]);
            const ms = match[3] ? parseFloat(match[3]) * 1000 : 0;
            const time = minute * 60 + second + ms / 1000;
            const text = line.replace(timeReg, '').trim();
            if (text) lyrics.push({ time, text });
        }
    }
    lyrics.sort((a, b) => a.time - b.time);
    return lyrics;
}

function seekToLyric(event, time) {
    if (event) event.stopPropagation(); 
    audio.currentTime = time;
    if (!state.isPlaying) audio.play();
    updateProgress();
}

function scrollLyric() {
    if (!state.lyrics.length) return;
    
    // 1. 计算当前应该高亮的行号
    let idx = -1;
    for (let i = 0; i < state.lyrics.length; i++) {
        if (audio.currentTime >= state.lyrics[i].time) idx = i;
        else break;
    }

    // 2. 如果行号变了，执行滚动和样式更新
    if (idx !== state.lyricIndex) {
        const container = document.getElementById('lyric-wrapper');
        if (!container) return;

        // A. 清除上一行的激活状态和残留样式（修复重影）
        const activeItem = container.querySelector('.lyric-line.active');
        if (activeItem) {
            activeItem.classList.remove('active');
            // 强制清除上一行逐字歌词的内联样式
            const words = activeItem.querySelectorAll('.yrc-word');
            words.forEach(w => {
                w.classList.remove('singing');
                w.classList.add('passed');
                w.style.textShadow = ''; 
                w.style.transform = '';
                w.style.color = '';
            });
        }

        // B. 更新状态索引
        state.lyricIndex = idx;
        state.activeWordEls = []; // 清空缓存

        // C. 激活新的一行
        const lines = container.querySelectorAll('.lyric-line');
        if (idx >= 0 && lines[idx]) {
            const line = lines[idx];
            line.classList.add('active');
            
            // 缓存当前行的字元素，供 updateKaraoke 使用
            if (state.lyricType === 'yrc') {
                state.activeWordEls = Array.from(line.querySelectorAll('.yrc-word'));
            }

            // D. 执行滚动
            const containerHeight = container.clientHeight;
            const lineTop = line.offsetTop;
            const lineHeight = line.offsetHeight;
            // 计算滚动位置：让当前行居中
            let targetScrollTop = lineTop + (lineHeight / 2) - (containerHeight / 2);
            
            container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
        }
    }
}

function togglePlaylistDrawer() {
    const drawer = document.getElementById('playlist-drawer');
    const overlay = document.getElementById('drawer-overlay');
    const isShow = drawer && drawer.classList.contains('show');
    if (!isShow) {
        renderPlaylistDrawer();
        if (drawer) drawer.classList.add('show');
        if (overlay) overlay.classList.add('show');
    } else {
        if (drawer) drawer.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
    }
}

function renderPlaylistDrawer() {
    const listContainer = document.getElementById('drawer-list');
    const countEl = document.getElementById('playlist-count');
    if (!listContainer || !countEl) return;
    
    countEl.innerText = state.playList.length;
    let html = '';
    if (state.playList.length === 0) {
        html = '<div class="loading">播放列表为空</div>';
    } else {
        state.playList.forEach((song, idx) => {
            const isActive = (idx === state.currentIndex);
            const name = song.name || song.title || '未知歌曲';
            const artists = song.artists || song.ar || [];
            const artistName = artists.map(a => a.name).join('/') || '';
            const activeClass = isActive ? 'active' : '';
            
            let waveHtml = '';
            if (isActive && state.isPlaying) {
                waveHtml = `<div class="playing-wave" style="margin-right: 12px; flex-shrink: 0;"><span></span><span></span><span></span></div>`;
            } else if (isActive && !state.isPlaying) {
                waveHtml = `<i class="fas fa-volume-up" style="color:var(--primary-color); margin-right: 12px; font-size: 14px;"></i>`;
            }

            html += `
                <div class="drawer-item ${activeClass}" onclick="playMusicAtIndex(${idx});">
                    ${waveHtml}
                    <div style="flex:1; overflow:hidden; margin-right: 35px;">
                        <div class="d-name ellipsis">${name}</div>
                        <div class="d-artist ellipsis">${artistName ? `- ${artistName}` : ''}</div>
                    </div>
                    <i class="fas fa-times" style="padding: 10px; color: #ccc;" onclick="event.stopPropagation(); removeFromList(${idx})"></i>
                </div>`;
        });
    }
    listContainer.innerHTML = html;
}

function removeFromList(index) {
    state.playList.splice(index, 1);
    if (index < state.currentIndex) {
        state.currentIndex--;
    } else if (index === state.currentIndex) {
        if (state.playList.length > 0) {
            playMusicAtIndex(index >= state.playList.length ? 0 : index);
        } else {
            clearPlaylist();
        }
    }
    renderPlaylistDrawer();
}

function clearPlaylist() {
    state.playList = [];
    audio.pause();
    state.isPlaying = false;
    state.currentSong = null;
    document.body.classList.remove('has-player');
    const miniPlayer = document.getElementById('mini-player');
    if (miniPlayer) miniPlayer.classList.remove('active');
    togglePlaylistDrawer();
}

// --- 收藏与用户数据 ---

async function initLikedSongs() {
    if (!state.isLoggedIn) return;
    try {
        const res = await api.getUserPlaylist(state.userInfo.userId, localStorage.getItem('music_cookie'));
        const likedPlaylist = res.playlist.find(pl => pl.specialType === 5);
        if (likedPlaylist) {
            state.userLikedPlaylistId = likedPlaylist.id;
            const songsRes = await api.getPlaylistTracks(likedPlaylist.id, 500);
            if (songsRes && songsRes.songs) songsRes.songs.forEach(song => state.likedSongs.add(song.id));
            if (state.currentSong) updateCurrentSongLikeButton(state.currentSong.id);
        }
    } catch (e) { console.error('获取红心歌单失败', e); }
}

function isSongLiked(songId) { return state.likedSongs.has(songId); }

async function toggleLikeSong(event, songId) {
    if(event) event.stopPropagation();
    if (!state.isLoggedIn) { showToast('请先登录'); switchTab('my'); return; }
    if (!state.userLikedPlaylistId) await initLikedSongs();
    
    const isLiked = isSongLiked(songId);
    
    // --- 新增：先在 UI 上变色，不需要等接口返回，体验更丝滑 ---
    // 乐观更新 UI
    if (isLiked) state.likedSongs.delete(songId);
    else state.likedSongs.add(songId);
    updateSingleLikeButton(songId, !isLiked);
    // -----------------------------------------------------

    const cookie = localStorage.getItem('music_cookie');
    try {
        await api.likeSong(songId, !isLiked, cookie);
        
        // 接口成功后，再确保一下状态是对的（防止原来的代码重复添加）
        // 原来的代码删掉或注释掉，因为上面已经更新过 UI 了
        /* 
        if (isLiked) state.likedSongs.delete(songId);
        else state.likedSongs.add(songId);
        updateSingleLikeButton(songId, !isLiked); 
        */
        
        renderPlaylistDrawer(); 
        showToast(isLiked ? '已取消喜欢' : '已添加到喜欢');
    } catch (e) { 
        console.error(e);
        // 如果失败了，把 UI 变回去
        if (isLiked) state.likedSongs.add(songId);
        else state.likedSongs.delete(songId);
        updateSingleLikeButton(songId, isLiked);

        if (e.status === 301 || e.code === 301) {
            showToast('登录已过期，请重新登录');
            handleLogout();
            switchTab('my');
        } else {
            showToast('操作失败'); 
        }
    }
}

function updateSingleLikeButton(songId, liked) {
    document.querySelectorAll(`[data-song-id="${songId}"]`).forEach(btn => {
        let icon = btn.tagName === 'I' ? btn : btn.querySelector('i');
        if (!icon) return; 
        
        icon.className = liked ? 'fas fa-heart' : 'far fa-heart';
        if (btn.classList.contains('like-btn') || btn.classList.contains('mini-like-btn') || btn.classList.contains('fp-like-btn') || btn.classList.contains('drawer-like-btn')) {
            liked ? btn.classList.add('active') : btn.classList.remove('active');
        }
        if (btn.tagName === 'I') {
             if (liked) {
                 btn.classList.remove('far');
                 btn.classList.add('fas');
                 // 添加心跳动画
                 btn.classList.add('heartbeat');
                 setTimeout(() => btn.classList.remove('heartbeat'), 800);
             } else {
                 btn.classList.remove('fas');
                 btn.classList.add('far');
             }
        }
    });
    if (state.currentSong && state.currentSong.id === songId) updateCurrentSongLikeButton(songId);
}

function updateCurrentSongLikeButton(songId) {
    const isLiked = isSongLiked(songId);
    ['mini-like-btn', 'fp-like-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if(!btn) return;
        if (isLiked) {
            btn.classList.add('active');
            btn.classList.remove('far');
            btn.classList.add('fas');
        } else {
            btn.classList.remove('active');
            btn.classList.remove('fas');
            btn.classList.add('far');
        }
    });
}

async function toggleLikeCurrentSong(event) {
    if (event) event.stopPropagation();
    if (state.currentSong) await toggleLikeSong(event, state.currentSong.id);
}

async function checkLogin() {
    const cookie = localStorage.getItem('music_cookie');
    if (cookie) {
        try {
            const res = await api.getLoginStatus(cookie);
            if (res.data && res.data.profile) {
                state.isLoggedIn = true;
                state.userInfo = res.data.profile;

                try {
                    const levelRes = await api.getUserLevel(cookie);
                    if (levelRes && levelRes.data) {
                        state.userInfo.level = levelRes.data.level || levelRes.data.currentLevel || 0;
                    }
                } catch (e) {
                    console.warn('获取用户等级失败:', e);
                }
            } else {
                state.isLoggedIn = false;
            }
        } catch (e) { state.isLoggedIn = false; }
    }
}

function renderMyPage() {
    // 添加SVIP动画样式
    if (!document.getElementById('svip-flow-style')) {
        const style = document.createElement('style');
        style.id = 'svip-flow-style';
        style.innerHTML = `
            @keyframes gold-text-flow {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes record-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes glow {
                0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
                50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
            }
        `;
        document.head.appendChild(style);
    }

    if (state.isLoggedIn && state.userInfo) {
        document.getElementById('login-panel').style.display = 'none';
        document.getElementById('user-panel').style.display = 'block';
        document.getElementById('user-avatar').src = state.userInfo.avatarUrl;
        document.getElementById('user-name').innerText = state.userInfo.nickname;

        const levelTag = document.querySelector('.user-level');
        
        if (state.userInfo.vipType > 0) {
            // SVIP 样式处理
            const cnNums = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'];
            const lvl = (state.userInfo.level !== undefined) ? state.userInfo.level : 7;
            const cnLevel = cnNums[lvl] || lvl; 

            levelTag.className = 'user-level'; 
            levelTag.style.cssText = `
                display: inline-flex;
                align-items: center;
                background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
                padding: 4px 14px 4px 4px; 
                border-radius: 30px; 
                vertical-align: middle;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5); 
                font-family: "Arial Black", Impact, "PingFang SC", "Microsoft YaHei", sans-serif;
                border: 1px solid rgba(212, 175, 55, 0.3);
                position: relative;
                overflow: hidden;
            `;

            const goldTextStyle = `
                background: linear-gradient(110deg, #e4c786 0%, #fff0c4 30%, #e4c786 50%, #c69c54 80%, #e4c786 100%);
                background-size: 200% 100%;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: gold-text-flow 3s linear infinite;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); 
                font-weight: 900;
            `;

            levelTag.innerHTML = `
                <div style="
                    width: 28px; height: 28px; margin-right: 8px; border-radius: 50%;
                    background: conic-gradient(#cb9b46 0%, #fceeb6 25%, #cb9b46 50%, #fceeb6 75%, #cb9b46 100%);
                    box-shadow: 0 0 0 2px #080808; display: flex; align-items: center; justify-content: center;
                    animation: record-spin 5s linear infinite; flex-shrink: 0; position: relative;
                ">
                    <div style="width: 60%; height: 60%; background: #111; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <div style="width: 75%; height: 75%; background: radial-gradient(circle, #fdf5cd 0%, #cba052 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <div style="width: 30%; height: 30%; background: #1a1a1a; border-radius: 50%;"></div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 900; line-height: 1;">
                    <span style="${goldTextStyle} letter-spacing: 1px; font-size: 12px;">SVIP</span>
                    <div style="width: 6px; height: 6px; border-radius: 50%; background: linear-gradient(135deg, #fff0c4, #c69c54); box-shadow: 0 1px 3px rgba(0,0,0,0.5);"></div>
                    <span style="${goldTextStyle} font-size: 16px; letter-spacing: 0.5px;">${cnLevel}</span>
                </div>
            `;
        } else {
            levelTag.className = 'user-level';
            levelTag.style.cssText = '';
            const level = (state.userInfo.level !== undefined) ? state.userInfo.level : 0;
            levelTag.innerText = `Lv.${level}`;
            levelTag.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            levelTag.style.color = 'white';
            levelTag.style.padding = '4px 12px';
            levelTag.style.borderRadius = '12px';
            levelTag.style.fontSize = '12px';
            levelTag.style.fontWeight = '700';
            levelTag.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
        }

        loadUserPlaylists();
    } else {
        document.getElementById('login-panel').style.display = 'block';
        document.getElementById('user-panel').style.display = 'none';
    }
}

async function loadUserPlaylists() {
    const container = document.getElementById('user-playlists');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const res = await api.getUserPlaylist(state.userInfo.userId, localStorage.getItem('music_cookie'));
        let html = '';
        const likedPlaylist = res.playlist.find(pl => pl.specialType === 5);
        if (likedPlaylist) {
            html += `
                <div class="playlist-row" onclick="loadPlaylist(${likedPlaylist.id})">
                    <div class="pl-row-cover" style="background:linear-gradient(135deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:24px;">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="pl-row-info">
                        <div class="pl-row-title ellipsis">我喜欢的音乐</div>
                        <div class="pl-row-count">${likedPlaylist.trackCount}首</div>
                    </div>
                </div>`;
        }
        res.playlist.forEach(pl => {
            if (pl.specialType === 5) return;
            html += `
                <div class="playlist-row" onclick="loadPlaylist(${pl.id})">
                    <img class="pl-row-cover" src="${pl.coverImgUrl}?param=100y100" loading="lazy">
                    <div class="pl-row-info">
                        <div class="pl-row-title ellipsis">${pl.name}</div>
                        <div class="pl-row-count">${pl.trackCount}首，by ${pl.creator.nickname}</div>
                    </div>
                </div>`;
        });
        container.innerHTML = html || '<div class="loading">暂无歌单</div>';
    } catch (e) { container.innerHTML = '<div class="loading">加载失败</div>'; }
}

async function showLoginModal() {
    const modal = document.getElementById('login-modal');
    const qrStatus = document.getElementById('qr-status');
    const qrImg = document.getElementById('qr-img');
    
    if (!modal || !qrStatus || !qrImg) return;
    
    modal.classList.remove('hidden');
    qrStatus.innerText = '正在获取二维码...';
    try {
        const keyRes = await api.getQRKey();
        const key = keyRes.data.unikey;
        const createRes = await api.createQR(key);
        qrImg.src = createRes.data.qrimg;
        qrStatus.innerText = '请使用网易云APP扫码';
        state.checkQrTimer = setInterval(async () => {
            try {
                const checkRes = await api.checkQR(key);
                if (checkRes.code === 803) {
                    clearInterval(state.checkQrTimer);
                    localStorage.setItem('music_cookie', checkRes.cookie);
                    await checkLogin();
                    await initLikedSongs();
                    hideLoginModal();
                    renderMyPage();
                    loadHomeData();
                    showToast('登录成功');
                }
            } catch (e) {}
        }, 3000);
    } catch (e) { 
        qrStatus.innerText = '获取失败，请重试';
        qrImg.src = '';
    }
}

function hideLoginModal(e) {
    if (e && e.target !== document.getElementById('login-modal') && !e.target.classList.contains('close-modal')) return;
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.add('hidden');
    if (state.checkQrTimer) clearInterval(state.checkQrTimer);
}

function handleLogout() {
    audio.pause();
    audio.src = "";
    audio.currentTime = 0;
    state.currentSong = null;
    state.isPlaying = false;
    updatePlayState();
    
    const miniPlayer = document.getElementById('mini-player');
    if (miniPlayer) miniPlayer.classList.remove('active');
    document.body.classList.remove('has-player');
    
    localStorage.removeItem('music_cookie');
    state.isLoggedIn = false;
    state.userInfo = null;
    state.likedSongs.clear();
    state.userLikedPlaylistId = null;
    
    renderMyPage();
    loadHomeData();
    showToast('已退出登录');
}

// --- 数据加载 ---
async function loadHomeData() {
    const container = document.getElementById('recommend-container');
    const title = document.getElementById('recommend-title');
    if (!container || !title) return;
    
    container.innerHTML = '<div class="loading-skeleton"></div>';
    try {
        if (state.isLoggedIn) {
            title.innerText = '每日推荐歌单';
            try {
                const res = await api.getDailyRecommendPlaylists();
                if (res && res.recommend) renderGrid(res.recommend, container);
                else throw new Error('Error');
            } catch (e) { await loadStandardRecommend(container); }
        } else {
            title.innerText = '推荐歌单';
            await loadStandardRecommend(container);
        }
    } catch (e) { container.innerHTML = '<div class="loading">加载失败</div>'; }
}

async function loadStandardRecommend(container) {
    const res = await api.getPersonalized(9);
    if (res && res.result) renderGrid(res.result, container);
}

function renderGrid(list, container) {
    container.innerHTML = '';
    if (!list || list.length === 0) { 
        container.innerHTML = '<div class="loading">暂无内容</div>'; 
        return; 
    }
    list.forEach(item => {
        const pic = item.picUrl || item.coverImgUrl;
        const div = document.createElement('div');
        div.className = 'grid-item';
        div.onclick = () => loadPlaylist(item.id);
        div.innerHTML = `
            <div class="cover-box">
                <img src="${pic}?param=200y200" loading="lazy" onload="this.classList.add('loaded')">
                <div class="play-count">▷ ${formatCount(item.playCount || item.playcount || 0)}</div>
            </div>
            <div class="grid-title line-clamp-2">${item.name}</div>`;
        container.appendChild(div);
    });
}

const PAGE_SIZE = 100;

async function loadPlaylist(id, page = 1) {
    if (document.getElementById('view-playlist').classList.contains('hidden')) {
        history.pushState({ view: 'playlist' }, '', '#playlist');
    }
    state.currentPlaylistId = id;
    switchView('playlist');
    const container = document.getElementById('playlist-details-container');
    
    const scrollContainer = document.getElementById('view-playlist');
    if(scrollContainer) smoothScrollToTop(scrollContainer);

    container.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const plRes = await api.getPlaylistDetail(id);
        const playlist = plRes.playlist;
        const totalTracks = playlist.trackCount;

        const offset = (page - 1) * PAGE_SIZE;

        const trackRes = await api.getPlaylistTracks(id, PAGE_SIZE, offset);
        state.playList = trackRes.songs || [];
        
        let html = `
            <div class="playlist-header">
                <div class="pl-cover"><img src="${playlist.coverImgUrl}?param=200y200" onload="this.classList.add('loaded')"></div>
                <div class="pl-info">
                    <div class="pl-title line-clamp-2">${playlist.name}</div>
                    <div class="pl-author"><img src="${playlist.creator.avatarUrl}?param=50y50"> ${playlist.creator.nickname}</div>
                </div>
            </div>
            <div class="song-list">`;
        
        if (state.playList.length === 0) {
            html += '<div class="loading">本页暂无歌曲</div>';
        } else {
            state.playList.forEach((song, index) => {
                const artists = song.ar || song.artists || [];
                const artistNames = artists.map(a => a.name).join('/');
                const isLiked = isSongLiked(song.id);
                const displayIndex = offset + index + 1;
                
                html += `
                    <div class="song-item" onclick="playMusicAtIndex(${index})">
                        <div class="song-index">${displayIndex}</div>
                        <div class="song-details">
                            <div class="song-name ellipsis">${song.name}</div>
                            <div class="song-meta ellipsis">${artistNames}</div>
                        </div>
                        <div class="like-btn ${isLiked ? 'active' : ''}" onclick="toggleLikeSong(event, ${song.id})" data-song-id="${song.id}">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        </div>
                    </div>`;
            });
        }
        html += '</div>';

        const totalPages = Math.ceil(totalTracks / PAGE_SIZE);
        if (totalPages > 1) {
            html += `<div style="padding: 20px 0; display: flex; justify-content: center; align-items: center; gap: 15px;">`;
            if (page > 1) {
                html += `<button onclick="loadPlaylist(${id}, ${page - 1})" style="padding: 10px 20px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--glass-bg); color: var(--text-main); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;">上一页</button>`;
            } else {
                html += `<button disabled style="padding: 10px 20px; border-radius: 20px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.05); color: var(--text-sub); font-size: 14px;">上一页</button>`;
            }
            html += `<span style="font-size: 13px; color: var(--text-sub); font-weight: 500;">${page} / ${totalPages}</span>`;
            if (page < totalPages) {
                html += `<button onclick="loadPlaylist(${id}, ${page + 1})" style="padding: 10px 20px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--glass-bg); color: var(--text-main); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;">下一页</button>`;
            } else {
                html += `<button disabled style="padding: 10px 20px; border-radius: 20px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.05); color: var(--text-sub); font-size: 14px;">下一页</button>`;
            }
            html += `</div>`;
        }

        container.innerHTML = html;
        
        // 初始化新加载的图片效果
        container.querySelectorAll('img').forEach(img => {
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.5s ease';
            img.onload = function() {
                this.style.opacity = '1';
                this.classList.add('loaded');
            };
        });
    } catch (e) { 
        console.error(e);
        container.innerHTML = '<div class="loading">加载失败</div>'; 
    }
}

async function loadDailySongs() {
    if (!state.isLoggedIn) { showToast('请先登录'); switchTab('my'); return; }
    if (document.getElementById('view-playlist').classList.contains('hidden')) {
        history.pushState({ view: 'playlist' }, '', '#playlist');
    }
    state.currentPlaylistId = 'daily';
    switchView('playlist');
    const container = document.getElementById('playlist-details-container');
    container.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const res = await api.getDailyRecommendSongs();
        state.playList = res.data.dailySongs || [];
        const date = new Date().getDate();
        let html = `
            <div class="playlist-header">
                <div class="pl-cover" style="background:linear-gradient(135deg, #ff5a4c 0%, #ff2d2d 100%);color:white;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;text-shadow:0 2px 8px rgba(0,0,0,0.3)">${date}</div>
                <div class="pl-info"><div class="pl-title">每日推荐歌曲</div><div class="pl-sub">根据你的口味生成</div></div>
            </div>
            <div class="song-list">`;
            
        if (state.playList.length === 0) html += '<div class="loading">今日暂无推荐</div>';
        else {
            state.playList.forEach((song, i) => {
                const isLiked = isSongLiked(song.id);
                const artists = song.ar || song.artists || [];
                const artistNames = artists.map(a => a.name).join('/');
                html += `
                    <div class="song-item" onclick="playMusicAtIndex(${i})">
                        <div class="song-index">${i + 1}</div>
                        <div class="song-details">
                            <div class="song-name ellipsis">${song.name}</div>
                            <div class="song-meta ellipsis">${artistNames}</div>
                        </div>
                        <div class="like-btn ${isLiked ? 'active' : ''}" onclick="toggleLikeSong(event, ${song.id})" data-song-id="${song.id}">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        </div>
                    </div>`;
            });
        }
        html += '</div>';
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<div class="loading">加载失败</div>'; }
}

async function doSearch() {
    const val = document.getElementById('search-input').value.trim();
    if (!val) return;
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.blur(); 
        // 添加搜索动画
        searchInput.parentElement.style.transform = 'scale(0.98)';
        setTimeout(() => {
            searchInput.parentElement.style.transform = '';
        }, 200);
    }
    
    const container = document.getElementById('search-results');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">搜索中...</div>';
    
    try {
        const res = await api.search(val);
        state.playList = res.result.songs || [];
        let html = '';
        if (state.playList.length === 0) html = '<div class="loading">无搜索结果</div>';
        else {
            state.playList.forEach((song, i) => {
                const isLiked = isSongLiked(song.id);
                const artists = song.artists || song.ar || [];
                const artistNames = artists.map(a => a.name).join('/');
                html += `
                    <div class="song-item" onclick="playMusicAtIndex(${i})">
                        <div class="song-index">${i + 1}</div>
                        <div class="song-details">
                            <div class="song-name ellipsis">${song.name}</div>
                            <div class="song-meta ellipsis">${artistNames}</div>
                        </div>
                        <div class="like-btn ${isLiked ? 'active' : ''}" onclick="toggleLikeSong(event, ${song.id})" data-song-id="${song.id}">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        </div>
                    </div>`;
            });
        }
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<div class="loading">搜索失败</div>'; }
}

function formatCount(n) {
    if (n > 100000000) return (n/100000000).toFixed(1)+'亿';
    if (n > 10000) return (n/10000).toFixed(1)+'万';
    return n;
}

function openFullPlayer() { 
    const fullPlayer = document.getElementById('full-player');
    if (state.currentSong && fullPlayer) {
        fullPlayer.classList.add('show');
        // 添加打开动画
        fullPlayer.style.transform = 'translateY(0)';
        fullPlayer.style.opacity = '1';
    }
}

function closeFullPlayer() { 
    const fullPlayer = document.getElementById('full-player');
    if (fullPlayer) {
        fullPlayer.classList.remove('show');
        // 添加关闭动画
        fullPlayer.style.transform = 'translateY(100vh)';
        fullPlayer.style.opacity = '0';
    }
}

function toggleLyricView() {
    const lyric = document.getElementById('lyric-wrapper');
    const cd = document.getElementById('cd-wrapper');
    if (!lyric || !cd) return;
    
    const isActive = lyric.classList.contains('active');
    
    if (isActive) {
        lyric.classList.remove('active');
        cd.style.opacity = '1';
        cd.style.display = 'flex';
        lyric.style.display = 'none';
        // CD显示动画
        cd.style.transform = 'scale(0.9)';
        setTimeout(() => {
            cd.style.transform = 'scale(1)';
        }, 50);
    } else {
        lyric.classList.add('active');
        cd.style.opacity = '0';
        cd.style.display = 'none';
        lyric.style.display = 'block';
        // 歌词显示动画
        lyric.style.opacity = '0';
        lyric.style.transform = 'translateY(20px)';
        setTimeout(() => {
            lyric.style.opacity = '1';
            lyric.style.transform = 'translateY(0)';
            lyric.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        }, 50);
        // 确保歌词内容刷新
        if (state.lyricIndex >= 0) {
            setTimeout(() => {
                scrollLyric();
            }, 100);
        }
    }
}

// 公开API供HTML调用
window.showToast = showToast;
window.switchTab = switchTab;
window.switchView = window.switchView || switchView;
window.goBack = () => history.back();
window.playNext = playNext;
window.playPrev = playPrev;
window.togglePlayMode = togglePlayMode;
window.togglePlay = togglePlay;
window.toggleLikeCurrentSong = toggleLikeCurrentSong;
window.toggleLikeSong = toggleLikeSong;
window.showLoginModal = showLoginModal;
window.hideLoginModal = hideLoginModal;
window.handleLogout = handleLogout;
window.doSearch = doSearch;
window.loadPlaylist = loadPlaylist;
window.loadDailySongs = loadDailySongs;
window.openFullPlayer = openFullPlayer;
window.closeFullPlayer = closeFullPlayer;
window.toggleLyricView = toggleLyricView;
window.togglePlaylistDrawer = togglePlaylistDrawer;
window.clearPlaylist = clearPlaylist;
window.playMusicAtIndex = playMusicAtIndex;
window.removeFromList = removeFromList;
window.seekToLyric = seekToLyric;
window.state = state;