(function () {
  'use strict';

  function initVideoPrezentare() {
    var shell = document.getElementById('vprez-shell');
    if (!shell) return;

    var video      = document.getElementById('vprez-video');
    var playBtn    = document.getElementById('vprez-play-btn');
    var unmuteBtn  = document.getElementById('vprez-unmute-btn');
    var progBar    = document.getElementById('vprez-progress');
    var progFill   = document.getElementById('vprez-progress-fill');
    var controls   = document.getElementById('vprez-controls');
    var overlay    = document.getElementById('vprez-play-overlay');
    var bigPlayBtn = document.getElementById('vprez-play-big-btn');

    if (!video || !playBtn || !unmuteBtn || !progBar || !progFill || !controls || !overlay || !bigPlayBtn) return;

    var hideTimer  = null;
    var userPaused = false;
    var isMobile   = window.matchMedia('(pointer: coarse)').matches;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var slowConn = conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g');

    // Reduced-motion or slow connection: skip autoplay, show manual play overlay
    if (reduceMotion || slowConn) {
      overlay.removeAttribute('aria-hidden');
      overlay.classList.add('is-visible');
      bigPlayBtn.addEventListener('click', function () {
        overlay.setAttribute('aria-hidden', 'true');
        overlay.classList.remove('is-visible');
        video.muted = false;
        video.play().catch(function () {
          video.muted = true;
          video.play().catch(function () {});
        });
      });
      return;
    }

    // IntersectionObserver 1: preload early — when shell is within 500px of viewport
    if ('IntersectionObserver' in window) {
      var preloadObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          video.preload = 'auto';
          preloadObserver.disconnect();
        }
      }, { rootMargin: '500px' });
      preloadObserver.observe(shell);
    }

    // IntersectionObserver 2: play when ≥25% visible, pause when scrolled out
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (video.paused && !userPaused) {
              video.play().catch(function () {});
            }
          } else {
            if (!video.paused) {
              video.pause();
              // auto-pause, do not set userPaused
            }
          }
        });
      }, { threshold: 0.25 });
      observer.observe(shell);
    }

    // Buffering state — show overlay when stalled, hide when ready
    video.addEventListener('waiting', function () {
      shell.classList.add('is-buffering');
    });
    video.addEventListener('stalled', function () {
      shell.classList.add('is-buffering');
    });
    video.addEventListener('canplay', function () {
      shell.classList.remove('is-buffering');
    });
    video.addEventListener('playing', function () {
      shell.classList.remove('is-buffering');
    });

    // Sync is-playing class and aria-label
    function syncState() {
      if (video.paused) {
        shell.classList.remove('is-playing');
        playBtn.setAttribute('aria-label', 'Redă video');
      } else {
        shell.classList.add('is-playing');
        playBtn.setAttribute('aria-label', 'Pauză video');
      }
    }

    video.addEventListener('play', syncState);
    video.addEventListener('pause', syncState);
    video.addEventListener('ended', function () {
      userPaused = false;
      showControls();
    });

    // Play/pause button
    playBtn.addEventListener('click', function () {
      if (video.paused) {
        userPaused = false;
        video.play().catch(function () {});
      } else {
        userPaused = true;
        video.pause();
      }
    });

    // Click on video element = toggle play/pause
    video.addEventListener('click', function () {
      if (video.paused) {
        userPaused = false;
        video.play().catch(function () {});
      } else {
        userPaused = true;
        video.pause();
      }
    });

    // Unmute / mute toggle
    unmuteBtn.addEventListener('click', function () {
      if (video.muted) {
        video.muted = false;
        shell.classList.add('is-unmuted');
        unmuteBtn.setAttribute('aria-label', 'Dezactivează sunetul');
      } else {
        video.muted = true;
        shell.classList.remove('is-unmuted');
        unmuteBtn.setAttribute('aria-label', 'Activează sunetul');
      }
    });

    // Progress bar fill
    video.addEventListener('timeupdate', function () {
      if (!video.duration || isNaN(video.duration)) return;
      var pct = (video.currentTime / video.duration) * 100;
      progFill.style.width = pct + '%';
      progBar.setAttribute('aria-valuenow', String(Math.round(pct)));
    });

    // Seek on click
    progBar.addEventListener('click', function (e) {
      var rect  = progBar.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (video.duration && !isNaN(video.duration)) {
        video.currentTime = ratio * video.duration;
      }
    });

    // Keyboard seek (5% steps)
    progBar.addEventListener('keydown', function (e) {
      if (!video.duration || isNaN(video.duration)) return;
      var step = video.duration * 0.05;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        video.currentTime = Math.min(video.duration, video.currentTime + step);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        video.currentTime = Math.max(0, video.currentTime - step);
        e.preventDefault();
      }
    });

    // Controls auto-hide (desktop only)
    function showControls() {
      controls.classList.remove('controls-hidden');
      if (hideTimer) clearTimeout(hideTimer);
      if (!video.paused && !isMobile) {
        hideTimer = setTimeout(function () {
          if (!video.paused) controls.classList.add('controls-hidden');
        }, 2000);
      }
    }

    shell.addEventListener('mousemove',  showControls);
    shell.addEventListener('mouseenter', showControls);
    shell.addEventListener('mouseleave', function () {
      if (!video.paused && !isMobile) {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(function () {
          controls.classList.add('controls-hidden');
        }, 600);
      }
    });
    shell.addEventListener('touchstart', showControls, { passive: true });

    // Keep controls visible whenever video is paused
    video.addEventListener('pause', showControls);
  }

  window.addEventListener('load', initVideoPrezentare);
})();
